import { describe, it, expect } from "vitest";
import { rad, random, randomUint, distance, abs } from "../src/math";

describe("math", () => {
  describe("rad", () => {
    it("返回从起点指向终点的有向角（+X 轴为 0，逆时针为正）", () => {
      expect(rad({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0, 10);
      expect(rad({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2, 10);
      expect(rad({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(Math.PI / 4, 10);
      expect(rad({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(Math.PI, 10);
      expect(rad({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(-Math.PI / 2, 10);
    });

    it("起点不在原点时同样正确", () => {
      expect(rad({ x: 5, y: 5 }, { x: 6, y: 5 })).toBeCloseTo(0, 10);
      expect(rad({ x: 5, y: 5 }, { x: 5, y: 6 })).toBeCloseTo(Math.PI / 2, 10);
      expect(rad({ x: 5, y: 5 }, { x: 4, y: 5 })).toBeCloseTo(Math.PI, 10);
    });

    it("两点重合时返回 0", () => {
      expect(rad({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0);
    });
  });

  describe("random", () => {
    it("结果恒落在 [min, max) 内", () => {
      for (let i = 0; i < 1000; i++) {
        const value = random(1, 3);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThan(3);
      }
    });

    it("from 大于 to 时自动交换上下界", () => {
      for (let i = 0; i < 1000; i++) {
        const value = random(3, 1);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThan(3);
      }
    });

    it("fixed 省略时取 0 位小数", () => {
      const value = random(1, 3);
      expect(Number.isInteger(value)).toBe(true);
    });

    it("按 fixed 保留小数位", () => {
      for (let i = 0; i < 200; i++) {
        const value = random(0, 1, 2);
        const decimals = (value.toString().split(".")[1] || "").length;
        expect(decimals).toBeLessThanOrEqual(2);
      }
    });

    it("from 与 to 相同时返回该值", () => {
      expect(random(5, 5)).toBe(5);
    });
  });

  describe("randomUint", () => {
    it("返回区间内的整数", () => {
      for (let i = 0; i < 1000; i++) {
        const value = randomUint(1, 3);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThan(3);
      }
    });

    it("from 大于 to 时自动交换上下界", () => {
      for (let i = 0; i < 1000; i++) {
        const value = randomUint(3, 1);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThan(3);
      }
    });

    it("小数边界取整到 [ceil(min), floor(max))", () => {
      for (let i = 0; i < 200; i++) {
        const value = randomUint(1.5, 3.5);
        expect(value).toBeGreaterThanOrEqual(2);
        expect(value).toBeLessThan(3);
      }
    });
  });

  describe("distance / abs", () => {
    it("计算两点距离", () => {
      expect(distance(0, 0, 3, 4)).toBe(5);
    });

    it("返回绝对值", () => {
      expect(abs(-3)).toBe(3);
      expect(abs(3)).toBe(3);
      expect(abs(0)).toBe(0);
    });
  });
});
