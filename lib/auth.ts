import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function isAdmin(userId: string | undefined | null): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}

/**
 * 确保 public.users 里有这个人。
 * 正常情况下注册时触发器会自动建；但如果站长是先用 Google 登录、后运行建表 SQL，
 * 触发器那时还不存在，users 里就缺这一行，后面写商家/推荐会因为外键失败。
 */
export async function ensureUserRow(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const meta = user.user_metadata ?? {};
  const name = String(meta.full_name ?? meta.name ?? (user.email ?? "").split("@")[0] ?? "").slice(0, 40) || null;
  const { error } = await createAdminClient()
    .from("users")
    .upsert({ id: user.id, email: user.email ?? null, display_name: name }, { onConflict: "id", ignoreDuplicates: true });
  if (error) console.error("ensureUserRow failed", error);
  return error;
}

/** 把数据库错误翻译成站长/用户看得懂的话，同时把原始错误写进 Vercel 日志 */
export function dbErrorMessage(
  where: string,
  error: { code?: string; message?: string; details?: string | null; hint?: string | null },
): string {
  console.error(`[${where}]`, error.code, error.message, error.details, error.hint);
  const msg = `${error.message ?? ""}`;
  if (/invalid api key|jwt|apikey|unauthorized/i.test(msg)) {
    return `网站的 Supabase key 配置不对（${where}）。站长请检查 Vercel 里的 SUPABASE_SERVICE_ROLE_KEY，然后重新部署`;
  }
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
    return `网站连不上 Supabase（${where}）。站长请检查 Vercel 里的 NEXT_PUBLIC_SUPABASE_URL`;
  }
  switch (error.code) {
    case "23505":
      return "这条信息已经存在了（电话或账号重复）";
    case "23503":
      return "账号信息不完整，请退出登录后重新登录一次再试";
    case "23514":
      return "有一项内容格式不对，请检查后再提交";
    case "22001":
      return "有一项内容太长了，请删短一点";
    case "42P01":
    case "PGRST205":
      return "网站数据库还没建好（站长需要先在 Supabase 运行建表 SQL）";
    case "42501":
      return "网站权限配置不对（站长请检查 SUPABASE_SERVICE_ROLE_KEY）";
    default:
      // 没有错误代码的一般是连不上 Supabase 或者 key 不对，把原始信息也显示出来方便排查
      return `提交失败（${where}：${error.code || "无代码"} ${(error.message ?? "").slice(0, 160)}）`;
  }
}
