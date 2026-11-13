/**
 * 视锥剔除
 *
 * 由视投影矩阵提取 6 个裁剪平面，用于快速判断物体是否在相机视锥内。
 */

import { Vector3 } from "../math/vector3";
import type { IVector3Like } from "../math/vector3";
import { Matrix4 } from "../math/matrix4";
import { Plane } from "../math/plane";

/** 三维包围盒 */
export interface IBounds3 {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** 视锥 */
export class Frustum {
  private readonly _planes: Plane[];

  constructor(planes: Plane[]) {
    this._planes = planes;
  }

  /**
   * 由视投影矩阵提取视锥
   * @param matrix 视投影矩阵（相机矩阵 × 投影矩阵）
   */
  static fromMatrix4(matrix: Matrix4): Frustum {
    const e = matrix.elements;

    // 矩阵的各行（列主序存储下按行取）
    const row0 = new Vector3(e[0], e[4], e[8]);
    const row1 = new Vector3(e[1], e[5], e[9]);
    const row2 = new Vector3(e[2], e[6], e[10]);
    const row3 = new Vector3(e[3], e[7], e[11]);

    // 左 / 右 / 下 / 上 / 近 / 远，由「行组合」得到平面方程
    const raw: Array<[Vector3, number]> = [
      [row3.add(row0), e[15] + e[12]],
      [row3.subtract(row0), e[15] - e[12]],
      [row3.add(row1), e[15] + e[13]],
      [row3.subtract(row1), e[15] - e[13]],
      [row3.add(row2), e[15] + e[14]],
      [row3.subtract(row2), e[15] - e[14]],
    ];

    const planes = raw.map(([normal, constant]) => {
      const len = normal.length;
      const unit = len === 0 ? normal : normal.multiply(1 / len);
      return new Plane(unit, len === 0 ? 0 : constant / len);
    });

    return new Frustum(planes);
  }

  /** 六个裁剪平面 */
  get planes(): Plane[] {
    return this._planes;
  }

  /**
   * 点是否在视锥内
   */
  public containsPoint(point: IVector3Like): boolean {
    for (const plane of this._planes) {
      if (plane.distanceToPoint(point) < 0) return false;
    }
    return true;
  }

  /**
   * 球是否完全在视锥内
   */
  public containsSphere(center: IVector3Like, radius: number): boolean {
    for (const plane of this._planes) {
      if (plane.distanceToPoint(center) < -radius) return false;
    }
    return true;
  }

  /**
   * 球是否与视锥相交（部分在视锥内也算）
   */
  public intersectsSphere(center: IVector3Like, radius: number): boolean {
    for (const plane of this._planes) {
      if (plane.distanceToPoint(center) < -radius) return false;
    }
    return true;
  }

  /**
   * AABB 是否与视锥相交
   *
   * 对每个平面取 AABB 在该平面法线方向上最远的顶点做判定
   */
  public intersectsAabb(bounds: IBounds3): boolean {
    for (const plane of this._planes) {
      const normal = plane.normal;
      const positiveX = normal.x >= 0 ? bounds.maxX : bounds.minX;
      const positiveY = normal.y >= 0 ? bounds.maxY : bounds.minY;
      const positiveZ = normal.z >= 0 ? bounds.maxZ : bounds.minZ;

      const distance =
        normal.x * positiveX + normal.y * positiveY + normal.z * positiveZ + plane.constant;
      if (distance < 0) return false;
    }
    return true;
  }

  /**
   * 提取视锥的 8 个角点
   *
   * 角点顺序：近平面 4 个（左下、右下、右上、左上），远平面同序
   */
  public getCorners(): Vector3[] {
    if (this._planes.length !== 6) return [];

    const [left, right, bottom, top, near, far] = this._planes;

    // 三平面求交：p = (d1(n2×n3) + d2(n3×n1) + d3(n1×n2)) / (n1·(n2×n3))
    const intersect = (a: Plane, b: Plane, c: Plane): Vector3 => {
      const n1n2 = a.normal.cross(b.normal);
      const n2n3 = b.normal.cross(c.normal);
      const n3n1 = c.normal.cross(a.normal);
      const denominator = a.normal.dot(n2n3);
      if (Math.abs(denominator) < 1e-10) return Vector3.zero();
      return n1n2
        .multiply(c.constant)
        .add(n2n3.multiply(a.constant))
        .add(n3n1.multiply(b.constant))
        .multiply(1 / denominator);
    };

    const nbl = intersect(near, bottom, left);
    const nbr = intersect(near, bottom, right);
    const ntr = intersect(near, top, right);
    const ntl = intersect(near, top, left);
    const fbl = intersect(far, bottom, left);
    const fbr = intersect(far, bottom, right);
    const ftr = intersect(far, top, right);
    const ftl = intersect(far, top, left);

    return [nbl, nbr, ntr, ntl, fbl, fbr, ftr, ftl];
  }
}

export default Frustum;
