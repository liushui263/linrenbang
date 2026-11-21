import { CATEGORIES } from "@/constants/categories";
import { chicagoDateString } from "@/lib/rotation";

/**
 * 站长后台“数据看板”：把数据库里已有的几张表的原始行汇总成数字。
 * 只做纯计算，方便测试；查询在 lib/admin-stats-data.ts。
 * 所有“今天 / 本周 / 几点”都按美国中部时间（America/Chicago）算。
 */

export type UserRow = { id: string; created_at: string; display_name: string | null };
export type AuthUserRow = { id: string; provider: string | null; last_sign_in_at: string | null };
export type ProviderRow = {
  id: string;
  name: string;
  status: string;
  categories: string[] | null;
  category: string;
  founding_rank: number | null;
  recommend_count: number;
  is_claimed: boolean;
  source: string | null;
  created_at: string;
};
export type RecRow = {
  provider_id: string;
  /** null = 匿名推荐 */
  user_id: string | null;
  recommender_area: string;
  service_item: string | null;
  status: string;
  created_at: string;
};
export type EventRow = { provider_id: string; kind: string; visitor_hash: string; day: string; created_at: string };
export type AskRow = { status: string; answer_count: number; chosen_provider_id: string | null; area: string; created_at: string };
export type AnswerRow = { created_at: string; status: string };
export type FavoriteRow = { provider_id: string; created_at: string };

export interface StatsInput {
  users: UserRow[];
  authUsers: AuthUserRow[];
  providers: ProviderRow[];
  recs: RecRow[];
  events: EventRow[];
  asks: AskRow[];
  answers: AnswerRow[];
  favorites: FavoriteRow[];
}

export type Ranked = { label: string; value: number; sub?: string };
export type DayPoint = { day: string; value: number };

export interface Stats {
  totals: {
    users: number;
    usersWeek: number;
    activeWeek: number;
    providersLive: number;
    providersWeek: number;
    providersPending: number;
    providersPaused: number;
    recommenders: number;
    recs: number;
    recsWeek: number;
    recsPending: number;
    favorites: number;
    claimed: number;
    neighborSubmitted: number;
  };
  founding: { used: number; left: number };
  growth: { users: DayPoint[]; recs: DayPoint[] };
  week: { views: number; calls: number; wechats: number; visitors: number; lastViews: number; lastCalls: number; lastWechats: number };
  topCategories: Ranked[];
  topAreas: Ranked[];
  topServiceItems: Ranked[];
  topProviders: Ranked[];
  topCalledWeek: Ranked[];
  topFavorited: Ranked[];
  topRecommenders: Ranked[];
  loginMethods: Ranked[];
  asks: { total: number; answered: number; answeredRate: number; answers: number; avgAnswers: number; helped: number };
  busiestHour: { hour: number; count: number } | null;
  busiestWeekday: { weekday: number; count: number } | null;
  hours: number[];
  zeroRecProviders: number;
  avgRecsPerProvider: number;
  firstUserDay: string | null;
}

const DAY = 86_400_000;

/** YYYY-MM-DD 往前/后挪 n 天 */
export function shiftDay(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
}

const chicagoParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  hour: "numeric",
  hourCycle: "h23",
  weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 芝加哥时间的 小时(0-23) 和 星期(0=周日) */
export function chicagoHourWeekday(iso: string): { hour: number; weekday: number } {
  const parts = chicagoParts.formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const weekday = WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")?.value ?? "Sun");
  return { hour, weekday };
}

/** 名字只露第一个字：“王**”；没有名字就叫“某邻居” */
export function maskName(name: string | null | undefined): string {
  const s = (name ?? "").trim();
  if (!s) return "某邻居";
  const first = Array.from(s)[0];
  return `${first}**`;
}

function rank(counts: Map<string, number>, n: number, sub?: (k: string) => string | undefined): Ranked[] {
  return [...counts.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([label, value]) => ({ label, value, sub: sub?.(label) }));
}

