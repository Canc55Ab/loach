/**
 * 4x4 矩阵
 *
 * 约定：
 * - **列主序**存储（与 WebGL / three.js 一致），`elements[col * 4 + row]`
 * - 右手系坐标，与 Vector3 叉积一致
 * - 运算方法默认返回新实例，不修改自身
 */

import { Vector3 } from "./vector3";
import type { IVector3Like } from "./vector3";

/** 任意含 x/y/z/w 的对象（四元数结构） */
export interface IQuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** 矩阵分解结果 */
export interface IMatrixDecompose {
  position: Vector3;
  quaternion: IQuaternionLike;
  scale: Vector3;
}

/** 4x4 矩阵 */
export class Matrix4 {
  /** 列主序存储的 16 个元素 */
  public elements: number[];

  constructor(elements?: number[]) {
    this.elements = elements ? elements.slice() : Matrix4.identityElements();
  }

  /** 单位矩阵的元素 */
  private static identityElements(): number[] {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }

  /** 单位矩阵 */
  static identity(): Matrix4 {
    return new Matrix4();
  }

  /** 由 16 个元素创建（列主序） */
  static fromArray(elements: number[]): Matrix4 {
    return new Matrix4(elements);
  }

  /** 复制一份 */
  clone(): Matrix4 {
    return new Matrix4(this.elements);
  }

  /** 用目标覆盖自身并返回自身 */
  copy(m: Matrix4): this {
    this.elements = m.elements.slice();
    return this;
  }

  /** 是否相等（带容差） */
  equals(m: Matrix4, epsilon: number = 1e-6): boolean {
    for (let i = 0; i < 16; i++) {
      if (Math.abs(this.elements[i] - m.elements[i]) > epsilon) return false;
    }
    return true;
  }

  /**
   * 导出为行主序的二维数组（便于消元计算）
   */
  private toRowMajor(): number[][] {
    const rows: number[][] = [];
    for (let r = 0; r < 4; r++) {
      const row: number[] = [];
      for (let c = 0; c < 4; c++) row.push(this.at(r, c));
      rows.push(row);
    }
    return rows;
  }

  /** 读取指定行指定列（行优先书写，内部按列主序存储） */
  private at(row: number, col: number): number {
    return this.elements[col * 4 + row];
  }

  /** 写入指定行指定列 */
  private setAt(row: number, col: number, value: number): void {
    this.elements[col * 4 + row] = value;
  }

  /** 重置为单位矩阵 */
  makeIdentity(): this {
    this.elements = Matrix4.identityElements();
    return this;
  }

  /** 设置平移 */
  makeTranslation(x: number, y: number, z: number): this {
    this.elements = Matrix4.identityElements();
    this.setAt(0, 3, x);
    this.setAt(1, 3, y);
    this.setAt(2, 3, z);
    return this;
  }

  /** 设置缩放 */
  makeScale(x: number, y: number, z: number): this {
    this.elements = Matrix4.identityElements();
    this.setAt(0, 0, x);
    this.setAt(1, 1, y);
    this.setAt(2, 2, z);
    return this;
  }

