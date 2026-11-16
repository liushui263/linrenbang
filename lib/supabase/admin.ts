import "server-only";
import { createClient } from "@supabase/supabase-js";

/** service role 客户端：绕过 RLS，只能在服务端用，绝不进前端 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
