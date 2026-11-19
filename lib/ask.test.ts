import { describe, expect, it } from "vitest";
import { askCategoryLabel, containsContact, parseAskForm, timeAgo, titleFromSearch, validateAnswerComment } from "./ask";

const AREAS = ["Katy", "Sugar Land"];
const form = (o: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) fd.set(k, v);
  return fd;
};

describe("parseAskForm", () => {
  it("accepts a normal ask and keeps a fine category inside its group", () => {
    const r = parseAskForm(
      form({ title: " 求靠谱水管师傅  厨房漏水 ", category_group: "home_repair", category: "plumbing", area: "Katy", urgency: "today" }),
      AREAS,
    );
    expect(r.fieldErrors).toBeUndefined();
    expect(r.data).toMatchObject({ title: "求靠谱水管师傅 厨房漏水", category: "plumbing", area: "Katy", urgency: "today", details: null });
  });
  it("drops a fine category from another group, and fills single-category groups", () => {
    expect(parseAskForm(form({ title: "求推荐川菜馆", category_group: "home_repair", category: "food", area: "Katy" }), AREAS).data?.category).toBeNull();
    expect(parseAskForm(form({ title: "求推荐川菜馆", category_group: "food", area: "Katy" }), AREAS).data?.category).toBe("food");
  });
  it("rejects contact info, unknown areas and missing groups", () => {
    const r = parseAskForm(form({ title: "找水管 713-555-0123", category_group: "nope", area: "Dallas" }), AREAS);
    expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["area", "category_group", "title"]);
  });
  it("defaults urgency to this week", () => {
    expect(parseAskForm(form({ title: "求推荐搬家公司", category_group: "moving", area: "Katy", urgency: "x" }), AREAS).data?.urgency).toBe("week");
  });
});

describe("containsContact", () => {
  it("spots phones, wechat ids and links", () => {
    expect(containsContact("电话 (713) 555 0123")).toBe(true);
    expect(containsContact("加微信 abc_12345")).toBe(true);
    expect(containsContact("看 www.example.com")).toBe(true);
  });
  it("allows ordinary numbers", () => {
    expect(containsContact("50 加仑热水器，预算 $1200，77494")).toBe(false);
  });
});

describe("validateAnswerComment", () => {
  it("needs at least 10 characters and no contact info", () => {
    expect(validateAnswerComment("很好")).not.toBeNull();
    expect(validateAnswerComment("去年换热水器找的他，价格公道")).toBeNull();
    expect(validateAnswerComment("人很好，电话 7135550123 直接打")).not.toBeNull();
  });
});

describe("titleFromSearch", () => {
  it("prefixes the search term and caps the length", () => {
    expect(titleFromSearch(" 泳池清洁 ")).toBe("求推荐：泳池清洁");
    expect(titleFromSearch("")).toBe("");
    expect(titleFromSearch("字".repeat(60)).length).toBe(40);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-10T12:00:00Z");
  it("formats recent times", () => {
    expect(timeAgo("2026-06-10T11:59:40Z", now)).toBe("刚刚");
    expect(timeAgo("2026-06-10T11:35:00Z", now)).toBe("25 分钟前");
    expect(timeAgo("2026-06-10T09:00:00Z", now)).toBe("3 小时前");
    expect(timeAgo("2026-06-09T10:00:00Z", now)).toBe("昨天");
    expect(timeAgo("2026-06-05T10:00:00Z", now)).toBe("5 天前");
  });
});

describe("askCategoryLabel", () => {
  it("prefers the fine category", () => {
    expect(askCategoryLabel({ category_group: "home_repair", category: "plumbing" })).toBe("🚰 水暖管道");
    expect(askCategoryLabel({ category_group: "home_repair", category: null })).toBe("❄️ 房屋维修");
  });
});
