import { describe, expect, it } from "vitest";
import { addClaimToken, customServiceFrom, guessCategory, parseAnonForm, parseContact, readClaimTokens, showAnonMark } from "./anon-recommend";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("parseAnonForm", () => {
  it("名字、联系方式、服务内容", () => {
    const r = parseAnonForm(fd({ name: "王师傅", contact: "(713) 555-0123", service: "修空调，上门快" }));
    expect(r.data).toEqual({ name: "王师傅", contact: { phone: "+17135550123", wechat: null, note: null }, service: "修空调，上门快" });
  });
  it("缺项报字段错误", () => {
    const r = parseAnonForm(fd({ name: "", contact: "", service: "" }));
    expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["contact", "name", "service"]);
  });
  it("只传了图片也算有联系方式", () => {
    expect(parseAnonForm(fd({ name: "a", contact: "", contact_image_set: "1", service: "修空调" })).data).toBeTruthy();
  });
  it("给已有商家推荐时只要服务内容", () => {
    expect(parseAnonForm(fd({ service: "换热水器" }), false).data?.service).toBe("换热水器");
  });
  it("服务内容不能放网址", () => {
    expect(parseAnonForm(fd({ name: "a", contact: "7135550123", service: "看 www.x.com" })).fieldErrors?.service).toBeTruthy();
  });
});

describe("parseContact", () => {
  it.each([
    ["713-555-0123", { phone: "+17135550123", wechat: null, note: null }],
    ["电话 7135550123", { phone: "+17135550123", wechat: null, note: null }],
    ["wangshifu88", { phone: null, wechat: "wangshifu88", note: null }],
    ["微信：wangshifu88", { phone: null, wechat: "wangshifu88", note: null }],
    ["wang@gmail.com", { phone: null, wechat: null, note: "wang@gmail.com" }],
    ["https://abc.com/ac", { phone: null, wechat: null, note: "https://abc.com/ac" }],
    ["832 555 0101 微信 laowang_ac", { phone: "+18325550101", wechat: "laowang_ac", note: null }],
    ["找群主要", { phone: null, wechat: null, note: "找群主要" }],
  ])("%s", (raw, want) => expect(parseContact(raw)).toEqual(want));
});

describe("guessCategory", () => {
  it.each([
    ["修空调，夏天上门快", "hvac"],
    ["换热水器 花了 $1200", "plumbing"],
    ["老王 屋顶漏水", "roof"],
    ["General contractor 装修", "handyman"],
    ["AC 不制冷", "hvac"],
    ["报税很专业", "tax"],
    ["做私房菜", "food"],
    ["帮忙遛狗", "other"],
  ])("%s → %s", (text, cat) => expect(guessCategory(text)).toBe(cat));
  it("取最先出现的关键词", () => expect(guessCategory("修空调顺便换了灯")).toBe("hvac"));
});

it("customServiceFrom 取第一句，最多 12 字", () => {
  expect(customServiceFrom("宠物美容，很耐心")).toBe("宠物美容");
  expect(customServiceFrom("一二三四五六七八九十一二三四")).toHaveLength(12);
});

describe("认领码 cookie", () => {
  const t1 = "a".repeat(32);
  const t2 = "b".repeat(32);
  it("追加、去重、过滤非法", () => {
    expect(readClaimTokens(addClaimToken(`${t1},bad`, t2))).toEqual([t1, t2]);
    expect(readClaimTokens(addClaimToken(`${t1},${t2}`, t1))).toEqual([t2, t1]);
    expect(readClaimTokens(undefined)).toEqual([]);
  });
});

describe("showAnonMark", () => {
  it("有推荐但全是匿名 → 显示", () => expect(showAnonMark({ recommend_count: 2, member_recommend_count: 0 })).toBe(true));
  it("有登录邻居推荐 → 自动消失", () => expect(showAnonMark({ recommend_count: 3, member_recommend_count: 1 })).toBe(false));
  it("匿名新加、推荐还在审核 → 显示", () =>
    expect(showAnonMark({ recommend_count: 0, member_recommend_count: 0, source: "neighbor_anonymous" })).toBe(true));
  it("普通商家还没推荐 → 不显示", () =>
    expect(showAnonMark({ recommend_count: 0, member_recommend_count: 0, source: "self_registered" })).toBe(false));
  it("迁移没运行（没有这一列）→ 不显示", () => expect(showAnonMark({ recommend_count: 2 })).toBe(false));
});
