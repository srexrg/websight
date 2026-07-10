import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";

/**
 * Session-replay object store (docs/redesign/24).
 *
 * This is the ONLY module in the codebase that talks to the replay blob store.
 * It speaks the raw S3 protocol over aws4fetch - PutObject, presigned GET,
 * DeleteObjects, bucket CORS - and never a vendor SDK. That is deliberate: the
 * cloud default is Cloudflare R2 (zero egress), but the same five env vars
 * (REPLAY_S3_ENDPOINT/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY/REGION) point at
 * MinIO, AWS S3, or Supabase Storage's S3 endpoint when self-hosting. Swapping
 * providers is a config change, not a code change.
 *
 * Callers (ingest, playback, retention) gate on replayStorageConfigured()
 * before invoking the async functions, which throw a clear error when the store
 * is not configured. URLs are path-style (`${endpoint}/${bucket}/${key}`) so an
 * account-scoped R2 endpoint works without virtual-host DNS. Error messages
 * carry S3 status codes and response bodies but never credentials.
 */

type ReplayEnv = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

function readEnv(): ReplayEnv | null {
  const endpoint = process.env.REPLAY_S3_ENDPOINT;
  const bucket = process.env.REPLAY_S3_BUCKET;
  const accessKeyId = process.env.REPLAY_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.REPLAY_S3_SECRET_ACCESS_KEY;
  const region = process.env.REPLAY_S3_REGION;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !region) {
    return null;
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey, region };
}

/** True when all five REPLAY_S3_* env vars are present. */
export function replayStorageConfigured(): boolean {
  return readEnv() !== null;
}

// Lazily built once from env; keyed by nothing - env does not change at runtime.
let cachedClient: { env: ReplayEnv; client: AwsClient } | null = null;

function ctx(): { env: ReplayEnv; client: AwsClient } {
  const env = readEnv();
  if (!env) throw new Error("replay storage not configured");
  if (!cachedClient || cachedClient.env.accessKeyId !== env.accessKeyId) {
    cachedClient = {
      env,
      client: new AwsClient({
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
        service: "s3",
        region: env.region,
      }),
    };
  }
  return cachedClient;
}

/** Object key for a recording chunk: `${siteId}/${recordingId}/${seq}.json[.gz]`. */
export function replayObjectPath(
  siteId: string,
  recordingId: string,
  seq: number,
  gz: boolean,
): string {
  return `${siteId}/${recordingId}/${seq}.json${gz ? ".gz" : ""}`;
}

// Path segments are uuids/ints, but encode the key anyway to be safe.
function objectUrl(env: ReplayEnv, path: string): string {
  return `${env.endpoint}/${env.bucket}/${encodeURI(path)}`;
}

/**
 * Sign a body-carrying request, then send it with plain fetch. client.fetch()
 * would wrap the body in a Request whose body becomes a ReadableStream; undici
 * then sends it with chunked transfer-encoding (no Content-Length) on some
 * connections, and R2 rejects that with 411 MissingContentLength. Handing the
 * raw body to fetch lets undici buffer it and set Content-Length itself.
 * aws4fetch signs the payload hash into the headers, so re-sending the
 * identical body keeps the signature valid.
 */
async function signedFetch(
  client: AwsClient,
  url: string,
  init: { method: string; headers: Record<string, string>; body: BodyInit },
): Promise<Response> {
  const signed = await client.sign(url, init);
  return fetch(signed.url, {
    method: init.method,
    headers: signed.headers,
    body: init.body,
  });
}

/** Store a chunk as application/octet-stream. Throws on any non-2xx response. */
export async function putReplayObject(
  path: string,
  body: Uint8Array | ArrayBuffer,
): Promise<void> {
  const { env, client } = ctx();
  const res = await signedFetch(client, objectUrl(env, path), {
    method: "PUT",
    headers: { "content-type": "application/octet-stream" },
    body: body as BodyInit,
  });
  if (!res.ok) {
    throw new Error(
      `replay put failed (${res.status}): ${await res.text().catch(() => "")}`,
    );
  }
}

/**
 * Query-signed GET URL for a chunk, valid for expiresSeconds (default 600).
 * The expiry rides on the X-Amz-Expires query param that aws4fetch folds into
 * the SigV4 query signature, so the returned URL is directly fetchable.
 */
export async function presignReplayGet(
  path: string,
  expiresSeconds = 600,
): Promise<string> {
  const { env, client } = ctx();
  const url = new URL(objectUrl(env, path));
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await client.sign(url.toString(), {
    method: "GET",
    aws: { signQuery: true },
  });
  return signed.url;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function contentMd5(body: string): string {
  return createHash("md5").update(body, "utf8").digest("base64");
}

/**
 * Delete objects via the S3 DeleteObjects (POST ?delete) batch API, at most
 * 1000 keys per request. No-op on an empty list. Throws on any failed batch.
 */
export async function deleteReplayObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { env, client } = ctx();
  for (let i = 0; i < paths.length; i += 1000) {
    const batch = paths.slice(i, i + 1000);
    const body =
      "<Delete><Quiet>true</Quiet>" +
      batch.map((k) => `<Object><Key>${xmlEscape(k)}</Key></Object>`).join("") +
      "</Delete>";
    const res = await signedFetch(client, `${env.endpoint}/${env.bucket}/?delete`, {
      method: "POST",
      headers: {
        "content-type": "application/xml",
        "content-md5": contentMd5(body),
      },
      body,
    });
    if (!res.ok) {
      throw new Error(
        `replay delete failed (${res.status}): ${await res.text().catch(() => "")}`,
      );
    }
  }
}

/**
 * Apply a bucket CORS policy allowing GET+HEAD from the given origins (the
 * player fetches chunks directly from the store via presigned URLs). Run once
 * via scripts/replay-cors.mts when provisioning a bucket.
 */
export async function putReplayBucketCors(origins: string[]): Promise<void> {
  const { env, client } = ctx();
  const rule =
    "<CORSRule>" +
    origins.map((o) => `<AllowedOrigin>${xmlEscape(o)}</AllowedOrigin>`).join("") +
    "<AllowedMethod>GET</AllowedMethod>" +
    "<AllowedMethod>HEAD</AllowedMethod>" +
    "<AllowedHeader>*</AllowedHeader>" +
    "<MaxAgeSeconds>3600</MaxAgeSeconds>" +
    "</CORSRule>";
  const body = `<CORSConfiguration>${rule}</CORSConfiguration>`;
  const res = await signedFetch(client, `${env.endpoint}/${env.bucket}/?cors`, {
    method: "PUT",
    headers: {
      "content-type": "application/xml",
      "content-md5": contentMd5(body),
    },
    body,
  });
  if (!res.ok) {
    throw new Error(
      `replay cors failed (${res.status}): ${await res.text().catch(() => "")}`,
    );
  }
}
