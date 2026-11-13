import { describe, it, expect } from "vitest";
import { Vector2 } from "../src/math/vector2";
import {
  seek,
  flee,
  arrive,
  pursuit,
  wander,
  separation,
  alignment,
  cohesion,
  steer,
  clampLength,
} from "../src/algorithms/steering";
import { createRandom } from "../src/math/random";

describe("steering", () => {
  describe("seek / flee", () => {
    it("seek 朝目标移动", () => {
      const result = seek(new Vector2(0, 0), new Vector2(10, 0), 5);
      expect(result.x).toBeCloseTo(5, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it("flee 背离目标", () => {
      const result = flee(new Vector2(0, 0), new Vector2(10, 0), 5);
      expect(result.x).toBeCloseTo(-5, 10);
    });

    it("与目标重合时返回零向量", () => {
      expect(seek(new Vector2(1, 1), new Vector2(1, 1), 5).toArray()).toEqual([0, 0]);
      expect(flee(new Vector2(1, 1), new Vector2(1, 1), 5).toArray()).toEqual([0, 0]);
    });

    it("不修改传入参数", () => {
      const position = new Vector2(0, 0);
      const target = new Vector2(10, 0);
      seek(position, target, 5);
      expect(position.toArray()).toEqual([0, 0]);
      expect(target.toArray()).toEqual([10, 0]);
    });
  });

  describe("arrive", () => {
    it("远离目标时全速", () => {
      const result = arrive(new Vector2(0, 0), new Vector2(100, 0), 10, 20);
      expect(result.length).toBeCloseTo(10, 10);
    });

    it("进入减速半径后速度下降", () => {
      const result = arrive(new Vector2(0, 0), new Vector2(10, 0), 10, 20);
      expect(result.length).toBeLessThan(10);
      expect(result.length).toBeCloseTo(5, 10);
    });

    it("已到达目标时速度为零", () => {
      expect(arrive(new Vector2(5, 5), new Vector2(5, 5), 10, 20).toArray()).toEqual([0, 0]);
    });
  });

  describe("pursuit", () => {
    it("朝目标预测位置移动", () => {
      const result = pursuit(
        new Vector2(0, 0),
        new Vector2(10, 0),
        new Vector2(5, 0),
        5,
        1
      );
      expect(result.x).toBeCloseTo(5, 10);
    });
  });

  describe("wander", () => {
    it("返回不超过最大速度的速度", () => {
      const rand = createRandom(1);
      const result = wander(
        new Vector2(0, 0),
        new Vector2(1, 0),
        5,
        { radius: 30, jitter: 0.5, angle: 0 },
        rand
      );
      expect(result.length).toBeCloseTo(5, 10);
    });

    it("不修改传入参数", () => {
      const rand = createRandom(2);
      const position = new Vector2(3, 4);
      wander(position, new Vector2(1, 0), 5, {}, rand);
      expect(position.toArray()).toEqual([3, 4]);
    });
  });

  describe("群体行为", () => {
    it("separation 使单位远离邻居", () => {
      const position = new Vector2(0, 0);
      const neighbors = [new Vector2(5, 0), new Vector2(-5, 0)];
      const result = separation(position, neighbors, 10, 20);

      // 左右各一个邻居，合力接近 0；单个邻居时才会产生明显排斥
      expect(result.length).toBeCloseTo(0, 6);
    });

    it("separation 单个邻居时远离对方", () => {
      const position = new Vector2(0, 0);
      const result = separation(position, [new Vector2(5, 0)], 10, 20);
      expect(result.x).toBeCloseTo(-10, 6);
    });

    it("separation 超出半径的邻居不产生影响", () => {
      const position = new Vector2(0, 0);
      const result = separation(position, [new Vector2(100, 0)], 10, 20);
      expect(result.toArray()).toEqual([0, 0]);
    });

    it("alignment 朝邻居平均方向", () => {
      const position = new Vector2(0, 0);
      const neighbors = [new Vector2(10, 0), new Vector2(20, 0)];
      const result = alignment(position, neighbors, 5);
      expect(result.x).toBeCloseTo(5, 6);
    });

    it("cohesion 朝邻居质心", () => {
      const position = new Vector2(0, 0);
      const neighbors = [new Vector2(10, 0), new Vector2(30, 0)];
      const result = cohesion(position, neighbors, 5);
      expect(result.x).toBeCloseTo(5, 6);
    });

    it("没有邻居时返回零向量", () => {
      expect(alignment(new Vector2(0, 0), [], 5).toArray()).toEqual([0, 0]);
      expect(cohesion(new Vector2(0, 0), [], 5).toArray()).toEqual([0, 0]);
    });

    it("邻居相对位置的平均值为零时返回零向量", () => {
      const position = new Vector2(0, 0);
      // 两个邻居一左一右，相对位移相互抵消
      const neighbors = [new Vector2(10, 5), new Vector2(-10, -5)];
      const result = alignment(position, neighbors, 5);
      expect(result.toArray()).toEqual([0, 0]);
      // 不得出现 NaN
      expect(Number.isNaN(result.x)).toBe(false);
      expect(Number.isNaN(result.y)).toBe(false);
    });
  });

  describe("steer", () => {
    it("转向力不超过上限", () => {
      const result = steer(new Vector2(0, 0), new Vector2(100, 0), 3);
      expect(result.length).toBeCloseTo(3, 10);
    });

    it("无需修正时转向力为零", () => {
      const result = steer(new Vector2(1, 0), new Vector2(1, 0), 3);
      expect(result.toArray()).toEqual([0, 0]);
    });
  });

  describe("clampLength", () => {
    it("限制向量长度", () => {
      expect(clampLength(new Vector2(3, 4), 5).length).toBeCloseTo(5, 10);
      expect(clampLength(new Vector2(1, 0), 5).length).toBeCloseTo(1, 10);
    });
  });
});
