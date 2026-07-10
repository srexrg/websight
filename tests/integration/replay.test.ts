/**
 * /api/replay ingest end-to-end (docs/redesign/24 milestone 1): GET config
 * and POST chunk storage against a real Supabase stack (cloud project from
 * .env.local, or a local `npx supabase start` fallback) plus the real
 * REPLAY_S3_* object store. Self-skips when either is unavailable. All rows
 * and objects are run-scoped and cleaned up in afterAll.
 */
import { randomUUID } from "node:crypto";
import { gzipSync } from "node:zlib";
import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  deleteReplayObjects,
  presignReplayGet,
  replayStorageConfigured,
} from "@/lib/replay/storage";
import { localStack } from "../helpers/local-stack";

const stack = localStack();

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const runId = Date.now().toString(36);
const DOMAIN_ENABLED = `replay-on-${runId}.test`;
const DOMAIN_DISABLED = `replay-off-${runId}.test`;
const DOMAIN_UNREGISTERED = `replay-none-${runId}.test`;

let db: SupabaseClient;
let enabledSiteId: string;
let disabledSiteId: string;
let POST: typeof import("@/app/api/replay/route").POST;
let GET: typeof import("@/app/api/replay/route").GET;

const recordingIds: string[] = [];
const storedPaths: string[] = [];

function replayGetRequest(site?: string): NextRequest {
  const qs = site ? `?site=${encodeURIComponent(site)}` : "";
  return new NextRequest(`http://localhost:3000/api/replay${qs}`);
}

