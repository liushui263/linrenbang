import { describe, expect, it } from "vitest";
import { chicagoHourWeekday, computeStats, maskName, shiftDay, type StatsInput } from "./admin-stats";

const NOW = new Date("2026-11-20T18:00:00Z"); // 芝加哥 11-20 12:00

const empty: StatsInput = { users: [], authUsers: [], providers: [], recs: [], events: [], asks: [], answers: [], favorites: [] };

const prov = (id: string, over: Partial<StatsInput["providers"][number]> = {}) => ({
  id,
  name: `店${id}`,
  status: "active",
  categories: ["hvac"],
  category: "hvac",
  founding_rank: null,
  recommend_count: 0,
  is_claimed: false,
  source: null,
  created_at: "2026-10-01T12:00:00Z",
  ...over,
});

describe("admin stats helpers", () => {
  it("shifts days across months", () => {
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("uses Chicago hour and weekday", () => {
    // 2026-11-20 03:30 UTC = 芝加哥 11-19 周四 21:30
    expect(chicagoHourWeekday("2026-11-20T03:30:00Z")).toEqual({ hour: 21, weekday: 4 });
  });

  it("masks names", () => {
    expect(maskName("王小明")).toBe("王**");
    expect(maskName("  ")).toBe("某邻居");
    expect(maskName(null)).toBe("某邻居");
  });
});

describe("computeStats", () => {
  it("handles an empty site", () => {
    const s = computeStats(empty, NOW);
    expect(s.totals.users).toBe(0);
    expect(s.founding.left).toBe(100);
    expect(s.growth.users).toHaveLength(30);
    expect(s.growth.users[29].day).toBe("2026-11-20");
    expect(s.busiestHour).toBeNull();
    expect(s.asks.answeredRate).toBe(0);
  });

  it("counts totals, weekly numbers and rankings", () => {
    const s = computeStats(
      {
        ...empty,
        users: [
          { id: "u1", created_at: "2026-11-19T15:00:00Z", display_name: "王小明" },
          { id: "u2", created_at: "2026-10-01T15:00:00Z", display_name: "Amy" },
          { id: "u3", created_at: "2026-11-01T15:00:00Z", display_name: null },
        ],
        authUsers: [
          { id: "u1", provider: "google", last_sign_in_at: "2026-11-19T15:00:00Z" },
          { id: "u2", provider: "email", last_sign_in_at: "2026-10-01T15:00:00Z" },
          { id: "u3", provider: "google", last_sign_in_at: null },
        ],
        providers: [
          prov("a", { recommend_count: 2, founding_rank: 1, categories: ["hvac", "plumbing"] }),
          prov("b", { recommend_count: 1, founding_rank: 2, status: "paused" }),
          prov("c", { status: "pending" }),
          prov("d", { status: "hidden", recommend_count: 9 }),
        ],
        recs: [
          { provider_id: "a", user_id: "u1", recommender_area: "Katy", service_item: "换压缩机", status: "active", created_at: "2026-11-19T02:00:00Z" },
          { provider_id: "b", user_id: "u1", recommender_area: "Katy", service_item: "换压缩机", status: "active", created_at: "2026-11-02T02:00:00Z" },
          { provider_id: "a", user_id: "u2", recommender_area: "Sugar Land", service_item: null, status: "active", created_at: "2026-11-03T02:00:00Z" },
          { provider_id: "a", user_id: "u3", recommender_area: "Katy", service_item: null, status: "pending", created_at: "2026-11-19T02:00:00Z" },
        ],
        events: [
          { provider_id: "a", kind: "view", visitor_hash: "v1", day: "2026-11-19", created_at: "2026-11-19T20:00:00Z" },
          { provider_id: "a", kind: "call", visitor_hash: "v1", day: "2026-11-19", created_at: "2026-11-19T20:01:00Z" },
          { provider_id: "a", kind: "view", visitor_hash: "v2", day: "2026-11-10", created_at: "2026-11-10T20:00:00Z" },
        ],
        asks: [
          { status: "open", answer_count: 2, chosen_provider_id: null, area: "Katy", created_at: "2026-11-18T02:00:00Z" },
          { status: "closed", answer_count: 1, chosen_provider_id: "a", area: "Katy", created_at: "2026-11-17T02:00:00Z" },
          { status: "open", answer_count: 0, chosen_provider_id: null, area: "Katy", created_at: "2026-11-16T02:00:00Z" },
          { status: "hidden", answer_count: 5, chosen_provider_id: null, area: "Katy", created_at: "2026-11-16T02:00:00Z" },
        ],
        answers: [
          { status: "active", created_at: "2026-11-18T03:00:00Z" },
          { status: "active", created_at: "2026-11-18T03:00:00Z" },
          { status: "active", created_at: "2026-11-17T03:00:00Z" },
        ],
        favorites: [
          { provider_id: "b", created_at: "2026-11-18T03:00:00Z" },
          { provider_id: "d", created_at: "2026-11-18T03:00:00Z" },
        ],
      },
      NOW,
    );

    expect(s.totals).toMatchObject({
      users: 3,
      usersWeek: 1,
      activeWeek: 1,
      providersLive: 2,
      providersPending: 1,
      providersPaused: 1,
      recommenders: 2,
      recs: 3,
      recsWeek: 1,
      recsPending: 1,
      favorites: 2,
    });
    expect(s.founding).toEqual({ used: 2, left: 98 });
    expect(s.week).toMatchObject({ views: 1, calls: 1, lastViews: 1, visitors: 1 });
    expect(s.topProviders[0]).toMatchObject({ label: "店a", value: 2 });
    expect(s.topProviders.map((p) => p.label)).not.toContain("店d"); // 隐藏的不上榜
    expect(s.topRecommenders[0]).toEqual({ label: "王**", value: 2, sub: "Katy" });
    expect(s.topAreas[0]).toMatchObject({ label: "Katy", value: 2 });
    expect(s.topServiceItems[0]).toMatchObject({ label: "换压缩机", value: 2 });
    expect(s.topCategories[0].value).toBe(2); // 空调 a+b
    expect(s.topCalledWeek[0]).toMatchObject({ label: "店a", value: 1 });
    expect(s.topFavorited).toEqual([{ label: "店b", value: 1, sub: undefined }]);
    expect(s.loginMethods[0]).toMatchObject({ label: "Google", value: 2 });
    expect(s.asks).toMatchObject({ total: 3, answered: 2, answers: 3, helped: 1 });
    expect(s.growth.users[29].value).toBe(0);
    expect(s.growth.users[28].value).toBe(1); // 11-19
    expect(s.busiestHour).not.toBeNull();
    expect(s.zeroRecProviders).toBe(0);
  });
});
