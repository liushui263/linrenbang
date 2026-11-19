import { describe, expect, it } from "vitest";
import { expandSearchTerms, matchingCategoryIds, sanitizeTerm } from "./search";

describe("expandSearchTerms", () => {
  it("keeps the original word and adds synonyms", () => {
    const t = expandSearchTerms("水电");
    expect(t[0]).toBe("水电");
    expect(t).toEqual(expect.arrayContaining(["水管", "水暖", "电路", "照明"]));
  });
  it("splits on spaces and dedupes", () => {
    expect(expandSearchTerms("  水管  水管 ")).toEqual(["水管", "水暖", "管道", "漏水"]);
  });
  it("caps the number of terms", () => {
    expect(expandSearchTerms("水电 空调 装修 搬家 报税").length).toBeLessThanOrEqual(10);
  });
  it("strips PostgREST/LIKE special characters", () => {
    expect(sanitizeTerm('a%b,c(d)*"e\\f:g')).toBe("a b c d e f g");
    expect(expandSearchTerms("%,()")).toEqual([]);
  });
});

describe("matchingCategoryIds", () => {
  it("matches category names partially", () => {
    expect(matchingCategoryIds(["水"])).toEqual(["plumbing"]);
    expect(matchingCategoryIds(["电"])).toEqual(["electrical", "appliance"]);
    expect(matchingCategoryIds(["家"])).toEqual(["appliance", "moving_ride"]);
    expect(matchingCategoryIds(expandSearchTerms("水电"))).toEqual(expect.arrayContaining(["plumbing", "electrical"]));
  });
  it("matches 杂修 for handyman", () => {
    expect(matchingCategoryIds(["杂修"])).toEqual(["handyman"]);
  });
});
