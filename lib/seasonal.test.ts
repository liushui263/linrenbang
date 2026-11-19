import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "@/constants/categories";
import { SEASONAL_REMINDERS } from "@/constants/seasonal";
import { chicagoMonth, findReminder, monthsLabel, remindersForMonth } from "./seasonal";

describe("seasonal reminders", () => {
  it("uses Chicago time for the month", () => {
    // 2026-12-01 03:00 UTC is still Nov 30 in Houston
    expect(chicagoMonth(new Date("2026-12-01T03:00:00Z"))).toBe(11);
    expect(chicagoMonth(new Date("2026-12-01T07:00:00Z"))).toBe(12);
  });

  it("picks reminders by month in config order", () => {
    expect(remindersForMonth(6).map((r) => r.id)).toEqual(["ac", "hurricane"]);
    expect(remindersForMonth(1).map((r) => r.id)).toEqual(["freeze", "tax"]);
    expect(remindersForMonth(11).map((r) => r.id)).toEqual(["heating", "insurance"]);
  });

  it("skips disabled reminders", () => {
    const list = [{ ...SEASONAL_REMINDERS[0], enabled: false }];
    expect(remindersForMonth(SEASONAL_REMINDERS[0].months[0], list)).toEqual([]);
  });

  it("every month has at least one reminder", () => {
    for (let m = 1; m <= 12; m++) expect(remindersForMonth(m).length).toBeGreaterThan(0);
  });

  it("config is valid", () => {
    const ids = new Set<string>();
    for (const r of SEASONAL_REMINDERS) {
      expect(r.id).toMatch(/^[a-z0-9-]+$/);
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
      expect(r.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(r.months.every((m) => m >= 1 && m <= 12)).toBe(true);
      expect(r.categories.length).toBeGreaterThan(0);
      for (const c of r.categories) expect(CATEGORY_IDS).toContain(c);
    }
    expect(findReminder("ac")?.id).toBe("ac");
    expect(findReminder("nope")).toBeUndefined();
  });

  it("formats month ranges", () => {
    expect(monthsLabel([6, 7, 8, 9])).toBe("6–9 月");
    expect(monthsLabel([12, 1, 2])).toBe("12–2 月");
    expect(monthsLabel([5, 6])).toBe("5、6 月");
  });
});
