import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isBotUserAgent, isEventKind } from "@/lib/impact";
import { chicagoDateString } from "@/lib/rotation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ok = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * 推荐有回音：记一次“查看 / 一键拨号 / 复制微信”。
 * 不存 IP 和账号，只存哈希；同一访客同一天同一种事件只记 1 次。
 * 商家本人、写过这家推荐的人不计（自己看自己不算）。
 * 无论记没记上都返回 204，不影响页面。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return ok();

  let kind: unknown;
  try {
    kind = (await req.json())?.kind;
  } catch {
    return ok();
  }
  if (!isEventKind(kind)) return ok();

  const ua = req.headers.get("user-agent");
  if (isBotUserAgent(ua)) return ok();

  try {
    const admin = createAdminClient();
    const [{ data: p }, user] = await Promise.all([
      admin.from("providers").select("id, status, owner_user_id").eq("id", id).maybeSingle(),
      getCurrentUser().catch(() => null),
    ]);
    if (!p || (p.status !== "active" && p.status !== "paused")) return ok();

    if (user) {
      if (p.owner_user_id === user.id) return ok();
      const { count } = await admin
        .from("recommendations")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", id)
        .eq("user_id", user.id);
      if ((count ?? 0) > 0) return ok();
    }

    const salt = process.env.CONTACT_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || "linrenbang";
    const who = user ? `u:${user.id}` : `a:${clientIp(req)}:${ua}`;
    const visitorHash = createHash("sha256").update(`${salt}:impact:${who}`).digest("hex");

    await admin
      .from("provider_events")
      .upsert(
        { provider_id: id, kind, visitor_hash: visitorHash, day: chicagoDateString() },
        { onConflict: "provider_id,kind,visitor_hash,day", ignoreDuplicates: true },
      );
  } catch (e) {
    console.error("[provider event]", e);
  }
  return ok();
}
