/**
 * BVH（包围体层次结构）
 *
 * 3D 场景中三角网格的加速结构，适用于射线拾取、视锥粗筛、碰撞查询。
 * 约定：
 * - 构建时**不修改**传入的三角形数组（内部复制索引后再排序）
 * - `queryRange` 返回相交三角形的**索引**（相对于构造入参的顺序）
 */

import { Vector3 } from "../math/vector3";
import type { IVector3Like } from "../math/vector3";
import { rayTriangle } from "./collision3d";

/** 三角形 */
export interface ITriangle3 {
  a: IVector3Like;
  b: IVector3Like;
  c: IVector3Like;
}

/** 三维包围盒 */
export interface IBounds3 {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** BVH 配置 */
export interface IBVHOptions {
  /** 叶子节点最多包含的三角形数，默认 4 */
  maxLeafSize?: number;
}

/** BVH 节点 */
export interface IBVHNode {
  /** 节点包围盒 */
  bounds: IBounds3;
  /** 左子树 */
  left: IBVHNode | null;
  /** 右子树 */
  right: IBVHNode | null;
  /** 叶子节点持有的三角形索引 */
  indices: number[];
}

/** 射线命中结果 */
export interface IBVHHit {
  /** 命中距离 */
  distance: number;
  /** 命中的三角形索引 */
  index: number;
  /** 命中点 */
  point: Vector3;
}

/**
 * 判断三角形是否与 AABB 相交（13 轴分离轴判定）
 */
export function triangleAabbOverlap(
  v0: Vector3,
  v1: Vector3,
  v2: Vector3,
  bounds: IBounds3
): boolean {
  const center = new Vector3(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2
  );
  const half = new Vector3(
    (bounds.maxX - bounds.minX) / 2,
    (bounds.maxY - bounds.minY) / 2,
    (bounds.maxZ - bounds.minZ) / 2
  );

  const e0 = v1.clone().subtract(v0);
  const e1 = v2.clone().subtract(v1);
  const e2 = v0.clone().subtract(v2);

  // 盒子的三个面法线
  const boxAxes = [Vector3.right(), Vector3.up(), Vector3.back()];
  for (const axis of boxAxes) {
    const p0 = v0.dot(axis);
    const p1 = v1.dot(axis);
    const p2 = v2.dot(axis);
    const minP = Math.min(p0, p1, p2);
    const maxP = Math.max(p0, p1, p2);
    const radius = half.dot(
      new Vector3(Math.abs(axis.x), Math.abs(axis.y), Math.abs(axis.z))
    );
    const c = center.dot(axis);
    if (minP > c + radius || maxP < c - radius) return false;
  }

  // 三角形所在平面
  const normal = e0.cross(e1);
  if (!normal.isZero) {
    const distance = Math.abs(normal.dot(v0) - normal.dot(center));
    const radius =
      half.x * Math.abs(normal.x) +
      half.y * Math.abs(normal.y) +
      half.z * Math.abs(normal.z);
    if (distance > radius) return false;
  }

  // 9 条边与轴的叉乘方向
  const edges = [e0, e1, e2];
  for (const edge of edges) {
    for (const boxAxis of boxAxes) {
      const axis = edge.cross(boxAxis);
      if (axis.isZero) continue;
      const p0 = v0.dot(axis);
      const p1 = v1.dot(axis);
      const p2 = v2.dot(axis);
      const minP = Math.min(p0, p1, p2);
      const maxP = Math.max(p0, p1, p2);
      const radius =
        half.x * Math.abs(axis.x) +
        half.y * Math.abs(axis.y) +
        half.z * Math.abs(axis.z);
      const c = center.dot(axis);
      if (minP > c + radius || maxP < c - radius) return false;
    }
  }

  return true;
}

/**
 * BVH 加速结构
 */
export class BVH {
  private readonly _triangles: ITriangle3[];
  private readonly _root: IBVHNode | null;

  constructor(triangles: ITriangle3[], options: IBVHOptions = {}) {
    this._triangles = triangles;
    const maxLeafSize = options.maxLeafSize ?? 4;

    if (!triangles.length) {
      this._root = null;
      return;
    }

    // 复制索引，绝不修改调用方传入的数组
    const indices = triangles.map((_, index) => index);
    const centroids = triangles.map((triangle) =>
      new Vector3(
        (triangle.a.x + triangle.b.x + triangle.c.x) / 3,
        (triangle.a.y + triangle.b.y + triangle.c.y) / 3,
        (triangle.a.z + triangle.b.z + triangle.c.z) / 3
      )
    );

    this._root = this.build(indices, centroids, maxLeafSize);
  }

  /** 三角形数量 */
  get triangleCount(): number {
    return this._triangles.length;
  }

  /** 根节点 */
  get root(): IBVHNode | null {
    return this._root;
  }

