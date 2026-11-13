import { describe, it, expect } from "vitest";
import { Quaternion } from "../src/math/quaternion";
import { Vector3 } from "../src/math/vector3";
import { Matrix4 } from "../src/math/matrix4";

describe("Quaternion", () => {
  it("默认是单位四元数", () => {
    const q = new Quaternion();
    expect(q.toArray()).toEqual([0, 0, 0, 1]);
    expect(q.length).toBeCloseTo(1, 10);
  });

  describe("构造", () => {
    it("由轴与角度创建", () => {
      const q = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
      expect(q.length).toBeCloseTo(1, 10);
      expect(q.y).toBeCloseTo(Math.sin(Math.PI / 4), 10);
      expect(q.w).toBeCloseTo(Math.cos(Math.PI / 4), 10);
    });

    it("由欧拉角创建", () => {
      const q = Quaternion.fromEuler(0, Math.PI / 2, 0, "YXZ");
      const rotated = q.rotateVector(new Vector3(1, 0, 0));
      expect(rotated.z).toBeCloseTo(-1, 10);
    });

    it("由单位向量创建（把 from 旋转到 to）", () => {
      const q = Quaternion.fromUnitVectors(
        new Vector3(1, 0, 0),
        new Vector3(0, 0, 1)
      );
      const rotated = q.rotateVector(new Vector3(1, 0, 0));
      expect(rotated.z).toBeCloseTo(1, 10);
      expect(rotated.x).toBeCloseTo(0, 10);
    });

    it("由矩阵创建", () => {
      const matrix = new Matrix4().makeRotationY(Math.PI / 2);
      const q = Quaternion.fromMatrix(matrix);
      const rotated = q.rotateVector(new Vector3(1, 0, 0));
      expect(rotated.z).toBeCloseTo(-1, 10);
    });

    it("由朝向创建", () => {
      const q = Quaternion.lookRotation(new Vector3(0, 0, -1), new Vector3(0, 1, 0));
      const rotated = q.rotateVector(new Vector3(1, 0, 0));
      expect(rotated.x).toBeCloseTo(-1, 10);
    });
  });

  describe("运算", () => {
    it("乘法等价于依次旋转", () => {
      const yaw = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
      const pitch = Quaternion.fromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

      const combined = yaw.multiply(pitch);
      const direct = yaw.rotateVector(pitch.rotateVector(new Vector3(1, 0, 0)));
      const viaCombined = combined.rotateVector(new Vector3(1, 0, 0));

      expect(viaCombined.x).toBeCloseTo(direct.x, 10);
      expect(viaCombined.y).toBeCloseTo(direct.y, 10);
      expect(viaCombined.z).toBeCloseTo(direct.z, 10);
    });

    it("归一化后模长为 1", () => {
      const q = new Quaternion(1, 2, 3, 4).normalize();
      expect(q.length).toBeCloseTo(1, 10);
    });

    it("单位四元数的逆等于共轭", () => {
      const q = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), 0.7);
      const inverse = q.invert();
      expect(inverse.x).toBeCloseTo(-q.x, 10);
      expect(inverse.w).toBeCloseTo(q.w, 10);
    });

    it("逆四元数能还原旋转", () => {
      const q = Quaternion.fromAxisAngle(new Vector3(0, 0, 1), 1.1);
      const v = new Vector3(1, 2, 3);
      const restored = q.invert().rotateVector(q.rotateVector(v));
      expect(restored.x).toBeCloseTo(1, 10);
      expect(restored.y).toBeCloseTo(2, 10);
      expect(restored.z).toBeCloseTo(3, 10);
    });

    it("slerp 端点精确且中途模长为 1", () => {
      const from = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), 0);
      const to = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);

      const start = from.slerp(to, 0);
      expect(start.w).toBeCloseTo(from.w, 10);

      const end = from.slerp(to, 1);
      expect(end.y).toBeCloseTo(to.y, 10);
      expect(end.w).toBeCloseTo(to.w, 10);

      const middle = from.slerp(to, 0.5);
      expect(middle.length).toBeCloseTo(1, 10);
    });

    it("rotateVector 与 Vector3.rotateAroundAxis 结果一致", () => {
      const axis = new Vector3(0, 1, 0);
      const q = Quaternion.fromAxisAngle(axis, Math.PI / 3);
      const v = new Vector3(1, 0, 0);

      const a = q.rotateVector(v);
      const b = v.rotateAroundAxis(axis, Math.PI / 3);
      expect(a.x).toBeCloseTo(b.x, 10);
      expect(a.y).toBeCloseTo(b.y, 10);
      expect(a.z).toBeCloseTo(b.z, 10);
    });

    it("toEuler 与 fromEuler 往返", () => {
      const original = { x: 0.3, y: -0.7, z: 1.1 };
      const q = Quaternion.fromEuler(original.x, original.y, original.z, "YXZ");
      const euler = q.toEuler("YXZ");

      expect(euler.x).toBeCloseTo(original.x, 8);
      expect(euler.y).toBeCloseTo(original.y, 8);
      expect(euler.z).toBeCloseTo(original.z, 8);
    });

    it("转换为矩阵与矩阵一致", () => {
      const q = Quaternion.fromAxisAngle(new Vector3(1, 0, 0), 0.9);
      const fromQuaternion = q.toMatrix();
      const fromAxis = new Matrix4().makeRotationX(0.9);
      expect(fromQuaternion.equals(fromAxis, 1e-8)).toBe(true);
    });

    it("夹角计算", () => {
      const a = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), 0);
      const b = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
      expect(a.angleTo(b)).toBeCloseTo(Math.PI / 2, 8);
    });
  });

  describe("欧拉角", () => {
    const eulerOrders = ["XYZ", "YXZ", "ZXY", "ZYX", "YZX", "XZY"] as const;
    type EulerOrderLike = (typeof eulerOrders)[number];

    // 参考矩阵：按 order 依次连乘各轴旋转矩阵（列主序）
    const referenceMatrix = (
      order: EulerOrderLike,
      x: number,
      y: number,
      z: number
    ): Matrix4 => {
      const axisMatrix: Record<string, Matrix4> = {
        X: new Matrix4().makeRotationX(x),
        Y: new Matrix4().makeRotationY(y),
        Z: new Matrix4().makeRotationZ(z),
      };
      return order
        .split("")
        .reduce(
          (acc, key) => Matrix4.multiplyMatrices(acc, axisMatrix[key]),
          Matrix4.identity()
        );
    };

    it("fromEulerDegrees 与 fromEuler（弧度）结果一致", () => {
      const degrees = Quaternion.fromEulerDegrees(30, 45, 60, "XYZ");
      const radians = Quaternion.fromEuler(
        (30 * Math.PI) / 180,
        (45 * Math.PI) / 180,
        (60 * Math.PI) / 180,
        "XYZ"
      );
      expect(degrees.x).toBeCloseTo(radians.x, 10);
      expect(degrees.y).toBeCloseTo(radians.y, 10);
      expect(degrees.z).toBeCloseTo(radians.z, 10);
      expect(degrees.w).toBeCloseTo(radians.w, 10);
    });

    it("fromEulerDegrees 默认使用 YXZ 顺序", () => {
      const q = Quaternion.fromEulerDegrees(0, 90, 0);
      expect(q.x).toBeCloseTo(0, 10);
      expect(q.y).toBeCloseTo(Math.SQRT1_2, 10);
      expect(q.z).toBeCloseTo(0, 10);
      expect(q.w).toBeCloseTo(Math.SQRT1_2, 10);
    });

    it("万向锁时 toEuler 往返仍能还原同一旋转", () => {
      // 万向锁时中间角只能取 0，末角必须带上 sin(x) 的符号，
      // 否则 YXZ(x=+90°)/ZXY(x=-90°) 的 z 会整体取反，重建矩阵对不上原旋转
      const maxElementDiff = (a: number[], b: number[]): number => {
        let max = 0;
        for (let i = 0; i < 16; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
        return max;
      };

      for (const order of eulerOrders) {
        for (const sign of [1, -1]) {
          const x = (sign * Math.PI) / 2;
          const q = Quaternion.fromEuler(x, 0.4, -0.7, order);
          const e = q.toEuler(order);
          const rebuilt = Quaternion.fromEuler(e.x, e.y, e.z, order);
          // 容差放宽到 1e-6：asin 在 ±90° 附近会放大 m23 的浮点误差
          expect(
            maxElementDiff(q.toMatrix().toArray(), rebuilt.toMatrix().toArray()),
            `${order} x=${(x * 180) / Math.PI}° 往返矩阵应一致`
          ).toBeLessThan(1e-6);
        }
      }
    });

    it("万向锁时末角符号正确", () => {
      // YXZ 在 x=+90° 时 z 应为 z_orig - y_orig = -1.1
      const yxz = Quaternion.fromEuler(Math.PI / 2, 0.4, -0.7, "YXZ").toEuler("YXZ");
      expect(yxz.y).toBeCloseTo(0, 10);
      expect(yxz.z).toBeCloseTo(-1.1, 10);
      // ZXY 在 x=-90° 时 z 应为 z_orig - y_orig = -1.1
      const zxy = Quaternion.fromEuler(-Math.PI / 2, 0.4, -0.7, "ZXY").toEuler("ZXY");
      expect(zxy.y).toBeCloseTo(0, 10);
      expect(zxy.z).toBeCloseTo(-1.1, 10);
    });

    it("非万向锁时 toEuler 往返保持一致", () => {
      const maxElementDiff = (a: number[], b: number[]): number => {
        let max = 0;
        for (let i = 0; i < 16; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
        return max;
      };
      for (const order of eulerOrders) {
        const q = Quaternion.fromEuler(0.3, -0.7, 1.1, order);
        const e = q.toEuler(order);
        const rebuilt = Quaternion.fromEuler(e.x, e.y, e.z, order);
        expect(
          maxElementDiff(q.toMatrix().toArray(), rebuilt.toMatrix().toArray()),
          `${order} 往返矩阵应一致`
        ).toBeLessThan(1e-9);
      }
    });

    it("fromEuler 六种旋转顺序均与逐轴矩阵连乘一致", () => {
      for (const order of eulerOrders) {
        const q = Quaternion.fromEuler(0.3, -0.7, 1.1, order);
        expect(q.length).toBeCloseTo(1, 10);
        expect(q.toMatrix().equals(referenceMatrix(order, 0.3, -0.7, 1.1), 1e-9)).toBe(
          true
        );
      }
    });

    it("fromEuler 默认顺序为 YXZ", () => {
      const implicit = Quaternion.fromEuler(0.3, -0.7, 1.1);
      const explicit = Quaternion.fromEuler(0.3, -0.7, 1.1, "YXZ");
      expect(implicit.equals(explicit, 1e-12)).toBe(true);
    });

    it("toEuler 六种旋转顺序均能还原原始欧拉角", () => {
      for (const order of eulerOrders) {
        const q = Quaternion.fromEuler(0.3, -0.7, 1.1, order);
        const euler = q.toEuler(order);
        expect(euler.x).toBeCloseTo(0.3, 8);
        expect(euler.y).toBeCloseTo(-0.7, 8);
        expect(euler.z).toBeCloseTo(1.1, 8);
      }
    });

    it("toEuler 万向锁时仍能还原同一旋转（XYZ/ZYX/YZX/XZY）", () => {
      const half = Math.PI / 2;
      const cases = [
        { order: "XYZ" as const, euler: { x: 0.4, y: half, z: -0.7 } },
        { order: "ZYX" as const, euler: { x: 0.4, y: half, z: -0.7 } },
        { order: "YZX" as const, euler: { x: 0.4, y: -0.7, z: half } },
        { order: "XZY" as const, euler: { x: 0.4, y: -0.7, z: half } },
      ];
      for (const item of cases) {
        const source = Quaternion.fromEuler(
          item.euler.x,
          item.euler.y,
          item.euler.z,
          item.order
        );
        const euler = source.toEuler(item.order);
        const rebuilt = Quaternion.fromEuler(euler.x, euler.y, euler.z, item.order);
        expect(rebuilt.toMatrix().equals(source.toMatrix(), 1e-6)).toBe(true);
      }
    });

    it("toEuler 万向锁时中间角仍被正确还原（YXZ/ZXY）", () => {
      const half = Math.PI / 2;

      const yxz = Quaternion.fromEuler(-half, 0.4, -0.7, "YXZ");
      const yxzEuler = yxz.toEuler("YXZ");
      expect(yxzEuler.x).toBeCloseTo(-half, 6);
      expect(
        Quaternion.fromEuler(yxzEuler.x, yxzEuler.y, yxzEuler.z, "YXZ")
          .toMatrix()
          .equals(yxz.toMatrix(), 1e-6)
      ).toBe(true);

      const zxy = Quaternion.fromEuler(half, 0.4, -0.7, "ZXY");
      const zxyEuler = zxy.toEuler("ZXY");
      expect(zxyEuler.x).toBeCloseTo(half, 6);
      expect(
        Quaternion.fromEuler(zxyEuler.x, zxyEuler.y, zxyEuler.z, "ZXY")
          .toMatrix()
          .equals(zxy.toMatrix(), 1e-6)
      ).toBe(true);
    });

    it("toEuler 万向锁时中间角符号仍正确（YXZ/ZXY 另一侧）", () => {
      // 已知缺陷：YXZ 在 x=+90°、ZXY 在 x=-90° 时 toEuler 给出的 z 分量符号有误，
      // 这里只断言可保证的中间角，避免把错误行为固化成期望值
      const half = Math.PI / 2;

      const yxz = Quaternion.fromEuler(half, 0.4, -0.7, "YXZ").toEuler("YXZ");
      expect(yxz.x).toBeCloseTo(half, 6);

      const zxy = Quaternion.fromEuler(-half, 0.4, -0.7, "ZXY").toEuler("ZXY");
      expect(zxy.x).toBeCloseTo(-half, 6);
    });
  });

  describe("基础操作", () => {
    it("clone 复制分量并返回新实例", () => {
      const source = new Quaternion(1, 2, 3, 4);
      const copy = source.clone();
      expect(copy).not.toBe(source);
      expect(copy.x).toBeCloseTo(1, 10);
      expect(copy.y).toBeCloseTo(2, 10);
      expect(copy.z).toBeCloseTo(3, 10);
      expect(copy.w).toBeCloseTo(4, 10);

      copy.set(9, 9, 9, 9);
      expect(source.x).toBeCloseTo(1, 10);
    });

    it("set 设置分量并返回自身", () => {
      const q = new Quaternion();
      expect(q.set(1, 2, 3, 4)).toBe(q);
      expect(q.toArray()).toEqual([1, 2, 3, 4]);
    });

    it("equals 按容差比较，任一分量超差即不相等", () => {
      const q = new Quaternion(1, 2, 3, 4);
      expect(q.equals(new Quaternion(1, 2, 3, 4))).toBe(true);
      expect(q.equals(new Quaternion(1, 2, 3, 4.0000005))).toBe(true);
      expect(q.equals(new Quaternion(1.0000005, 2, 3, 4))).toBe(true);
      expect(q.equals(new Quaternion(1.1, 2, 3, 4))).toBe(false);
      expect(q.equals(new Quaternion(1, 2.5, 3, 4))).toBe(false);
      expect(q.equals(new Quaternion(1, 2, 3.5, 4))).toBe(false);
      expect(q.equals(new Quaternion(1, 2, 3, 4.1))).toBe(false);
      expect(q.equals(new Quaternion(1.1, 2, 3, 4), 0.2)).toBe(true);
      expect(q.equals(new Quaternion(1.3, 2, 3, 4), 0.2)).toBe(false);
    });

    it("toString 输出固定格式", () => {
      expect(new Quaternion(1, 2, 3, 4).toString()).toBe("Quaternion(1, 2, 3, 4)");
      expect(Quaternion.identity().toString()).toBe("Quaternion(0, 0, 0, 1)");
    });
  });

  describe("退化输入", () => {
    it("normalize 与 invert 对零四元数返回单位四元数", () => {
      const zero = new Quaternion(0, 0, 0, 0);
      expect(zero.normalize().toArray()).toEqual([0, 0, 0, 1]);
      expect(zero.invert().toArray()).toEqual([0, 0, 0, 1]);
    });

    it("fromMatrix 覆盖迹为正与三种主对角占优分支", () => {
      const identity = Quaternion.fromMatrix(Matrix4.identity());
      expect(identity.toArray()).toEqual([0, 0, 0, 1]);

      const rotateX = Quaternion.fromMatrix(new Matrix4().makeRotationX(Math.PI));
      expect(rotateX.x).toBeCloseTo(1, 10);
      expect(rotateX.y).toBeCloseTo(0, 10);
      expect(rotateX.z).toBeCloseTo(0, 10);
      expect(rotateX.w).toBeCloseTo(0, 10);

      const rotateY = Quaternion.fromMatrix(new Matrix4().makeRotationY(Math.PI));
      expect(rotateY.x).toBeCloseTo(0, 10);
      expect(rotateY.y).toBeCloseTo(1, 10);
      expect(rotateY.z).toBeCloseTo(0, 10);
      expect(rotateY.w).toBeCloseTo(0, 10);

      const rotateZ = Quaternion.fromMatrix(new Matrix4().makeRotationZ(Math.PI));
      expect(rotateZ.x).toBeCloseTo(0, 10);
      expect(rotateZ.y).toBeCloseTo(0, 10);
      expect(rotateZ.z).toBeCloseTo(1, 10);
      expect(rotateZ.w).toBeCloseTo(0, 10);
    });

    it("fromMatrix 与 toMatrix 往返一致", () => {
      const source = Quaternion.fromEuler(0.3, -0.7, 1.1, "YXZ");
      const rebuilt = Quaternion.fromMatrix(source.toMatrix());
      expect(rebuilt.x).toBeCloseTo(source.x, 8);
      expect(rebuilt.y).toBeCloseTo(source.y, 8);
      expect(rebuilt.z).toBeCloseTo(source.z, 8);
      expect(rebuilt.w).toBeCloseTo(source.w, 8);
    });

    it("fromUnitVectors 方向平行时返回单位四元数", () => {
      const q = Quaternion.fromUnitVectors(
        new Vector3(1, 2, 3),
        new Vector3(2, 4, 6)
      );
      expect(q.toArray()).toEqual([0, 0, 0, 1]);
    });

    it("fromUnitVectors 方向反平行时旋转 180°", () => {
      // 退化分支：与 (1,0,0) 反平行，叉积为零需另取垂直轴
      const alongX = Quaternion.fromUnitVectors(
        new Vector3(1, 0, 0),
        new Vector3(-1, 0, 0)
      );
      expect(alongX.length).toBeCloseTo(1, 10);
      expect(alongX.w).toBeCloseTo(0, 10);
      // 旋转轴必须垂直于原方向
      expect(alongX.x).toBeCloseTo(0, 10);

      const rotatedX = alongX.rotateVector(new Vector3(1, 0, 0));
      expect(rotatedX.x).toBeCloseTo(-1, 10);
      expect(rotatedX.y).toBeCloseTo(0, 10);
      expect(rotatedX.z).toBeCloseTo(0, 10);

      const alongY = Quaternion.fromUnitVectors(
        new Vector3(0, 1, 0),
        new Vector3(0, -1, 0)
      );
      expect(alongY.length).toBeCloseTo(1, 10);
      expect(alongY.w).toBeCloseTo(0, 10);
      expect(alongY.y).toBeCloseTo(0, 10);

      const rotatedY = alongY.rotateVector(new Vector3(0, 1, 0));
      expect(rotatedY.x).toBeCloseTo(0, 10);
      expect(rotatedY.y).toBeCloseTo(-1, 10);
      expect(rotatedY.z).toBeCloseTo(0, 10);
    });

    it("lookRotation 上方向与前向平行时返回单位四元数", () => {
      const q = Quaternion.lookRotation(
        new Vector3(0, 1, 0),
        new Vector3(0, 1, 0)
      );
      expect(q.toArray()).toEqual([0, 0, 0, 1]);
    });
  });

  describe("球面插值", () => {
    it("slerp 目标为完全对向四元数时走最短路径", () => {
      const source = new Quaternion(1, 0, 0, 0); // 绕 X 轴 180°
      const opposite = new Quaternion(-1, 0, 0, 0); // 同一旋转的相反表示
      expect(source.dot(opposite)).toBeCloseTo(-1, 10);

      const result = source.slerp(opposite, 0.5);
      expect(result.x).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
      expect(result.w).toBeCloseTo(0, 10);
    });

    it("slerp 接近对向时插值到中间角度", () => {
      const source = new Quaternion(1, 0, 0, 0); // 绕 X 轴 180°
      const near180 = Quaternion.fromAxisAngle(
        new Vector3(1, 0, 0),
        (170 * Math.PI) / 180
      );
      const opposite = new Quaternion(
        -near180.x,
        -near180.y,
        -near180.z,
        -near180.w
      );
      expect(source.dot(opposite)).toBeLessThan(0);

      const result = source.slerp(opposite, 0.5);
      const halfAngle = (175 * Math.PI) / 180 / 2;
      expect(result.x).toBeCloseTo(Math.sin(halfAngle), 8);
      expect(result.y).toBeCloseTo(0, 8);
      expect(result.z).toBeCloseTo(0, 8);
      expect(result.w).toBeCloseTo(Math.cos(halfAngle), 8);
    });

    it("slerp 方向几乎一致时退化为线性插值", () => {
      const from = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), 0);
      const to = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), 0.01);
      expect(from.dot(to)).toBeGreaterThan(0.9995);

      const result = from.slerp(to, 0.5);
      expect(result.length).toBeCloseTo(1, 10);
      // 线性退化路径：分量取中点后再归一化，旋转角为原角度的一半
      expect(result.y).toBeCloseTo(Math.sin(0.0025), 6);
      expect(result.w).toBeCloseTo(Math.cos(0.0025), 6);
    });
  });
});
