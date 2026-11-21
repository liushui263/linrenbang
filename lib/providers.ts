import "server-only";
import { after } from "next/server";
import { CATEGORY_IDS } from "@/constants/categories";
import { ANYWHERE_AREA } from "@/constants/cities";
import { NEW_PICKS_DAYS, NEW_PICKS_LIMIT, PAGE_SIZE, RANKED_MAX, ROTATION_POOL_PER_CATEGORY, TODAY_PICKS } from "@/constants/site";
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

/**
 * 某城市某分类的轮换池：active、创始有效期内、通过最早的 10 家（paused 自动退出）。
 * 只按主营分类（category）算：选了 3 个分类的商家不会因此多拿 3 倍首页曝光。
 */
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

/** 今日轮换：传 category 返回该分类当天的 6 家；不传返回首页的 6 家（各分类轮着取） */
export async function getTodayRotation(cityId: string, category?: string): Promise<PublicProvider[]> {
  const date = chicagoDateString();
  const dayIndex = dayIndexFor(date);

  if (category) {
    const picked = pickDailyRotation(await rotationPool(cityId, category), dayIndex, TODAY_PICKS);
    recordRotationLazily(cityId, "category_rotation", category, picked, date);
    return picked;
  }

  const perCategory = await Promise.all(
    CATEGORY_IDS.map(async (c) => pickDailyRotation(await rotationPool(cityId, c), dayIndex)),
  );
  const picked = pickHomeRotation(perCategory, dayIndex, TODAY_PICKS);
  recordRotationLazily(cityId, "home_rotation", null, picked, date);
  return picked;
}

/** 大类页的今日轮换：从这个大类的几个细分类里各取轮换池，规则同首页（只展示，不写 ad_placements） */
export async function getGroupRotation(cityId: string, categoryIds: string[]): Promise<PublicProvider[]> {
  const dayIndex = dayIndexFor(chicagoDateString());
  const perCategory = await Promise.all(
    categoryIds.map(async (c) => pickDailyRotation(await rotationPool(cityId, c), dayIndex)),
  );
  return pickHomeRotation(perCategory, dayIndex, TODAY_PICKS);
}

export type NewPick = { provider: PublicProvider; kind: "joined" | "recommended" };

/**
 * 最近 7 天（按芝加哥日期，含今天）新加入的商家（approved_at），以及新通过了邻居推荐的商家
 * （recommendations.updated_at），最新的在前，排在“今日邻人推荐”最前面。
 * 新加入的商家即使还没有推荐也算。传 categories 时只看这几个分类（分类页 / 大类页）。
 */
export async function getNewPicks(cityId: string, categories?: string[], limit = NEW_PICKS_LIMIT): Promise<NewPick[]> {
  const supabase = await createClient();
  const today = chicagoDateString();
  const since = chicagoDayBounds(chicagoDateString(new Date(Date.parse(`${today}T12:00:00Z`) - (NEW_PICKS_DAYS - 1) * 86_400_000))).start;
  const [{ data: recs }, { data: joined }] = await Promise.all([
    supabase
      .from("recommendations")
      .select("provider_id, updated_at")
      .eq("status", "active")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("providers")
      .select("id, approved_at")
      .eq("city_id", cityId)
      .in("status", ["active", "paused"])
      .gte("approved_at", since)
      .order("approved_at", { ascending: false })
      .limit(100),
  ]);
  // 每个商家取最新的那个时间；新加入优先标成“新加入”
  const latest = new Map<string, { at: string; kind: NewPick["kind"] }>();
  const note = (id: string, at: string, kind: NewPick["kind"]) => {
    const cur = latest.get(id);
    if (!cur) latest.set(id, { at, kind });
    else latest.set(id, { at: cur.at > at ? cur.at : at, kind: cur.kind === "joined" || kind === "joined" ? "joined" : kind });
  };
  for (const r of joined ?? []) note(r.id as string, r.approved_at as string, "joined");
  for (const r of recs ?? []) note(r.provider_id as string, r.updated_at as string, "recommended");
  const ids = [...latest.keys()].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) return [];
  let query = supabase
    .from("providers")
    .select(PUBLIC_PROVIDER_COLUMNS)
    .eq("city_id", cityId)
    .in("status", ["active", "paused"])
    .in("id", ids);
  if (categories?.length) query = query.overlaps("categories", categories);
  const { data } = await query;
  const ts = (p: PublicProvider) => Date.parse(latest.get(p.id)?.at ?? "") || 0;
  return ((data ?? []) as unknown as PublicProvider[])
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, limit)
    .map((p) => ({ provider: p, kind: latest.get(p.id)!.kind }));
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
  // 商家最多 3 个分类，在每个分类下都能被找到；大类筛选 = 任一分类在这个大类里
  if (f.category) query = query.contains("categories", [f.category]);
  else if (f.categories?.length) query = query.overlaps("categories", f.categories);
  // 按片区筛选时，“不限地区”的商家也算在内
  if (f.area) query = query.overlaps("service_areas", [f.area, ANYWHERE_AREA]);
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
      if (categoryIds.length) conds.push(`categories.ov.{${categoryIds.join(",")}}`);
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

/** 首页“全部 · 按推荐数排序”：同样的分类/片区筛选，不排除今日推荐，一次取全（一行一家，前端折叠） */
export async function listRanked(f: Omit<ListFilters, "q" | "page">): Promise<RankedProvider[]> {
  const supabase = await createClient();
  let query = supabase
    .from("providers")
    .select("id, name, category, categories, recommend_count, status")
    .eq("city_id", f.cityId)
    .in("status", ["active", "paused"]);
  if (f.category) query = query.contains("categories", [f.category]);
  else if (f.categories?.length) query = query.overlaps("categories", f.categories);
  // 按片区筛选时，“不限地区”的商家也算在内
  if (f.area) query = query.overlaps("service_areas", [f.area, ANYWHERE_AREA]);
  const { data } = await query
    .order("recommend_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(RANKED_MAX);
  return (data ?? []) as RankedProvider[];
}

export interface RankedProvider {
  id: string;
  name: string;
  category: string;
  categories: string[] | null;
  recommend_count: number;
  status: string;
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

/** 季节提醒里推荐的师傅：这几个分类里正在接单（active）的，按邻居推荐数排 */
export async function getSeasonalPicks(cityId: string, categoryIds: string[], limit: number): Promise<PublicProvider[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("providers")
    .select(PUBLIC_PROVIDER_COLUMNS)
    .eq("city_id", cityId)
    .eq("status", "active")
    .overlaps("categories", categoryIds)
    .order("recommend_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as PublicProvider[];
}
