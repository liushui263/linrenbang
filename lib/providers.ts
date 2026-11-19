import "server-only";
import { after } from "next/server";
import { CATEGORY_IDS } from "@/constants/categories";
import { PAGE_SIZE, ROTATION_POOL_PER_CATEGORY } from "@/constants/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { chicagoDateString, chicagoDayBounds, dayIndexFor, pickDailyRotation, pickHomeRotation } from "@/lib/rotation";
import { expandSearchTerms, matchingCategoryIds } from "@/lib/search";
import { PUBLIC_PROVIDER_COLUMNS, type PublicProvider } from "@/lib/types";

export interface ListFilters {
  cityId: string;
  category?: string;
  /** 大类筛选：传一组细分类 id（category 优先） */
  categories?: string[];
  area?: string;
  q?: string;
  page?: number;
}

/** 某城市某分类的轮换池：active、创始有效期内、通过最早的 10 家（paused 自动退出） */
async function rotationPool(cityId: string, category: string): Promise<PublicProvider[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("providers")
    .select(PUBLIC_PROVIDER_COLUMNS)
    .eq("city_id", cityId)
    .eq("category", category)
    .eq("status", "active")
    .gt("founding_expires_at", new Date().toISOString())
    .order("founding_started_at", { ascending: true })
    .limit(ROTATION_POOL_PER_CATEGORY);
  return (data ?? []) as unknown as PublicProvider[];
}

/** 今日轮换：传 category 返回该分类的 2 家；不传返回首页的 2 家 */
export async function getTodayRotation(cityId: string, category?: string): Promise<PublicProvider[]> {
  const date = chicagoDateString();
  const dayIndex = dayIndexFor(date);

  if (category) {
    const picked = pickDailyRotation(await rotationPool(cityId, category), dayIndex);
    recordRotationLazily(cityId, "category_rotation", category, picked, date);
    return picked;
  }

  const perCategory = await Promise.all(
    CATEGORY_IDS.map(async (c) => pickDailyRotation(await rotationPool(cityId, c), dayIndex)),
  );
  const picked = pickHomeRotation(perCategory, dayIndex);
  recordRotationLazily(cityId, "home_rotation", null, picked, date);
  return picked;
}

/** 大类页的今日轮换：从这个大类的几个细分类里各取轮换池，规则同首页（只展示，不写 ad_placements） */
export async function getGroupRotation(cityId: string, categoryIds: string[]): Promise<PublicProvider[]> {
  const dayIndex = dayIndexFor(chicagoDateString());
  const perCategory = await Promise.all(
    categoryIds.map(async (c) => pickDailyRotation(await rotationPool(cityId, c), dayIndex)),
  );
  return pickHomeRotation(perCategory, dayIndex);
}

/** 13.1 第 5 步：当天第一次请求时顺带写 ad_placements（响应发出后再写，不拖慢页面） */
function recordRotationLazily(
  cityId: string,
  slotType: "home_rotation" | "category_rotation",
  category: string | null,
  picked: PublicProvider[],
  date: string,
) {
  if (picked.length === 0 || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  after(async () => {
    try {
      const admin = createAdminClient();
      let check = admin
        .from("ad_placements")
        .select("id", { count: "exact", head: true })
        .eq("city_id", cityId)
        .eq("slot_type", slotType)
        .eq("rotation_date", date);
      check = category ? check.eq("category", category) : check.is("category", null);
      const { count } = await check;
      if (count && count > 0) return;
      const { start, end } = chicagoDayBounds(date);
      // 并发时可能两个请求都走到这里，唯一索引会挡住重复，忽略冲突错误即可
      await admin.from("ad_placements").insert(
        picked.map((p) => ({
          provider_id: p.id,
          city_id: cityId,
          slot_type: slotType,
          category,
          rotation_date: date,
          start_at: start,
          end_at: end,
          is_free_grant: true,
          amount_cents: 0,
        })),
      );
    } catch (e) {
      console.error("rotation lazy write failed", e);
    }
  });
}

/** 推荐内容（修了什么、评语）里包含关键词的商家 id；只看公开的 active 推荐 */
async function providerIdsFromRecommendations(terms: string[]): Promise<string[]> {
  const supabase = await createClient();
  const conds = terms.flatMap((t) => [`service_item.ilike.%${t}%`, `comment.ilike.%${t}%`]).join(",");
  const { data } = await supabase.from("recommendations").select("provider_id").eq("status", "active").or(conds).limit(500);
  return [...new Set((data ?? []).map((r) => r.provider_id as string))].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
}

/** 列表：轮换之后按推荐数降序 → 创建时间降序，每页 20 条 */
export async function listProviders(f: ListFilters, excludeIds: string[] = []) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let query = supabase
    .from("providers")
    .select(PUBLIC_PROVIDER_COLUMNS, { count: "exact" })
    .eq("city_id", f.cityId)
    .in("status", ["active", "paused"]);
  if (f.category) query = query.eq("category", f.category);
  else if (f.categories?.length) query = query.in("category", f.categories);
  if (f.area) query = query.contains("service_areas", [f.area]);
  if (f.q) {
    // 部分匹配：商家名、服务名、标语、简介、标签、分类名、邻居推荐里的“修了什么”和评语。
    // 不支持按电话/微信搜（防爬），结果也只返回公开字段。
    const terms = expandSearchTerms(f.q);
    if (terms.length) {
      const [categoryIds, recommendedIds] = await Promise.all([
        Promise.resolve(matchingCategoryIds(terms)),
        providerIdsFromRecommendations(terms),
      ]);
      const conds = terms.flatMap((t) => [
        `name.ilike.%${t}%`,
        `custom_service.ilike.%${t}%`,
        `tagline.ilike.%${t}%`,
        `description.ilike.%${t}%`,
        `sub_tags.cs.{"${t}"}`,
      ]);
      if (categoryIds.length) conds.push(`category.in.(${categoryIds.join(",")})`);
      if (recommendedIds.length) conds.push(`id.in.(${recommendedIds.join(",")})`);
      query = query.or(conds.join(","));
    }
  }
  if (excludeIds.length) query = query.not("id", "in", `(${excludeIds.join(",")})`);
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query
    .order("recommend_count", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  return {
    providers: (data ?? []) as unknown as PublicProvider[],
    total: count ?? 0,
    page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}

export async function getPublicProvider(id: string): Promise<PublicProvider | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("providers").select(PUBLIC_PROVIDER_COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as PublicProvider) ?? null;
}

/** 创始名额还剩几个（第 101 名起不再发） */
export async function foundingSlotsLeft(): Promise<number> {
  const { FOUNDING_SLOTS } = await import("@/constants/site");
  const { count } = await createAdminClient()
    .from("providers")
    .select("id", { count: "exact", head: true })
    .not("founding_rank", "is", null);
  return Math.max(0, FOUNDING_SLOTS - (count ?? 0));
}

/** 当前登录用户自己的店（没有就 null）。用于首页/页脚把“免费注册”换成“管理我的名片” */
export async function getMyProvider(userId: string | null | undefined): Promise<{ id: string; name: string } | null> {
  if (!userId) return null;
  const { data } = await createAdminClient().from("providers").select("id, name").eq("owner_user_id", userId).maybeSingle();
  return data ?? null;
}
