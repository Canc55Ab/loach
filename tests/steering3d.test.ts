import { describe, it, expect } from "vitest";
import { Vector3 } from "../src/math/vector3";
import {
  seek3d,
  flee3d,
  arrive3d,
  pursuit3d,
  wander3d,
  separation3d,
  alignment3d,
  cohesion3d,
  steer3d,
} from "../src/algorithms/steering3d";
import { createRandom } from "../src/math/random";

describe("steering3d", () => {
  describe("seek / flee", () => {
    it("seek 朝目标移动", () => {
      const result = seek3d(new Vector3(0, 0, 0), new Vector3(10, 0, 0), 5);
      expect(result.x).toBeCloseTo(5, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it("flee 背离目标", () => {
      const result = flee3d(new Vector3(0, 0, 0), new Vector3(0, 0, 10), 5);
      expect(result.z).toBeCloseTo(-5, 10);
    });

    it("与目标重合时返回零向量", () => {
      expect(seek3d(new Vector3(1, 1, 1), new Vector3(1, 1, 1), 5).toArray()).toEqual([0, 0, 0]);
    });

    it("不修改传入参数", () => {
      const position = new Vector3(0, 0, 0);
      const target = new Vector3(10, 0, 0);
      seek3d(position, target, 5);
      expect(position.toArray()).toEqual([0, 0, 0]);
      expect(target.toArray()).toEqual([10, 0, 0]);
    });
  });

  describe("arrive", () => {
    it("远离目标时全速", () => {
      const result = arrive3d(new Vector3(0, 0, 0), new Vector3(100, 0, 0), 10, 20);
      expect(result.length).toBeCloseTo(10, 10);
    });

    it("进入减速半径后速度下降", () => {
      const result = arrive3d(new Vector3(0, 0, 0), new Vector3(10, 0, 0), 10, 20);
      expect(result.length).toBeCloseTo(5, 10);
    });
  });

  describe("pursuit", () => {
    it("朝目标预测位置移动", () => {
      const result = pursuit3d(
        new Vector3(0, 0, 0),
        new Vector3(10, 0, 0),
        new Vector3(5, 0, 0),
        5,
        1
      );
      expect(result.x).toBeCloseTo(5, 10);
    });
  });

  describe("wander", () => {
    it("返回不超过最大速度的速度", () => {
      const rand = createRandom(1);
      const result = wander3d(
        new Vector3(0, 0, 0),
        new Vector3(1, 0, 0),
        5,
        { radius: 30, jitter: 0.5, direction: new Vector3(1, 0, 0) },
        rand
      );
      expect(result.length).toBeCloseTo(5, 10);
    });
  });

  describe("群体行为", () => {
    it("separation 使单位远离邻居", () => {
      const result = separation3d(
        new Vector3(0, 0, 0),
        [new Vector3(5, 0, 0)],
        10,
        20
      );
      expect(result.x).toBeCloseTo(-10, 6);
    });

    it("separation 超出半径的邻居不产生影响", () => {
      const result = separation3d(
        new Vector3(0, 0, 0),
        [new Vector3(100, 0, 0)],
        10,
        20
      );
      expect(result.toArray()).toEqual([0, 0, 0]);
    });

    it("alignment 朝邻居平均方向", () => {
      const result = alignment3d(
        new Vector3(0, 0, 0),
        [new Vector3(10, 0, 0), new Vector3(20, 0, 0)],
        5
      );
      expect(result.x).toBeCloseTo(5, 6);
    });

    it("cohesion 朝邻居质心", () => {
      const result = cohesion3d(
        new Vector3(0, 0, 0),
        [new Vector3(10, 0, 0), new Vector3(30, 0, 0)],
        5
      );
      expect(result.x).toBeCloseTo(5, 6);
    });

    it("没有邻居时返回零向量", () => {
      expect(alignment3d(new Vector3(0, 0, 0), [], 5).toArray()).toEqual([0, 0, 0]);
      expect(cohesion3d(new Vector3(0, 0, 0), [], 5).toArray()).toEqual([0, 0, 0]);
    });
  });

  describe("steer", () => {
    it("转向力不超过上限", () => {
      const result = steer3d(new Vector3(0, 0, 0), new Vector3(100, 0, 0), 3);
      expect(result.length).toBeCloseTo(3, 10);
    });

    it("无需修正时转向力为零", () => {
      const result = steer3d(new Vector3(1, 0, 0), new Vector3(1, 0, 0), 3);
      expect(result.toArray()).toEqual([0, 0, 0]);
    });
  });

  describe("退化输入", () => {
    it("flee 与目标重合时返回零向量", () => {
      const result = flee3d(new Vector3(2, 2, 2), new Vector3(2, 2, 2), 5);
      expect(result.toArray()).toEqual([0, 0, 0]);
      expect(Number.isNaN(result.x)).toBe(false);
      expect(Number.isNaN(result.y)).toBe(false);
      expect(Number.isNaN(result.z)).toBe(false);
    });

    it("arrive 已在目标点时返回零向量", () => {
      const result = arrive3d(new Vector3(1, 1, 1), new Vector3(1, 1, 1), 10, 20);
      expect(result.toArray()).toEqual([0, 0, 0]);
      expect(Number.isNaN(result.length)).toBe(false);
    });

    it("arrive 距离等于减速半径时按全速处理", () => {
      const boundary = arrive3d(new Vector3(0, 0, 0), new Vector3(20, 0, 0), 10, 20);
      expect(boundary.length).toBeCloseTo(10, 10);
      // 略微进入减速半径后速度下降
      const inside = arrive3d(new Vector3(0, 0, 0), new Vector3(19.999, 0, 0), 10, 20);
      expect(inside.length).toBeLessThan(10);
      expect(inside.length).toBeCloseTo(9.9995, 4);
    });
  });

  describe("wander 的退化场景", () => {
    it("速度为零且未指定方向时回退到 +Z 朝向", () => {
      const rand = createRandom(21);
      const result = wander3d(new Vector3(0, 0, 0), new Vector3(0, 0, 0), 5, {}, rand);
      expect(Number.isNaN(result.x)).toBe(false);
      expect(Number.isNaN(result.y)).toBe(false);
      expect(Number.isNaN(result.z)).toBe(false);
      expect(result.length).toBeCloseTo(5, 10);
      // 回退朝向为 +Z，扰动轴取 up，偏移落在 XY 平面内
      expect(result.z).toBeCloseTo(0, 10);
    });

    it("朝向接近竖直时扰动落在 XZ 平面", () => {
      const rand = createRandom(23);
      const result = wander3d(
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 0),
        5,
        { direction: new Vector3(0, 1, 0) },
        rand
      );
      expect(Number.isNaN(result.x)).toBe(false);
      // |current.y| >= 0.9 时扰动轴取 right，偏移落在 XZ 平面内
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.length).toBeCloseTo(5, 10);
    });

    it("缺省参数下结果可复现", () => {
      const a = wander3d(new Vector3(0, 0, 0), new Vector3(0, 0, 0), 5, {}, createRandom(24));
      const b = wander3d(new Vector3(0, 0, 0), new Vector3(0, 0, 0), 5, {}, createRandom(24));
      expect(a.toArray()).toEqual(b.toArray());
      expect(a.length).toBeCloseTo(5, 10);
    });
  });

  describe("群体行为的退化场景", () => {
    it("邻居对称时 separation 返回零向量", () => {
      const result = separation3d(
        new Vector3(0, 0, 0),
        [new Vector3(5, 0, 0), new Vector3(-5, 0, 0)],
        10,
        20
      );
      expect(result.toArray()).toEqual([0, 0, 0]);
      expect(Number.isNaN(result.x)).toBe(false);
      expect(Number.isNaN(result.y)).toBe(false);
      expect(Number.isNaN(result.z)).toBe(false);
    });

    it("邻居对称时 alignment 返回零向量", () => {
      const result = alignment3d(
        new Vector3(0, 0, 0),
        [new Vector3(5, 0, 0), new Vector3(-5, 0, 0)],
        5
      );
      expect(result.toArray()).toEqual([0, 0, 0]);
      expect(Number.isNaN(result.length)).toBe(false);
    });
  });
});
