/**
 * 平面
 *
 * 平面定义：`normal · p + constant = 0`
 */

import { Vector3 } from "./vector3";
import type { IVector3Like } from "./vector3";

/** 平面 */
export class Plane {
  /** 单位法线 */
  public normal: Vector3;
  /** 平面常数 */
  public constant: number;

  constructor(normal: IVector3Like = { x: 0, y: 1, z: 0 }, constant: number = 0) {
    this.normal = new Vector3(normal.x, normal.y, normal.z);
    this.constant = constant;
  }

  /**
   * 由三个点确定平面
   */
  static fromPoints(
    a: IVector3Like,
    b: IVector3Like,
    c: IVector3Like
  ): Plane {
    const pointA = new Vector3(a.x, a.y, a.z);
    const pointB = new Vector3(b.x, b.y, b.z);
    const pointC = new Vector3(c.x, c.y, c.z);
    const normal = pointB.subtract(pointA).cross(pointC.subtract(pointA)).normalized();
    if (normal.isZero) {
      return new Plane(new Vector3(0, 1, 0), 0);
    }
    return new Plane(normal, -normal.dot(pointA));
  }

  /**
   * 由法线与平面上一点确定平面
   */
  static fromNormalAndPoint(
    normal: IVector3Like,
    point: IVector3Like
  ): Plane {
    const unit = new Vector3(normal.x, normal.y, normal.z).normalized();
    const p = new Vector3(point.x, point.y, point.z);
    return new Plane(unit, -unit.dot(p));
  }

  /** 复制一份 */
  clone(): Plane {
    return new Plane(this.normal, this.constant);
  }

  /**
   * 点到平面的带符号距离
   * 正值表示点在法线方向一侧
   */
  distanceToPoint(point: IVector3Like): number {
    return this.normal.dot(new Vector3(point.x, point.y, point.z)) + this.constant;
  }

  /**
   * 点到平面的最近点投影
   */
  projectPoint(point: IVector3Like): Vector3 {
    const p = new Vector3(point.x, point.y, point.z);
    return p.subtract(this.normal.clone().multiply(this.distanceToPoint(point)));
  }

  /**
   * 点是否落在平面上
   */
  coplanar(point: IVector3Like, epsilon: number = 1e-6): boolean {
    return Math.abs(this.distanceToPoint(point)) <= epsilon;
  }

  /** 字符串表示 */
  toString(): string {
    return `Plane(${this.normal.toString()}, ${this.constant})`;
  }
}

export default Plane;
