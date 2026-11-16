import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** 服务端（Server Component / Server Action / Route Handler）用的 anon 客户端，带登录态 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 在 Server Component 里不能写 cookie，middleware 会刷新登录态
        }
      },
    },
  });
}
