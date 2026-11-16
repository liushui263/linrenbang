"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { dbErrorMessage, ensureUserRow, getCurrentUser } from "@/lib/auth";
import { validateForm } from "@/lib/validate";
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
  if (!parsed.data) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

  // 电话重复先查一下，直接提示在电话那一栏
  const { data: dup } = await admin.from("providers").select("id").eq("phone", parsed.data.phone).maybeSingle();
  if (dup) {
    return { fieldErrors: { phone: "这个电话已经登记过了。如果是邻居帮你登记的，请去“认领我的店”。" } };
  }

  const userErr = await ensureUserRow(user);
  if (userErr) return { error: dbErrorMessage("registerMerchant.ensureUser", userErr) };

  const avatar = await uploadImage(fd.get("avatar"), "avatars", user.id);
  if (avatar.error) return { fieldErrors: { avatar: avatar.error } };
  const license = await uploadImage(fd.get("license_photo"), "licenses", user.id);
  if (license.error) return { fieldErrors: { license_photo: license.error } };

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
      return { fieldErrors: { phone: "这个电话已经登记过了。如果是邻居帮你登记的，请去“认领我的店”。" } };
    }
    return { error: dbErrorMessage("registerMerchant", error) };
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
  if (!parsed.data) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
  const { phone: _phone, ...rest } = parsed.data;
  void _phone;

  const avatar = await uploadImage(fd.get("avatar"), "avatars", user.id);
  if (avatar.error) return { fieldErrors: { avatar: avatar.error } };
  const license = await uploadImage(fd.get("license_photo"), "licenses", user.id);
  if (license.error) return { fieldErrors: { license_photo: license.error } };

  const update: Record<string, unknown> = { ...rest };
  if (avatar.value) update.avatar_url = avatar.value;
  if (license.value) {
    update.license_photo_url = license.value;
    update.license_status = "doc_uploaded";
  }
  const { error } = await admin.from("providers").update(update).eq("id", mine.id);
  if (error) return { error: dbErrorMessage("updateMerchant", error) };
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
  const { error } = await admin
    .from("reports")
    .insert({ target_type: "provider", target_id: mine.id, kind: "takedown", reason, reporter_user_id: user.id });
  if (error) return { error: dbErrorMessage("requestTakedown", error) };
  return { ok: "已提交下架申请，站长核实后处理" };
}

/** 7.2 认领：Google 登录 → 填店的电话 → 站长电话/微信核实后通过 */
export async function requestClaim(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先用 Google 登录" };
  const fieldErrors = validateForm(fd, ["phone", "contact_note"]);
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const phone = toE164(String(fd.get("phone") ?? ""))!;
  const note = String(fd.get("contact_note") ?? "").trim().slice(0, 200);
  await ensureUserRow(user);

  const admin = createAdminClient();
  const { data: owned } = await admin.from("providers").select("id").eq("owner_user_id", user.id).maybeSingle();
  if (owned) return { error: "这个账号已经有一个商家了" };
  const { data: p } = await admin.from("providers").select("id, owner_user_id").eq("phone", phone).maybeSingle();
  if (!p) return { fieldErrors: { phone: "没找到这个电话登记的店。没登记过的话，直接去“商家免费注册”。" } };
  if (p.owner_user_id) return { error: "这家店已经被认领了。如果有误，请举报/纠错或联系站长。" };

  const { error } = await admin
    .from("claim_requests")
    .upsert({ provider_id: p.id, user_id: user.id, contact_note: note, status: "pending" }, { onConflict: "provider_id,user_id" });
  if (error) return { error: dbErrorMessage("requestClaim", error) };
  return { ok: "已提交认领申请。站长会通过电话或微信跟你核实，一般 24 小时内处理。" };
}
