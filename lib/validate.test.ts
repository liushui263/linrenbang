import { describe, expect, it } from "vitest";
import { validateField, validateForm } from "./validate";

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};

describe("validateField", () => {
  it("checks phone", () => {
    expect(validateField("phone", fd({ phone: "713-555-0123" }))).toBeNull();
    expect(validateField("phone", fd({ phone: "555-0123" }))).toMatch(/10 位/);
  });
  it("checks wechat id", () => {
    expect(validateField("wechat_id", fd({ wechat_id: "" }))).toBeNull();
    expect(validateField("wechat_id", fd({ wechat_id: "laowang_123" }))).toBeNull();
    expect(validateField("wechat_id", fd({ wechat_id: "7135550123" }))).toBeNull();
    expect(validateField("wechat_id", fd({ wechat_id: "123abc" }))).toMatch(/字母开头/);
    expect(validateField("wechat_id", fd({ wechat_id: "abc" }))).toMatch(/6-20/);
  });
  it("blocks links in description", () => {
    expect(validateField("description", fd({ description: "看 www.x.com" }))).toMatch(/网址/);
  });
  it("needs at least one area", () => {
    expect(validateField("service_areas", fd({}))).toMatch(/片区/);
    expect(validateField("service_areas", fd({ service_areas: ["Katy"] }))).toBeNull();
  });
});

describe("custom_service", () => {
  it("is required only for the other category", () => {
    expect(validateField("custom_service", fd({ category: "hvac" }))).toBeNull();
    expect(validateField("custom_service", fd({ category: "other", custom_service: "" }))).toMatch(/具体做什么/);
    expect(validateField("custom_service", fd({ category: "other", custom_service: "网站设计" }))).toBeNull();
    expect(validateField("custom_service", fd({ category: "other", custom_service: "一二三四五六七八九十一二三" }))).toMatch(/12 个字/);
  });
});

describe("validateForm", () => {
  it("collects all errors", () => {
    const errs = validateForm(fd({ name: "", phone: "1" }), ["name", "phone", "category"]);
    expect(Object.keys(errs)).toEqual(["name", "phone", "category"]);
  });
});
