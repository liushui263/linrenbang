"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { parseProviderForm, parseRecommendationForm } from "@/lib/provider-form";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string; ok?: string } | undefined;

/** 7.3 邻居写推荐：pending，站长通过后展示；一人一商家一条，可编辑；商家不能推荐自己 */
export async function submitRecommendation(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };
  const providerId = String(fd.get("provider_id") ?? "");
  const admin = createAdminClient();
  const { data: provider } = await admin
    .from("providers")
    .select("id, status, owner_user_id")
    .eq("id", providerId)
    .maybeSingle();
  if (!provider || !["active", "paused"].includes(provider.status)) return { error: "没找到这个商家" };
  if (provider.owner_user_id === user.id) return { error: "商家不能给自己写推荐" };

  const parsed = parseRecommendationForm(fd);
  if (!parsed.data) return { error: parsed.error };

  const { error } = await admin
    .from("recommendations")
    .upsert({ provider_id: providerId, user_id: user.id, ...parsed.data, status: "pending" }, { onConflict: "provider_id,user_id" });
  if (error) return { error: "提交失败，请稍后再试" };
  revalidatePath(`/provider/${providerId}`);
  return { ok: "已提交，站长审核通过后就会显示。谢谢你帮邻居！" };
}

/** 7.2 邻居代录入：新商家 pending + 推荐 pending */
export async function submitNeighborProvider(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };
  const p = parseProviderForm(fd, true);
  if (!p.data) return { error: p.error };
  const r = parseRecommendationForm(fd);
  if (!r.data) return { error: r.error };

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("providers")
    .insert({ ...p.data, status: "pending", source: "neighbor_submitted", submitted_by_user_id: user.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "这个电话已经有人登记过了，请回到上一步查一下" };
    return { error: "提交失败，请稍后再试" };
  }
  await admin.from("recommendations").insert({ provider_id: created.id, user_id: user.id, ...r.data, status: "pending" });
  redirect("/recommend?submitted=1");
}
