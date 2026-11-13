import { describe, it, expect } from "vitest";
import { Vector3 } from "../src/math/vector3";

describe("Vector3", () => {
  describe("构造与静态方法", () => {
    it("默认构造零向量", () => {
      const v = new Vector3();
      expect(v.toArray()).toEqual([0, 0, 0]);
      expect(v.isZero).toBe(true);
    });

    it("提供方向常量", () => {
      expect(Vector3.right().toArray()).toEqual([1, 0, 0]);
      expect(Vector3.left().toArray()).toEqual([-1, 0, 0]);
      expect(Vector3.up().toArray()).toEqual([0, 1, 0]);
      expect(Vector3.down().toArray()).toEqual([0, -1, 0]);
      expect(Vector3.forward().toArray()).toEqual([0, 0, 1]);
      expect(Vector3.back().toArray()).toEqual([0, 0, -1]);
    });

    it("由数组与球坐标创建", () => {
      expect(Vector3.fromArray([1, 2, 3]).toArray()).toEqual([1, 2, 3]);
      const v = Vector3.fromSpherical(1, Math.PI / 2, 0);
      expect(v.x).toBeCloseTo(1, 10);
      expect(v.y).toBeCloseTo(0, 10);
      expect(v.z).toBeCloseTo(0, 10);
    });

    it("静态 lerp 端点精确", () => {
      const from = new Vector3(0, 0, 0);
      const to = new Vector3(10, 20, 30);
      expect(Vector3.lerp(from, to, 0).toArray()).toEqual([0, 0, 0]);
      expect(Vector3.lerp(from, to, 1).toArray()).toEqual([10, 20, 30]);
    });
  });

  describe("算术运算（不修改原实例）", () => {
    it("加减乘除", () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(4, 5, 6);

      expect(a.add(b).toArray()).toEqual([5, 7, 9]);
      expect(a.subtract(b).toArray()).toEqual([-3, -3, -3]);
      expect(a.multiply(b).toArray()).toEqual([4, 10, 18]);
      expect(a.multiply(2).toArray()).toEqual([2, 4, 6]);
      expect(b.divide(2).toArray()).toEqual([2, 2.5, 3]);
      expect(a.negate().toArray()).toEqual([-1, -2, -3]);

      // 原实例不变
      expect(a.toArray()).toEqual([1, 2, 3]);
    });

    it("点积与叉积（右手系）", () => {
      expect(new Vector3(1, 0, 0).dot(new Vector3(0, 1, 0))).toBe(0);
      expect(new Vector3(1, 2, 3).dot(new Vector3(4, 5, 6))).toBe(32);
      expect(new Vector3(1, 0, 0).cross(new Vector3(0, 1, 0)).toArray()).toEqual([0, 0, 1]);
      expect(new Vector3(0, 1, 0).cross(new Vector3(1, 0, 0)).toArray()).toEqual([0, 0, -1]);
    });

    it("距离", () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(1, 2, 2);
      expect(a.distanceTo(b)).toBe(3);
      expect(a.distanceToSquared(b)).toBe(9);
    });

    it("归一化后长度为 1，零向量不产生 NaN", () => {
      expect(new Vector3(0, 3, 4).normalized().length).toBeCloseTo(1, 10);
      const zero = Vector3.zero().normalized();
      expect(zero.toArray()).toEqual([0, 0, 0]);
      expect(Number.isNaN(zero.z)).toBe(false);
    });

    it("插值端点精确", () => {
      const from = new Vector3(0, 0, 0);
      const to = new Vector3(10, 0, 0);
      expect(from.lerp(to, 0).toArray()).toEqual([0, 0, 0]);
      expect(from.lerp(to, 0.5).toArray()).toEqual([5, 0, 0]);
      expect(from.lerp(to, 1).toArray()).toEqual([10, 0, 0]);
    });
  });

  describe("几何运算", () => {
    it("绕轴旋转与 Rodrigues 公式一致", () => {
      const v = new Vector3(1, 0, 0);
      const rotated = v.rotateAroundAxis(Vector3.up(), Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0, 10);
      expect(rotated.y).toBeCloseTo(0, 10);
      expect(rotated.z).toBeCloseTo(-1, 10);
    });

    it("投影到向量与平面", () => {
      const projected = new Vector3(3, 4, 0).projectOn(new Vector3(1, 0, 0));
      expect(projected.toArray()).toEqual([3, 0, 0]);

      const onPlane = new Vector3(1, 1, 5).projectOnPlane(Vector3.up());
      expect(onPlane.y).toBeCloseTo(0, 10);
      expect(onPlane.z).toBeCloseTo(5, 10);
    });

    it("反射", () => {
      const reflected = new Vector3(1, -1, 0).reflect(new Vector3(0, 1, 0));
      expect(reflected.x).toBeCloseTo(1, 10);
      expect(reflected.y).toBeCloseTo(1, 10);
    });

    it("夹角", () => {
      expect(new Vector3(1, 0, 0).angleTo(new Vector3(0, 1, 0))).toBeCloseTo(Math.PI / 2, 10);
      expect(new Vector3(1, 0, 0).angleTo(new Vector3(1, 0, 0))).toBeCloseTo(0, 10);
      expect(
        new Vector3(1, 0, 0).angleToSigned(new Vector3(0, 1, 0), new Vector3(0, 0, 1))
      ).toBeCloseTo(Math.PI / 2, 10);
    });

    it("裁剪分量与长度", () => {
      const clamped = new Vector3(5, -5, 0).clamp(
        { x: -1, y: -1, z: -1 },
        { x: 1, y: 1, z: 1 }
      );
      expect(clamped.toArray()).toEqual([1, -1, 0]);

      const limited = new Vector3(3, 4, 0).limit(2);
      expect(limited.length).toBeCloseTo(2, 10);
    });
  });

  describe("原地运算", () => {
    it("addInPlace / subtractInPlace / scaleInPlace", () => {
      const v = new Vector3(1, 1, 1);
      v.addInPlace({ x: 2, y: 3, z: 4 });
      expect(v.toArray()).toEqual([3, 4, 5]);
      v.subtractInPlace({ x: 1, y: 1, z: 1 });
      expect(v.toArray()).toEqual([2, 3, 4]);
      v.scaleInPlace(2);
      expect(v.toArray()).toEqual([4, 6, 8]);
    });

    it("normalizeInPlace / lerpInPlace 返回自身", () => {
      const v = new Vector3(0, 3, 4);
      expect(v.normalizeInPlace()).toBe(v);
      expect(v.length).toBeCloseTo(1, 10);

      const w = new Vector3(0, 0, 0);
      w.lerpInPlace({ x: 10, y: 20, z: 30 }, 0.5);
      expect(w.toArray()).toEqual([5, 10, 15]);
    });
  });

  describe("基础操作", () => {
    it("one 返回各分量为 1 的向量", () => {
      expect(Vector3.one().toArray()).toEqual([1, 1, 1]);
      expect(Vector3.one().length).toBeCloseTo(Math.sqrt(3), 10);
    });

    it("set 设置分量并返回自身", () => {
      const v = new Vector3();
      expect(v.set(1, 2, 3)).toBe(v);
      expect(v.toArray()).toEqual([1, 2, 3]);
    });

    it("copyFrom 用目标覆盖自身并返回自身", () => {
      const v = new Vector3(1, 1, 1);
      expect(v.copyFrom({ x: 4, y: 5, z: 6 })).toBe(v);
      expect(v.toArray()).toEqual([4, 5, 6]);
    });

    it("equals 按容差比较，任一分量超差即不相等", () => {
      const v = new Vector3(1, 2, 3);
      expect(v.equals({ x: 1, y: 2, z: 3 })).toBe(true);
      expect(v.equals({ x: 1, y: 2, z: 3.0000005 })).toBe(true);
      expect(v.equals({ x: 1.1, y: 2, z: 3 })).toBe(false);
      expect(v.equals({ x: 1, y: 2.5, z: 3 })).toBe(false);
      expect(v.equals({ x: 1, y: 2, z: 3.5 })).toBe(false);
      expect(v.equals({ x: 1.1, y: 2, z: 3 }, 0.2)).toBe(true);
      expect(v.equals({ x: 1.3, y: 2, z: 3 }, 0.2)).toBe(false);
    });

    it("toString 输出固定格式", () => {
      expect(new Vector3(1, 2, 3).toString()).toBe("Vector3(1, 2, 3)");
      expect(Vector3.zero().toString()).toBe("Vector3(0, 0, 0)");
    });

    it("lengthSquared 为长度的平方", () => {
      const v = new Vector3(3, 4, 0);
      expect(v.lengthSquared).toBeCloseTo(25, 10);
      expect(v.lengthSquared).toBeCloseTo(v.length * v.length, 10);
      expect(Vector3.zero().lengthSquared).toBeCloseTo(0, 10);
    });
  });

  describe("标量运算与重载", () => {
    it("addScalar 与 subtractScalar 逐分量加减标量", () => {
      const v = new Vector3(1, 2, 3);
      expect(v.addScalar(2).toArray()).toEqual([3, 4, 5]);
      expect(v.subtractScalar(1).toArray()).toEqual([0, 1, 2]);
      // 原实例不变
      expect(v.toArray()).toEqual([1, 2, 3]);
    });

    it("multiply 同时支持标量与向量两种重载", () => {
      expect(new Vector3(1, 2, 3).multiply(3).toArray()).toEqual([3, 6, 9]);
      expect(
        new Vector3(1, 2, 3).multiply(new Vector3(2, 3, 4)).toArray()
      ).toEqual([2, 6, 12]);
    });

    it("divide 同时支持标量与向量两种重载", () => {
      expect(new Vector3(2, 4, 6).divide(2).toArray()).toEqual([1, 2, 3]);
      expect(
        new Vector3(2, 4, 6).divide(new Vector3(2, 2, 3)).toArray()
      ).toEqual([1, 2, 2]);
    });

    it("divide 除以零时对应分量取 0", () => {
      expect(new Vector3(1, 2, 3).divide(0).toArray()).toEqual([0, 0, 0]);
      expect(
        new Vector3(4, 6, 8).divide(new Vector3(2, 0, 4)).toArray()
      ).toEqual([2, 0, 2]);
      // 除数各分量均为 0 时全部取 0
      expect(new Vector3(4, 6, 8).divide(Vector3.zero()).toArray()).toEqual([
        0, 0, 0,
      ]);
    });
  });

  describe("几何运算补充", () => {
    it("projectOn 目标为零向量时返回零向量", () => {
      const projected = new Vector3(3, 4, 0).projectOn(Vector3.zero());
      expect(projected.toArray()).toEqual([0, 0, 0]);
    });

    it("projectOnPlane 法线为零向量时返回自身副本", () => {
      const source = new Vector3(1, 2, 3);
      const projected = source.projectOnPlane(Vector3.zero());
      expect(projected.toArray()).toEqual([1, 2, 3]);
      expect(projected).not.toBe(source);
      expect(source.toArray()).toEqual([1, 2, 3]);
    });

    it("reflect 沿法线对称", () => {
      // 沿自身方向反射等价于取反
      const normal = new Vector3(1, 1, 0).normalized();
      const reflected = new Vector3(1, 1, 0).reflect(normal);
      expect(reflected.x).toBeCloseTo(-1, 10);
      expect(reflected.y).toBeCloseTo(-1, 10);
      expect(reflected.z).toBeCloseTo(0, 10);

      const oblique = new Vector3(1, 1, 0).reflect(new Vector3(1, 0, 0));
      expect(oblique.x).toBeCloseTo(-1, 10);
      expect(oblique.y).toBeCloseTo(1, 10);
      expect(oblique.z).toBeCloseTo(0, 10);
    });

    it("angleTo 返回 [0, π] 区间夹角", () => {
      expect(new Vector3(1, 0, 0).angleTo(new Vector3(-1, 0, 0))).toBeCloseTo(
        Math.PI,
        10
      );
      expect(new Vector3(1, 0, 0).angleTo(new Vector3(0, 0, 1))).toBeCloseTo(
        Math.PI / 2,
        10
      );
    });

    it("angleToSigned 按轴方向给出正负号", () => {
      const positive = new Vector3(1, 0, 0).angleToSigned(
        new Vector3(0, 1, 0),
        new Vector3(0, 0, 1)
      );
      expect(positive).toBeCloseTo(Math.PI / 2, 10);

      const negative = new Vector3(0, 1, 0).angleToSigned(
        new Vector3(1, 0, 0),
        new Vector3(0, 0, 1)
      );
      expect(negative).toBeCloseTo(-Math.PI / 2, 10);

      // 绕相反轴时符号翻转
      const flipped = new Vector3(1, 0, 0).angleToSigned(
        new Vector3(0, 1, 0),
        new Vector3(0, 0, -1)
      );
      expect(flipped).toBeCloseTo(-Math.PI / 2, 10);
    });
  });

  describe("裁剪与插值边界", () => {
    it("clamp 在 min 大于 max 时以 max 为准", () => {
      const clamped = new Vector3(0.5, 2, 3).clamp(
        { x: 1, y: 1, z: 1 },
        { x: 0, y: 0, z: 0 }
      );
      expect(clamped.toArray()).toEqual([0, 0, 0]);
    });

    it("clampLength 覆盖过短、适中与过长三种情况", () => {
      expect(new Vector3(1, 0, 0).clampLength(2, 5).toArray()).toEqual([2, 0, 0]);
      expect(new Vector3(3, 4, 0).clampLength(2, 5).toArray()).toEqual([3, 4, 0]);

      const shortened = new Vector3(3, 4, 0).clampLength(0, 1);
      expect(shortened.x).toBeCloseTo(0.6, 10);
      expect(shortened.y).toBeCloseTo(0.8, 10);
      expect(shortened.z).toBeCloseTo(0, 10);
    });

    it("clampLength 对零向量返回零向量", () => {
      expect(Vector3.zero().clampLength(1, 5).toArray()).toEqual([0, 0, 0]);
    });

    it("limit 只限制最大长度", () => {
      const kept = new Vector3(3, 4, 0).limit(10);
      expect(kept.toArray()).toEqual([3, 4, 0]);

      const shrunk = new Vector3(3, 4, 0).limit(2);
      expect(shrunk.length).toBeCloseTo(2, 10);
      expect(shrunk.x).toBeCloseTo(1.2, 10);
    });

    it("lerp 在 t 超出 [0,1] 时做线性外推", () => {
      expect(new Vector3(0, 0, 0).lerp(new Vector3(10, 0, 0), -1).toArray()).toEqual([
        -10, 0, 0,
      ]);
      expect(new Vector3(0, 0, 0).lerp(new Vector3(10, 0, 0), 2).toArray()).toEqual([
        20, 0, 0,
      ]);
    });
  });

  describe("长度调整与取整", () => {
    it("withLength 保持方向调整长度", () => {
      const scaled = new Vector3(3, 4, 0).withLength(10);
      expect(scaled.x).toBeCloseTo(6, 10);
      expect(scaled.y).toBeCloseTo(8, 10);
      expect(scaled.z).toBeCloseTo(0, 10);
      expect(scaled.length).toBeCloseTo(10, 10);
    });

    it("withLength 对零向量返回零向量", () => {
      expect(Vector3.zero().withLength(5).toArray()).toEqual([0, 0, 0]);
    });

    it("floor 与 round 逐分量取整", () => {
      expect(new Vector3(1.7, -1.2, 3.9).floor().toArray()).toEqual([1, -2, 3]);
      expect(new Vector3(1.5, -1.6, 2.4).round().toArray()).toEqual([2, -2, 2]);
    });

    it("normalizeInPlace 对零向量保持不变并返回自身", () => {
      const v = Vector3.zero();
      expect(v.normalizeInPlace()).toBe(v);
      expect(v.toArray()).toEqual([0, 0, 0]);
    });

    it("isZero 仅在三分量全为 0 时为真", () => {
      expect(new Vector3(0, 0, 0).isZero).toBe(true);
      expect(new Vector3(0, 0, 1).isZero).toBe(false);
    });
  });
});
