"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, ensureUserRow, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** 收藏 / 取消收藏一个师傅（只给登录用户） */
export async function setFavorite(
  providerId: string,
  on: boolean,
): Promise<{ ok: boolean; favorited?: boolean; needLogin?: boolean; error?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(providerId)) return { ok: false, error: "参数不对" };
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false, needLogin: true };

  const admin = createAdminClient();
  if (on) {
    await ensureUserRow(user);
    const { error } = await admin
      .from("favorites")
      .upsert({ user_id: user.id, provider_id: providerId }, { onConflict: "user_id,provider_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: dbErrorMessage("setFavorite", error) };
  } else {
    const { error } = await admin.from("favorites").delete().eq("user_id", user.id).eq("provider_id", providerId);
    if (error) return { ok: false, error: dbErrorMessage("setFavorite", error) };
  }
  revalidatePath("/me");
  return { ok: true, favorited: on };
}
