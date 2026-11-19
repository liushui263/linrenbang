import { describe, expect, it } from "vitest";
import { clampOffset, cropDrawRect, fitWithin } from "./image";

describe("clampOffset", () => {
  it("图比框大：不能露出空白", () => {
    expect(clampOffset(10, 400, 200)).toBe(0);
    expect(clampOffset(-300, 400, 200)).toBe(-200);
    expect(clampOffset(-50, 400, 200)).toBe(-50);
  });
  it("图比框小：不能拖出框外", () => {
    expect(clampOffset(-10, 100, 200)).toBe(0);
    expect(clampOffset(150, 100, 200)).toBe(100);
    expect(clampOffset(50, 100, 200)).toBe(50);
  });
});

describe("fitWithin", () => {
  it("大图按长边缩小", () => {
    expect(fitWithin(4032, 3024, 2000)).toEqual({ w: 2000, h: 1500 });
    expect(fitWithin(3024, 4032, 2000)).toEqual({ w: 1500, h: 2000 });
  });
  it("小图不放大", () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ w: 800, h: 600 });
  });
});

describe("cropDrawRect", () => {
  it("按输出尺寸等比换算", () => {
    expect(cropDrawRect(-100, -50, 0.5, 1000, 800, 250, 500)).toEqual({ dx: -200, dy: -100, dw: 1000, dh: 800 });
  });
});
