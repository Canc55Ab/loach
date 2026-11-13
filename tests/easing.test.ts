import { describe, it, expect } from "vitest";
import {
  easings,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeOutBack,
  easeInOutBounce,
  easeInOutExpo,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  smoothstep,
  smootherstep,
  inverseLerp,
  remap,
  pingPong,
  clamp01,
} from "../src/math/easing";

describe("easing", () => {
  describe("基础性质", () => {
    it("全部缓动函数满足 f(0)=0、f(1)=1", () => {
      const names = Object.keys(easings) as Array<keyof typeof easings>;
      for (const name of names) {
        const fn = easings[name];
        expect(fn(0), `${name}(0)`).toBeCloseTo(0, 6);
        expect(fn(1), `${name}(1)`).toBeCloseTo(1, 6);
      }
    });

    it("入参被限制到 [0, 1]", () => {
      expect(clamp01(-1)).toBe(0);
      expect(clamp01(2)).toBe(1);
      expect(easeInQuad(-1)).toBe(0);
      expect(easeInQuad(2)).toBe(1);
    });

    it("二次缓动端点与中点正确", () => {
      expect(easeInQuad(0.5)).toBeCloseTo(0.25, 10);
      expect(easeOutQuad(0.5)).toBeCloseTo(0.75, 10);
      expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 10);
    });

    it("回弹缓出在中段过冲", () => {
      expect(easeOutBack(0.7)).toBeGreaterThan(1);
    });

    it("回弹缓入在中段为负", () => {
      expect(easings.easeInBack(0.3)).toBeLessThan(0);
    });

    it("反弹缓动始终落在 [0, 1] 区间内", () => {
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const value = easeInOutBounce(t);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("工具函数", () => {
    it("smoothstep 在区间内单调且端点为 0/1", () => {
      expect(smoothstep(0, 1, 0)).toBe(0);
      expect(smoothstep(0, 1, 1)).toBe(1);
      expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 10);
      expect(smoothstep(0, 1, -1)).toBe(0);
      expect(smoothstep(0, 1, 2)).toBe(1);
    });

    it("smootherstep 中点为 0.5", () => {
      expect(smootherstep(0, 1, 0.5)).toBeCloseTo(0.5, 10);
    });

    it("smoothstep 起止相同时不除零", () => {
      expect(smoothstep(1, 1, 1)).toBe(1);
      expect(smoothstep(1, 1, 0)).toBe(0);
    });

    it("inverseLerp 反推插值系数", () => {
      expect(inverseLerp(0, 10, 5)).toBeCloseTo(0.5, 10);
      expect(inverseLerp(0, 0, 3)).toBe(0);
    });

    it("remap 区间重映射", () => {
      expect(remap(5, 0, 10, 0, 100)).toBeCloseTo(50, 10);
      expect(remap(0, 0, 10, 20, 30)).toBeCloseTo(20, 10);
    });

    it("pingPong 往复", () => {
      expect(pingPong(0)).toBe(0);
      expect(pingPong(0.5)).toBe(1);
      expect(pingPong(1)).toBe(0);
    });
  });

  describe("中段取值（区间内部的分支）", () => {
    it("easeInOutExpo 在中段两半取不同值", () => {
      expect(easeInOutExpo(0.25)).toBeCloseTo(0.015625, 10);
      expect(easeInOutExpo(0.75)).toBeCloseTo(0.984375, 10);
    });

    it("easeInElastic 中段为负值（先回拉）", () => {
      expect(easeInElastic(0.25)).toBeCloseTo(-0.005524271728, 9);
      expect(easeInElastic(0.5)).toBeCloseTo(-0.015625, 10);
    });

    it("easeOutElastic 中段可超过 1（过冲）", () => {
      expect(easeOutElastic(0.25)).toBeCloseTo(0.911611652352, 9);
      expect(easeOutElastic(0.5)).toBeCloseTo(1.015625, 10);
    });

    it("easeInOutElastic 中段两半对称", () => {
      expect(easeInOutElastic(0.25)).toBeCloseTo(0.011969444424, 9);
      expect(easeInOutElastic(0.75)).toBeCloseTo(0.988030555576, 9);
    });

    it("中段取值仍被限制在 [0, 1] 输入域内", () => {
      expect(easeInOutExpo(-1)).toBeCloseTo(0, 10);
      expect(easeInOutExpo(2)).toBeCloseTo(1, 10);
      expect(easeInElastic(-1)).toBeCloseTo(0, 10);
      expect(easeOutElastic(2)).toBeCloseTo(1, 10);
      expect(easeInOutElastic(-1)).toBeCloseTo(0, 10);
    });
  });

  describe("退化输入", () => {
    it("smootherstep 起止相同时退化为阶跃", () => {
      expect(smootherstep(5, 5, 4)).toBe(0);
      expect(smootherstep(5, 5, 5)).toBe(1);
      expect(smootherstep(5, 5, 6)).toBe(1);
    });

    it("smoothstep 起止相同时退化为阶跃", () => {
      expect(smoothstep(5, 5, 4)).toBe(0);
      expect(smoothstep(5, 5, 6)).toBe(1);
    });

    it("inverseLerp 起止相同时返回 0", () => {
      expect(inverseLerp(3, 3, 10)).toBe(0);
      expect(inverseLerp(0, 10, 5)).toBeCloseTo(0.5, 10);
    });

    it("remap 输入区间退化为零时返回输出下限", () => {
      expect(remap(5, 2, 2, 100, 200)).toBe(100);
      expect(remap(5, 0, 10, 0, 100)).toBeCloseTo(50, 10);
    });
  });
});
