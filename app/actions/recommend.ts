"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { dbErrorMessage, ensureUserRow, getCurrentUser } from "@/lib/auth";
import { parseProviderForm, parseRecommendationForm } from "@/lib/provider-form";
import { checkCanAnswer, insertAskAnswer } from "@/lib/ask-answer";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ANON_CLAIM_COOKIE,
  ANON_RECS_PER_DAY,
  CONTACT_IMAGE_MAX_BYTES,
  HONEYPOT_FIELD,
  addClaimToken,
  customServiceFrom,
  guessCategory,
  parseAnonForm,
} from "@/lib/anon-recommend";
import { hashClaimToken, newClaimToken, visitorIpHash } from "@/lib/anon-server";
import { getVisitorLocation } from "@/lib/location";
import { uploadImage } from "@/lib/uploads";
import { OTHER_CATEGORY } from "@/constants/categories";

export type FormState =
  | {
      error?: string;
      ok?: string;
      fieldErrors?: Record<string, string>;
      /** 字段错误下面附带的链接，如“去认领我的店” */
      fieldLinks?: Record<string, { href: string; label: string }>;
    }
  | undefined;

/** 从求推荐页进来的（/recommend?ask=...）：表单里带 ask_id，提交后顺带写一条回答 */
function askIdOf(fd: FormData): string | null {
  const id = String(fd.get("ask_id") ?? "");
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

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
  if (!parsed.data) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
  const askId = askIdOf(fd);
  if (askId) {
    const blocked = await checkCanAnswer(askId, user.id);
    if (blocked) return { error: blocked };
  }
  await ensureUserRow(user);

  const { data: rec, error } = await admin
    .from("recommendations")
    .upsert({ provider_id: providerId, user_id: user.id, ...parsed.data, status: "pending" }, { onConflict: "provider_id,user_id" })
    .select("id")
    .single();
  if (error) return { error: dbErrorMessage("submitRecommendation", error) };
  revalidatePath(`/provider/${providerId}`);
  if (askId) {
    const res = await insertAskAnswer({
      askId,
      providerId,
      userId: user.id,
      area: parsed.data.recommender_area,
      comment: parsed.data.comment,
      usedIt: true,
      recommendationId: rec.id,
    });
    if (res.error) return { error: res.error };
    redirect(`/ask/${askId}?answered=1`);
  }
  return { ok: "已提交，站长审核通过后就会显示。谢谢你帮邻居！" };
}

/** 7.2 邻居代录入：新商家 pending + 推荐 pending */
export async function submitNeighborProvider(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };
  const p = parseProviderForm(fd, true);
  const r = parseRecommendationForm(fd);
  if (!p.data || !r.data) {
    return { error: p.error ?? r.error, fieldErrors: { ...p.fieldErrors, ...r.fieldErrors } };
  }
  const askId = askIdOf(fd);
  if (askId) {
    const blocked = await checkCanAnswer(askId, user.id);
    if (blocked) return { error: blocked };
  }
  await ensureUserRow(user);

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("providers")
    .insert({ ...p.data, status: "pending", source: "neighbor_submitted", submitted_by_user_id: user.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { fieldErrors: { phone: "这个电话已经有人登记过了，请回到上一步查一下" } };
    return { error: dbErrorMessage("submitNeighborProvider", error) };
  }
  const { data: rec, error: recError } = await admin
    .from("recommendations")
    .insert({ provider_id: created.id, user_id: user.id, ...r.data, status: "pending" })
    .select("id")
    .single();
  if (recError) return { error: dbErrorMessage("submitNeighborProvider.rec", recError) };
  if (askId) {
    // 新师傅还在审核中：回答先显示名字，站长通过后才显示电话和微信
    const res = await insertAskAnswer({
      askId,
      providerId: created.id,
      userId: user.id,
      area: r.data.recommender_area,
      comment: r.data.comment,
      usedIt: true,
      recommendationId: rec.id,
    });
    if (res.error) return { error: res.error };
    redirect(`/ask/${askId}?answered=1`);
  }
  redirect("/recommend?submitted=1");
}

/**
 * 冷启动期的快速推荐（不用登录）：只填 名字 / 电话 / 服务内容。
 * - 按电话查重：已有这位师傅 → 只加一条推荐；没有 → 新建商家（pending）+ 推荐（pending），站长审核后展示
 * - 防刷：隐藏输入框（机器人会填）+ 同一 IP 24 小时最多 5 条；同一 IP 给同一位师傅再推荐 = 修改原来那条
 * - 发一个认领码放在这个浏览器的 cookie 里，以后登录可以把推荐认到自己名下
 * 从 /recommend?provider=... 进来时带 provider_id，只需要填服务内容
 */