function replayPostRequest(params: Record<string, string>, body: Uint8Array): NextRequest {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost:3000/api/replay?${qs}`, {
    method: "POST",
    body: body as unknown as BodyInit,
    headers: {
      "user-agent": CHROME_UA,
      "x-forwarded-for": "203.0.113.77",
      "x-vercel-ip-country": "NL",
    },
  });
}

describe.skipIf(!replayStorageConfigured())("replay ingest (docs/redesign/24)", () => {
  beforeAll(async () => {
    if (!stack) throw new Error("no supabase stack for integration tests");
    process.env.NEXT_PUBLIC_SUPABASE_URL = stack.url;
    process.env.SUPABASE_SECRET_KEY = stack.serviceKey;
    process.env.SUPABASE_SERVICE_ROLE_KEY = stack.serviceKey;
    db = createClient(stack.url, stack.serviceKey, { auth: { persistSession: false } });

    const { data: enabledSite, error: e1 } = await db
      .from("sites")
      .insert({
        name: "replay enabled test site",
        domains: [DOMAIN_ENABLED],
        settings: { replay_enabled: true, replay_sample_rate: 0.5 },
      })
      .select("id")
      .single();
    if (e1) throw new Error(e1.message);
    enabledSiteId = enabledSite.id;

    const { data: disabledSite, error: e2 } = await db
      .from("sites")
      .insert({
        name: "replay disabled test site",
        domains: [DOMAIN_DISABLED],
        settings: { replay_enabled: false },
      })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    disabledSiteId = disabledSite.id;

    ({ POST, GET } = await import("@/app/api/replay/route"));
  });

  afterAll(async () => {
    if (!db) return;
    if (recordingIds.length > 0) {
      await db.from("replay_chunks").delete().in("recording_id", recordingIds);
      await db.from("replay_recordings").delete().in("id", recordingIds);
    }
    if (enabledSiteId) await db.from("sites").delete().eq("id", enabledSiteId);
    if (disabledSiteId) await db.from("sites").delete().eq("id", disabledSiteId);
    if (storedPaths.length > 0) await deleteReplayObjects(storedPaths);
  });

  it("GET config: unregistered site is off", async () => {
    const res = await GET(replayGetRequest(DOMAIN_UNREGISTERED));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ on: false, sample: 0, maskText: false });
  });

  it("GET config: registered+enabled site reflects settings", async () => {
    const res = await GET(replayGetRequest(DOMAIN_ENABLED));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ on: true, sample: 0.5, maskText: false });
  });

  it("GET config: disabled site is off", async () => {
    const res = await GET(replayGetRequest(DOMAIN_DISABLED));
    expect(res.status).toBe(200);
    // A resolved (registered) site always reports its real settings; only
    // "on" is gated by enabled && storage configured. Sample rate here is
    // the untouched default (1) since the fixture only overrides `enabled`.
    expect(await res.json()).toEqual({ on: false, sample: 1, maskText: false });
  });

  let happyRid: string;
  let firstChunkBytes: number;

  it("POST happy path: stores a chunk and registers the recording", async () => {
    happyRid = randomUUID();
    const payload = Buffer.from(
      JSON.stringify([{ type: 2, data: { x: 1 }, timestamp: Date.now() }]),
    );
    const gz = gzipSync(payload);
    firstChunkBytes = gz.byteLength;

    const res = await POST(
      replayPostRequest({ site: DOMAIN_ENABLED, rid: happyRid, seq: "0", pc: "1", gz: "1" }, gz),
    );
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
    recordingIds.push(happyRid);

    const { data: rec } = await db
      .from("replay_recordings")
      .select("*")
      .eq("id", happyRid)
      .single();
    expect(rec.status).toBe("active");
    expect(rec.chunk_count).toBe(1);
    expect(Number(rec.bytes)).toBe(firstChunkBytes);
    // Default retention is 30 days (settings only override enabled/sample_rate).
    const expectedExpiry = Date.now() + 30 * 86400000;
    expect(Math.abs(new Date(rec.expires_at).getTime() - expectedExpiry)).toBeLessThan(60_000);

    const { data: chunk } = await db
      .from("replay_chunks")
      .select("*")
      .eq("recording_id", happyRid)
      .eq("seq", 0)
      .single();
    expect(chunk).toBeTruthy();
    storedPaths.push(chunk.storage_path);

    const url = await presignReplayGet(chunk.storage_path);
    const fetched = await fetch(url);
    const fetchedBuf = Buffer.from(await fetched.arrayBuffer());
    expect(fetchedBuf.equals(gz)).toBe(true);
  });

  it("duplicate seq re-POST acks without double-counting", async () => {
    const payload = Buffer.from(
      JSON.stringify([{ type: 2, data: { x: 1 }, timestamp: Date.now() }]),
    );
    const gz = gzipSync(payload);
    const res = await POST(
      replayPostRequest({ site: DOMAIN_ENABLED, rid: happyRid, seq: "0", pc: "1", gz: "1" }, gz),
    );
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });

    const { data: rec } = await db
      .from("replay_recordings")
      .select("chunk_count")
      .eq("id", happyRid)
      .single();
    expect(rec!.chunk_count).toBe(1);
  });

  it("disabled site drops the chunk and stores nothing", async () => {
    const rid = randomUUID();
    const body = Buffer.from(JSON.stringify([{ type: 2 }]));
    const res = await POST(
      replayPostRequest({ site: DOMAIN_DISABLED, rid, seq: "0", pc: "1", gz: "0" }, body),
    );
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, dropped: "disabled" });

    const { data: rec } = await db
      .from("replay_recordings")
      .select("id")
      .eq("id", rid)
      .maybeSingle();
    expect(rec).toBeNull();
  });

  it("seq out of range -> 400", async () => {
    const res = await POST(
      replayPostRequest(
        { site: DOMAIN_ENABLED, rid: randomUUID(), seq: "501", pc: "1", gz: "0" },
        Buffer.from("x"),
      ),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad request" });
  });

  it("bad rid -> 400", async () => {
    const res = await POST(
      replayPostRequest(
        { site: DOMAIN_ENABLED, rid: "not-a-uuid", seq: "0", pc: "1", gz: "0" },
        Buffer.from("x"),
      ),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad request" });
  });

  it("body over 5MB -> 413", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    const res = await POST(
      replayPostRequest(
        { site: DOMAIN_ENABLED, rid: randomUUID(), seq: "0", pc: "1", gz: "0" },
        big,
      ),
    );
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "Payload too large" });
  });

  it("second chunk updates chunk_count and page_count", async () => {
    const payload2 = Buffer.from(
      JSON.stringify([{ type: 3, data: { y: 2 }, timestamp: Date.now() }]),
    );
    const gz2 = gzipSync(payload2);
    const res = await POST(
      replayPostRequest({ site: DOMAIN_ENABLED, rid: happyRid, seq: "1", pc: "3", gz: "1" }, gz2),
    );
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });

    const { data: chunk } = await db
      .from("replay_chunks")
      .select("storage_path")
      .eq("recording_id", happyRid)
      .eq("seq", 1)
      .single();
    storedPaths.push(chunk!.storage_path);

    const { data: rec } = await db
      .from("replay_recordings")
      .select("chunk_count, page_count, bytes")
      .eq("id", happyRid)
      .single();
    expect(rec!.chunk_count).toBe(2);
    expect(rec!.page_count).toBe(3);
    expect(Number(rec!.bytes)).toBe(firstChunkBytes + gz2.byteLength);
  });
});
