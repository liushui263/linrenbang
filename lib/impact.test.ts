import { describe, expect, it } from "vitest";
import { impactSentence, impactShareLines, impactWindowStart, isBotUserAgent, isEventKind } from "./impact";

describe("impact", () => {
  it("window start covers 7 Chicago days including today", () => {
    // 2026-11-19 03:00 UTC 在芝加哥还是 11-18 晚上
    expect(impactWindowStart(new Date("2026-11-19T03:00:00Z"))).toBe("2026-11-12");
    expect(impactWindowStart(new Date("2026-03-03T18:00:00Z"))).toBe("2026-02-25");
  });

  it("validates kinds", () => {
    expect(isEventKind("view")).toBe(true);
    expect(isEventKind("call")).toBe(true);
    expect(isEventKind("delete")).toBe(false);
    expect(isEventKind(undefined)).toBe(false);
  });

  it("filters bots and link previews", () => {
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent(null)).toBe(true);
    expect(
      isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 MicroMessenger/8.0.40"),
    ).toBe(false);
  });

  it("writes the sentence", () => {
    expect(impactSentence("许广军", { views: 8, calls: 3, wechats: 0 })).toBe("你推荐的许广军，最近 7 天被 8 位邻居查看、3 位拨打。");
    expect(impactSentence("许广军", { views: 8, calls: 3, wechats: 2 })).toContain("2 位加微信");
    expect(impactSentence("许广军", { views: 0, calls: 0, wechats: 0 })).toContain("还没有邻居来看");
  });

  it("share lines skip stats when empty", () => {
    expect(impactShareLines("许广军", "空调暖气", { views: 0, calls: 0, wechats: 0 })[0]).not.toContain("位邻居");
    expect(impactShareLines("许广军", "空调暖气", { views: 8, calls: 3, wechats: 1 })[0]).toContain("8 位邻居查看、4 次联系");
  });
});
