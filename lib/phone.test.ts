import { describe, expect, it } from "vitest";
import { formatUsPhone, toE164 } from "./phone";

describe("toE164", () => {
  it("normalizes common US formats", () => {
    expect(toE164("(713) 555-0101")).toBe("+17135550101");
    expect(toE164("1-713-555-0101")).toBe("+17135550101");
    expect(toE164("+1 713 555 0101")).toBe("+17135550101");
  });
  it("rejects invalid numbers", () => {
    expect(toE164("555-0101")).toBeNull();
    expect(toE164("")).toBeNull();
  });
  it("formats for display", () => {
    expect(formatUsPhone("+17135550101")).toBe("(713) 555-0101");
  });
});
