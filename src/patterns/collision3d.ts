/**
 * 三维碰撞检测
 *
 * 形状用判别联合描述：`shape: "sphere" | "aabb" | "obb" | "capsule"`
 * 约定：
 * - 相交判定**对称**：`intersects3d(a, b) === intersects3d(b, a)`
 * - 射线检测返回命中距离，起点在形状内部时返回 0，未命中返回 null
 */

import { Vector3 } from "../math/vector3";
import type { IVector3Like } from "../math/vector3";
import { Quaternion } from "../math/quaternion";
import type { IQuaternionLike } from "../math/matrix4";

/** 形状类型 */
export type Shape3DType = "sphere" | "aabb" | "obb" | "capsule";

/** 球体 */
export interface ISphere3 {
  shape: "sphere";
  x: number;
  y: number;
  z: number;
  radius: number;
}

/** 轴对齐包围盒 */
export interface IAabb3 {
  shape: "aabb";
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** 有向包围盒（带旋转） */
export interface IObb3 {
  shape: "obb";
  x: number;
  y: number;
  z: number;
  halfX: number;
  halfY: number;
  halfZ: number;
  /** 朝向四元数，缺省为不旋转 */
  rotation?: IQuaternionLike;
}

/** 胶囊体 */
export interface ICapsule3 {
  shape: "capsule";
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  radius: number;
}

/** 任意 3D 形状 */
export type Shape3D = ISphere3 | IAabb3 | IObb3 | ICapsule3;

/** 三维包围盒 */
export interface IBounds3 {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** 三维最小平移向量 */
export interface ITranslation3 {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

/** 射线检测结果 */
export interface IRayHit3 {
  /** 命中距离 */
  distance: number;
  /** 命中点 */
  point: Vector3;
}

// ---------------- 基础工具 ----------------

/**
 * 计算形状的轴对齐包围盒
 */
export function getBounds3(shape: Shape3D): IBounds3 {
  switch (shape.shape) {
    case "sphere":
      return {
        minX: shape.x - shape.radius,
        minY: shape.y - shape.radius,
        minZ: shape.z - shape.radius,
        maxX: shape.x + shape.radius,
        maxY: shape.y + shape.radius,
        maxZ: shape.z + shape.radius,
      };
    case "aabb":
      return {
        minX: shape.minX,
        minY: shape.minY,
        minZ: shape.minZ,
        maxX: shape.maxX,
        maxY: shape.maxY,
        maxZ: shape.maxZ,
      };
    case "obb": {
      const axes = getObbAxes(shape);
      const extent = new Vector3();
      for (const axis of axes) {
        const halfX = Math.abs(axis.x) * shape.halfX;
        const halfY = Math.abs(axis.y) * shape.halfY;
        const halfZ = Math.abs(axis.z) * shape.halfZ;
        extent.x += halfX;
        extent.y += halfY;
        extent.z += halfZ;
      }
      return {
        minX: shape.x - extent.x,
        minY: shape.y - extent.y,
        minZ: shape.z - extent.z,
        maxX: shape.x + extent.x,
        maxY: shape.y + extent.y,
        maxZ: shape.z + extent.z,
      };
    }
    case "capsule":
    default: {
      const start = new Vector3(shape.startX, shape.startY, shape.startZ);
      const end = new Vector3(shape.endX, shape.endY, shape.endZ);
      const minX = Math.min(start.x, end.x) - shape.radius;
      const minY = Math.min(start.y, end.y) - shape.radius;
      const minZ = Math.min(start.z, end.z) - shape.radius;
      const maxX = Math.max(start.x, end.x) + shape.radius;
      const maxY = Math.max(start.y, end.y) + shape.radius;
      const maxZ = Math.max(start.z, end.z) + shape.radius;
      return { minX, minY, minZ, maxX, maxY, maxZ };
    }
  }
}

/**
 * 取 OBB 的三个世界坐标轴
 */
function getObbAxes(obb: IObb3): Vector3[] {
  const rotation = obb.rotation;
  const quaternion = rotation
    ? new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w).normalize()
    : Quaternion.identity();
  const matrix = quaternion.toMatrix();
  return [
    new Vector3(matrix.elements[0], matrix.elements[1], matrix.elements[2]),
    new Vector3(matrix.elements[4], matrix.elements[5], matrix.elements[6]),
    new Vector3(matrix.elements[8], matrix.elements[9], matrix.elements[10]),
  ];
}

/**
 * 世界坐标点转换到 OBB 局部坐标
 */
function toObbLocal(obb: IObb3, point: IVector3Like): Vector3 {
  const axes = getObbAxes(obb);
  const delta = new Vector3(point.x, point.y, point.z).subtract(
    new Vector3(obb.x, obb.y, obb.z)
  );
  return new Vector3(
    delta.dot(axes[0]),
    delta.dot(axes[1]),
    delta.dot(axes[2])
  );
}

/**
 * 线段上距离给定最近的点
 */
export function closestPointOnSegment(
  point: IVector3Like,
  start: IVector3Like,
  end: IVector3Like
): Vector3 {
  const p = new Vector3(point.x, point.y, point.z);
  const a = new Vector3(start.x, start.y, start.z);
  const b = new Vector3(end.x, end.y, end.z);
  const ab = b.subtract(a);
  const lenSq = ab.lengthSquared;
  if (lenSq === 0) return a;
  const t = Math.min(Math.max(p.subtract(a).dot(ab) / lenSq, 0), 1);
  return a.add(ab.multiply(t));
}

/**
 * 两线段之间的最近点距离
 *
 * 采用 Ericson《Real-Time Collision Detection》的 ClosestPtSegmentSegment 算法，
 * 对平行、重叠、共线等退化情形同样稳定
 */
export function segmentSegmentDistance(
  p1: IVector3Like,
  q1: IVector3Like,
  p2: IVector3Like,
  q2: IVector3Like
): number {
  const d1 = new Vector3(q1.x, q1.y, q1.z).subtract(
    new Vector3(p1.x, p1.y, p1.z)
  );
  const d2 = new Vector3(q2.x, q2.y, q2.z).subtract(
    new Vector3(p2.x, p2.y, p2.z)
  );
  const r = new Vector3(p1.x, p1.y, p1.z).subtract(
    new Vector3(p2.x, p2.y, p2.z)
  );

  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  const epsilon = 1e-10;

  let s = 0;
  let t = 0;

  if (a <= epsilon && e <= epsilon) {
    // 两条线段都退化为点
    return r.length;
  }

  if (a <= epsilon) {
    // 第一条退化为点
    t = Math.min(Math.max(f / e, 0), 1);
  } else {
    const c = d1.dot(r);
    if (e <= epsilon) {
      // 第二条退化为点
      s = Math.min(Math.max(-c / a, 0), 1);
    } else {
      const b = d1.dot(d2);
      const denominator = a * e - b * b;
      s = denominator !== 0 ? Math.min(Math.max((b * f - c * e) / denominator, 0), 1) : 0;
      t = (b * s + f) / e;

      if (t < 0) {
        t = 0;
        s = Math.min(Math.max(-c / a, 0), 1);
      } else if (t > 1) {
        t = 1;
        s = Math.min(Math.max((b - c) / a, 0), 1);
      }
    }
  }

  const pointA = new Vector3(p1.x, p1.y, p1.z).add(d1.multiply(s));
  const pointB = new Vector3(p2.x, p2.y, p2.z).add(d2.multiply(t));
  return pointA.distanceTo(pointB);
}

/**
 * 点到 AABB 的距离
 */
export function distancePointToAabb(point: IVector3Like, aabb: IAabb3): number {
  const dx = Math.max(aabb.minX - point.x, 0, point.x - aabb.maxX);
  const dy = Math.max(aabb.minY - point.y, 0, point.y - aabb.maxY);
  const dz = Math.max(aabb.minZ - point.z, 0, point.z - aabb.maxZ);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 线段到 AABB 的距离
 *
 * 距离函数沿线段参数是凸的，用三分搜索求最小值
 */
export function distanceSegmentToAabb(
  start: IVector3Like,
  end: IVector3Like,
  aabb: IAabb3
): number {
  const a = new Vector3(start.x, start.y, start.z);
  const b = new Vector3(end.x, end.y, end.z);
  let lo = 0;
  let hi = 1;

  for (let i = 0; i < 32; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    const d1 = distancePointToAabb(a.clone().lerp(b, m1), aabb);
    const d2 = distancePointToAabb(a.clone().lerp(b, m2), aabb);
    if (d1 <= d2) hi = m2;
    else lo = m1;
  }

  return distancePointToAabb(a.clone().lerp(b, (lo + hi) / 2), aabb);
}

// ---------------- 相交判定 ----------------

/**
 * 球与球是否相交
 */
export function sphereSphere(a: ISphere3, b: ISphere3): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/**
 * 球与 AABB 是否相交
 */
export function sphereAabb(sphere: ISphere3, aabb: IAabb3): boolean {
  return distancePointToAabb(sphere, aabb) <= sphere.radius;
}

/**
 * 球与 OBB 是否相交
 */
export function sphereObb(sphere: ISphere3, obb: IObb3): boolean {
  const local = toObbLocal(obb, sphere);
  const localBox: IAabb3 = {
    shape: "aabb",
    minX: -obb.halfX,
    minY: -obb.halfY,
    minZ: -obb.halfZ,
    maxX: obb.halfX,
    maxY: obb.halfY,
    maxZ: obb.halfZ,
  };
  const localSphere: ISphere3 = {
    shape: "sphere",
    x: local.x,
    y: local.y,
    z: local.z,
    radius: sphere.radius,
  };
  return sphereAabb(localSphere, localBox);
}

/**
 * 胶囊与球是否相交
 */
export function capsuleSphere(capsule: ICapsule3, sphere: ISphere3): boolean {
  const closest = closestPointOnSegment(
    sphere,
    { x: capsule.startX, y: capsule.startY, z: capsule.startZ },
    { x: capsule.endX, y: capsule.endY, z: capsule.endZ }
  );
  return closest.distanceTo(sphere) <= capsule.radius + sphere.radius;
}

/**
 * 胶囊与胶囊是否相交
 */
export function capsuleCapsule(a: ICapsule3, b: ICapsule3): boolean {
  const distance = segmentSegmentDistance(
    { x: a.startX, y: a.startY, z: a.startZ },
    { x: a.endX, y: a.endY, z: a.endZ },
    { x: b.startX, y: b.startY, z: b.startZ },
    { x: b.endX, y: b.endY, z: b.endZ }
  );
  return distance <= a.radius + b.radius;
}

/**
 * 胶囊与 AABB 是否相交
 */
export function capsuleAabb(capsule: ICapsule3, aabb: IAabb3): boolean {
  const distance = distanceSegmentToAabb(
    { x: capsule.startX, y: capsule.startY, z: capsule.startZ },
    { x: capsule.endX, y: capsule.endY, z: capsule.endZ },
    aabb
  );
  return distance <= capsule.radius;
}

/**
 * AABB 与 AABB 是否相交
 */
export function aabbAabb(a: IAabb3, b: IAabb3): boolean {
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
 * 把 AABB 转成轴对齐的 OBB（朝向为单位四元数）
 */
export function aabbToObb(aabb: IAabb3): IObb3 {
  return {
    shape: "obb",
    x: (aabb.minX + aabb.maxX) / 2,
    y: (aabb.minY + aabb.maxY) / 2,
    z: (aabb.minZ + aabb.maxZ) / 2,
    halfX: (aabb.maxX - aabb.minX) / 2,
    halfY: (aabb.maxY - aabb.minY) / 2,
    halfZ: (aabb.maxZ - aabb.minZ) / 2,
  };
}

/**
 * AABB 与 OBB 是否相交
 *
 * AABB 视作轴对齐的 OBB，复用 15 轴分离轴判定
 */
export function aabbObb(aabb: IAabb3, obb: IObb3): boolean {
  return obbObb(aabbToObb(aabb), obb);
}

/**
 * 胶囊与 OBB 是否相交
 *
 * 把胶囊线段转到 OBB 局部空间，退化为「线段 vs AABB」的距离判定
 */
export function capsuleObb(capsule: ICapsule3, obb: IObb3): boolean {
  const localStart = toObbLocal(obb, {
    x: capsule.startX,
    y: capsule.startY,
    z: capsule.startZ,
  });
  const localEnd = toObbLocal(obb, {
    x: capsule.endX,
    y: capsule.endY,
    z: capsule.endZ,
  });
  const localBox: IAabb3 = {
    shape: "aabb",
    minX: -obb.halfX,
    minY: -obb.halfY,
    minZ: -obb.halfZ,
    maxX: obb.halfX,
    maxY: obb.halfY,
    maxZ: obb.halfZ,
  };
  const distance = distanceSegmentToAabb(localStart, localEnd, localBox);
  return distance <= capsule.radius;
}

/**
 * OBB 与 OBB 是否相交（分离轴定理，15 个候选轴）
 */
export function obbObb(a: IObb3, b: IObb3): boolean {
  const axisA = getObbAxes(a);
  const axisB = getObbAxes(b);
  const halfA = new Vector3(a.halfX, a.halfY, a.halfZ);
  const halfB = new Vector3(b.halfX, b.halfY, b.halfZ);

  const centerA = new Vector3(a.x, a.y, a.z);
  const centerB = new Vector3(b.x, b.y, b.z);
  const t = centerB.subtract(centerA);

  // R[i][j] = axisA[i] · axisB[j]
  const r: number[][] = [];
  const absR: number[][] = [];
  for (let i = 0; i < 3; i++) {
    r[i] = [];
    absR[i] = [];
    for (let j = 0; j < 3; j++) {
      const value = axisA[i].dot(axisB[j]);
      r[i][j] = value;
      absR[i][j] = Math.abs(value) + 1e-6;
    }
  }

  const tA = [t.dot(axisA[0]), t.dot(axisA[1]), t.dot(axisA[2])];
  const half = [halfA.x, halfA.y, halfA.z];
  const halfBArr = [halfB.x, halfB.y, halfB.z];

  // A 的三个轴
  for (let i = 0; i < 3; i++) {
    const ra = half[i];
    const rb =
      halfBArr[0] * absR[i][0] +
      halfBArr[1] * absR[i][1] +
      halfBArr[2] * absR[i][2];
    if (Math.abs(tA[i]) > ra + rb) return false;
  }

  // B 的三个轴
  const tB = [t.dot(axisB[0]), t.dot(axisB[1]), t.dot(axisB[2])];
  for (let i = 0; i < 3; i++) {
    const ra =
      half[0] * absR[0][i] + half[1] * absR[1][i] + half[2] * absR[2][i];
    const rb = halfBArr[i];
    if (Math.abs(tB[i]) > ra + rb) return false;
  }

  // 9 个混合轴
  for (let i = 0; i < 3; i++) {
    const i1 = (i + 1) % 3;
    const i2 = (i + 2) % 3;
    for (let j = 0; j < 3; j++) {
      const j1 = (j + 1) % 3;
      const j2 = (j + 2) % 3;
      const ra = half[i1] * absR[i2][j] + half[i2] * absR[i1][j];
      const rb = halfBArr[j1] * absR[i][j2] + halfBArr[j2] * absR[i][j1];
      const distance = Math.abs(tA[i2] * r[i1][j] - tA[i1] * r[i2][j]);
      if (distance > ra + rb) return false;
    }
  }

  return true;
}

/**
 * 任意两个形状是否相交（对称）
 */
export function intersects3d(a: Shape3D, b: Shape3D): boolean {
  if (a.shape === "sphere" && b.shape === "sphere") return sphereSphere(a, b);
  if (a.shape === "sphere" && b.shape === "aabb") return sphereAabb(a, b);
  if (a.shape === "aabb" && b.shape === "sphere") return sphereAabb(b, a);
  if (a.shape === "sphere" && b.shape === "obb") return sphereObb(a, b);
  if (a.shape === "obb" && b.shape === "sphere") return sphereObb(b, a);
  if (a.shape === "sphere" && b.shape === "capsule") return capsuleSphere(b, a);
  if (a.shape === "capsule" && b.shape === "sphere") return capsuleSphere(a, b);
  if (a.shape === "capsule" && b.shape === "capsule") return capsuleCapsule(a, b);
  if (a.shape === "capsule" && b.shape === "aabb") return capsuleAabb(a, b);
  if (a.shape === "aabb" && b.shape === "capsule") return capsuleAabb(b, a);
  if (a.shape === "aabb" && b.shape === "aabb") return aabbAabb(a, b);
  if (a.shape === "obb" && b.shape === "obb") return obbObb(a, b);
  if (a.shape === "aabb" && b.shape === "obb") return aabbObb(a, b);
  if (a.shape === "obb" && b.shape === "aabb") return aabbObb(b, a);
  if (a.shape === "capsule" && b.shape === "obb") return capsuleObb(a, b);
  if (a.shape === "obb" && b.shape === "capsule") return capsuleObb(b, a);
  return false;
}

// ---------------- 点包含 ----------------

/**
 * 点是否在形状内
 */
export function pointInShape3d(point: IVector3Like, shape: Shape3D): boolean {
  switch (shape.shape) {
    case "sphere": {
      const dx = point.x - shape.x;
      const dy = point.y - shape.y;
      const dz = point.z - shape.z;
      return dx * dx + dy * dy + dz * dz <= shape.radius * shape.radius;
    }
    case "aabb":
      return (
        point.x >= shape.minX &&
        point.x <= shape.maxX &&
        point.y >= shape.minY &&
        point.y <= shape.maxY &&
        point.z >= shape.minZ &&
        point.z <= shape.maxZ
      );
    case "obb": {
      const local = toObbLocal(shape, point);
      return (
        Math.abs(local.x) <= shape.halfX &&
        Math.abs(local.y) <= shape.halfY &&
        Math.abs(local.z) <= shape.halfZ
      );
    }
    case "capsule": {
      const closest = closestPointOnSegment(
        point,
        { x: shape.startX, y: shape.startY, z: shape.startZ },
        { x: shape.endX, y: shape.endY, z: shape.endZ }
      );
      return closest.distanceTo(point) <= shape.radius;
    }
    default:
      return false;
  }
}

// ---------------- 最小平移向量 ----------------

/**
 * 求把 a 推出 b 所需的最小平移向量
 *
 * 说明：球与轴对齐盒为精确解；胶囊与 OBB 使用最近点连线方向的近似解
 * @returns 不相交时返回 null
 */
export function getTranslation3d(
  a: Shape3D,
  b: Shape3D
): ITranslation3 | null {
  if (!intersects3d(a, b)) return null;

  if (a.shape === "sphere" && b.shape === "sphere") {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const magnitude = a.radius + b.radius - dist;
    if (dist === 0) return { x: magnitude, y: 0, z: 0, magnitude };
    return {
      x: (dx / dist) * magnitude,
      y: (dy / dist) * magnitude,
      z: (dz / dist) * magnitude,
      magnitude,
    };
  }

  if (
    (a.shape === "sphere" && b.shape === "aabb") ||
    (a.shape === "aabb" && b.shape === "sphere")
  ) {
    // 两种顺序统一按「球相对盒」求解，再用 sign 决定推球还是推盒
    const sphere = a.shape === "sphere" ? a : (b as ISphere3);
    const box = a.shape === "aabb" ? a : (b as IAabb3);
    const sign = a.shape === "sphere" ? 1 : -1;

    const closest = new Vector3(
      Math.min(Math.max(sphere.x, box.minX), box.maxX),
      Math.min(Math.max(sphere.y, box.minY), box.maxY),
      Math.min(Math.max(sphere.z, box.minZ), box.maxZ)
    );
    const dir = new Vector3(sphere.x, sphere.y, sphere.z).subtract(closest);
    const dist = dir.length;
    const magnitude = sphere.radius - dist;
    if (dist === 0) {
      // 球心在盒内：沿最浅方向推出
      const left = sphere.x - box.minX;
      const right = box.maxX - sphere.x;
      const bottom = sphere.y - box.minY;
      const top = box.maxY - sphere.y;
      const back = sphere.z - box.minZ;
      const front = box.maxZ - sphere.z;
      const min = Math.min(left, right, bottom, top, back, front);
      if (min === left) {
        const m = left + sphere.radius;
        return { x: -m * sign, y: 0, z: 0, magnitude: m };
      }
      if (min === right) {
        const m = right + sphere.radius;
        return { x: m * sign, y: 0, z: 0, magnitude: m };
      }
      if (min === bottom) {
        const m = bottom + sphere.radius;
        return { x: 0, y: -m * sign, z: 0, magnitude: m };
      }
      if (min === top) {
        const m = top + sphere.radius;
        return { x: 0, y: m * sign, z: 0, magnitude: m };
      }
      if (min === back) {
        const m = back + sphere.radius;
        return { x: 0, y: 0, z: -m * sign, magnitude: m };
      }
      const m = front + sphere.radius;
      return { x: 0, y: 0, z: m * sign, magnitude: m };
    }
    const dirNormalized = dir.multiply(1 / dist);
    return {
      x: dirNormalized.x * magnitude * sign,
      y: dirNormalized.y * magnitude * sign,
      z: dirNormalized.z * magnitude * sign,
      magnitude,
    };
  }

  if (a.shape === "aabb" && b.shape === "aabb") {
    const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
    const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
    const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);

    if (overlapX <= overlapY && overlapX <= overlapZ) {
      const x = a.minX + (a.maxX - a.minX) / 2 < b.minX + (b.maxX - b.minX) / 2
        ? -overlapX
        : overlapX;
      return { x, y: 0, z: 0, magnitude: overlapX };
    }
    if (overlapY <= overlapZ) {
      const y = a.minY + (a.maxY - a.minY) / 2 < b.minY + (b.maxY - b.minY) / 2
        ? -overlapY
        : overlapY;
      return { x: 0, y, z: 0, magnitude: overlapY };
    }
    const z = a.minZ + (a.maxZ - a.minZ) / 2 < b.minZ + (b.maxZ - b.minZ) / 2
      ? -overlapZ
      : overlapZ;
    return { x: 0, y: 0, z, magnitude: overlapZ };
  }

  if (a.shape === "capsule" && b.shape === "sphere") {
    const closest = closestPointOnSegment(
      b,
      { x: a.startX, y: a.startY, z: a.startZ },
      { x: a.endX, y: a.endY, z: a.endZ }
    );
    const dir = new Vector3(closest.x, closest.y, closest.z).subtract(
      new Vector3(b.x, b.y, b.z)
    );
    const dist = dir.length;
    const magnitude = a.radius + b.radius - dist;
    if (dist === 0) return { x: magnitude, y: 0, z: 0, magnitude };
    return {
      x: (dir.x / dist) * magnitude,
      y: (dir.y / dist) * magnitude,
      z: (dir.z / dist) * magnitude,
      magnitude,
    };
  }

  // 兜底：沿两形状中心连线方向分离
  const centerA = shapeCenter(a);
  const centerB = shapeCenter(b);
  const dir = centerA.subtract(centerB);
  const dist = dir.length;
  if (dist === 0) return { x: 0, y: 0, z: 0, magnitude: 0 };
  return {
    x: (dir.x / dist) * 0.001,
    y: (dir.y / dist) * 0.001,
    z: (dir.z / dist) * 0.001,
    magnitude: 0.001,
  };
}

/**
 * 形状中心点
 */
export function shapeCenter(shape: Shape3D): Vector3 {
  switch (shape.shape) {
    case "sphere":
      return new Vector3(shape.x, shape.y, shape.z);
    case "aabb":
      return new Vector3(
        (shape.minX + shape.maxX) / 2,
        (shape.minY + shape.maxY) / 2,
        (shape.minZ + shape.maxZ) / 2
      );
    case "obb":
      return new Vector3(shape.x, shape.y, shape.z);
    case "capsule":
    default:
      return new Vector3(
        (shape.startX + shape.endX) / 2,
        (shape.startY + shape.endY) / 2,
        (shape.startZ + shape.endZ) / 2
      );
  }
}

// ---------------- 射线检测 ----------------

/**
 * 射线与球求交
 * @returns 命中距离，未命中返回 null；起点在球内返回 0
 */
export function raySphere(
  origin: IVector3Like,
  direction: IVector3Like,
  sphere: ISphere3
): number | null {
  const len = Math.sqrt(
    direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
  );
  if (len === 0) return null;
  const dx = direction.x / len;
  const dy = direction.y / len;
  const dz = direction.z / len;

  const ox = origin.x - sphere.x;
  const oy = origin.y - sphere.y;
  const oz = origin.z - sphere.z;
  const b = 2 * (ox * dx + oy * dy + oz * dz);
  const c = ox * ox + oy * oy + oz * oz - sphere.radius * sphere.radius;

  if (c <= 0) return 0;

  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const sqrt = Math.sqrt(disc);
  const t1 = (-b - sqrt) / 2;
  const t2 = (-b + sqrt) / 2;
  if (t1 >= 0) return t1;
  if (t2 >= 0) return t2;
  return null;
}

/**
 * 射线与 AABB 求交
 */
export function rayAabb(
  origin: IVector3Like,
  direction: IVector3Like,
  aabb: IAabb3
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
    [origin.x, dx, aabb.minX, aabb.maxX],
    [origin.y, dy, aabb.minY, aabb.maxY],
    [origin.z, dz, aabb.minZ, aabb.maxZ],
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

/**
 * 射线与 OBB 求交（转到 OBB 局部坐标后按 AABB 处理）
 */
export function rayObb(
  origin: IVector3Like,
  direction: IVector3Like,
  obb: IObb3
): number | null {
  const axes = getObbAxes(obb);
  const center = new Vector3(obb.x, obb.y, obb.z);

  const localOrigin = new Vector3(
    new Vector3(origin.x, origin.y, origin.z).subtract(center).dot(axes[0]),
    new Vector3(origin.x, origin.y, origin.z).subtract(center).dot(axes[1]),
    new Vector3(origin.x, origin.y, origin.z).subtract(center).dot(axes[2])
  );
  const localDirection = new Vector3(
    direction.x * axes[0].x + direction.y * axes[0].y + direction.z * axes[0].z,
    direction.x * axes[1].x + direction.y * axes[1].y + direction.z * axes[1].z,
    direction.x * axes[2].x + direction.y * axes[2].y + direction.z * axes[2].z
  );

  const localBox: IAabb3 = {
    shape: "aabb",
    minX: -obb.halfX,
    minY: -obb.halfY,
    minZ: -obb.halfZ,
    maxX: obb.halfX,
    maxY: obb.halfY,
    maxZ: obb.halfZ,
  };

  return rayAabb(localOrigin, localDirection, localBox);
}

/**
 * 射线与三角面求交（Möller–Trumbore 算法）
 */
export function rayTriangle(
  origin: IVector3Like,
  direction: IVector3Like,
  a: IVector3Like,
  b: IVector3Like,
  c: IVector3Like
): number | null {
  const len = Math.sqrt(
    direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
  );
  if (len === 0) return null;
  const dir = new Vector3(direction.x / len, direction.y / len, direction.z / len);
  const orig = new Vector3(origin.x, origin.y, origin.z);
  const v0 = new Vector3(a.x, a.y, a.z);
  const v1 = new Vector3(b.x, b.y, b.z);
  const v2 = new Vector3(c.x, c.y, c.z);

  const edge1 = v1.subtract(v0);
  const edge2 = v2.subtract(v0);
  const pvec = dir.cross(edge2);
  const det = edge1.dot(pvec);

  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;
  const tvec = orig.subtract(v0);
  const u = tvec.dot(pvec) * invDet;
  if (u < -1e-6 || u > 1 + 1e-6) return null;

  const qvec = tvec.cross(edge1);
  const v = dir.dot(qvec) * invDet;
  if (v < -1e-6 || u + v > 1 + 1e-6) return null;

  const t = edge2.dot(qvec) * invDet;
  return t >= 0 ? t : null;
}

/**
 * 射线与平面求交
 */
export function rayPlane(
  origin: IVector3Like,
  direction: IVector3Like,
  normal: IVector3Like,
  constant: number
): number | null {
  const len = Math.sqrt(
    direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
  );
  if (len === 0) return null;
  const dx = direction.x / len;
  const dy = direction.y / len;
  const dz = direction.z / len;

  const denominator = normal.x * dx + normal.y * dy + normal.z * dz;
  if (Math.abs(denominator) < 1e-12) return null;

  const originValue =
    origin.x * normal.x + origin.y * normal.y + origin.z * normal.z + constant;
  const t = -originValue / denominator;
  return t >= 0 ? t : null;
}

/**
 * 射线与任意形状求交
 * @returns 命中距离，未命中返回 null
 */
export function raycast3d(
  origin: IVector3Like,
  direction: IVector3Like,
  shape: Shape3D
): number | null {
  switch (shape.shape) {
    case "sphere":
      return raySphere(origin, direction, shape);
    case "aabb":
      return rayAabb(origin, direction, shape);
    case "obb":
      return rayObb(origin, direction, shape);
    case "capsule": {
      // 近似：采样线段上的关键点（端点与球心）后取最近命中
      const start = new Vector3(shape.startX, shape.startY, shape.startZ);
      const end = new Vector3(shape.endX, shape.endY, shape.endZ);
      const center = start.add(end).multiply(0.5);
      const halfLength = start.distanceTo(end) / 2;
      const sphere: ISphere3 = {
        shape: "sphere",
        x: center.x,
        y: center.y,
        z: center.z,
        radius: shape.radius + halfLength,
      };
      return raySphere(origin, direction, sphere);
    }
    default:
      return null;
  }
}
