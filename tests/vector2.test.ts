import { describe, it, expect } from "vitest";
import { Vector2 } from "../src/math/vector2";

describe("Vector2", () => {
  describe("构造与静态方法", () => {
    it("默认构造零向量", () => {
      const v = new Vector2();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.isZero).toBe(true);
    });

    it("提供方向常量", () => {
      expect(Vector2.right().toArray()).toEqual([1, 0]);
      expect(Vector2.left().toArray()).toEqual([-1, 0]);
      expect(Vector2.up().toArray()).toEqual([0, 1]);
      expect(Vector2.down().toArray()).toEqual([0, -1]);
      expect(Vector2.one().toArray()).toEqual([1, 1]);
    });

    it("由极坐标创建", () => {
      const v = Vector2.fromAngle(0, 5);
      expect(v.x).toBeCloseTo(5, 10);
      expect(v.y).toBeCloseTo(0, 10);
    });

    it("由任意 x/y 对象创建", () => {
      const v = Vector2.from({ x: 3, y: 4 });
      expect(v.toArray()).toEqual([3, 4]);
    });

    it("静态 lerp 端点精确", () => {
      const from = new Vector2(0, 0);
      const to = new Vector2(10, 20);
      expect(Vector2.lerp(from, to, 0).toArray()).toEqual([0, 0]);
      expect(Vector2.lerp(from, to, 1).toArray()).toEqual([10, 20]);
    });
  });

  describe("只读属性", () => {
    it("计算长度与长度平方", () => {
      const v = new Vector2(3, 4);
      expect(v.length).toBe(5);
      expect(v.lengthSquared).toBe(25);
    });

    it("计算与 +X 轴夹角", () => {
      expect(new Vector2(1, 0).angle).toBeCloseTo(0, 10);
      expect(new Vector2(0, 1).angle).toBeCloseTo(Math.PI / 2, 10);
      expect(new Vector2(-1, 0).angle).toBeCloseTo(Math.PI, 10);
    });
  });

  describe("算术运算（不修改原实例）", () => {
    it("加减乘除", () => {
      const a = new Vector2(1, 2);
      const b = new Vector2(3, 4);

      expect(a.add(b).toArray()).toEqual([4, 6]);
      expect(a.subtract(b).toArray()).toEqual([-2, -2]);
      expect(a.multiply(b).toArray()).toEqual([3, 8]);
      expect(a.multiply(2).toArray()).toEqual([2, 4]);
      expect(b.divide(2).toArray()).toEqual([1.5, 2]);
      expect(a.negate().toArray()).toEqual([-1, -2]);
      expect(a.addScalar(1).toArray()).toEqual([2, 3]);

      // 原实例不变
      expect(a.toArray()).toEqual([1, 2]);
    });

    it("除以零时该分量取 0", () => {
      const v = new Vector2(4, 6).divide(0);
      expect(v.toArray()).toEqual([0, 0]);
    });

    it("点积与叉积", () => {
      expect(new Vector2(1, 0).dot(new Vector2(0, 1))).toBe(0);
      expect(new Vector2(2, 3).dot(new Vector2(4, 5))).toBe(23);
      expect(new Vector2(1, 0).cross(new Vector2(0, 1))).toBe(1);
      expect(new Vector2(0, 1).cross(new Vector2(1, 0))).toBe(-1);
    });

    it("距离", () => {
      const a = new Vector2(0, 0);
      const b = new Vector2(3, 4);
      expect(a.distanceTo(b)).toBe(5);
      expect(a.distanceToSquared(b)).toBe(25);
    });

    it("归一化后长度为 1，零向量不产生 NaN", () => {
      expect(new Vector2(3, 4).normalized().length).toBeCloseTo(1, 10);
      const zero = Vector2.zero().normalized();
      expect(zero.toArray()).toEqual([0, 0]);
      expect(Number.isNaN(zero.x)).toBe(false);
    });

    it("插值端点精确", () => {
      const from = new Vector2(0, 0);
      const to = new Vector2(10, 0);
      expect(from.lerp(to, 0).toArray()).toEqual([0, 0]);
      expect(from.lerp(to, 1).toArray()).toEqual([10, 0]);
      expect(from.lerp(to, 0.5).toArray()).toEqual([5, 0]);
    });

    it("旋转", () => {
      const rotated = new Vector2(1, 0).rotate(Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0, 10);
      expect(rotated.y).toBeCloseTo(1, 10);
    });

    it("绕支点旋转", () => {
      const rotated = new Vector2(2, 1).rotateAround({ x: 1, y: 1 }, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(1, 10);
      expect(rotated.y).toBeCloseTo(2, 10);
    });

    it("夹角", () => {
      const angle = new Vector2(1, 0).angleTo(new Vector2(0, 1));
      expect(angle).toBeCloseTo(Math.PI / 2, 10);
    });

    it("反射", () => {
      const reflected = new Vector2(1, -1).reflect(new Vector2(0, 1));
      expect(reflected.x).toBeCloseTo(1, 10);
      expect(reflected.y).toBeCloseTo(1, 10);
    });

    it("裁剪分量与长度", () => {
      const clamped = new Vector2(5, -5).clamp({ x: -1, y: -1 }, { x: 1, y: 1 });
      expect(clamped.toArray()).toEqual([1, -1]);

      const limited = new Vector2(3, 4).limit(2);
      expect(limited.length).toBeCloseTo(2, 10);

      const ranged = new Vector2(3, 4).clampLength(1, 2);
      expect(ranged.length).toBeCloseTo(2, 10);

      const shorter = new Vector2(3, 4).clampLength(1, 2).withLength(1);
      expect(shorter.length).toBeCloseTo(1, 10);
    });

    it("取整", () => {
      expect(new Vector2(1.4, 1.6).round().toArray()).toEqual([1, 2]);
      expect(new Vector2(1.4, 1.6).floor().toArray()).toEqual([1, 1]);
    });

    it("相等判断带容差", () => {
      expect(new Vector2(1, 1).equals({ x: 1, y: 1 })).toBe(true);
      expect(new Vector2(1, 1).equals({ x: 1.0000001, y: 1 })).toBe(true);
      expect(new Vector2(1, 1).equals({ x: 1.1, y: 1 })).toBe(false);
    });

    it("字符串表示", () => {
      expect(new Vector2(1, 2).toString()).toBe("Vector2(1, 2)");
    });
  });

  describe("原地运算", () => {
    it("addInPlace / subtractInPlace / scaleInPlace", () => {
      const v = new Vector2(1, 1);
      v.addInPlace({ x: 2, y: 3 });
      expect(v.toArray()).toEqual([3, 4]);
      v.subtractInPlace({ x: 1, y: 1 });
      expect(v.toArray()).toEqual([2, 3]);
      v.scaleInPlace(2);
      expect(v.toArray()).toEqual([4, 6]);
    });

    it("normalizeInPlace / lerpInPlace 返回自身", () => {
      const v = new Vector2(3, 4);
      expect(v.normalizeInPlace()).toBe(v);
      expect(v.length).toBeCloseTo(1, 10);

      const w = new Vector2(0, 0);
      w.lerpInPlace({ x: 10, y: 20 }, 0.5);
      expect(w.toArray()).toEqual([5, 10]);
    });

    it("set / copyFrom / clone", () => {
      const v = new Vector2();
      v.set(1, 2);
      expect(v.toArray()).toEqual([1, 2]);
      v.copyFrom({ x: 3, y: 4 });
      expect(v.toArray()).toEqual([3, 4]);
      expect(v.clone().toArray()).toEqual([3, 4]);
      expect(v.clone()).not.toBe(v);
    });
  });

  describe("标量与向量运算补充分支", () => {
    it("subtractScalar 逐分量减去标量", () => {
      const v = new Vector2(5, 8).subtractScalar(2);
      expect(v.toArray()).toEqual([3, 6]);
      // 返回新实例，不修改原向量
      const origin = new Vector2(5, 8);
      expect(origin.subtractScalar(2)).not.toBe(origin);
      expect(origin.toArray()).toEqual([5, 8]);
    });

    it("按向量逐分量相除", () => {
      const v = new Vector2(10, 20).divide(new Vector2(2, 4));
      expect(v.toArray()).toEqual([5, 5]);
    });

    it("按向量相除时零分量结果为 0", () => {
      const v = new Vector2(10, 20).divide(new Vector2(0, 4));
      expect(v.x).toBe(0);
      expect(v.y).toBe(5);
    });

    it("按标量相除时除以零结果为 0", () => {
      const v = new Vector2(10, 20).divide(0);
      expect(v.toArray()).toEqual([0, 0]);
    });
  });

  describe("长度裁剪补充分支", () => {
    it("clampLength 会把过短的向量拉伸到下限", () => {
      const v = new Vector2(3, 4).clampLength(10, 20);
      expect(v.length).toBeCloseTo(10, 10);
      // 方向保持不变
      expect(v.x).toBeCloseTo(6, 10);
      expect(v.y).toBeCloseTo(8, 10);
    });

    it("clampLength 对零向量返回零向量", () => {
      const v = new Vector2(0, 0).clampLength(1, 2);
      expect(v.toArray()).toEqual([0, 0]);
    });

    it("limit 相当于 clampLength(0, max)", () => {
      const v = new Vector2(3, 4).limit(5);
      expect(v.length).toBeCloseTo(5, 10);
      expect(v.x).toBeCloseTo(3, 10);
      expect(v.y).toBeCloseTo(4, 10);
    });

    it("limit 对零向量返回零向量", () => {
      expect(new Vector2(0, 0).limit(5).toArray()).toEqual([0, 0]);
    });

    it("normalizeInPlace 对零向量不做任何改动", () => {
      const v = new Vector2(0, 0);
      const result = v.normalizeInPlace();
      expect(result).toBe(v);
      expect(v.toArray()).toEqual([0, 0]);
      expect(Number.isNaN(v.x)).toBe(false);
      expect(Number.isNaN(v.y)).toBe(false);
    });
  });
});
