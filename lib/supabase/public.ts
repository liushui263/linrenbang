import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 不带 cookie 的 anon 客户端：只读公开数据（和没登录的访客看到的一样）。
 * 用它的页面/图片不依赖访客 cookie，可以被 Vercel CDN 缓存，不用每次都重新跑。
 */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
