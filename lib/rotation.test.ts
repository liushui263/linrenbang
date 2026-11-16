import { describe, expect, it } from "vitest";
import {
  chicagoDateString,
  chicagoDayBounds,
  dayIndexFor,
  foundingDaysLeft,
  isFoundingActive,
  pickDailyRotation,
  pickHomeRotation,
} from "./rotation";

describe("chicagoDateString", () => {
  it("uses Chicago midnight, not UTC midnight", () => {
    // 2026-11-17 03:00 UTC = 2026-11-16 21:00 CST
    expect(chicagoDateString(new Date("2026-11-17T03:00:00Z"))).toBe("2026-11-16");
    // 2026-11-17 06:00 UTC = 2026-11-17 00:00 CST
    expect(chicagoDateString(new Date("2026-11-17T06:00:00Z"))).toBe("2026-11-17");
  });
  it("handles daylight saving time (CDT, UTC-5)", () => {
    expect(chicagoDateString(new Date("2026-07-01T04:59:00Z"))).toBe("2026-06-30");
    expect(chicagoDateString(new Date("2026-07-01T05:00:00Z"))).toBe("2026-07-01");
  });
});

describe("dayIndexFor", () => {
  it("counts days since 2026-01-01", () => {
    expect(dayIndexFor("2026-01-01")).toBe(0);
    expect(dayIndexFor("2026-01-02")).toBe(1);
    expect(dayIndexFor("2026-11-16")).toBe(319);
    expect(dayIndexFor("2027-01-01")).toBe(365);
  });
  it("is not affected by DST transitions", () => {
    expect(dayIndexFor("2026-03-09") - dayIndexFor("2026-03-08")).toBe(1);
    expect(dayIndexFor("2026-11-02") - dayIndexFor("2026-11-01")).toBe(1);
  });
});

describe("pickDailyRotation", () => {
  const pool = ["a", "b", "c", "d", "e"];
  it("returns nothing for an empty pool", () => {
    expect(pickDailyRotation([], 7)).toEqual([]);
  });
  it("returns the whole pool when it has 2 or fewer", () => {
    expect(pickDailyRotation(["a"], 3)).toEqual(["a"]);
    expect(pickDailyRotation(["a", "b"], 3)).toEqual(["a", "b"]);
  });
  it("takes dayIndex % n and (dayIndex + 1) % n", () => {
    expect(pickDailyRotation(pool, 0)).toEqual(["a", "b"]);
    expect(pickDailyRotation(pool, 3)).toEqual(["d", "e"]);
    expect(pickDailyRotation(pool, 4)).toEqual(["e", "a"]);
    expect(pickDailyRotation(pool, 5)).toEqual(["a", "b"]);
  });
  it("changes day to day and is stable within a day", () => {
    expect(pickDailyRotation(pool, 10)).toEqual(pickDailyRotation(pool, 10));
    expect(pickDailyRotation(pool, 10)).not.toEqual(pickDailyRotation(pool, 11));
  });
});

describe("pickHomeRotation", () => {
  const p = (id: string) => ({ id });
  it("prefers two different categories", () => {
    const res = pickHomeRotation([[p("a1"), p("a2")], [], [p("b1"), p("b2")]], 0);
    expect(res.map((x) => x.id)).toEqual(["a1", "b1"]);
  });
  it("rotates which category goes first", () => {
    const res = pickHomeRotation([[p("a1")], [p("b1")], [p("c1")]], 1);
    expect(res.map((x) => x.id)).toEqual(["b1", "c1"]);
  });
  it("fills from the same category when only one has a pool", () => {
    const res = pickHomeRotation([[], [p("a1"), p("a2")]], 5);
    expect(res.map((x) => x.id)).toEqual(["a1", "a2"]);
  });
  it("returns empty when no pools", () => {
    expect(pickHomeRotation([[], []], 0)).toEqual([]);
  });
});

describe("chicagoDayBounds", () => {
  it("covers a standard-time day (UTC-6)", () => {
    expect(chicagoDayBounds("2026-11-16")).toEqual({
      start: "2026-11-16T06:00:00.000Z",
      end: "2026-11-17T05:59:59.000Z",
    });
  });
  it("covers a daylight-time day (UTC-5)", () => {
    expect(chicagoDayBounds("2026-07-01")).toEqual({
      start: "2026-07-01T05:00:00.000Z",
      end: "2026-07-02T04:59:59.000Z",
    });
  });
  it("covers the fall-back day (25 hours)", () => {
    expect(chicagoDayBounds("2026-11-01")).toEqual({
      start: "2026-11-01T05:00:00.000Z",
      end: "2026-11-02T05:59:59.000Z",
    });
  });
});

describe("founding window", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  it("is active before expiry and shows days left", () => {
    expect(isFoundingActive("2026-11-20T12:00:00Z", now)).toBe(true);
    expect(foundingDaysLeft("2026-11-20T12:00:00Z", now)).toBe(4);
    expect(foundingDaysLeft("2026-11-20T13:00:00Z", now)).toBe(5);
  });
  it("expires after founding_expires_at", () => {
    expect(isFoundingActive("2026-11-16T11:59:59Z", now)).toBe(false);
    expect(isFoundingActive(null, now)).toBe(false);
    expect(foundingDaysLeft("2026-11-01T00:00:00Z", now)).toBe(0);
  });
});
