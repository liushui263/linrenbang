import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { CONTACT_REVEALS_PER_HOUR } from "@/constants/site";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** 13.6：点按钮时才取电话和微信。只对 active 商家返回；paused 返回 { paused: true }；其他 404 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });

  const admin = createAdminClient();
  const { data: p } = await admin.from("providers").select("id, status, phone, wechat_id, contact_methods").eq("id", id).maybeSingle();
  if (!p || (p.status !== "active" && p.status !== "paused")) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  if (p.status === "paused") return NextResponse.json({ paused: true }, { headers: noStore });

  // 轻量限流：同一 IP 每小时最多 30 次（IP 只存哈希）
  const salt = process.env.CONTACT_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || "linrenbang";
  const ipHash = createHash("sha256").update(`${salt}:${clientIp(req)}`).digest("hex");
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("contact_reveals")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= CONTACT_REVEALS_PER_HOUR) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: noStore });
  }
  await admin.from("contact_reveals").insert({ ip_hash: ipHash, provider_id: p.id });

  // 只返回商家愿意公开的方式：电话 / 短信都用 phone，加微信用 wechat_id
  const methods: string[] = p.contact_methods ?? ["phone", "sms"];
  const phone = methods.includes("phone") || methods.includes("sms") ? p.phone : null;
  const wechat_id = methods.includes("wechat") ? p.wechat_id || null : null;
  return NextResponse.json({ phone, wechat_id }, { headers: noStore });
}
