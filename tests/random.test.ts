import { describe, it, expect } from "vitest";
import {
  createRandom,
  randomInt,
  randomFloat,
  randomBool,
  randomSign,
  randomPick,
  weightedPick,
  shuffle,
  sample,
  gaussian,
  randomPointInCircle,
  randomPointOnCircle,
  randomPointInRect,
  randomUnitVector,
  bellCurve,
} from "../src/math/random";

describe("random", () => {
  describe("createRandom", () => {
    it("同种子产生完全相同的序列", () => {
      const a = createRandom(42);
      const b = createRandom(42);
      for (let i = 0; i < 20; i++) {
        expect(a()).toBe(b());
      }
    });

    it("输出落在 [0, 1)", () => {
      const rand = createRandom(1);
      for (let i = 0; i < 500; i++) {
        const value = rand();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it("不同种子产生不同序列", () => {
      const a = createRandom(1);
      const b = createRandom(2);
      const seqA = Array.from({ length: 10 }, () => a());
      const seqB = Array.from({ length: 10 }, () => b());
      expect(seqA).not.toEqual(seqB);
    });
  });

  describe("区间随机", () => {
    it("randomInt 返回区间内的整数", () => {
      const rand = createRandom(3);
      for (let i = 0; i < 500; i++) {
        const value = randomInt(1, 5, rand);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThan(5);
      }
    });

    it("randomInt 上下界颠倒时自动交换", () => {
      const rand = createRandom(3);
      const value = randomInt(5, 1, rand);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThan(5);
    });

    it("randomFloat 返回区间内的浮点数", () => {
      const rand = createRandom(4);
      for (let i = 0; i < 500; i++) {
        const value = randomFloat(-2, 3, rand);
        expect(value).toBeGreaterThanOrEqual(-2);
        expect(value).toBeLessThan(3);
      }
    });

    it("randomBool 按概率返回", () => {
      const rand = createRandom(6);
      let trues = 0;
      for (let i = 0; i < 1000; i++) {
        if (randomBool(0.3, rand)) trues++;
      }
      expect(trues).toBeGreaterThan(200);
      expect(trues).toBeLessThan(400);
    });

    it("randomSign 只返回 1 或 -1", () => {
      const rand = createRandom(8);
      for (let i = 0; i < 100; i++) {
        expect([1, -1]).toContain(randomSign(rand));
      }
    });
  });

  describe("集合操作", () => {
    it("randomPick 从数组中取元素", () => {
      const rand = createRandom(10);
      const items = ["a", "b", "c"];
      for (let i = 0; i < 100; i++) {
        expect(items).toContain(randomPick(items, rand));
      }
      expect(randomPick([], rand)).toBeUndefined();
    });

    it("weightedPick 按权重命中", () => {
      const rand = createRandom(12);
      const items = ["rare", "common"];
      const weights = [1, 9];
      let rare = 0;
      for (let i = 0; i < 10000; i++) {
        if (weightedPick(items, weights, rand) === "rare") rare++;
      }
      // 期望约 10%
      expect(rare).toBeGreaterThan(700);
      expect(rare).toBeLessThan(1300);
    });

    it("weightedPick 权重全为 0 时退化为等概率且不抛错", () => {
      const rand = createRandom(14);
      const items = ["a", "b"];
      expect(["a", "b"]).toContain(weightedPick(items, [0, 0], rand));
    });

    it("shuffle 不丢元素且不修改原数组", () => {
      const rand = createRandom(16);
      const items = [1, 2, 3, 4, 5];
      const result = shuffle(items, rand);
      expect(result).not.toBe(items);
      expect(items).toEqual([1, 2, 3, 4, 5]);
      expect(result.slice().sort((a, b) => a - b)).toEqual(items);
    });

    it("sample 无重复取样", () => {
      const rand = createRandom(18);
      const items = [1, 2, 3, 4, 5, 6];
      const result = sample(items, 3, rand);
      expect(result.length).toBe(3);
      expect(new Set(result).size).toBe(3);
    });

    it("sample 取样数超过总数时返回全部", () => {
      const rand = createRandom(20);
      expect(sample([1, 2], 5, rand).length).toBe(2);
    });
  });

  describe("分布", () => {
    it("gaussian 均值接近 0", () => {
      const rand = createRandom(22);
      let sum = 0;
      const count = 10000;
      for (let i = 0; i < count; i++) {
        sum += gaussian(0, 1, rand);
      }
      expect(Math.abs(sum / count)).toBeLessThan(0.1);
    });

    it("gaussian 服从指定均值与标准差", () => {
      const rand = createRandom(24);
      let sum = 0;
      let squareSum = 0;
      const count = 20000;
      for (let i = 0; i < count; i++) {
        const value = gaussian(10, 2, rand);
        sum += value;
        squareSum += (value - 10) * (value - 10);
      }
      expect(sum / count).toBeCloseTo(10, 0);
      expect(Math.sqrt(squareSum / count)).toBeCloseTo(2, 0);
    });

    it("bellCurve 输出在 [-1, 1]", () => {
      const rand = createRandom(26);
      for (let i = 0; i < 200; i++) {
        const value = bellCurve(rand);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("几何随机点", () => {
    it("圆内随机点落在半径内", () => {
      const rand = createRandom(28);
      for (let i = 0; i < 300; i++) {
        const point = randomPointInCircle(10, rand);
        expect(Math.sqrt(point.x * point.x + point.y * point.y)).toBeLessThanOrEqual(10);
      }
    });

    it("圆周随机点半径恒定", () => {
      const rand = createRandom(30);
      for (let i = 0; i < 100; i++) {
        const point = randomPointOnCircle(5, rand);
        expect(Math.sqrt(point.x * point.x + point.y * point.y)).toBeCloseTo(5, 10);
      }
    });

    it("矩形内随机点落在矩形内", () => {
      const rand = createRandom(32);
      for (let i = 0; i < 200; i++) {
        const point = randomPointInRect(10, 20, rand);
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThan(10);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThan(20);
      }
    });

    it("单位向量长度为 1", () => {
      const rand = createRandom(34);
      for (let i = 0; i < 100; i++) {
        const point = randomUnitVector(rand);
        expect(Math.sqrt(point.x * point.x + point.y * point.y)).toBeCloseTo(1, 10);
      }
    });
  });

  describe("边界与退化输入", () => {
    it("randomInt 在上下界重合时返回该值", () => {
      expect(randomInt(5, 5)).toBe(5);
      expect(randomInt(5, 5, createRandom(1))).toBe(5);
    });

    it("randomInt 在区间内没有整数时返回上取整的最小值", () => {
      // 1.2~1.8 之间没有整数
      expect(randomInt(1.2, 1.8)).toBe(2);
    });

    it("weightedPick 权重全为 0 时退化为等概率", () => {
      const items = ["a", "b", "c"];
      const picked = weightedPick(items, [0, 0, 0], createRandom(7));
      expect(items).toContain(picked);
    });

    it("weightedPick 权重总和为 0 时退化为等概率", () => {
      const items = ["a", "b"];
      const picked = weightedPick(items, [0, 0], () => 0.5);
      expect(items).toContain(picked);
    });

    it("weightedPick 空数组返回 undefined", () => {
      expect(weightedPick([], [], createRandom(1))).toBeUndefined();
    });

    it("weightedPick 权重为 0 的候选项不会被选中", () => {
      const items = ["never", "always"];
      // 随机源固定返回 0，roll = 0 * total = 0，减掉第一个权重后为 0（不小于 0）
      // 第二个权重为 1，roll 变为 -1，因此只会选中权重非 0 的项
      const picked = weightedPick(items, [0, 1], () => 0);
      expect(picked).toBe("always");
    });

    it("weightedPick 权重恰好命中边界时选中对应项", () => {
      const items = ["a", "b", "c"];
      // roll = 0.5 * 3 = 1.5，减去 a 的权重 1 后为 0.5，减 b 的权重 1 后为 -0.5 → 选中 b
      expect(weightedPick(items, [1, 1, 1], () => 0.5)).toBe("b");
    });
  });
});
