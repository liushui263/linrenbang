/**
 * 创始身份到期（规格第 6 节 / 验收 §12 第 3 条）：
 * founding_expires_at 改成过去时间后 → 角标消失、退出“今日推荐”轮换、仍按推荐数正常出现在列表里。
 *
 * 用内存里的假 Supabase 跑真实的 getTodayRotation / listProviders 查询，
 * 这样以后有人改了查询条件（比如漏掉 founding_expires_at 过滤），这里会挂。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicProvider } from "./types";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => {} }));

type Row = Record<string, unknown>;
let rows: Row[] = [];

/** 只实现 lib/providers.ts 用到的那几个 PostgREST 过滤方法 */
function fakeQuery(table: Row[]) {
  const preds: ((r: Row) => boolean)[] = [];
  const orders: [string, boolean][] = [];
  let lim = Infinity;
  let off = 0;
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), q),
    in: (c: string, vs: unknown[]) => (preds.push((r) => vs.includes(r[c])), q),
    gt: (c: string, v: string) => (preds.push((r) => r[c] != null && String(r[c]) > v), q),
    lt: (c: string, v: string) => (preds.push((r) => r[c] != null && String(r[c]) < v), q),
    contains: (c: string, vs: unknown[]) => (preds.push((r) => vs.every((v) => ((r[c] as unknown[]) ?? []).includes(v))), q),
    overlaps: (c: string, vs: unknown[]) => (preds.push((r) => vs.some((v) => ((r[c] as unknown[]) ?? []).includes(v))), q),
    not: (c: string, op: string, v: string) => {
      if (op === "in") {
        const ids = v.replace(/[()]/g, "").split(",");
        preds.push((r) => !ids.includes(String(r[c])));
      }
      return q;
    },
    order: (c: string, o: { ascending: boolean }) => (orders.push([c, o.ascending]), q),
    limit: (n: number) => ((lim = n), q),
    range: (a: number, b: number) => ((off = a), (lim = b - a + 1), q),
    then(resolve: (v: { data: Row[]; count: number }) => void) {
      const hit = table.filter((r) => preds.every((p) => p(r)));
      hit.sort((a, b) => {
        for (const [c, asc] of orders) {
          if (a[c] === b[c]) continue;
          return (String(a[c]).localeCompare(String(b[c]), "en", { numeric: true }) < 0 ? -1 : 1) * (asc ? 1 : -1);
        }
        return 0;
      });
      resolve({ data: hit.slice(off, off + lim), count: hit.length });
    },
  };
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => fakeQuery(rows) }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => fakeQuery(rows) }),
}));

const { getTodayRotation, listProviders } = await import("./providers");
const { isFoundingActive } = await import("./rotation");

const NOW = new Date("2026-11-16T18:00:00Z");
const DAY = 86_400_000;

function provider(id: string, over: Partial<PublicProvider> = {}): Row {
  return {
    id,
    city_id: "houston",
    name: id,
    category: "hvac",
    categories: ["hvac"],
    status: "active",
    service_areas: [],
    recommend_count: 0,
    is_founding: true,
    founding_rank: 1,
    founding_started_at: "2026-10-01T00:00:00Z",
    founding_expires_at: new Date(NOW.getTime() + 30 * DAY).toISOString(),
    created_at: "2026-10-01T00:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("founding status expiry", () => {
  it("expired founder loses the badge, leaves rotation, but stays in the list by recommend count", async () => {
    const expired = provider("expired", {
      founding_rank: 1,
      founding_started_at: "2026-08-01T00:00:00Z",
      founding_expires_at: new Date(NOW.getTime() - 1000).toISOString(),
      recommend_count: 9,
    });
    rows = [
      expired,
      provider("active-a", { founding_rank: 2, recommend_count: 1 }),
      provider("plain", { is_founding: false, founding_rank: null, founding_started_at: null, founding_expires_at: null, recommend_count: 5 }),
    ];

    // 角标：ProviderCard / 商家页都用 isFoundingActive 决定显不显示
    expect(isFoundingActive(expired.founding_expires_at as string)).toBe(false);

    // 轮换：分类页和首页都不再出现
    const catPick = await getTodayRotation("houston", "hvac");
    expect(catPick.map((p) => p.id)).toEqual(["active-a"]);
    const homePick = await getTodayRotation("houston");
    expect(homePick.map((p) => p.id)).not.toContain("expired");

    // 列表：仍然可见，并且按推荐数排在最前
    const list = await listProviders({ cityId: "houston", category: "hvac" }, catPick.map((p) => p.id));
    expect(list.providers.map((p) => p.id)).toEqual(["expired", "plain"]);
  });

  it("still-valid founder is in rotation and shows the badge", async () => {
    const valid = provider("valid");
    rows = [valid];
    expect(isFoundingActive(valid.founding_expires_at as string)).toBe(true);
    expect((await getTodayRotation("houston", "hvac")).map((p) => p.id)).toEqual(["valid"]);
  });

  it("paused founder leaves rotation but stays listed", async () => {
    rows = [provider("paused", { status: "paused" })];
    expect(await getTodayRotation("houston", "hvac")).toEqual([]);
    expect((await listProviders({ cityId: "houston" })).providers.map((p) => p.id)).toEqual(["paused"]);
  });

  it("rotation flips from in to out exactly when founding_expires_at passes", async () => {
    const expiresAt = new Date(NOW.getTime() + 60_000).toISOString();
    rows = [provider("edge", { founding_expires_at: expiresAt })];
    expect((await getTodayRotation("houston", "hvac")).length).toBe(1);
    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    expect(await getTodayRotation("houston", "hvac")).toEqual([]);
    expect(isFoundingActive(expiresAt)).toBe(false);
  });
});
