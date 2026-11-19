import "server-only";
import { revalidatePath } from "next/cache";
import { dbErrorMessage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// 注意：这里的函数信任传进来的 userId，只能在服务端（Server Action 校验过登录之后）调用，
// 不能放进 "use server" 文件，否则前端可以直接调用。

/**
 * 写一条回答（推荐一位师傅）。给 /ask/[id] 的回答框和 /recommend 的“添加新师傅”共用。
 * usedIt=true 时同时生成一条 pending 推荐（站长通过后算进邻居推荐数）；
 * 已经推荐过这位师傅的，不覆盖原来的推荐。
 */
export async function insertAskAnswer(input: {
  askId: string;
  providerId: string;
  userId: string;
  area: string;
  comment: string;
  usedIt: boolean;
  /** 调用方已经写好的推荐（/recommend 流程） */
  recommendationId?: string | null;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();
  let recommendationId = input.recommendationId ?? null;
  if (input.usedIt && !recommendationId) {
    const { data: existing } = await admin
      .from("recommendations")
      .select("id")
      .eq("provider_id", input.providerId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (existing) {
      recommendationId = existing.id;
    } else {
      const { data: rec, error } = await admin
        .from("recommendations")
        .insert({
          provider_id: input.providerId,
          user_id: input.userId,
          recommender_area: input.area,
          comment: input.comment,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) return { error: dbErrorMessage("insertAskAnswer.rec", error) };
      recommendationId = rec.id;
    }
  }
  const { error } = await admin.from("ask_answers").insert({
    ask_id: input.askId,
    provider_id: input.providerId,
    user_id: input.userId,
    recommender_area: input.area,
    comment: input.comment,
    used_it: input.usedIt,
    recommendation_id: recommendationId,
    status: "active",
  });
  if (error) {
    if (error.code === "23505") return { error: "你已经在这条提问下推荐过这位师傅了" };
    return { error: dbErrorMessage("insertAskAnswer", error) };
  }
  revalidatePath("/");
  revalidatePath("/ask");
  revalidatePath(`/ask/${input.askId}`);
  return {};
}

/** 能不能回答这条提问：提问还开着、不是自己的提问 */
export async function checkCanAnswer(askId: string, userId: string): Promise<string | null> {
  const { data: ask } = await createAdminClient().from("asks").select("status, user_id").eq("id", askId).maybeSingle();
  if (!ask || ask.status === "hidden") return "这条提问已经不在了";
  if (ask.status !== "open") return "发帖人已经找到师傅，这条提问关闭了";
  if (ask.user_id === userId) return "这是你自己的提问";
  return null;
}

