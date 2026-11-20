import { describe, expect, it } from "vitest";
import { getCity, formatServiceAreas } from "@/constants/cities";

describe("formatServiceAreas", () => {
  const all = getCity("houston").areas;
  it("全选显示大休斯顿地区（顺序无关）", () => {
    expect(formatServiceAreas("houston", [...all].reverse())).toBe("大休斯顿地区");
  });
  it("没全选就列片区名", () => {
    expect(formatServiceAreas("houston", ["Katy", "Sugar Land"])).toBe("Katy, Sugar Land");
    expect(formatServiceAreas("houston", ["Katy", "Pearland"], " / ")).toBe("Katy / Pearland");
  });
});
