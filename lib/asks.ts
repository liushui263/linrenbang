import "server-only";
import { findGroup } from "@/constants/categories";
import { ASK_PAGE_SIZE, CLOSED_FOLD_DAYS, PUBLIC_ASK_COLUMNS, type PublicAsk } from "@/lib/ask";
import { expandSearchTerms } from "@/lib/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_PROVIDER_COLUMNS, type PublicProvider } from "@/lib/types";

/** 列表卡片上“3 位邻居推荐了 李师傅空调 等 2 位”用的摘要 */
export interface AskSummary extends PublicAsk {
  /** 被推荐的师傅（去重，按第一次被推荐的时间），只含可公开的名字 */
  providerNames: string[];
}

export interface ListAskFilters {
  cityId: string;
  area?: string;
  group?: string;
  /** 只看还没人回答的 */
  waiting?: boolean;
  page?: number;
}

const foldCutoff = () => new Date(Date.now() - CLOSED_FOLD_DAYS * 86400_000).toISOString();

/** 每条提问被推荐了哪些师傅（只要名字；待审核的新师傅也显示名字，隐藏的不显示） */
async function providerNamesFor(askIds: string[]): Promise<Record<string, string[]>> {
  if (askIds.length === 0) return {};
  const supabase = await createClient();
  const { data: answers } = await supabase
    .from("ask_answers")
    .select("ask_id, provider_id, created_at")
    .in("ask_id", askIds)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  const providerIds = [...new Set((answers ?? []).map((a) => a.provider_id as string))];
  if (providerIds.length === 0) return {};
  const { data: providers } = await createAdminClient()
    .from("providers")
    .select("id, name, status")
    .in("id", providerIds)
    .neq("status", "hidden");
  const names = new Map((providers ?? []).map((p) => [p.id as string, p.name as string]));
  const out: Record<string, string[]> = {};
  for (const a of answers ?? []) {
    const n = names.get(a.provider_id as string);
    if (!n) continue;
    const list = (out[a.ask_id as string] ??= []);
    if (!list.includes(n)) list.push(n);
  }
  return out;
}

async function withNames(asks: PublicAsk[]): Promise<AskSummary[]> {
  const names = await providerNamesFor(asks.map((a) => a.id));
  return asks.map((a) => ({ ...a, providerNames: names[a.id] ?? [] }));
}

/** /ask 列表：未解决的 + 30 天内解决的，最新在前 */
export async function listAsks(f: ListAskFilters) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let query = supabase
    .from("asks")
    .select(PUBLIC_ASK_COLUMNS, { count: "exact" })
    .eq("city_id", f.cityId)
    .or(`status.eq.open,closed_at.gt."${foldCutoff()}"`);
  if (f.area) query = query.eq("area", f.area);
  if (f.group && findGroup(f.group)) query = query.eq("category_group", f.group);
  if (f.waiting) query = query.eq("status", "open").eq("answer_count", 0);
  const from = (page - 1) * ASK_PAGE_SIZE;
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + ASK_PAGE_SIZE - 1);
  return {
    asks: await withNames((data ?? []) as unknown as PublicAsk[]),
    total: count ?? 0,
    page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / ASK_PAGE_SIZE)),
  };
}

/** “等你推荐”的数量（列表页切换按钮上的小数字） */
export async function countWaiting(cityId: string, area?: string, group?: string): Promise<number> {
  const supabase = await createClient();
  let q = supabase
    .from("asks")
    .select("id", { count: "exact", head: true })
    .eq("city_id", cityId)
    .eq("status", "open")
    .eq("answer_count", 0);
  if (area) q = q.eq("area", area);
  if (group && findGroup(group)) q = q.eq("category_group", group);
  const { count } = await q;
  return count ?? 0;
}

/** 首页“邻居在求推荐”：最新几条还没解决的 + 一共多少条 */
export async function getLatestAsks(cityId: string, n: number) {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("asks")
    .select(PUBLIC_ASK_COLUMNS, { count: "exact" })
    .eq("city_id", cityId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(n);
  return { asks: await withNames((data ?? []) as unknown as PublicAsk[]), total: count ?? 0 };
}

/** 搜不到时：“已经有邻居问过类似的” */
export async function similarAsks(cityId: string, q: string, n = 2): Promise<AskSummary[]> {
  const terms = expandSearchTerms(q).slice(0, 6);
  if (terms.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("asks")
    .select(PUBLIC_ASK_COLUMNS)
    .eq("city_id", cityId)
    .in("status", ["open", "closed"])
    .or(terms.map((t) => `title.ilike.%${t}%`).join(","))
    .order("answer_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(n);
  return withNames((data ?? []) as unknown as PublicAsk[]);
}

export async function getAsk(id: string): Promise<PublicAsk | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("asks").select(PUBLIC_ASK_COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as PublicAsk) ?? null;
}

export interface AnswerQuote {
  id: string;
  recommender_area: string;
  comment: string;
  used_it: boolean;
  created_at: string;
}

/** 详情页：回答按师傅分组。已上线的师傅给完整名片字段；审核中的只给名字和分类 */
export interface AnswerGroup {
  providerId: string;
  provider: PublicProvider | null;
  pending: { name: string; categories: string[]; custom_service: string | null; category: string } | null;
  quotes: AnswerQuote[];
}

export async function getAskAnswers(askId: string, visitorArea: string | null): Promise<AnswerGroup[]> {
  const supabase = await createClient();
  const { data: answers } = await supabase
    .from("ask_answers")
    .select("id, provider_id, recommender_area, comment, used_it, created_at")
    .eq("ask_id", askId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (!answers?.length) return [];
  const ids = [...new Set(answers.map((a) => a.provider_id as string))];
  const [{ data: live }, { data: all }] = await Promise.all([
    supabase.from("providers").select(PUBLIC_PROVIDER_COLUMNS).in("id", ids),
    createAdminClient().from("providers").select("id, name, status, category, categories, custom_service").in("id", ids),
  ]);
  const liveMap = new Map(((live ?? []) as unknown as PublicProvider[]).map((p) => [p.id, p]));
  const allMap = new Map((all ?? []).map((p) => [p.id as string, p]));

  const groups = new Map<string, AnswerGroup>();
  for (const a of answers) {
    const pid = a.provider_id as string;
    const raw = allMap.get(pid);
    if (!raw || raw.status === "hidden") continue;
    let g = groups.get(pid);
    if (!g) {
      const provider = liveMap.get(pid) ?? null;
      g = {
        providerId: pid,
        provider,
        pending: provider
          ? null
          : { name: raw.name, categories: raw.categories ?? [raw.category], custom_service: raw.custom_service, category: raw.category },
        quotes: [],
      };
      groups.set(pid, g);
    }
    g.quotes.push(a as AnswerQuote);
  }
  // 同片区邻居的回答排前面；师傅按“被几位邻居推荐”排，已上线的在审核中的前面
  const same = (q: AnswerQuote) => !!visitorArea && q.recommender_area === visitorArea;
  const list = [...groups.values()];
  for (const g of list) g.quotes.sort((x, y) => Number(same(y)) - Number(same(x)));
  return list.sort((x, y) => Number(!!y.provider) - Number(!!x.provider) || y.quotes.length - x.quotes.length);
}
