import { describe, it, expect } from "vitest";
import { Matrix4 } from "../src/math/matrix4";
import { Vector3 } from "../src/math/vector3";
import { Quaternion } from "../src/math/quaternion";

describe("Matrix4", () => {
  it("默认是单位矩阵", () => {
    const m = new Matrix4();
    expect(m.elements).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
  });

  describe("列主序约定", () => {
    it("绕 Y 轴旋转的元素位置符合列主序", () => {
      const c = Math.cos(Math.PI / 2);
      const s = Math.sin(Math.PI / 2);
      const m = new Matrix4().makeRotationY(Math.PI / 2);

      // elements[col * 4 + row]
      expect(m.elements[0]).toBeCloseTo(c, 10);
      expect(m.elements[2]).toBeCloseTo(-s, 10);
      expect(m.elements[8]).toBeCloseTo(s, 10);
      expect(m.elements[10]).toBeCloseTo(c, 10);
    });

    it("绕 X 轴旋转把 +Y 转到 +Z", () => {
      const m = new Matrix4().makeRotationX(Math.PI / 2);
      const result = m.transformDirection(new Vector3(0, 1, 0));
      expect(result.z).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(0, 10);
    });

    it("绕 Z 轴旋转把 +X 转到 +Y", () => {
      const m = new Matrix4().makeRotationZ(Math.PI / 2);
      const result = m.transformDirection(new Vector3(1, 0, 0));
      expect(result.y).toBeCloseTo(1, 10);
      expect(result.x).toBeCloseTo(0, 10);
    });
  });

  describe("变换", () => {
    it("平移只影响位置", () => {
      const m = new Matrix4().makeTranslation(1, 2, 3);
      const point = m.transformPoint(new Vector3(0, 0, 0));
      expect(point.toArray()).toEqual([1, 2, 3]);

      const direction = m.transformDirection(new Vector3(1, 0, 0));
      expect(direction.toArray()).toEqual([1, 0, 0]);
    });

    it("缩放生效", () => {
      const m = new Matrix4().makeScale(2, 3, 4);
      const point = m.transformPoint(new Vector3(1, 1, 1));
      expect(point.toArray()).toEqual([2, 3, 4]);
    });

    it("compose 后 transformPoint 等于预期位置", () => {
      const position = new Vector3(1, 2, 3);
      const rotation = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
      const scale = new Vector3(2, 2, 2);

      const m = new Matrix4().compose(position, rotation, scale);
      const point = m.transformPoint(new Vector3(1, 0, 0));

      expect(point.x).toBeCloseTo(1, 10);
      expect(point.y).toBeCloseTo(2, 10);
      expect(point.z).toBeCloseTo(1, 10);
    });

    it("decompose 能还原 compose 的结果", () => {
      const position = new Vector3(1, 2, 3);
      const rotation = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), 0.6);
      const scale = new Vector3(2, 2, 2);

      const m = new Matrix4().compose(position, rotation, scale);
      const result = m.decompose();

      expect(result.position.x).toBeCloseTo(1, 8);
      expect(result.position.y).toBeCloseTo(2, 8);
      expect(result.position.z).toBeCloseTo(3, 8);
      expect(result.scale.x).toBeCloseTo(2, 8);
      expect(result.scale.z).toBeCloseTo(2, 8);
      expect(result.quaternion.y).toBeCloseTo(rotation.y, 8);
      expect(result.quaternion.w).toBeCloseTo(rotation.w, 8);
    });
  });

  describe("矩阵运算", () => {
    it("乘法可叠加平移", () => {
      const a = new Matrix4().makeTranslation(1, 0, 0);
      const b = new Matrix4().makeTranslation(0, 1, 0);
      const result = Matrix4.multiplyMatrices(a, b);
      const point = result.transformPoint(new Vector3(0, 0, 0));
      expect(point.x).toBeCloseTo(1, 10);
      expect(point.y).toBeCloseTo(1, 10);
    });

    it("求逆后与原矩阵相乘为单位阵", () => {
      const m = new Matrix4()
        .makeTranslation(1, 2, 3)
        .multiply(new Matrix4().makeRotationY(0.8));
      const inverse = m.clone().invert();
      const product = Matrix4.multiplyMatrices(m, inverse);

      expect(product.equals(new Matrix4(), 1e-8)).toBe(true);
    });

    it("奇异矩阵求逆不抛错", () => {
      const m = new Matrix4().makeScale(0, 0, 0);
      expect(() => m.invert()).not.toThrow();
    });

    it("转置", () => {
      const m = new Matrix4().makeTranslation(1, 2, 3);
      const t = m.transposed();
      // 平移原本在第 4 列，转置后应移到第 4 行
      expect(t.elements[12]).toBeCloseTo(0, 10);
      expect(t.elements[3]).toBeCloseTo(1, 10);
      expect(t.elements[7]).toBeCloseTo(2, 10);
      expect(t.elements[11]).toBeCloseTo(3, 10);
    });

    it("行列式为单位阵时为 1", () => {
      expect(new Matrix4().determinant()).toBeCloseTo(1, 10);
    });
  });

  describe("相机矩阵", () => {
    it("lookAt 使目标保持在相机前方", () => {
      const view = Matrix4.lookAt(
        new Vector3(0, 0, 0),
        new Vector3(0, 0, -1),
        new Vector3(0, 1, 0)
      );
      const point = view.transformPoint(new Vector3(0, 0, -1));
      expect(point.x).toBeCloseTo(0, 10);
      expect(point.y).toBeCloseTo(0, 10);
      expect(point.z).toBeCloseTo(-1, 10);
    });

    it("透视投影矩阵可把近平面点映射到 -1", () => {
      const projection = Matrix4.perspective(Math.PI / 2, 1, 1, 100);
      const point = projection.transformPoint(new Vector3(0, 0, -1));
      expect(point.z).toBeCloseTo(-1, 10);
    });

    it("正交投影矩阵把原点映射到中心", () => {
      const projection = Matrix4.orthographic(-1, 1, 1, -1, 1, 100);
      const point = projection.transformPoint(new Vector3(0, 0, -10));
      expect(point.x).toBeCloseTo(0, 10);
      expect(point.y).toBeCloseTo(0, 10);
    });
  });

  describe("构造与基础操作", () => {
    it("identity 返回单位矩阵且不共享元素数组", () => {
      const a = Matrix4.identity();
      const b = Matrix4.identity();
      expect(a.elements).toEqual([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]);
      expect(a.elements).not.toBe(b.elements);
    });

    it("fromArray 按列主序创建并复制入参", () => {
      const source = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 6, 7, 1];
      const m = Matrix4.fromArray(source);
      expect(m.elements).toEqual(source);
      expect(m.elements).not.toBe(source);

      source[0] = 999;
      expect(m.elements[0]).toBe(1);

      // 列主序：平移位于第 3 列（索引 12~14）
      expect(m.elements[12]).toBe(5);
      const point = m.transformPoint(new Vector3(0, 0, 0));
      expect(point.x).toBeCloseTo(5, 10);
      expect(point.y).toBeCloseTo(6, 10);
      expect(point.z).toBeCloseTo(7, 10);
    });

    it("copy 覆盖自身并返回自身", () => {
      const source = new Matrix4().makeTranslation(1, 2, 3);
      const target = new Matrix4();
      const returned = target.copy(source);
      expect(returned).toBe(target);
      expect(target.elements).toEqual(source.elements);

      source.elements[12] = 999;
      expect(target.elements[12]).toBe(1);
    });

    it("makeIdentity 重置为单位矩阵", () => {
      const m = new Matrix4().makeTranslation(1, 2, 3).makeScale(2, 3, 4);
      const returned = m.makeIdentity();
      expect(returned).toBe(m);
      expect(m.elements).toEqual([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]);
    });

    it("toArray 返回列主序元素副本", () => {
      const m = new Matrix4().makeTranslation(1, 2, 3);
      const array = m.toArray();
      expect(array).toEqual(m.elements);
      expect(array).not.toBe(m.elements);

      array[12] = 999;
      expect(m.elements[12]).toBe(1);
    });

    it("toString 输出元素列表", () => {
      expect(new Matrix4().toString()).toBe(
        "Matrix4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)"
      );
      expect(new Matrix4().makeTranslation(1, 2, 3).toString()).toBe(
        "Matrix4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1)"
      );
    });

    it("equals 在元素不同时返回 false 并受容差控制", () => {
      const a = new Matrix4();
      const b = new Matrix4().makeTranslation(1, 0, 0);
      expect(a.equals(b)).toBe(false);
      // 容差放大到 2 后，1 的差异被视作相等
      expect(a.equals(b, 2)).toBe(true);
    });

    it("invert 就地修改矩阵并返回自身", () => {
      const m = new Matrix4().makeTranslation(1, 2, 3);
      const result = m.invert();
      expect(result).toBe(m);

      const point = m.transformPoint(new Vector3(1, 2, 3));
      expect(point.x).toBeCloseTo(0, 8);
      expect(point.y).toBeCloseTo(0, 8);
      expect(point.z).toBeCloseTo(0, 8);
    });

    it("奇异矩阵求逆返回自身且元素保持不变", () => {
      const m = new Matrix4().makeScale(0, 0, 0);
      const before = m.elements.slice();
      const result = m.invert();
      expect(result).toBe(m);
      expect(m.elements).toEqual(before);
    });
  });

  describe("分解的退化与分支", () => {
    it("decompose 在行列式为负时给出负的 x 缩放", () => {
      const m = new Matrix4().makeScale(-1, 1, 1);
      const result = m.decompose();
      expect(result.scale.x).toBeCloseTo(-1, 10);
      expect(result.scale.y).toBeCloseTo(1, 10);
      expect(result.scale.z).toBeCloseTo(1, 10);
      expect(result.quaternion.x).toBeCloseTo(0, 10);
      expect(result.quaternion.y).toBeCloseTo(0, 10);
      expect(result.quaternion.z).toBeCloseTo(0, 10);
      expect(result.quaternion.w).toBeCloseTo(1, 10);
    });

    it("decompose 还原绕 X 轴 180° 的四元数", () => {
      const m = new Matrix4().makeRotationX(Math.PI);
      const result = m.decompose();
      expect(result.quaternion.x).toBeCloseTo(1, 8);
      expect(result.quaternion.y).toBeCloseTo(0, 8);
      expect(result.quaternion.z).toBeCloseTo(0, 8);
      expect(result.quaternion.w).toBeCloseTo(0, 8);
      expect(result.scale.x).toBeCloseTo(1, 8);
      expect(result.scale.y).toBeCloseTo(1, 8);
      expect(result.scale.z).toBeCloseTo(1, 8);
    });

    it("decompose 还原绕 Y 轴 180° 的四元数", () => {
      const m = new Matrix4().makeRotationY(Math.PI);
      const result = m.decompose();
      expect(result.quaternion.x).toBeCloseTo(0, 8);
      expect(result.quaternion.y).toBeCloseTo(1, 8);
      expect(result.quaternion.z).toBeCloseTo(0, 8);
      expect(result.quaternion.w).toBeCloseTo(0, 8);
      expect(result.scale.x).toBeCloseTo(1, 8);
      expect(result.scale.y).toBeCloseTo(1, 8);
      expect(result.scale.z).toBeCloseTo(1, 8);
    });

    it("decompose 还原绕 Z 轴 180° 的四元数", () => {
      const m = new Matrix4().makeRotationZ(Math.PI);
      const result = m.decompose();
      expect(result.quaternion.x).toBeCloseTo(0, 8);
      expect(result.quaternion.y).toBeCloseTo(0, 8);
      expect(result.quaternion.z).toBeCloseTo(1, 8);
      expect(result.quaternion.w).toBeCloseTo(0, 8);
      expect(result.scale.x).toBeCloseTo(1, 8);
      expect(result.scale.y).toBeCloseTo(1, 8);
      expect(result.scale.z).toBeCloseTo(1, 8);
    });

    it("decompose 在 x 缩放为 0 时仍给出有限结果", () => {
      const m = new Matrix4().makeScale(0, 2, 3);
      const result = m.decompose();
      expect(result.scale.x).toBeCloseTo(0, 10);
      expect(result.scale.y).toBeCloseTo(2, 10);
      expect(result.scale.z).toBeCloseTo(3, 10);
      expect(Number.isFinite(result.quaternion.x)).toBe(true);
      expect(Number.isFinite(result.quaternion.y)).toBe(true);
      expect(Number.isFinite(result.quaternion.z)).toBe(true);
      expect(Number.isFinite(result.quaternion.w)).toBe(true);
      expect(result.quaternion.w).toBeCloseTo(Math.sqrt(3) / 2, 8);
    });

    it("decompose 在 y 缩放为 0 时仍给出有限结果", () => {
      const m = new Matrix4().makeScale(2, 0, 3);
      const result = m.decompose();
      expect(result.scale.x).toBeCloseTo(2, 10);
      expect(result.scale.y).toBeCloseTo(0, 10);
      expect(result.scale.z).toBeCloseTo(3, 10);
      expect(Number.isFinite(result.quaternion.w)).toBe(true);
      expect(result.quaternion.w).toBeCloseTo(Math.sqrt(3) / 2, 8);
    });

    it("decompose 在 z 缩放为 0 时仍给出有限结果", () => {
      const m = new Matrix4().makeScale(2, 3, 0);
      const result = m.decompose();
      expect(result.scale.x).toBeCloseTo(2, 10);
      expect(result.scale.y).toBeCloseTo(3, 10);
      expect(result.scale.z).toBeCloseTo(0, 10);
      expect(Number.isFinite(result.quaternion.w)).toBe(true);
      expect(result.quaternion.w).toBeCloseTo(Math.sqrt(3) / 2, 8);
    });
  });

  describe("行列式", () => {
    it("行列式在需要交换主元行时结果正确", () => {
      // 行主序为 [1 2 3 4; 5 6 7 8; 0 0 1 0; 0 0 0 1]，行列式为 -4
      const m = Matrix4.fromArray([
        1, 5, 0, 0, 2, 6, 0, 0, 3, 7, 1, 0, 4, 8, 0, 1,
      ]);
      expect(m.determinant()).toBeCloseTo(-4, 10);
    });

    it("奇异矩阵的行列式为 0", () => {
      expect(new Matrix4().makeScale(0, 0, 0).determinant()).toBeCloseTo(0, 10);
      // 第一列全零
      expect(
        Matrix4.fromArray([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]).determinant()
      ).toBeCloseTo(0, 10);
    });
  });

  describe("透视除法", () => {
    it("transformPoint 在 w 为 0 时不产生 NaN", () => {
      const projection = Matrix4.perspective(Math.PI / 2, 1, 1, 100);
      // 透视矩阵下 w = -z，点在 z = 0 处时 w 为 0
      const point = projection.transformPoint(new Vector3(0, 0, 0));
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(Number.isFinite(point.z)).toBe(true);
      expect(point.x).toBeCloseTo(0, 10);
      expect(point.y).toBeCloseTo(0, 10);
      // 未做透视除法时的原始 z 值
      expect(point.z).toBeCloseTo((2 * 100 * 1) / (1 - 100), 10);
    });
  });
});