  /** 绕 X 轴旋转 */
  makeRotationX(radians: number): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    this.elements = Matrix4.identityElements();
    this.setAt(1, 1, c);
    this.setAt(1, 2, -s);
    this.setAt(2, 1, s);
    this.setAt(2, 2, c);
    return this;
  }

  /** 绕 Y 轴旋转 */
  makeRotationY(radians: number): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    this.elements = Matrix4.identityElements();
    this.setAt(0, 0, c);
    this.setAt(0, 2, s);
    this.setAt(2, 0, -s);
    this.setAt(2, 2, c);
    return this;
  }

  /** 绕 Z 轴旋转 */
  makeRotationZ(radians: number): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    this.elements = Matrix4.identityElements();
    this.setAt(0, 0, c);
    this.setAt(0, 1, -s);
    this.setAt(1, 0, s);
    this.setAt(1, 1, c);
    return this;
  }

  /** 由四元数设置旋转 */
  makeRotationFromQuaternion(q: IQuaternionLike): this {
    const x = q.x;
    const y = q.y;
    const z = q.z;
    const w = q.w;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    this.elements = Matrix4.identityElements();
    this.setAt(0, 0, 1 - (yy + zz));
    this.setAt(0, 1, xy - wz);
    this.setAt(0, 2, xz + wy);
    this.setAt(1, 0, xy + wz);
    this.setAt(1, 1, 1 - (xx + zz));
    this.setAt(1, 2, yz - wx);
    this.setAt(2, 0, xz - wy);
    this.setAt(2, 1, yz + wx);
    this.setAt(2, 2, 1 - (xx + yy));
    return this;
  }

  /**
   * 组合变换：平移 × 旋转 × 缩放
   * @param position 位置
   * @param rotation 旋转四元数
   * @param scale 缩放
   */
  compose(
    position: IVector3Like,
    rotation: IQuaternionLike,
    scale: IVector3Like
  ): this {
    const rotationMatrix = new Matrix4().makeRotationFromQuaternion(rotation);
    const e = rotationMatrix.elements;

    this.elements = Matrix4.identityElements();
    this.setAt(0, 0, e[0] * scale.x);
    this.setAt(0, 1, e[4] * scale.y);
    this.setAt(0, 2, e[8] * scale.z);
    this.setAt(1, 0, e[1] * scale.x);
    this.setAt(1, 1, e[5] * scale.y);
    this.setAt(1, 2, e[9] * scale.z);
    this.setAt(2, 0, e[2] * scale.x);
    this.setAt(2, 1, e[6] * scale.y);
    this.setAt(2, 2, e[10] * scale.z);
    this.setAt(0, 3, position.x);
    this.setAt(1, 3, position.y);
    this.setAt(2, 3, position.z);
    return this;
  }

  /**
   * 分解变换
   * @returns 位置、四元数、缩放
   */
  decompose(): IMatrixDecompose {
    const determinant = this.determinant();

    let scaleX = Math.sqrt(
      this.at(0, 0) * this.at(0, 0) +
        this.at(1, 0) * this.at(1, 0) +
        this.at(2, 0) * this.at(2, 0)
    );
    if (determinant < 0) scaleX = -scaleX;
    const scaleY = Math.sqrt(
      this.at(0, 1) * this.at(0, 1) +
        this.at(1, 1) * this.at(1, 1) +
        this.at(2, 1) * this.at(2, 1)
    );
    const scaleZ = Math.sqrt(
      this.at(0, 2) * this.at(0, 2) +
        this.at(1, 2) * this.at(1, 2) +
        this.at(2, 2) * this.at(2, 2)
    );

    const position = new Vector3(
      this.at(0, 3),
      this.at(1, 3),
      this.at(2, 3)
    );

    // 先把三列除以对应缩放，还原成纯旋转矩阵再提取四元数
    const m11 = this.at(0, 0) / (scaleX || 1);
    const m21 = this.at(1, 0) / (scaleX || 1);
    const m31 = this.at(2, 0) / (scaleX || 1);
    const m12 = this.at(0, 1) / (scaleY || 1);
    const m22 = this.at(1, 1) / (scaleY || 1);
    const m32 = this.at(2, 1) / (scaleY || 1);
    const m13 = this.at(0, 2) / (scaleZ || 1);
    const m23 = this.at(1, 2) / (scaleZ || 1);
    const m33 = this.at(2, 2) / (scaleZ || 1);

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

    return {
      position,
      quaternion: { x, y, z, w },
      scale: new Vector3(scaleX, scaleY, scaleZ),
    };
  }

  /**
   * 矩阵乘法：this = this * m
   */
  multiply(m: Matrix4): Matrix4 {
    const result = Matrix4.multiplyMatrices(this, m);
    this.elements = result.elements;
    return this;
  }

  /**
   * 静态矩阵乘法：a * b
   */
  static multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
    const result = new Matrix4();
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a.at(row, k) * b.at(k, col);
        }
        result.setAt(row, col, sum);
      }
    }
    return result;
  }

  /**
   * 行列式
   *
   * 用带主元的 LU 消元计算
   */
  determinant(): number {
    const m = this.toRowMajor();
    let det = 1;

    for (let i = 0; i < 4; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < 4; r++) {
        if (Math.abs(m[r][i]) > Math.abs(m[pivotRow][i])) pivotRow = r;
      }
      if (Math.abs(m[pivotRow][i]) < 1e-12) return 0;

      if (pivotRow !== i) {
        const tmp = m[i];
        m[i] = m[pivotRow];
        m[pivotRow] = tmp;
        det = -det;
      }

      det *= m[i][i];

      for (let r = i + 1; r < 4; r++) {
        const factor = m[r][i] / m[i][i];
        for (let c = i; c < 4; c++) {
          m[r][c] -= factor * m[i][c];
        }
      }
    }

    return det;
  }

  /**
   * 求逆矩阵（奇异矩阵返回自身）
   *
   * 用带主元的 Gauss-Jordan 消元实现，4x4 规模下精度足够且不易写错
   */
  invert(): Matrix4 {
    // 增广矩阵：[A | I]
    const m: number[][] = [];
    for (let r = 0; r < 4; r++) {
      const row: number[] = [];
      for (let c = 0; c < 4; c++) row.push(this.at(r, c));
      for (let c = 0; c < 4; c++) row.push(r === c ? 1 : 0);
      m.push(row);
    }

    for (let i = 0; i < 4; i++) {
      // 选主元
      let pivotRow = i;
      for (let r = i + 1; r < 4; r++) {
        if (Math.abs(m[r][i]) > Math.abs(m[pivotRow][i])) pivotRow = r;
      }
      if (Math.abs(m[pivotRow][i]) < 1e-12) return this;

      if (pivotRow !== i) {
        const tmp = m[i];
        m[i] = m[pivotRow];
        m[pivotRow] = tmp;
      }

      // 主元行归一
      const pivot = m[i][i];
      for (let c = 0; c < 8; c++) m[i][c] /= pivot;

      // 消元
      for (let r = 0; r < 4; r++) {
        if (r === i) continue;
        const factor = m[r][i];
        if (factor === 0) continue;
        for (let c = 0; c < 8; c++) {
          m[r][c] -= factor * m[i][c];
        }
      }
    }

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        this.setAt(r, c, m[r][4 + c]);
      }
    }
    return this;
  }

  /**
   * 转置（返回新实例）
   */
  transposed(): Matrix4 {
    const result = new Matrix4();
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        result.setAt(row, col, this.at(col, row));
      }
    }
    return result;
  }

  /**
   * 变换点（含透视除法）
   */
  transformPoint(point: IVector3Like): Vector3 {
    const x = point.x;
    const y = point.y;
    const z = point.z;
    const e = this.elements;

    const w = e[3] * x + e[7] * y + e[11] * z + e[15];
    const divisor = w === 0 ? 1 : w;

    return new Vector3(
      (e[0] * x + e[4] * y + e[8] * z + e[12]) / divisor,
      (e[1] * x + e[5] * y + e[9] * z + e[13]) / divisor,
      (e[2] * x + e[6] * y + e[10] * z + e[14]) / divisor
    );
  }

  /**
   * 变换方向（忽略平移与透视除法）
   */
  transformDirection(direction: IVector3Like): Vector3 {
    const x = direction.x;
    const y = direction.y;
    const z = direction.z;
    const e = this.elements;

    return new Vector3(
      e[0] * x + e[4] * y + e[8] * z,
      e[1] * x + e[5] * y + e[9] * z,
      e[2] * x + e[6] * y + e[10] * z
    );
  }

  /**
   * 视图矩阵：相机看向目标
   */
  static lookAt(eye: IVector3Like, target: IVector3Like, up: IVector3Like): Matrix4 {
    const zAxis = new Vector3(eye.x, eye.y, eye.z)
      .subtract(target)
      .normalized();
    const xAxis = new Vector3(up.x, up.y, up.z).cross(zAxis).normalized();
    const yAxis = zAxis.cross(xAxis);

    const result = new Matrix4();
    result.setAt(0, 0, xAxis.x);
    result.setAt(1, 0, xAxis.y);
    result.setAt(2, 0, xAxis.z);
    result.setAt(0, 1, yAxis.x);
    result.setAt(1, 1, yAxis.y);
    result.setAt(2, 1, yAxis.z);
    result.setAt(0, 2, zAxis.x);
    result.setAt(1, 2, zAxis.y);
    result.setAt(2, 2, zAxis.z);
    result.setAt(0, 3, -xAxis.dot(new Vector3(eye.x, eye.y, eye.z)));
    result.setAt(1, 3, -yAxis.dot(new Vector3(eye.x, eye.y, eye.z)));
    result.setAt(2, 3, -zAxis.dot(new Vector3(eye.x, eye.y, eye.z)));
    result.setAt(3, 3, 1);
    return result;
  }

  /**
   * 透视投影矩阵（右手系，WebGL 深度范围 -1 ~ 1）
   * @param fovRadians 垂直视场角
   */
  static perspective(
    fovRadians: number,
    aspect: number,
    near: number,
    far: number
  ): Matrix4 {
    const f = 1 / Math.tan(fovRadians / 2);
    const result = new Matrix4();
    result.setAt(0, 0, f / aspect);
    result.setAt(1, 1, f);
    result.setAt(2, 2, (far + near) / (near - far));
    result.setAt(2, 3, (2 * far * near) / (near - far));
    result.setAt(3, 2, -1);
    // 透视矩阵的 m[3][3] 必须为 0，否则 w 的计算会带上常数项
    result.setAt(3, 3, 0);
    return result;
  }

  /**
   * 正交投影矩阵
   */
  static orthographic(
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number
  ): Matrix4 {
    const result = new Matrix4();
    result.setAt(0, 0, 2 / (right - left));
    result.setAt(1, 1, 2 / (top - bottom));
    result.setAt(2, 2, -2 / (far - near));
    result.setAt(0, 3, -(right + left) / (right - left));
    result.setAt(1, 3, -(top + bottom) / (top - bottom));
    result.setAt(2, 3, -(far + near) / (far - near));
    result.setAt(3, 3, 1);
    return result;
  }

  /** 转为数组（列主序） */
  toArray(): number[] {
    return this.elements.slice();
  }

  /** 字符串表示 */
  toString(): string {
    return `Matrix4(${this.elements.join(", ")})`;
  }
}

export default Matrix4;
