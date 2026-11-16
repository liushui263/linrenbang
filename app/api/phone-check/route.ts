import { NextResponse, type NextRequest } from "next/server";
import { toE164 } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** 7.2 电话查重：只返回“已存在 + 商家 id（仅当可公开展示）”或“不存在”，不返回其他字段 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = toE164(body.phone ?? "");
  if (!phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.from("providers").select("id, status").eq("phone", phone).maybeSingle();
  if (!data) return NextResponse.json({ exists: false }, { headers: { "Cache-Control": "no-store" } });
  const visible = data.status === "active" || data.status === "paused";
  return NextResponse.json(
    { exists: true, providerId: visible ? data.id : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
