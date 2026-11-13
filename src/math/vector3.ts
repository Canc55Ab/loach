/**
 * 三维向量
 *
 * 约定（与 Vector2 保持一致）：
 * - 运算方法默认**返回新实例**，不修改自身
 * - 带 `InPlace` 后缀的方法原地修改并返回 `this`
 * - 叉积按右手系（x × y = z）
 */

/** 任意含 x/y/z 的对象 */
export interface IVector3Like {
  x: number;
  y: number;
  z: number;
}

/** 三维向量 */
export class Vector3 {
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  // ---------------- 静态构造 ----------------

  /** 零向量 */
  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  /** 各分量为 1 的向量 */
  static one(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  /** +X 方向单位向量 */
  static right(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  /** -X 方向单位向量 */
  static left(): Vector3 {
    return new Vector3(-1, 0, 0);
  }

  /** +Y 方向单位向量 */
  static up(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  /** -Y 方向单位向量 */
  static down(): Vector3 {
    return new Vector3(0, -1, 0);
  }

  /** +Z 方向单位向量（three.js 约定：forward = +Z） */
  static forward(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  /** -Z 方向单位向量 */
  static back(): Vector3 {
    return new Vector3(0, 0, -1);
  }

  /** 由任意含 x/y/z 的对象创建 */
  static from(source: IVector3Like): Vector3 {
    return new Vector3(source.x, source.y, source.z);
  }

  /** 由数组创建 */
  static fromArray(source: number[] | [number, number, number]): Vector3 {
    return new Vector3(source[0], source[1], source[2]);
  }

  /** 由球坐标创建（半径 radius，仰角 polar，方位角 azimuth） */
  static fromSpherical(
    radius: number,
    polar: number,
    azimuth: number
  ): Vector3 {
    const sinPolar = Math.sin(polar);
    return new Vector3(
      radius * sinPolar * Math.cos(azimuth),
      radius * Math.cos(polar),
      radius * sinPolar * Math.sin(azimuth)
    );
  }

  /** 静态线性插值 */
  static lerp(
    from: IVector3Like,
    to: IVector3Like,
    t: number
  ): Vector3 {
    return new Vector3(
      from.x + (to.x - from.x) * t,
      from.y + (to.y - from.y) * t,
      from.z + (to.z - from.z) * t
    );
  }

  // ---------------- 只读属性 ----------------

  /** 向量长度 */
  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /** 长度的平方 */
  get lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /** 是否为零向量 */
  get isZero(): boolean {
    return this.x === 0 && this.y === 0 && this.z === 0;
  }

  // ---------------- 基础操作 ----------------

  /** 复制一份 */
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /** 设置分量并返回自身 */
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /** 用目标覆盖自身并返回自身 */
  copyFrom(source: IVector3Like): this {
    this.x = source.x;
    this.y = source.y;
    this.z = source.z;
    return this;
  }

  /** 是否相等（带容差） */
  equals(other: IVector3Like, epsilon: number = 1e-6): boolean {
    return (
      Math.abs(this.x - other.x) <= epsilon &&
      Math.abs(this.y - other.y) <= epsilon &&
      Math.abs(this.z - other.z) <= epsilon
    );
  }

  // ---------------- 算术运算（返回新实例） ----------------

  /** 向量加法 */
  add(other: IVector3Like): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  /** 标量加法 */
  addScalar(value: number): Vector3 {
    return new Vector3(this.x + value, this.y + value, this.z + value);
  }

  /** 向量减法 */
  subtract(other: IVector3Like): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  /** 标量减法 */
  subtractScalar(value: number): Vector3 {
    return new Vector3(this.x - value, this.y - value, this.z - value);
  }

  /** 乘法：可乘向量或标量 */
  multiply(other: Vector3 | number): Vector3 {
    if (typeof other === "number") {
      return new Vector3(this.x * other, this.y * other, this.z * other);
    }
    return new Vector3(this.x * other.x, this.y * other.y, this.z * other.z);
  }

  /** 除法：可除向量或标量；除以零分量时该分量取 0 */
  divide(other: Vector3 | number): Vector3 {
    if (typeof other === "number") {
      return new Vector3(
        other === 0 ? 0 : this.x / other,
        other === 0 ? 0 : this.y / other,
        other === 0 ? 0 : this.z / other
      );
    }
    return new Vector3(
      other.x === 0 ? 0 : this.x / other.x,
      other.y === 0 ? 0 : this.y / other.y,
      other.z === 0 ? 0 : this.z / other.z
    );
  }

  /** 取反 */
  negate(): Vector3 {
    return new Vector3(-this.x, -this.y, -this.z);
  }

  /** 点积 */
  dot(other: IVector3Like): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /** 叉积（右手系：x × y = z） */
  cross(other: IVector3Like): Vector3 {
    return new Vector3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  /** 到目标的距离 */
  distanceTo(other: IVector3Like): number {
    return Math.sqrt(this.distanceToSquared(other));
  }

  /** 到目标距离的平方 */
  distanceToSquared(other: IVector3Like): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /** 归一化（零向量返回零向量，不产生 NaN） */
  normalized(): Vector3 {
    const len = this.length;
    if (len === 0) return Vector3.zero();
    return new Vector3(this.x / len, this.y / len, this.z / len);
  }

  /** 线性插值到目标 */
  lerp(target: IVector3Like, t: number): Vector3 {
    return Vector3.lerp(this, target, t);
  }

  /** 绕轴旋转（罗德里格斯公式，轴需为单位向量） */
  rotateAroundAxis(axis: IVector3Like, radians: number): Vector3 {
    const unit = Vector3.from(axis).normalized();
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const cross = unit.cross(this);
    const dot = unit.dot(this);
    return new Vector3(
      this.x * cos + cross.x * sin + unit.x * dot * (1 - cos),
      this.y * cos + cross.y * sin + unit.y * dot * (1 - cos),
      this.z * cos + cross.z * sin + unit.z * dot * (1 - cos)
    );
  }

  /** 投影到目标向量上 */
  projectOn(target: IVector3Like): Vector3 {
    const lenSq = target.x * target.x + target.y * target.y + target.z * target.z;
    if (lenSq === 0) return Vector3.zero();
    const scale = this.dot(target) / lenSq;
    return new Vector3(target.x * scale, target.y * scale, target.z * scale);
  }

  /** 投影到平面（法线需为单位向量） */
  projectOnPlane(normal: IVector3Like): Vector3 {
    const lenSq = normal.x * normal.x + normal.y * normal.y + normal.z * normal.z;
    if (lenSq === 0) return this.clone();
    const scale = this.dot(normal) / lenSq;
    return new Vector3(
      this.x - normal.x * scale,
      this.y - normal.y * scale,
      this.z - normal.z * scale
    );
  }

  /** 沿法线反射（法线需为单位向量） */
  reflect(normal: IVector3Like): Vector3 {
    const dot = this.dot(normal);
    return new Vector3(
      this.x - 2 * dot * normal.x,
      this.y - 2 * dot * normal.y,
      this.z - 2 * dot * normal.z
    );
  }

  /** 与另一个向量的夹角（弧度，[0, π]） */
  angleTo(other: IVector3Like): number {
    return Math.atan2(this.cross(other).length, this.dot(other));
  }

  /** 绕指定轴的有向夹角（弧度，(-π, π]） */
  angleToSigned(other: IVector3Like, axis: IVector3Like): number {
    const cross = this.cross(other);
    const sign = Math.sign(cross.dot(axis));
    return sign * this.angleTo(other);
  }

  /** 分量裁剪到 [min, max] */
  clamp(min: IVector3Like, max: IVector3Like): Vector3 {
    return new Vector3(
      Math.min(Math.max(this.x, min.x), max.x),
      Math.min(Math.max(this.y, min.y), max.y),
      Math.min(Math.max(this.z, min.z), max.z)
    );
  }

  /** 长度裁剪到 [min, max] */
  clampLength(min: number, max: number): Vector3 {
    const len = this.length;
    if (len === 0) return Vector3.zero();
    if (len < min) return this.clone().multiply(min / len);
    if (len > max) return this.clone().multiply(max / len);
    return this.clone();
  }

  /** 限制最大长度 */
  limit(max: number): Vector3 {
    return this.clampLength(0, max);
  }

  /** 调整到指定长度（保持方向） */
  withLength(length: number): Vector3 {
    const len = this.length;
    if (len === 0) return Vector3.zero();
    return this.clone().multiply(length / len);
  }

  /** 向下取整 */
  floor(): Vector3 {
    return new Vector3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
  }

  /** 四舍五入 */
  round(): Vector3 {
    return new Vector3(Math.round(this.x), Math.round(this.y), Math.round(this.z));
  }

  /** 转为数组 */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /** 字符串表示 */
  toString(): string {
    return `Vector3(${this.x}, ${this.y}, ${this.z})`;
  }

  // ---------------- 原地运算（热路径） ----------------

  /** 原地向量加法 */
  addInPlace(other: IVector3Like): this {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  /** 原地向量减法 */
  subtractInPlace(other: IVector3Like): this {
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
  }

  /** 原地标量缩放 */
  scaleInPlace(scale: number): this {
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
    return this;
  }

  /** 原地归一化 */
  normalizeInPlace(): this {
    const len = this.length;
    if (len === 0) return this;
    this.x /= len;
    this.y /= len;
    this.z /= len;
    return this;
  }

  /** 原地插值 */
  lerpInPlace(target: IVector3Like, t: number): this {
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;
    this.z += (target.z - this.z) * t;
    return this;
  }
}

export default Vector3;