  /**
   * 构建 BVH 树
   */
  private build(
    indices: number[],
    centroids: Vector3[],
    maxLeafSize: number
  ): IBVHNode {
    const bounds = this.computeBounds(indices);

    if (indices.length <= maxLeafSize) {
      return { bounds, left: null, right: null, indices };
    }

    // 沿质心包围盒最长的轴做中位分割
    const size = new Vector3(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      bounds.maxZ - bounds.minZ
    );
    const axis =
      size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;

    const sorted = indices.slice().sort((i, j) => {
      const ci = centroids[i];
      const cj = centroids[j];
      const valueI = axis === 0 ? ci.x : axis === 1 ? ci.y : ci.z;
      const valueJ = axis === 0 ? cj.x : axis === 1 ? cj.y : cj.z;
      return valueI - valueJ;
    });

    const middle = Math.floor(sorted.length / 2);
    const leftIndices = sorted.slice(0, middle);
    const rightIndices = sorted.slice(middle);

    return {
      bounds,
      left: this.build(leftIndices, centroids, maxLeafSize),
      right: this.build(rightIndices, centroids, maxLeafSize),
      indices: [],
    };
  }

  /**
   * 计算一组三角形的包围盒
   */
  private computeBounds(indices: number[]): IBounds3 {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    for (const index of indices) {
      const triangle = this._triangles[index];
      for (const point of [triangle.a, triangle.b, triangle.c]) {
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.z < minZ) minZ = point.z;
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
        if (point.z > maxZ) maxZ = point.z;
      }
    }

    return { minX, minY, minZ, maxX, maxY, maxZ };
  }

  /**
   * 查询与范围相交的三角形索引
   */
  public queryRange(range: IBounds3): number[] {
    if (!this._root) return [];
    const result: number[] = [];
    this.queryNode(this._root, range, result);
    return result;
  }

  /**
   * 递归查询
   */
  private queryNode(node: IBVHNode, range: IBounds3, result: number[]): void {
    if (!BVH.intersects(node.bounds, range)) return;

    if (node.indices.length) {
      for (const index of node.indices) {
        const triangle = this._triangles[index];
        const v0 = new Vector3(triangle.a.x, triangle.a.y, triangle.a.z);
        const v1 = new Vector3(triangle.b.x, triangle.b.y, triangle.b.z);
        const v2 = new Vector3(triangle.c.x, triangle.c.y, triangle.c.z);
        if (triangleAabbOverlap(v0, v1, v2, range)) {
          result.push(index);
        }
      }
      return;
    }

    if (node.left) this.queryNode(node.left, range, result);
    if (node.right) this.queryNode(node.right, range, result);
  }

  /**
   * 射线拾取，返回最近的命中
   * @param maxDistance 最大搜索距离
   */
  public raycast(
    origin: IVector3Like,
    direction: IVector3Like,
    maxDistance: number = Infinity
  ): IBVHHit | null {
    if (!this._root) return null;

    let best: IBVHHit | null = null;

    const visit = (node: IBVHNode): void => {
      if (best && best.distance > maxDistance) return;

      // 先做包围盒的射线检测
      const hitDistance = BVH.rayBox(origin, direction, node.bounds);
      if (hitDistance === null) return;
      if (best && hitDistance >= best.distance) return;

      if (node.indices.length) {
        for (const index of node.indices) {
          const triangle = this._triangles[index];
          const distance = rayTriangle(origin, direction, triangle.a, triangle.b, triangle.c);
          if (distance === null) continue;
          if (distance > maxDistance) continue;
          if (best && distance >= best.distance) continue;
          best = {
            distance,
            index,
            point: new Vector3(
              origin.x + direction.x * distance,
              origin.y + direction.y * distance,
              origin.z + direction.z * distance
            ),
          };
        }
        return;
      }

      if (node.left) visit(node.left);
      if (node.right) visit(node.right);
    };

    visit(this._root);
    return best;
  }

  /**
   * 包围盒是否相交
   */
  private static intersects(a: IBounds3, b: IBounds3): boolean {
    return !(
      a.maxX < b.minX ||
      a.minX > b.maxX ||
      a.maxY < b.minY ||
      a.minY > b.maxY ||
      a.maxZ < b.minZ ||
      a.minZ > b.maxZ
    );
  }

  /**
   * 射线与包围盒求交（返回进入距离）
   */
  private static rayBox(
    origin: IVector3Like,
    direction: IVector3Like,
    bounds: IBounds3
  ): number | null {
    const len = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
    );
    if (len === 0) return null;
    const dx = direction.x / len;
    const dy = direction.y / len;
    const dz = direction.z / len;

    let tMin = 0;
    let tMax = Infinity;

    const axes: Array<[number, number, number, number]> = [
      [origin.x, dx, bounds.minX, bounds.maxX],
      [origin.y, dy, bounds.minY, bounds.maxY],
      [origin.z, dz, bounds.minZ, bounds.maxZ],
    ];

    for (const [originValue, directionValue, min, max] of axes) {
      if (directionValue === 0) {
        if (originValue < min || originValue > max) return null;
        continue;
      }
      const inv = 1 / directionValue;
      let t1 = (min - originValue) * inv;
      let t2 = (max - originValue) * inv;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }

    return tMin;
  }
}

export default BVH;
