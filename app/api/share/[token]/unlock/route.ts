import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/utils/supabase/admin";
import { shareCookieName, shareCookieValue, type ShareRow } from "@/lib/analytics/share";

/**
 * POST /api/share/:token/unlock - verify a share password and set a scoped,
 * unforgeable httpOnly cookie (7 days). The cookie value is derived from the
 * bcrypt hash (never exposed), so it can't be crafted without knowing the
 * password. Token entropy + bcrypt cost are the brute-force protection.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { password } = ((await req.json().catch(() => ({}))) as { password?: string }) ?? {};
  if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: share } = await admin
    .from("share_tokens")
    .select("token, password_hash")
    .eq("token", token)
    .maybeSingle<Pick<ShareRow, "token" | "password_hash">>();
  if (!share || !share.password_hash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(password, share.password_hash);
  if (!ok) return NextResponse.json({ error: "Wrong password" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(shareCookieName(token), shareCookieValue(share.password_hash, token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