export async function submitAnonRecommendation(_prev: FormState, fd: FormData): Promise<FormState> {
  const done = (pid?: string) => redirect(`/recommend?submitted=1&anon=1${pid ? `&p=${pid}` : ""}`);
  // 机器人：假装成功，什么都不写
  if (String(fd.get(HONEYPOT_FIELD) ?? "").trim()) done();

  const user = await getCurrentUser().catch(() => null);
  const givenProviderId = String(fd.get("provider_id") ?? "");
  const hasProvider = /^[0-9a-f-]{36}$/i.test(givenProviderId);
  const parsed = parseAnonForm(fd, !hasProvider);
  if (!parsed.data) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
  const { name, contact, service } = parsed.data;
  const { phone } = contact;

  const admin = createAdminClient();
  const ipHash = await visitorIpHash();
  if (!user) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await admin
      .from("recommendations")
      .select("id", { count: "exact", head: true })
      .eq("anon_ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= ANON_RECS_PER_DAY) {
      return { error: "今天推荐得有点多了，谢谢你！明天再来，或者登录后继续推荐。" };
    }
  } else {
    await ensureUserRow(user);
  }

  const loc = await getVisitorLocation();
  // 查重：有电话按电话（全站唯一）；只有微信号就按微信号
  const findExisting = async () => {
    if (phone) return (await admin.from("providers").select("id, status, owner_user_id").eq("phone", phone).maybeSingle()).data;
    if (contact.wechat) {
      const { data } = await admin.from("providers").select("id, status, owner_user_id").eq("wechat_id", contact.wechat).limit(1);
      return data?.[0] ?? null;
    }
    return null;
  };
  let provider: { id: string; status: string; owner_user_id: string | null } | null = null;
  if (hasProvider) {
    const { data } = await admin.from("providers").select("id, status, owner_user_id").eq("id", givenProviderId).maybeSingle();
    provider = data;
    if (!provider || !["active", "paused"].includes(provider.status)) return { error: "没找到这个商家" };
  } else {
    provider = await findExisting();
    if (!provider) {
      // 名片 / 广告截图 / 二维码：浏览器里已经压缩过，这里再卡一下大小
      let contactImage: string | null = null;
      const file = fd.get("contact_image");
      if (file && typeof file !== "string" && file.size > 0) {
        if (file.size > CONTACT_IMAGE_MAX_BYTES) return { fieldErrors: { contact: "图片太大了，请重新选一次" } };
        const up = await uploadImage(file, "avatars", "contact");
        if (up.error) return { fieldErrors: { contact: up.error } };
        contactImage = up.value ?? null;
      }
      if (!phone && !contact.wechat && !contact.note && !contactImage) {
        return { fieldErrors: { contact: "请留一个能找到他的方式：电话、微信、邮箱、网址，或者传一张名片/广告截图" } };
      }
      const category = guessCategory(`${name} ${service}`);
      const contact_methods = [...(phone ? ["phone", "sms"] : []), ...(contact.wechat ? ["wechat"] : [])];
      const { data: created, error } = await admin
        .from("providers")
        .insert({
          name,
          phone,
          wechat_id: contact.wechat,
          contact_note: contact.note,
          contact_image_url: contactImage,
          contact_methods,
          contact_pref: contact_methods[0] ?? "phone",
          category,
          categories: [category],
          custom_service: category === OTHER_CATEGORY ? customServiceFrom(service) : null,
          city_id: loc.city.id,
          service_areas: loc.area ? [loc.area] : [],
          status: "pending",
          source: "neighbor_anonymous",
          submitted_by_user_id: user?.id ?? null,
        })
        .select("id, status, owner_user_id")
        .single();
      if (error?.code === "23505") provider = await findExisting(); // 同时有人登记了同一个电话
      else if (error) return { error: dbErrorMessage("submitAnonRecommendation", error) };
      else provider = created;
    }
  }
  if (!provider) return { error: "提交没有成功，请再试一次" };
  // 被站长隐藏的商家：不再收推荐，但也不告诉对方（免得被用来试探）
  if (provider.status === "hidden") done();
  if (user && provider.owner_user_id === user.id) return { error: "商家不能给自己写推荐" };

  const area = loc.area ?? loc.city.zh;
  const rec = { recommender_area: area, comment: service, service_item: null, cost_approx: null, status: "pending" };
  if (user) {
    const { error } = await admin
      .from("recommendations")
      .upsert({ provider_id: provider.id, user_id: user.id, ...rec }, { onConflict: "provider_id,user_id" });
    if (error) return { error: dbErrorMessage("submitAnonRecommendation.rec", error) };
  } else {
    const store = await cookies();
    // 同一个人（同一 IP）给同一位师傅再推荐一次：改原来那条，不重复计数
    const { data: mine } = await admin
      .from("recommendations")
      .select("id")
      .eq("provider_id", provider.id)
      .eq("anon_ip_hash", ipHash)
      .is("user_id", null)
      .maybeSingle();
    const token = newClaimToken();
    const row = { ...rec, claim_token_hash: hashClaimToken(token) };
    const { error } = mine
      ? await admin.from("recommendations").update(row).eq("id", mine.id)
      : await admin.from("recommendations").insert({ provider_id: provider.id, user_id: null, anon_ip_hash: ipHash, ...row });
    if (error) return { error: dbErrorMessage("submitAnonRecommendation.rec", error) };
    store.set(ANON_CLAIM_COOKIE, addClaimToken(store.get(ANON_CLAIM_COOKIE)?.value, token), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
    });
  }
  revalidatePath(`/provider/${provider.id}`);
  done(provider.id);
}
