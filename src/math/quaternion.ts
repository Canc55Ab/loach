/**
 * 四元数
 *
 * 约定：
 * - 分量顺序 `(x, y, z, w)`，w 在最后（与 three.js 一致）
 * - 右手系坐标
 * - 运算方法默认返回新实例，不修改自身
 */

import { Vector3 } from "./vector3";
import type { IVector3Like } from "./vector3";
import { Matrix4 } from "./matrix4";

/** 欧拉角顺序 */
export type EulerOrder = "XYZ" | "YXZ" | "ZXY" | "ZYX" | "YZX" | "XZY";

/** 欧拉角 */
export interface IEuler {
  x: number;
  y: number;
  z: number;
}

/** 四元数 */
export class Quaternion {
  public x: number;
  public y: number;
  public z: number;
  public w: number;

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  // ---------------- 静态构造 ----------------

  /** 单位四元数 */
  static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  /** 由轴与旋转角创建 */
  static fromAxisAngle(axis: IVector3Like, radians: number): Quaternion {
    const unit = new Vector3(axis.x, axis.y, axis.z).normalized();
    const half = radians / 2;
    const sin = Math.sin(half);
    return new Quaternion(unit.x * sin, unit.y * sin, unit.z * sin, Math.cos(half));
  }

  /**
   * 由欧拉角创建
   * @param order 旋转顺序，默认 YXZ
   */
  static fromEuler(
    x: number,
    y: number,
    z: number,
    order: EulerOrder = "YXZ"
  ): Quaternion {
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    switch (order) {
      case "XYZ":
        return new Quaternion(
          s1 * c2 * c3 + c1 * s2 * s3,
          c1 * s2 * c3 - s1 * c2 * s3,
          c1 * c2 * s3 + s1 * s2 * c3,
          c1 * c2 * c3 - s1 * s2 * s3
        );
      case "YXZ":
        return new Quaternion(
          s1 * c2 * c3 + c1 * s2 * s3,
          c1 * s2 * c3 - s1 * c2 * s3,
          c1 * c2 * s3 - s1 * s2 * c3,
          c1 * c2 * c3 + s1 * s2 * s3
        );
      case "ZXY":
        return new Quaternion(
          s1 * c2 * c3 - c1 * s2 * s3,
          c1 * s2 * c3 + s1 * c2 * s3,
          c1 * c2 * s3 + s1 * s2 * c3,
          c1 * c2 * c3 - s1 * s2 * s3
        );
      case "ZYX":
        return new Quaternion(
          s1 * c2 * c3 - c1 * s2 * s3,
          c1 * s2 * c3 + s1 * c2 * s3,
          c1 * c2 * s3 - s1 * s2 * c3,
          c1 * c2 * c3 + s1 * s2 * s3
        );
      case "YZX":
        return new Quaternion(
          s1 * c2 * c3 + c1 * s2 * s3,
          c1 * s2 * c3 + s1 * c2 * s3,
          c1 * c2 * s3 - s1 * s2 * c3,
          c1 * c2 * c3 - s1 * s2 * s3
        );
      case "XZY":
      default:
        return new Quaternion(
          s1 * c2 * c3 - c1 * s2 * s3,
          c1 * s2 * c3 - s1 * c2 * s3,
          c1 * c2 * s3 + s1 * s2 * c3,
          c1 * c2 * c3 + s1 * s2 * s3
        );
    }
  }

  /** 由角度值（度）创建欧拉角四元数 */
  static fromEulerDegrees(
    x: number,
    y: number,
    z: number,
    order: EulerOrder = "YXZ"
  ): Quaternion {
    const toRad = Math.PI / 180;
    return Quaternion.fromEuler(x * toRad, y * toRad, z * toRad, order);
  }

  /** 由旋转矩阵创建（忽略缩放与平移） */
  static fromMatrix(matrix: Matrix4): Quaternion {
    const m11 = matrix.elements[0];
    const m12 = matrix.elements[4];
    const m13 = matrix.elements[8];
    const m21 = matrix.elements[1];
    const m22 = matrix.elements[5];
    const m23 = matrix.elements[9];
    const m31 = matrix.elements[2];
    const m32 = matrix.elements[6];
    const m33 = matrix.elements[10];

    const trace = m11 + m22 + m33;
    let x: number;
    let y: number;
    let z: number;
    let w: number;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      w = 0.25 / s;
      x = (m32 - m23) * s;
      y = (m13 - m31) * s;
      z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
      w = (m32 - m23) / s;
      x = 0.25 * s;
      y = (m12 + m21) / s;
      z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
      w = (m13 - m31) / s;
      x = (m12 + m21) / s;
      y = 0.25 * s;
      z = (m23 + m32) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
      w = (m21 - m12) / s;
      x = (m13 + m31) / s;
      y = (m23 + m32) / s;
      z = 0.25 * s;
    }

