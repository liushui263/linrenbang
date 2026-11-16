"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { toE164 } from "@/lib/phone";
import { parseProviderForm } from "@/lib/provider-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadImage } from "@/lib/uploads";
import type { FormState } from "./recommend";

/** 7.1 商家自助注册：Google 登录 → 填表 → pending */
export async function registerMerchant(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先用 Google 登录" };
  const admin = createAdminClient();
  const { data: existing } = await admin.from("providers").select("id").eq("owner_user_id", user.id).maybeSingle();
  if (existing) return { error: "这个账号已经有一个商家了，一个账号只能注册一个商家" };

  const parsed = parseProviderForm(fd, true);
  if (!parsed.data) return { error: parsed.error };

  const avatar = await uploadImage(fd.get("avatar"), "avatars", user.id);
  if (avatar.error) return { error: avatar.error };
  const license = await uploadImage(fd.get("license_photo"), "licenses", user.id);
  if (license.error) return { error: license.error };

  const { error } = await admin.from("providers").insert({
    ...parsed.data,
    owner_user_id: user.id,
    submitted_by_user_id: user.id,
    source: "self_registered",
    is_claimed: true,
    status: "pending",
    avatar_url: avatar.value ?? null,
    license_photo_url: license.value ?? null,
    license_status: license.value ? "doc_uploaded" : parsed.data.is_licensed ? "self_claimed" : "unclaimed",
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "这个电话已经登记过了。如果是你的店被邻居代录入了，请去“认领我的店”。" };
    }
    return { error: "提交失败，请稍后再试" };
  }
  redirect("/merchant/register?submitted=1");
}

/** /merchant 编辑名片（电话不可改） */
export async function updateMerchant(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };
  const admin = createAdminClient();
  const { data: mine } = await admin.from("providers").select("id, status").eq("owner_user_id", user.id).maybeSingle();
  if (!mine) return { error: "没找到你的商家" };
  const parsed = parseProviderForm(fd, false);
  if (!parsed.data) return { error: parsed.error };
  const { phone: _phone, ...rest } = parsed.data;
  void _phone;

  const avatar = await uploadImage(fd.get("avatar"), "avatars", user.id);
  if (avatar.error) return { error: avatar.error };
  const license = await uploadImage(fd.get("license_photo"), "licenses", user.id);
  if (license.error) return { error: license.error };

  const update: Record<string, unknown> = { ...rest };
  if (avatar.value) update.avatar_url = avatar.value;
  if (license.value) {
    update.license_photo_url = license.value;
    update.license_status = "doc_uploaded";
  }
  const { error } = await admin.from("providers").update(update).eq("id", mine.id);
  if (error) return { error: "保存失败，请稍后再试" };
  revalidatePath("/merchant");
  revalidatePath(`/provider/${mine.id}`);
  return { ok: "已保存" };
}

/** 13.3 一键切换“近期排期已满 · 暂停接单” */
export async function setPaused(paused: boolean): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "请先登录" };
  const admin = createAdminClient();
  const { data: mine } = await admin.from("providers").select("id, status").eq("owner_user_id", user.id).maybeSingle();
  if (!mine || !["active", "paused"].includes(mine.status)) return { ok: false, error: "审核通过后才能切换" };
  await admin.from("providers").update({ status: paused ? "paused" : "active" }).eq("id", mine.id);
  revalidatePath("/merchant");
  revalidatePath("/");
  return { ok: true };
}

/** 7.4 商家申请下架 */
export async function requestTakedown(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };
  const admin = createAdminClient();
  const { data: mine } = await admin.from("providers").select("id").eq("owner_user_id", user.id).maybeSingle();
  if (!mine) return { error: "没找到你的商家" };
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300) || "商家本人申请下架";
  await admin.from("reports").insert({ target_type: "provider", target_id: mine.id, kind: "takedown", reason, reporter_user_id: user.id });
  return { ok: "已提交下架申请，站长核实后处理" };
}

/** 7.2 认领：Google 登录 → 填店的电话 → 站长电话/微信核实后通过 */
export async function requestClaim(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先用 Google 登录" };
  const phone = toE164(String(fd.get("phone") ?? ""));
  if (!phone) return { error: "电话格式不对" };
  const note = String(fd.get("contact_note") ?? "").trim().slice(0, 200);
  if (note.length < 2) return { error: "请留一个站长能联系到你的方式（微信号或方便的时间）" };

  const admin = createAdminClient();
  const { data: owned } = await admin.from("providers").select("id").eq("owner_user_id", user.id).maybeSingle();
  if (owned) return { error: "这个账号已经有一个商家了" };
  const { data: p } = await admin.from("providers").select("id, owner_user_id").eq("phone", phone).maybeSingle();
  if (!p) return { error: "没找到这个电话登记的店。没登记过的话，直接去“商家免费注册”。" };
  if (p.owner_user_id) return { error: "这家店已经被认领了。如果有误，请举报/纠错或联系站长。" };

  const { error } = await admin
    .from("claim_requests")
    .upsert({ provider_id: p.id, user_id: user.id, contact_note: note, status: "pending" }, { onConflict: "provider_id,user_id" });
  if (error) return { error: "提交失败，请稍后再试" };
  return { ok: "已提交认领申请。站长会通过电话或微信跟你核实，一般 24 小时内处理。" };
}
