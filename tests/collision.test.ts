import { describe, it, expect } from "vitest";
import {
  getBounds,
  aabbIntersects,
  rectIntersects,
  circleIntersects,
  circleRectIntersects,
  intersects,
  pointInBounds,
  pointInShape,
  getTranslation,
  raycast,
  rayBounds,
  sweptAabb,
  boundsIntersectShape,
} from "../src/patterns/collision";
import type { ICircleShape, IRectShape } from "../src/patterns/collision";

function rect(x: number, y: number, width: number, height: number): IRectShape {
  return { shape: "rect", x, y, width, height };
}

function circle(x: number, y: number, radius: number): ICircleShape {
  return { shape: "circle", x, y, radius };
}

describe("collision", () => {
  describe("getBounds", () => {
    it("矩形的包围盒", () => {
      expect(getBounds(rect(10, 20, 30, 40))).toEqual({
        minX: 10,
        minY: 20,
        maxX: 40,
        maxY: 60,
      });
    });

    it("圆的包围盒", () => {
      expect(getBounds(circle(10, 10, 5))).toEqual({
        minX: 5,
        minY: 5,
        maxX: 15,
        maxY: 15,
      });
    });
  });

  describe("相交判定", () => {
    it("矩形相交", () => {
      expect(rectIntersects(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true);
      expect(rectIntersects(rect(0, 0, 10, 10), rect(20, 20, 10, 10))).toBe(false);
    });

    it("圆相交", () => {
      expect(circleIntersects(circle(0, 0, 5), circle(8, 0, 5))).toBe(true);
      expect(circleIntersects(circle(0, 0, 5), circle(20, 0, 5))).toBe(false);
    });

    it("圆与矩形相交", () => {
      expect(circleRectIntersects(circle(5, 5, 3), rect(0, 0, 10, 10))).toBe(true);
      expect(circleRectIntersects(circle(20, 20, 3), rect(0, 0, 10, 10))).toBe(false);
      // 圆心在矩形外但圆覆盖到矩形
      expect(circleRectIntersects(circle(12, 5, 4), rect(0, 0, 10, 10))).toBe(true);
    });

    it("通用判定对两种顺序都成立", () => {
      expect(intersects(rect(0, 0, 10, 10), circle(8, 8, 5))).toBe(true);
      expect(intersects(circle(8, 8, 5), rect(0, 0, 10, 10))).toBe(true);
    });

    it("包围盒相交判定", () => {
      expect(
        aabbIntersects({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, { minX: 5, minY: 5, maxX: 15, maxY: 15 })
      ).toBe(true);
      expect(
        aabbIntersects({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, { minX: 20, minY: 20, maxX: 30, maxY: 30 })
      ).toBe(false);
    });
  });

  describe("点判定", () => {
    it("点在形状内", () => {
      expect(pointInShape({ x: 5, y: 5 }, rect(0, 0, 10, 10))).toBe(true);
      expect(pointInShape({ x: 15, y: 5 }, rect(0, 0, 10, 10))).toBe(false);
      expect(pointInShape({ x: 5, y: 5 }, circle(0, 0, 10))).toBe(true);
      expect(pointInShape({ x: 15, y: 0 }, circle(0, 0, 10))).toBe(false);
    });

    it("点在包围盒内", () => {
      const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      expect(pointInBounds({ x: 0, y: 0 }, bounds)).toBe(true);
      expect(pointInBounds({ x: 10, y: 10 }, bounds)).toBe(true);
      expect(pointInBounds({ x: 11, y: 10 }, bounds)).toBe(false);
    });
  });

  describe("最小平移向量", () => {
    it("矩形重叠时给出分离向量", () => {
      const translation = getTranslation(rect(0, 0, 10, 10), rect(5, 0, 10, 10));
      expect(translation).not.toBeNull();
      expect(translation?.magnitude).toBeCloseTo(5, 10);
      expect(translation?.x).toBeCloseTo(-5, 10);
    });

    it("圆重叠时沿圆心连线推出", () => {
      const translation = getTranslation(circle(0, 0, 5), circle(6, 0, 5));
      expect(translation?.magnitude).toBeCloseTo(4, 10);
      expect(translation?.x).toBeCloseTo(-4, 10);
    });

    it("不相交时返回 null", () => {
      expect(getTranslation(rect(0, 0, 10, 10), rect(50, 50, 10, 10))).toBeNull();
    });
  });

  describe("射线检测", () => {
    it("命中矩形返回距离", () => {
      const distance = raycast({ x: 0, y: 0 }, { x: 1, y: 0 }, rect(10, -5, 10, 10));
      expect(distance).toBeCloseTo(10, 10);
    });

    it("未命中返回 null", () => {
      expect(raycast({ x: 0, y: 0 }, { x: 1, y: 0 }, rect(10, 50, 10, 10))).toBeNull();
    });

    it("命中圆返回距离", () => {
      const distance = raycast({ x: 0, y: 0 }, { x: 1, y: 0 }, circle(10, 0, 2));
      expect(distance).toBeCloseTo(8, 10);
    });

    it("射线起点在圆内返回 0", () => {
      const distance = raycast({ x: 0, y: 0 }, { x: 1, y: 0 }, circle(0, 0, 5));
      expect(distance).toBeCloseTo(0, 10);
    });

    it("零向量方向返回 null", () => {
      expect(raycast({ x: 0, y: 0 }, { x: 0, y: 0 }, rect(0, 0, 10, 10))).toBeNull();
    });

    it("rayBounds 直接对包围盒求交", () => {
      const bounds = { minX: 5, minY: -5, maxX: 15, maxY: 5 };
      expect(rayBounds({ x: 0, y: 0 }, { x: 1, y: 0 }, bounds)).toBeCloseTo(5, 10);
    });
  });

  describe("扫掠碰撞", () => {
    it("移动的盒子撞上目标时返回碰撞时刻", () => {
      const result = sweptAabb(
        { minX: 0, minY: 0, maxX: 10, maxY: 10, vx: 100, vy: 0 },
        { minX: 50, minY: 0, maxX: 60, maxY: 10 },
        1
      );
      // 盒子右边缘从 10 移动到 110，目标左边缘 50，接触时刻为 0.4
      expect(result).not.toBeNull();
      expect(result as number).toBeCloseTo(0.4, 6);
    });

    it("未碰撞返回 null", () => {
      const result = sweptAabb(
        { minX: 0, minY: 0, maxX: 10, maxY: 10, vx: 1, vy: 0 },
        { minX: 500, minY: 0, maxX: 510, maxY: 10 },
        1
      );
      expect(result).toBeNull();
    });

    it("dt 为 0 返回 null", () => {
      const result = sweptAabb(
        { minX: 0, minY: 0, maxX: 10, maxY: 10, vx: 100, vy: 0 },
        { minX: 50, minY: 0, maxX: 60, maxY: 10 },
        0
      );
      expect(result).toBeNull();
    });
  });

  describe("包围盒与形状求交", () => {
    it("形状落在包围盒内时相交", () => {
      expect(
        boundsIntersectShape({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, rect(5, 5, 2, 2))
      ).toBe(true);
      expect(
        boundsIntersectShape({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, circle(2, 2, 1))
      ).toBe(true);
    });

    it("形状在包围盒外时不相交", () => {
      expect(
        boundsIntersectShape({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, rect(50, 50, 2, 2))
      ).toBe(false);
      expect(
        boundsIntersectShape({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, circle(50, 50, 1))
      ).toBe(false);
    });
  });

  describe("最小平移向量补充分支", () => {
    it("矩形纵向重叠时沿 Y 轴推出", () => {
      // X 方向重叠 10、Y 方向重叠 5，取更浅的 Y 轴
      const translation = getTranslation(rect(0, 0, 10, 10), rect(0, 5, 10, 10));
      expect(translation?.x).toBeCloseTo(0, 10);
      expect(translation?.y).toBeCloseTo(-5, 10);
      expect(translation?.magnitude).toBeCloseTo(5, 10);
    });

    it("矩形中心在对方右侧时沿正 X 推出", () => {
      // a 的中心 x=10 在 b 的中心 x=5 右侧，应向 +X 推
      const translation = getTranslation(rect(5, 0, 10, 10), rect(0, 0, 10, 10));
      expect(translation?.x).toBeCloseTo(5, 10);
      expect(translation?.magnitude).toBeCloseTo(5, 10);
    });

    it("两个圆心重合时沿 +X 推出", () => {
      const translation = getTranslation(circle(5, 5, 3), circle(5, 5, 4));
      expect(translation?.x).toBeCloseTo(7, 10);
      expect(translation?.y).toBeCloseTo(0, 10);
      expect(translation?.magnitude).toBeCloseTo(7, 10);
    });

    it("圆心在矩形内时沿最近的边推出", () => {
      // 靠左
      const left = getTranslation(circle(1, 5, 2), rect(0, 0, 10, 10));
      expect(left?.x).toBeCloseTo(-3, 10);
      expect(left?.y).toBeCloseTo(0, 10);
      expect(left?.magnitude).toBeCloseTo(3, 10);
      // 靠右
      const right = getTranslation(circle(9, 5, 2), rect(0, 0, 10, 10));
      expect(right?.x).toBeCloseTo(3, 10);
      expect(right?.magnitude).toBeCloseTo(3, 10);
      // 靠上
      const top = getTranslation(circle(5, 1, 2), rect(0, 0, 10, 10));
      expect(top?.y).toBeCloseTo(-3, 10);
      expect(top?.magnitude).toBeCloseTo(3, 10);
      // 靠下
      const bottom = getTranslation(circle(5, 9, 2), rect(0, 0, 10, 10));
      expect(bottom?.y).toBeCloseTo(3, 10);
      expect(bottom?.magnitude).toBeCloseTo(3, 10);
    });

    it("圆心在矩形外时沿圆心到最近点的方向推出", () => {
      // 圆在矩形右侧，圆心 a 在前：推出方向为 +X
      const circleFirst = getTranslation(circle(11, 5, 2), rect(0, 0, 10, 10));
      expect(circleFirst?.x).toBeCloseTo(1, 10);
      expect(circleFirst?.y).toBeCloseTo(0, 10);
      expect(circleFirst?.magnitude).toBeCloseTo(1, 10);
      // 矩形在前：方向取反，把矩形推离圆
      const rectFirst = getTranslation(rect(0, 0, 10, 10), circle(11, 5, 2));
      expect(rectFirst?.x).toBeCloseTo(-1, 10);
      expect(rectFirst?.magnitude).toBeCloseTo(1, 10);
    });
  });

  describe("射线检测补充分支", () => {
    it("方向 x 分量为 0 且起点在包围盒横向之外时不命中", () => {
      const bounds = { minX: 5, minY: -5, maxX: 15, maxY: 5 };
      expect(rayBounds({ x: 0, y: 0 }, { x: 0, y: 1 }, bounds)).toBeNull();
      expect(rayBounds({ x: 20, y: 0 }, { x: 0, y: 1 }, bounds)).toBeNull();
    });

    it("方向 x 分量为 0 但起点横向在内时仍可命中", () => {
      const bounds = { minX: -5, minY: 5, maxX: 5, maxY: 15 };
      expect(rayBounds({ x: 0, y: 0 }, { x: 0, y: 1 }, bounds)).toBeCloseTo(5, 10);
    });

    it("方向 y 分量为 0 且起点在包围盒纵向之外时不命中", () => {
      const bounds = { minX: -5, minY: 5, maxX: 5, maxY: 15 };
      expect(rayBounds({ x: 0, y: 0 }, { x: 1, y: 0 }, bounds)).toBeNull();
      expect(rayBounds({ x: 0, y: 20 }, { x: 1, y: 0 }, bounds)).toBeNull();
    });

    it("射线背向包围盒时不命中", () => {
      const bounds = { minX: 5, minY: -5, maxX: 15, maxY: 5 };
      expect(rayBounds({ x: 0, y: 0 }, { x: -1, y: 0 }, bounds)).toBeNull();
    });

    it("圆射线未命中返回 null", () => {
      expect(raycast({ x: 0, y: 0 }, { x: 1, y: 0 }, circle(0, 50, 2))).toBeNull();
    });

    it("射线背向圆时返回 null", () => {
      // 起点在圆外且方向背离圆，两个交点参数都为负
      expect(raycast({ x: 20, y: 0 }, { x: 1, y: 0 }, circle(0, 0, 5))).toBeNull();
    });

    it("圆的零向量方向返回 null", () => {
      expect(raycast({ x: 0, y: 0 }, { x: 0, y: 0 }, circle(0, 0, 5))).toBeNull();
    });
  });

  describe("扫掠碰撞补充分支", () => {
    it("盒子背向目标移动时不碰撞", () => {
      const result = sweptAabb(
        { minX: 0, minY: 0, maxX: 10, maxY: 10, vx: -100, vy: 0 },
        { minX: 50, minY: 0, maxX: 60, maxY: 10 },
        1
      );
      expect(result).toBeNull();
    });

    it("目标在移动距离之外时不碰撞", () => {
      const result = sweptAabb(
        { minX: 0, minY: 0, maxX: 10, maxY: 10, vx: 1, vy: 0 },
        { minX: 100, minY: 0, maxX: 110, maxY: 10 },
        1
      );
      expect(result).toBeNull();
    });

    it("盒子静止不动时返回 null", () => {
      const result = sweptAabb(
        { minX: 0, minY: 0, maxX: 10, maxY: 10, vx: 0, vy: 0 },
        { minX: 5, minY: 0, maxX: 15, maxY: 10 },
        1
      );
      expect(result).toBeNull();
    });

    // 回归：sweptAabb 的目标膨胀曾把速度符号乘进半尺寸，
    // 负方向速度下 expanded 退化为一点，碰撞时刻偏晚 2*半尺寸/速度。已修复。
    it("负 y 方向移动同样能检出碰撞", () => {
      // 盒子向下移动，下边缘从 0 移到 -100，目标上边缘在 -40，接触时刻应为 0.4
      const result = sweptAabb(
        { minX: 0, minY: 0, maxX: 10, maxY: 10, vx: 0, vy: -100 },
        { minX: 0, minY: -50, maxX: 10, maxY: -40 },
        1
      );
      expect(result).not.toBeNull();
      expect(result as number).toBeCloseTo(0.4, 6);
    });

    it("负 x 方向移动同样能检出碰撞", () => {
      // 盒子向左移动，左边缘从 0 移到 -100，目标右边缘在 -50，接触时刻应为 0.5
      const result = sweptAabb(
        { minX: 0, minY: 0, maxX: 10, maxY: 10, vx: -100, vy: 0 },
        { minX: -60, minY: 0, maxX: -50, maxY: 10 },
        1
      );
      expect(result).not.toBeNull();
      expect(result as number).toBeCloseTo(0.5, 6);
    });
  });
});
