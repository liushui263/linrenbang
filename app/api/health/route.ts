import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 站长排查用：只返回“有没有配置 / 能不能连上”，不返回任何 key 或数据。
 * 打开 https://你的网站/api/health 看结果。
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: url ? (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ? "ok" : "格式不像 https://xxxx.supabase.co") : "缺少",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "有" : "缺少",
    SUPABASE_SERVICE_ROLE_KEY: !service
      ? "缺少"
      : service.startsWith("sb_publishable_")
        ? "填错了：这是 publishable key，要填 secret / service_role key"
        : service === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? "填错了：和 anon key 一样，要填 service_role key"
          : "有",
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS ? "有" : "缺少",
  };

  const checks: Record<string, string> = {};
  if (url && service) {
    const admin = createAdminClient();
    const tables = ["users", "providers", "recommendations", "ad_placements", "reports", "claim_requests", "contact_reveals"];
    for (const t of tables) {
      const { error } = await admin.from(t).select("*", { count: "exact", head: true });
      checks[`表 ${t}`] = error ? `出错：${error.code || ""} ${error.message || "（无信息，多半是 key 不对或连不上）"}` : "ok";
    }
    const { error: colErr } = await admin.from("providers").select("custom_service").limit(1);
    checks["0002 迁移（custom_service 列）"] = colErr ? `没运行：${colErr.message}` : "ok";
    const { error: cpErr } = await admin.from("providers").select("contact_methods, contact_pref").limit(1);
    checks["0003 迁移（联系方式偏好）"] = cpErr ? `没运行：${cpErr.message}` : "ok";
    const { data: buckets, error: bErr } = await admin.storage.listBuckets();
    if (bErr) checks["图片存储"] = `出错：${bErr.message}`;
    else {
      const names = (buckets ?? []).map((b) => b.name);
      checks["图片存储 avatars"] = names.includes("avatars") ? "ok" : "缺少（重新运行 0001 SQL 最后几行）";
      checks["图片存储 licenses"] = names.includes("licenses") ? "ok" : "缺少（重新运行 0001 SQL 最后几行）";
    }
  }
  const ok = Object.values(env).every((v) => v === "ok" || v === "有") && Object.values(checks).every((v) => v === "ok");
  return NextResponse.json({ ok, env, checks }, { headers: { "Cache-Control": "no-store" } });
}