function bump(m: Map<string, number>, k: string, by = 1) {
  m.set(k, (m.get(k) ?? 0) + by);
}

const LOGIN_LABEL: Record<string, string> = { google: "Google", email: "邮箱验证码", phone: "手机", wechat: "微信" };
const CAT_LABEL = new Map(CATEGORIES.map((c) => [c.id, `${c.icon} ${c.zh}`]));

export function computeStats(input: StatsInput, now: Date = new Date()): Stats {
  const today = chicagoDateString(now);
  const weekStart = shiftDay(today, -6); // 含今天共 7 天
  const lastWeekStart = shiftDay(today, -13);
  const growthStart = shiftDay(today, -29);
  const dayOf = (iso: string) => chicagoDateString(new Date(iso));
  const inWeek = (iso: string) => dayOf(iso) >= weekStart;

  const live = input.providers.filter((p) => p.status === "active" || p.status === "paused");
  const liveIds = new Set(live.map((p) => p.id));
  const providerName = new Map(input.providers.map((p) => [p.id, p.name]));
  const activeRecs = input.recs.filter((r) => r.status === "active");
  const userName = new Map(input.users.map((u) => [u.id, u.display_name]));

  // 30 天每日新增
  const series = (dates: string[]): DayPoint[] => {
    const m = new Map<string, number>();
    for (const d of dates) if (d >= growthStart) bump(m, d);
    return Array.from({ length: 30 }, (_, i) => {
      const day = shiftDay(growthStart, i);
      return { day, value: m.get(day) ?? 0 };
    });
  };

  // 本周 vs 上周的查看 / 拨号 / 微信（每个访客每天每种只记一次）
  const ev = { views: 0, calls: 0, wechats: 0, lastViews: 0, lastCalls: 0, lastWechats: 0 };
  const visitors = new Set<string>();
  const callsWeek = new Map<string, number>();
  for (const e of input.events) {
    const thisWeek = e.day >= weekStart;
    const lastWeek = !thisWeek && e.day >= lastWeekStart;
    if (!thisWeek && !lastWeek) continue;
    if (thisWeek) visitors.add(e.visitor_hash);
    if (e.kind === "view") ev[thisWeek ? "views" : "lastViews"]++;
    if (e.kind === "call") ev[thisWeek ? "calls" : "lastCalls"]++;
    if (e.kind === "wechat") ev[thisWeek ? "wechats" : "lastWechats"]++;
    if (thisWeek && (e.kind === "call" || e.kind === "wechat")) bump(callsWeek, e.provider_id);
  }

  // 分类：一家多分类时每个分类都算一次
  const cats = new Map<string, number>();
  for (const p of live) for (const c of p.categories?.length ? p.categories : [p.category]) bump(cats, CAT_LABEL.get(c) ?? c);

  const areas = new Map<string, number>();
  const items = new Map<string, number>();
  const byRecommender = new Map<string, number>();
  const recommenderArea = new Map<string, string>();
  for (const r of activeRecs) {
    bump(areas, r.recommender_area.trim() || "未填");
    const item = (r.service_item ?? "").trim();
    if (item) bump(items, item);
    if (!r.user_id) continue; // 匿名推荐不进“推荐最多的邻居”
    bump(byRecommender, r.user_id);
    recommenderArea.set(r.user_id, r.recommender_area);
  }

  const provRecs = new Map<string, number>();
  for (const p of live) provRecs.set(p.id, p.recommend_count);

  const favs = new Map<string, number>();
  for (const f of input.favorites) if (liveIds.has(f.provider_id)) bump(favs, f.provider_id);

  const logins = new Map<string, number>();
  for (const a of input.authUsers) bump(logins, LOGIN_LABEL[a.provider ?? ""] ?? a.provider ?? "其他");

  // 邻居最常在几点、星期几上站干活：发推荐、发求助、回答、拨号/加微信
  const hours = Array<number>(24).fill(0);
  const weekdays = Array<number>(7).fill(0);
  const stamp = (iso: string) => {
    const { hour, weekday } = chicagoHourWeekday(iso);
    hours[hour]++;
    weekdays[weekday]++;
  };
  input.recs.forEach((r) => stamp(r.created_at));
  input.asks.forEach((a) => stamp(a.created_at));
  input.answers.forEach((a) => stamp(a.created_at));
  input.events.filter((e) => e.kind !== "view").forEach((e) => stamp(e.created_at));
  const maxIdx = (arr: number[]) => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);
  const h = maxIdx(hours);
  const w = maxIdx(weekdays);

  const visibleAsks = input.asks.filter((a) => a.status !== "hidden");
  const answered = visibleAsks.filter((a) => a.answer_count > 0).length;
  const activeAnswers = input.answers.filter((a) => a.status === "active").length;
  const used = input.providers.filter((p) => p.founding_rank != null).length;
  const firstUser = input.users.reduce<string | null>((min, u) => (!min || u.created_at < min ? u.created_at : min), null);

  return {
    totals: {
      users: input.users.length,
      usersWeek: input.users.filter((u) => inWeek(u.created_at)).length,
      activeWeek: input.authUsers.filter((a) => a.last_sign_in_at && inWeek(a.last_sign_in_at)).length,
      providersLive: live.length,
      providersWeek: live.filter((p) => inWeek(p.created_at)).length,
      providersPending: input.providers.filter((p) => p.status === "pending").length,
      providersPaused: input.providers.filter((p) => p.status === "paused").length,
      recommenders: byRecommender.size,
      recs: activeRecs.length,
      recsWeek: activeRecs.filter((r) => inWeek(r.created_at)).length,
      recsPending: input.recs.filter((r) => r.status === "pending").length,
      favorites: input.favorites.length,
      claimed: live.filter((p) => p.is_claimed).length,
      neighborSubmitted: live.filter((p) => p.source === "neighbor_submitted").length,
    },
    founding: { used, left: Math.max(0, 100 - used) },
    growth: {
      users: series(input.users.map((u) => dayOf(u.created_at))),
      recs: series(activeRecs.map((r) => dayOf(r.created_at))),
    },
    week: { ...ev, visitors: visitors.size },
    topCategories: rank(cats, 5),
    topAreas: rank(areas, 5),
    topServiceItems: rank(items, 5),
    topProviders: rank(provRecs, 3).map((r) => ({ ...r, label: providerName.get(r.label) ?? "?" })),
    topCalledWeek: rank(callsWeek, 3).map((r) => ({ ...r, label: providerName.get(r.label) ?? "?" })),
    topFavorited: rank(favs, 3).map((r) => ({ ...r, label: providerName.get(r.label) ?? "?" })),
    topRecommenders: rank(byRecommender, 3).map((r) => ({
      label: maskName(userName.get(r.label)),
      value: r.value,
      sub: recommenderArea.get(r.label),
    })),
    loginMethods: rank(logins, 5),
    asks: {
      total: visibleAsks.length,
      answered,
      answeredRate: visibleAsks.length ? answered / visibleAsks.length : 0,
      answers: activeAnswers,
      avgAnswers: visibleAsks.length ? activeAnswers / visibleAsks.length : 0,
      helped: visibleAsks.filter((a) => a.chosen_provider_id).length,
    },
    busiestHour: hours[h] > 0 ? { hour: h, count: hours[h] } : null,
    busiestWeekday: weekdays[w] > 0 ? { weekday: w, count: weekdays[w] } : null,
    hours,
    zeroRecProviders: live.filter((p) => p.recommend_count === 0).length,
    avgRecsPerProvider: live.length ? activeRecs.filter((r) => liveIds.has(r.provider_id)).length / live.length : 0,
    firstUserDay: firstUser ? dayOf(firstUser) : null,
  };
}
