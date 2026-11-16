import { describe, expect, it } from "vitest";
import { parseProviderForm } from "./provider-form";
import { validateField } from "./validate";

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};
const base = { name: "老王空调", category: "hvac", city_id: "houston", service_areas: "Katy", phone: "(713) 555-0123" };

describe("contact preference validation", () => {
  it("is skipped when the form has no contact section (neighbor submission)", () => {
    expect(validateField("contact_methods", fd({}))).toBeNull();
    expect(validateField("contact_pref", fd({}))).toBeNull();
  });
  it("needs at least one method", () => {
    expect(validateField("contact_methods", fd({ contact_form: "1" }))).toMatch(/至少选一种/);
  });
  it("needs a wechat id when 加微信 is picked", () => {
    expect(validateField("contact_methods", fd({ contact_form: "1", contact_methods: ["sms", "wechat"] }))).toMatch(/微信号/);
    expect(
      validateField("contact_methods", fd({ contact_form: "1", contact_methods: ["wechat"], wechat_id: "laowang_123" })),
    ).toBeNull();
  });
  it("preferred method must be one of the picked methods", () => {
    expect(validateField("contact_pref", fd({ contact_form: "1", contact_methods: ["phone"], contact_pref: "sms" }))).toMatch(/先在上面勾选/);
    expect(validateField("contact_pref", fd({ contact_form: "1", contact_methods: ["phone", "sms"], contact_pref: "sms" }))).toBeNull();
  });
});

describe("parseProviderForm contact fields", () => {
  it("defaults to phone + sms (+ wechat if given) for neighbor submissions", () => {
    expect(parseProviderForm(fd(base)).data).toMatchObject({ contact_methods: ["phone", "sms"], contact_pref: "phone" });
    expect(parseProviderForm(fd({ ...base, wechat_id: "laowang_123" })).data).toMatchObject({
      contact_methods: ["phone", "sms", "wechat"],
      contact_pref: "phone",
    });
  });
  it("keeps the merchant's choice in a fixed order", () => {
    const r = parseProviderForm(fd({ ...base, contact_form: "1", contact_methods: ["sms", "phone"], contact_pref: "sms" }));
    expect(r.data).toMatchObject({ contact_methods: ["phone", "sms"], contact_pref: "sms" });
  });
  it("sms-only merchant", () => {
    const r = parseProviderForm(fd({ ...base, contact_form: "1", contact_methods: "sms", contact_pref: "sms" }));
    expect(r.data).toMatchObject({ contact_methods: ["sms"], contact_pref: "sms" });
  });
  it("rejects wechat without a wechat id and a preference that isn't picked", () => {
    expect(parseProviderForm(fd({ ...base, contact_form: "1", contact_methods: "wechat", contact_pref: "wechat" })).fieldErrors)
      .toHaveProperty("contact_methods");
    expect(parseProviderForm(fd({ ...base, contact_form: "1", contact_methods: "phone", contact_pref: "wechat" })).fieldErrors)
      .toHaveProperty("contact_pref");
  });
});
