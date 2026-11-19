import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** 当前登录用户收藏了哪些师傅（只返回 id），给名片上的收藏按钮用 */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ signedIn: false, ids: [] }, { headers: { "Cache-Control": "no-store" } });
  const supabase = await createClient();
  const { data, error } = await supabase.from("favorites").select("provider_id").eq("user_id", user.id);
  if (error) console.error("[favorites GET]", error.code, error.message);
  return NextResponse.json(
    { signedIn: true, ids: (data ?? []).map((r) => r.provider_id as string) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
