"use server";

import { redirect } from "next/navigation";
import { ensureUserRow } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** 邮箱验证码在浏览器里验证成功后调用：读 cookie 里的新会话，补 public.users 那一行 */
export async function afterEmailLogin(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await ensureUserRow(user);
  return { ok: true };
}
