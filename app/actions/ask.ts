"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions/recommend";
import { ASKS_PER_DAY, parseAskForm, validateAnswerComment } from "@/lib/ask";
import { dbErrorMessage, ensureUserRow, getCurrentUser } from "@/lib/auth";
import { getVisitorLocation } from "@/lib/location";
import { checkCanAnswer, insertAskAnswer } from "@/lib/ask-answer";
import { createAdminClient } from "@/lib/supabase/admin";

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

function refresh(askId?: string) {
  revalidatePath("/");
  revalidatePath("/ask");
  if (askId) revalidatePath(`/ask/${askId}`);
}

/** 发求推荐：要登录；先发出去，事后管理；每人 24 小时最多 3 条 */
export async function createAsk(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };
  const loc = await getVisitorLocation();
  const parsed = parseAskForm(fd, loc.city.areas);
  if (!parsed.data) return { fieldErrors: parsed.fieldErrors };
  await ensureUserRow(user);

  const admin = createAdminClient();
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await admin
    .from("asks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("created_at", since);
  if ((count ?? 0) >= ASKS_PER_DAY) return { error: `24 小时内最多发 ${ASKS_PER_DAY} 条求推荐，明天再来吧` };

  const { data, error } = await admin
    .from("asks")
    .insert({ ...parsed.data, city_id: loc.city.id, user_id: user.id, status: "open" })
    .select("id")
    .single();
  if (error) return { error: dbErrorMessage("createAsk", error) };
  refresh();
  redirect(`/ask/${data.id}?posted=1`);
}

/** /ask/[id] 回答框：推荐一位已经在网站上的师傅 */
export async function answerAsk(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };
  const askId = String(fd.get("ask_id") ?? "");
  const providerId = String(fd.get("provider_id") ?? "");
  const comment = String(fd.get("comment") ?? "").trim();
  const usedIt = fd.get("used_it") === "on";
  if (!isId(askId)) return { error: "参数不对" };
  if (!isId(providerId)) return { fieldErrors: { provider_id: "先在上面搜一下，选一位师傅" } };
  const commentError = validateAnswerComment(comment);
  if (commentError) return { fieldErrors: { comment: commentError } };

  const blocked = await checkCanAnswer(askId, user.id);
  if (blocked) return { error: blocked };

  const admin = createAdminClient();
  const { data: provider } = await admin.from("providers").select("status, owner_user_id").eq("id", providerId).maybeSingle();
  if (!provider || !["active", "paused"].includes(provider.status)) return { fieldErrors: { provider_id: "没找到这位师傅，请重新选" } };
  if (provider.owner_user_id === user.id) return { error: "商家不能推荐自己" };

  await ensureUserRow(user);
  const loc = await getVisitorLocation();
  const area = loc.area ?? String(fd.get("area") ?? "");
  if (!loc.city.areas.includes(area)) return { fieldErrors: { area: "请选你住的片区" } };

  const res = await insertAskAnswer({ askId, providerId, userId: user.id, area, comment, usedIt });
  if (res.error) return { error: res.error };
  return { ok: usedIt ? "推荐好了！你的经历也会提交给站长，审核后算进师傅的邻居推荐数。" : "推荐好了，谢谢你帮邻居！" };
}

/** 发帖人关闭提问（已经找到了），可以选“最后找的是哪位” */
export async function closeAsk(fd: FormData) {
  const user = await getCurrentUser();
  const askId = String(fd.get("ask_id") ?? "");
  if (!user || !isId(askId)) return;
  const chosen = String(fd.get("chosen_provider_id") ?? "");
  const admin = createAdminClient();
  let chosenId: string | null = null;
  if (isId(chosen)) {
    const { data } = await admin.from("ask_answers").select("id").eq("ask_id", askId).eq("provider_id", chosen).limit(1);
    if (data?.length) chosenId = chosen;
  }
  await admin
    .from("asks")
    .update({ status: "closed", closed_at: new Date().toISOString(), chosen_provider_id: chosenId })
    .eq("id", askId)
    .eq("user_id", user.id)
    .eq("status", "open");
  refresh(askId);
}

/** 发帖人重新打开（关错了） */
export async function reopenAsk(fd: FormData) {
  const user = await getCurrentUser();
  const askId = String(fd.get("ask_id") ?? "");
  if (!user || !isId(askId)) return;
  await createAdminClient()
    .from("asks")
    .update({ status: "open", closed_at: null, chosen_provider_id: null })
    .eq("id", askId)
    .eq("user_id", user.id)
    .eq("status", "closed");
  refresh(askId);
}
