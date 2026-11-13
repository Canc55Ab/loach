/**
 * 二维向量
 *
 * 约定：
 * - 运算方法默认**返回新实例**，不修改自身（避免别名污染）
 * - 带 `InPlace` 后缀的方法原地修改并返回 `this`（用于游戏主循环热路径）
 * - 角度单位为弧度，`angle` / `angleTo` 以 **+X 轴逆时针为正**
 */

/** 任意含 x/y 字段的对象 */
export interface IVector2Like {
  x: number;
  y: number;
}

/** 二维向量 */
export class Vector2 {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  // ---------------- 静态构造 ----------------

  /** 零向量 */
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /** 各分量为 1 的向量 */
  static one(): Vector2 {
    return new Vector2(1, 1);
  }

  /** +X 方向单位向量 */
  static right(): Vector2 {
    return new Vector2(1, 0);
  }

  /** -X 方向单位向量 */
  static left(): Vector2 {
    return new Vector2(-1, 0);
  }

  /** +Y 方向单位向量 */
  static up(): Vector2 {
    return new Vector2(0, 1);
  }

  /** -Y 方向单位向量 */
  static down(): Vector2 {
    return new Vector2(0, -1);
  }

  /** 由任意含 x/y 的对象创建 */
  static from(source: IVector2Like): Vector2 {
    return new Vector2(source.x, source.y);
  }

  /** 由极坐标创建 */
  static fromAngle(angle: number, radius: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  /** 静态线性插值 */
  static lerp(from: IVector2Like, to: IVector2Like, t: number): Vector2 {
    return new Vector2(
      from.x + (to.x - from.x) * t,
      from.y + (to.y - from.y) * t
    );
  }

  // ---------------- 只读属性 ----------------

  /** 向量长度 */
  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** 长度的平方（比较距离时避免开方） */
  get lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** 与 +X 轴的夹角（弧度，(-π, π]） */
  get angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** 是否为零向量 */
  get isZero(): boolean {
    return this.x === 0 && this.y === 0;
  }

  // ---------------- 基础操作 ----------------

  /** 复制一份 */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /** 设置分量并返回自身 */
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /** 用目标覆盖自身并返回自身 */
  copyFrom(source: IVector2Like): this {
    this.x = source.x;
    this.y = source.y;
    return this;
  }

  /** 是否相等（带容差） */
  equals(other: IVector2Like, epsilon: number = 1e-6): boolean {
    return (
      Math.abs(this.x - other.x) <= epsilon &&
      Math.abs(this.y - other.y) <= epsilon
    );
  }

  // ---------------- 算术运算（返回新实例） ----------------

  /** 向量加法 */
  add(other: IVector2Like): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  /** 标量加法 */
  addScalar(value: number): Vector2 {
    return new Vector2(this.x + value, this.y + value);
  }

  /** 向量减法 */
  subtract(other: IVector2Like): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  /** 标量减法 */
  subtractScalar(value: number): Vector2 {
    return new Vector2(this.x - value, this.y - value);
  }

  /** 乘法：可乘向量或标量 */
  multiply(other: Vector2 | number): Vector2 {
    if (typeof other === "number") {
      return new Vector2(this.x * other, this.y * other);
    }
    return new Vector2(this.x * other.x, this.y * other.y);
  }

  /** 除法：可除向量或标量；除以零分量时该分量取 0 */
  divide(other: Vector2 | number): Vector2 {
    if (typeof other === "number") {
      return new Vector2(
        other === 0 ? 0 : this.x / other,
        other === 0 ? 0 : this.y / other
      );
    }
    return new Vector2(
      other.x === 0 ? 0 : this.x / other.x,
      other.y === 0 ? 0 : this.y / other.y
    );
  }

  /** 取反 */
  negate(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  /** 点积 */
  dot(other: IVector2Like): number {
    return this.x * other.x + this.y * other.y;
  }

  /** 二维叉积的 z 分量 */
  cross(other: IVector2Like): number {
    return this.x * other.y - this.y * other.x;
  }

  /** 到目标的距离 */
  distanceTo(other: IVector2Like): number {
    return Math.sqrt(this.distanceToSquared(other));
  }

  /** 到目标距离的平方 */
  distanceToSquared(other: IVector2Like): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /** 归一化（零向量返回零向量，不产生 NaN） */
  normalized(): Vector2 {
    const len = this.length;
    if (len === 0) return Vector2.zero();
    return new Vector2(this.x / len, this.y / len);
  }

  /** 线性插值到目标 */
  lerp(target: IVector2Like, t: number): Vector2 {
    return Vector2.lerp(this, target, t);
  }

  /** 绕原点旋转（弧度，逆时针） */
  rotate(radians: number): Vector2 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /** 绕支点旋转（弧度，逆时针） */
  rotateAround(pivot: IVector2Like, radians: number): Vector2 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = this.x - pivot.x;
    const dy = this.y - pivot.y;
    return new Vector2(
      pivot.x + dx * cos - dy * sin,
      pivot.y + dx * sin + dy * cos
    );
  }

  /** 与另一个向量的夹角（弧度，(-π, π]） */
  angleTo(other: IVector2Like): number {
    return Math.atan2(this.cross(other), this.dot(other));
  }

  /** 沿法线反射（法线需为单位向量） */
  reflect(normal: IVector2Like): Vector2 {
    const dot = this.dot(normal);
    return new Vector2(
      this.x - 2 * dot * normal.x,
      this.y - 2 * dot * normal.y
    );
  }

  /** 分量裁剪到 [min, max] */
  clamp(min: IVector2Like, max: IVector2Like): Vector2 {
    return new Vector2(
      Math.min(Math.max(this.x, min.x), max.x),
      Math.min(Math.max(this.y, min.y), max.y)
    );
  }

  /** 长度裁剪到 [min, max] */
  clampLength(min: number, max: number): Vector2 {
    const len = this.length;
    if (len === 0) return Vector2.zero();
    if (len < min) return this.clone().multiply(min / len);
    if (len > max) return this.clone().multiply(max / len);
    return this.clone();
  }

  /** 限制最大长度 */
  limit(max: number): Vector2 {
    return this.clampLength(0, max);
  }

  /** 调整到指定长度（保持方向） */
  withLength(length: number): Vector2 {
    const len = this.length;
    if (len === 0) return Vector2.zero();
    return this.clone().multiply(length / len);
  }

  /** 向下取整 */
  floor(): Vector2 {
    return new Vector2(Math.floor(this.x), Math.floor(this.y));
  }

  /** 四舍五入 */
  round(): Vector2 {
    return new Vector2(Math.round(this.x), Math.round(this.y));
  }

  /** 转为数组 */
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  /** 字符串表示 */
  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  // ---------------- 原地运算（热路径） ----------------

  /** 原地向量加法 */
  addInPlace(other: IVector2Like): this {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  /** 原地向量减法 */
  subtractInPlace(other: IVector2Like): this {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  /** 原地标量缩放 */
  scaleInPlace(scale: number): this {
    this.x *= scale;
    this.y *= scale;
    return this;
  }

  /** 原地归一化 */
  normalizeInPlace(): this {
    const len = this.length;
    if (len === 0) return this;
    this.x /= len;
    this.y /= len;
    return this;
  }

  /** 原地插值 */
  lerpInPlace(target: IVector2Like, t: number): this {
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;
    return this;
  }
}

export default Vector2;
