import { describe, expect, it } from "vitest";
import { ANYWHERE_AREA, cleanServiceAreas, getCity, formatServiceAreas } from "@/constants/cities";

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

describe("不限地区", () => {
  const city = getCity("houston");
  it("显示不限地区", () => {
    expect(formatServiceAreas("houston", [ANYWHERE_AREA])).toBe("不限地区（线上/远程服务）");
  });
  it("和片区互斥，只存 Anywhere", () => {
    expect(cleanServiceAreas(city, ["Katy", ANYWHERE_AREA])).toEqual([ANYWHERE_AREA]);
  });
  it("不认识的片区被丢掉", () => {
    expect(cleanServiceAreas(city, ["Katy", "Mars"])).toEqual(["Katy"]);
  });
});
