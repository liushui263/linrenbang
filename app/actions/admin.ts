"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!isAdmin(user?.id)) notFound();
  return createAdminClient();
}

function done(providerId?: string) {
  revalidatePath("/admin");
  revalidatePath("/");
  if (providerId) revalidatePath(`/provider/${providerId}`);
}

const idOf = (fd: FormData) => {
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("bad id");
  return id;
};

/** 通过商家：数据库函数自动算创始名次（前 100，100 天）和分类名次 */
export async function approveProvider(fd: FormData) {
  const admin = await requireAdmin();
  const id = idOf(fd);
  const { error } = await admin.rpc("approve_provider", { p_id: id });
  if (error) throw new Error(error.message);
  done(id);
}

export async function hideProvider(fd: FormData) {
  const admin = await requireAdmin();
  const id = idOf(fd);
  await admin.from("providers").update({ status: "hidden" }).eq("id", id);
  done(id);
}

export async function approveRecommendation(fd: FormData) {
  const admin = await requireAdmin();
  const id = idOf(fd);
  const { data } = await admin.from("recommendations").update({ status: "active" }).eq("id", id).select("provider_id").single();
  done(data?.provider_id);
}

export async function hideRecommendation(fd: FormData) {
  const admin = await requireAdmin();
  const id = idOf(fd);
  const { data } = await admin.from("recommendations").update({ status: "hidden" }).eq("id", id).select("provider_id").single();
  done(data?.provider_id);
}

/** 处理举报：hide=1 时先隐藏被举报的商家/推荐（先隐藏再核实） */
export async function resolveReport(fd: FormData) {
  const admin = await requireAdmin();
  const id = idOf(fd);
  const hide = fd.get("hide") === "1";
  const { data: r } = await admin.from("reports").select("target_type, target_id").eq("id", id).single();
  if (r && hide) {
    const table = {
      provider: "providers",
      recommendation: "recommendations",
      ask: "asks",
      ask_answer: "ask_answers",
    }[r.target_type as string];
    if (table) await admin.from(table).update({ status: "hidden" }).eq("id", r.target_id);
    if (r.target_type === "ask" || r.target_type === "ask_answer") revalidatePath("/ask");
  }
  await admin.from("reports").update({ status: "resolved" }).eq("id", id);
  done(r?.target_type === "provider" ? r.target_id : undefined);
}

export async function approveClaim(fd: FormData) {
  const admin = await requireAdmin();
  const id = idOf(fd);
  const { data: c } = await admin.from("claim_requests").select("provider_id, user_id").eq("id", id).single();
  if (!c) return;
  const { data: owned } = await admin.from("providers").select("id").eq("owner_user_id", c.user_id).maybeSingle();
  if (owned) throw new Error("这个账号已经拥有一个商家");
  const { error } = await admin
    .from("providers")
    .update({ owner_user_id: c.user_id, is_claimed: true })
    .eq("id", c.provider_id)
    .is("owner_user_id", null);
  if (error) throw new Error(error.message);
  await admin.from("claim_requests").update({ status: "approved" }).eq("id", id);
  await admin.from("claim_requests").update({ status: "rejected" }).eq("provider_id", c.provider_id).eq("status", "pending");
  done(c.provider_id);
}

export async function rejectClaim(fd: FormData) {
  const admin = await requireAdmin();
  await admin.from("claim_requests").update({ status: "rejected" }).eq("id", idOf(fd));
  done();
}

/** 求推荐是先发后管：站长看到不对的（广告、留联系方式、自问自答）直接隐藏 */
export async function hideAsk(fd: FormData) {
  const admin = await requireAdmin();
  const id = idOf(fd);
  await admin.from("asks").update({ status: "hidden" }).eq("id", id);
  revalidatePath("/ask");
  revalidatePath(`/ask/${id}`);
  done();
}

export async function hideAskAnswer(fd: FormData) {
  const admin = await requireAdmin();
  const id = idOf(fd);
  const { data } = await admin.from("ask_answers").update({ status: "hidden" }).eq("id", id).select("ask_id").single();
  if (data) revalidatePath(`/ask/${data.ask_id}`);
  revalidatePath("/ask");
  done();
}
