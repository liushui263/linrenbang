import "server-only";
import { computeStats, shiftDay, type AuthUserRow, type Stats, type StatsInput } from "@/lib/admin-stats";
import { chicagoDateString } from "@/lib/rotation";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE = 1000; // Supabase 每次最多返回 1000 行，多的分页取

type Admin = ReturnType<typeof createAdminClient>;

async function fetchAll<T>(
  admin: Admin,
  table: string,
  columns: string,
  sinceDay?: string,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const base = admin.from(table).select(columns);
    const q = sinceDay ? base.gte("day", sinceDay) : base;
    const { data, error } = await q.order("created_at").range(from, from + PAGE - 1);
    if (error) {
      console.error(`[admin-stats] ${table}`, error.code, error.message);
      break;
    }
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** 登录方式、最近登录时间在 Supabase Auth 里，不在 public.users */
async function fetchAuthUsers(admin: Admin): Promise<AuthUserRow[]> {
  const out: AuthUserRow[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) {
      console.error("[admin-stats] auth users", error.message);
      break;
    }
    for (const u of data.users) {
      out.push({ id: u.id, provider: (u.app_metadata?.provider as string | undefined) ?? null, last_sign_in_at: u.last_sign_in_at ?? null });
    }
    if (data.users.length < PAGE) break;
  }
  return out;
}

/** 站长看板：只读已有的表，不需要新的 SQL */
export async function loadAdminStats(now: Date = new Date()): Promise<Stats> {
  const admin = createAdminClient();
  const eventsSince = shiftDay(chicagoDateString(now), -13); // 本周 + 上周

  const [users, authUsers, providers, recs, events, asks, answers, favorites] = await Promise.all([
    fetchAll<StatsInput["users"][number]>(admin, "users", "id, created_at, display_name"),
    fetchAuthUsers(admin),
    fetchAll<StatsInput["providers"][number]>(
      admin,
      "providers",
      "id, name, status, categories, category, founding_rank, recommend_count, is_claimed, source, created_at",
    ),
    fetchAll<StatsInput["recs"][number]>(admin, "recommendations", "provider_id, user_id, recommender_area, service_item, status, created_at"),
    fetchAll<StatsInput["events"][number]>(admin, "provider_events", "provider_id, kind, visitor_hash, day, created_at", eventsSince),
    fetchAll<StatsInput["asks"][number]>(admin, "asks", "status, answer_count, chosen_provider_id, area, created_at"),
    fetchAll<StatsInput["answers"][number]>(admin, "ask_answers", "status, created_at"),
    fetchAll<StatsInput["favorites"][number]>(admin, "favorites", "provider_id, created_at"),
  ]);

  return computeStats({ users, authUsers, providers, recs, events, asks, answers, favorites }, now);
}