    return new Quaternion(x, y, z, w);
  }

  /** 由两个单位向量构造（把 from 旋转到 to） */
  static fromUnitVectors(from: IVector3Like, to: IVector3Like): Quaternion {
    const v1 = new Vector3(from.x, from.y, from.z).normalized();
    const v2 = new Vector3(to.x, to.y, to.z).normalized();
    const dot = v1.dot(v2);

    if (dot >= 1 - 1e-8) return Quaternion.identity();
    if (dot <= -1 + 1e-8) {
      // 180°：取任意垂直轴
      const axis = new Vector3(1, 0, 0).cross(v1);
      if (axis.isZero) axis.set(0, 1, 0).cross(v1);
      axis.normalizeInPlace();
      return new Quaternion(axis.x, axis.y, axis.z, 0);
    }

    const cross = v1.cross(v2);
    const quaternion = new Quaternion(cross.x, cross.y, cross.z, 1 + dot);
    return quaternion.normalize();
  }

  /** 由前向与上方向构造朝向四元数 */
  static lookRotation(forward: IVector3Like, up: IVector3Like): Quaternion {
    const f = new Vector3(forward.x, forward.y, forward.z).normalized();
    const u = new Vector3(up.x, up.y, up.z).normalized();
    const r = u.cross(f).normalized();
    if (r.isZero) return Quaternion.identity();
    const trueUp = f.cross(r);
    const matrix = new Matrix4();
    const e = matrix.elements;
    e[0] = r.x;
    e[1] = r.y;
    e[2] = r.z;
    e[4] = trueUp.x;
    e[5] = trueUp.y;
    e[6] = trueUp.z;
    e[8] = f.x;
    e[9] = f.y;
    e[10] = f.z;
    return Quaternion.fromMatrix(matrix);
  }

  // ---------------- 基础操作 ----------------

  /** 复制一份 */
  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  /** 设置分量并返回自身 */
  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  /** 是否相等（带容差） */
  equals(other: Quaternion, epsilon: number = 1e-6): boolean {
    return (
      Math.abs(this.x - other.x) <= epsilon &&
      Math.abs(this.y - other.y) <= epsilon &&
      Math.abs(this.z - other.z) <= epsilon &&
      Math.abs(this.w - other.w) <= epsilon
    );
  }

  /** 模长 */
  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  /** 模长平方 */
  get lengthSquared(): number {
    return (
      this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w
    );
  }

  // ---------------- 运算 ----------------

  /** 四元数乘法（this * q，表示先应用 this 再应用 q） */
  multiply(q: Quaternion): Quaternion {
    const x = this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y;
    const y = this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x;
    const z = this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w;
    const w = this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z;
    return new Quaternion(x, y, z, w);
  }

  /** 点积 */
  dot(q: Quaternion): number {
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
  }

  /** 共轭 */
  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }

  /** 求逆（单位四元数的逆等于共轭） */
  invert(): Quaternion {
    const lenSq = this.lengthSquared;
    if (lenSq === 0) return Quaternion.identity();
    const conjugate = this.conjugate();
    return new Quaternion(
      conjugate.x / lenSq,
      conjugate.y / lenSq,
      conjugate.z / lenSq,
      conjugate.w / lenSq
    );
  }

  /** 归一化 */
  normalize(): Quaternion {
    const len = this.length;
    if (len === 0) return Quaternion.identity();
    return new Quaternion(this.x / len, this.y / len, this.z / len, this.w / len);
  }

  /**
   * 球面线性插值（走最短路径）
   * @param target 目标四元数
   * @param t 插值系数 [0, 1]
   */
  slerp(target: Quaternion, t: number): Quaternion {
    let cos = this.dot(target);
    let endX = target.x;
    let endY = target.y;
    let endZ = target.z;
    let endW = target.w;

    if (cos < 0) {
      cos = -cos;
      endX = -endX;
      endY = -endY;
      endZ = -endZ;
      endW = -endW;
    }

    if (cos > 0.9995) {
      // 角度过小，退化为线性插值
      return new Quaternion(
        this.x + (endX - this.x) * t,
        this.y + (endY - this.y) * t,
        this.z + (endZ - this.z) * t,
        this.w + (endW - this.w) * t
      ).normalize();
    }

    const theta = Math.acos(Math.min(Math.max(cos, -1), 1));
    const sinTheta = Math.sin(theta);
    const scaleA = Math.sin((1 - t) * theta) / sinTheta;
    const scaleB = Math.sin(t * theta) / sinTheta;

    return new Quaternion(
      this.x * scaleA + endX * scaleB,
      this.y * scaleA + endY * scaleB,
      this.z * scaleA + endZ * scaleB,
      this.w * scaleA + endW * scaleB
    );
  }

  /**
   * 用四元数旋转向量：v' = q · v · q⁻¹
   */
  rotateVector(v: IVector3Like): Vector3 {
    const q = this;
    const ix = q.w * v.x + q.y * v.z - q.z * v.y;
    const iy = q.w * v.y + q.z * v.x - q.x * v.z;
    const iz = q.w * v.z + q.x * v.y - q.y * v.x;
    const iw = -q.x * v.x - q.y * v.y - q.z * v.z;

    return new Vector3(
      ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
      iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
      iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x
    );
  }

  /** 转为旋转矩阵 */
  toMatrix(): Matrix4 {
    return new Matrix4().makeRotationFromQuaternion(this);
  }

  /**
   * 转为欧拉角
   * @param order 与 fromEuler 相同的旋转顺序
   */
  toEuler(order: EulerOrder = "YXZ"): IEuler {
    const matrix = this.toMatrix();
    const m11 = matrix.elements[0];
    const m12 = matrix.elements[4];
    const m13 = matrix.elements[8];
    const m21 = matrix.elements[1];
    const m22 = matrix.elements[5];
    const m23 = matrix.elements[9];
    const m31 = matrix.elements[2];
    const m32 = matrix.elements[6];
    const m33 = matrix.elements[10];

    const clamp = (value: number): number =>
      Math.min(Math.max(value, -1), 1);

    let x: number;
    let y: number;
    let z: number;

    switch (order) {
      case "XYZ":
        y = Math.asin(clamp(m13));
        if (Math.abs(m13) < 0.9999999) {
          x = Math.atan2(-m23, m33);
          z = Math.atan2(-m12, m11);
        } else {
          x = Math.atan2(m32, m22);
          z = 0;
        }
        break;
      case "YXZ":
        x = Math.asin(-clamp(m23));
        if (Math.abs(m23) < 0.9999999) {
          y = Math.atan2(m13, m33);
          z = Math.atan2(m21, m22);
        } else {
          // 万向锁：中间角只能取 0，末角需带上 sin(x) 的符号，
          // 否则 x = ±90° 时的 z 会整体取反，重建矩阵对不上原旋转
          y = 0;
          const s = -m23;
          z = Math.atan2(s * m31, s * m32);
        }
        break;
      case "ZXY":
        x = Math.asin(clamp(m32));
        if (Math.abs(m32) < 0.9999999) {
          y = Math.atan2(-m31, m33);
          z = Math.atan2(-m12, m22);
        } else {
          y = 0;
          const s = m32;
          z = Math.atan2(s * m13, m11);
        }
        break;
      case "ZYX":
        y = Math.asin(-clamp(m31));
        if (Math.abs(m31) < 0.9999999) {
          x = Math.atan2(m32, m33);
          z = Math.atan2(m21, m11);
        } else {
          x = 0;
          z = Math.atan2(-m12, m22);
        }
        break;
      case "YZX":
        z = Math.asin(clamp(m21));
        if (Math.abs(m21) < 0.9999999) {
          x = Math.atan2(-m23, m22);
          y = Math.atan2(-m31, m11);
        } else {
          x = 0;
          y = Math.atan2(m13, m33);
        }
        break;
      case "XZY":
      default:
        z = Math.asin(-clamp(m12));
        if (Math.abs(m12) < 0.9999999) {
          x = Math.atan2(m32, m22);
          y = Math.atan2(m13, m11);
        } else {
          x = Math.atan2(-m23, m33);
          y = 0;
        }
        break;
    }

    return { x, y, z };
  }

  /** 与另一个四元数的夹角（弧度） */
  angleTo(q: Quaternion): number {
    const dot = Math.min(Math.max(Math.abs(this.dot(q)), -1), 1);
    return 2 * Math.acos(dot);
  }

  /** 转为数组 */
  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }

  /** 字符串表示 */
  toString(): string {
    return `Quaternion(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
  }
}

export default Quaternion;
