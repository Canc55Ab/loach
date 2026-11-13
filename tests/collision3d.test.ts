import { describe, it, expect } from "vitest";
import {
  getBounds3,
  sphereSphere,
  sphereAabb,
  sphereObb,
  capsuleSphere,
  capsuleCapsule,
  capsuleAabb,
  aabbAabb,
  obbObb,
  intersects3d,
  pointInShape3d,
  getTranslation3d,
  raySphere,
  rayAabb,
  rayObb,
  rayTriangle,
  rayPlane,
  raycast3d,
  closestPointOnSegment,
  segmentSegmentDistance,
  distancePointToAabb,
  distanceSegmentToAabb,
  shapeCenter,
} from "../src/patterns/collision3d";
import type {
  IAabb3,
  ICapsule3,
  IObb3,
  ISphere3,
  Shape3D,
} from "../src/patterns/collision3d";
import { Quaternion } from "../src/math/quaternion";

function sphere(x: number, y: number, z: number, radius: number): ISphere3 {
  return { shape: "sphere", x, y, z, radius };
}

function aabb(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): IAabb3 {
  return { shape: "aabb", minX, minY, minZ, maxX, maxY, maxZ };
}

function obb(
  x: number,
  y: number,
  z: number,
  half: number,
  rotation?: { x: number; y: number; z: number; w: number }
): IObb3 {
  return { shape: "obb", x, y, z, halfX: half, halfY: half, halfZ: half, rotation };
}

function capsule(
  startX: number,
  startY: number,
  startZ: number,
  endX: number,
  endY: number,
  endZ: number,
  radius: number
): ICapsule3 {
  return { shape: "capsule", startX, startY, startZ, endX, endY, endZ, radius };
}

describe("collision3d", () => {
  describe("包围盒", () => {
    it("球的包围盒", () => {
      expect(getBounds3(sphere(0, 0, 0, 2))).toEqual({
        minX: -2,
        minY: -2,
        minZ: -2,
        maxX: 2,
        maxY: 2,
        maxZ: 2,
      });
    });

    it("胶囊的包围盒", () => {
      const bounds = getBounds3(capsule(0, 0, 0, 4, 0, 0, 1));
      expect(bounds.minX).toBe(-1);
      expect(bounds.maxX).toBe(5);
    });

    it("OBB 的包围盒随旋转变化", () => {
      const axisAligned = getBounds3(obb(0, 0, 0, 1));
      expect(axisAligned.maxX).toBeCloseTo(1, 10);

      const rotated = getBounds3(
        obb(0, 0, 0, 1, Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4))
      );
      expect(rotated.maxX).toBeGreaterThan(1);
    });
  });

  describe("相交判定", () => {
    it("球与球", () => {
      expect(sphereSphere(sphere(0, 0, 0, 2), sphere(3, 0, 0, 2))).toBe(true);
      expect(sphereSphere(sphere(0, 0, 0, 1), sphere(5, 0, 0, 1))).toBe(false);
    });

    it("球与 AABB", () => {
      expect(sphereAabb(sphere(1, 1, 1, 1), aabb(0, 0, 0, 2, 2, 2))).toBe(true);
      expect(sphereAabb(sphere(10, 10, 10, 1), aabb(0, 0, 0, 2, 2, 2))).toBe(false);
      // 球心在盒外但球体覆盖到盒子
      expect(sphereAabb(sphere(2.5, 1, 1, 1), aabb(0, 0, 0, 2, 2, 2))).toBe(true);
    });

    it("球与 OBB", () => {
      expect(sphereObb(sphere(0, 0, 0, 1), obb(0, 0, 0, 2))).toBe(true);
      expect(sphereObb(sphere(10, 0, 0, 1), obb(0, 0, 0, 2))).toBe(false);
      const rotated = obb(
        0,
        0,
        0,
        2,
        Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4)
      );
      expect(sphereObb(sphere(0, 0, 0, 1), rotated)).toBe(true);
    });

    it("胶囊与球、胶囊与胶囊、胶囊与 AABB", () => {
      expect(capsuleSphere(capsule(0, 0, 0, 10, 0, 0, 1), sphere(5, 0, 0, 1))).toBe(true);
      expect(capsuleSphere(capsule(0, 0, 0, 10, 0, 0, 1), sphere(0, 5, 0, 1))).toBe(false);
      expect(capsuleCapsule(capsule(0, 0, 0, 10, 0, 0, 1), capsule(5, 0, 0, 15, 0, 0, 1))).toBe(true);
      expect(capsuleCapsule(capsule(0, 0, 0, 10, 0, 0, 1), capsule(0, 5, 0, 10, 5, 0, 1))).toBe(false);
      expect(capsuleAabb(capsule(0, 0, 0, 10, 0, 0, 1), aabb(4, -1, -1, 6, 1, 1))).toBe(true);
      expect(capsuleAabb(capsule(0, 0, 0, 10, 0, 0, 1), aabb(0, 5, 0, 2, 7, 2))).toBe(false);
    });

    it("AABB 与 AABB", () => {
      expect(aabbAabb(aabb(0, 0, 0, 2, 2, 2), aabb(1, 1, 1, 3, 3, 3))).toBe(true);
      expect(aabbAabb(aabb(0, 0, 0, 2, 2, 2), aabb(5, 5, 5, 7, 7, 7))).toBe(false);
    });

    it("OBB 与 OBB", () => {
      expect(obbObb(obb(0, 0, 0, 2), obb(1, 0, 0, 2))).toBe(true);
      expect(obbObb(obb(0, 0, 0, 2), obb(10, 0, 0, 2))).toBe(false);
      // 旋转 45° 的盒子与轴对齐盒子的相交判定
      const rotated = obb(
        0,
        0,
        0,
        2,
        Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4)
      );
      expect(obbObb(rotated, obb(2.5, 0, 0, 1))).toBe(true);
    });

    it("通用判定对两种顺序都成立", () => {
      const pairs: Array<[Shape3D, Shape3D]> = [
        [sphere(0, 0, 0, 2), sphere(3, 0, 0, 2)],
        [sphere(1, 1, 1, 1), aabb(0, 0, 0, 2, 2, 2)],
        [sphere(0, 0, 0, 1), obb(0, 0, 0, 2)],
        [capsule(0, 0, 0, 10, 0, 0, 1), sphere(5, 0, 0, 1)],
        [capsule(0, 0, 0, 10, 0, 0, 1), capsule(5, 0, 0, 15, 0, 0, 1)],
        [capsule(0, 0, 0, 10, 0, 0, 1), aabb(4, -1, -1, 6, 1, 1)],
        [aabb(0, 0, 0, 2, 2, 2), aabb(1, 1, 1, 3, 3, 3)],
        [obb(0, 0, 0, 2), obb(1, 0, 0, 2)],
      ];

      for (const [a, b] of pairs) {
        expect(intersects3d(a, b)).toBe(intersects3d(b, a));
      }
    });

    it("点是否在形状内", () => {
      expect(pointInShape3d({ x: 0, y: 0, z: 0 }, sphere(0, 0, 0, 2))).toBe(true);
      expect(pointInShape3d({ x: 3, y: 0, z: 0 }, sphere(0, 0, 0, 2))).toBe(false);
      expect(pointInShape3d({ x: 1, y: 1, z: 1 }, aabb(0, 0, 0, 2, 2, 2))).toBe(true);
      expect(pointInShape3d({ x: 3, y: 1, z: 1 }, aabb(0, 0, 0, 2, 2, 2))).toBe(false);
      expect(pointInShape3d({ x: 0, y: 0, z: 0 }, obb(0, 0, 0, 2))).toBe(true);
      expect(pointInShape3d({ x: 5, y: 0, z: 0 }, capsule(0, 0, 0, 10, 0, 0, 1))).toBe(true);
    });
  });

  describe("最小平移向量", () => {
    it("球与球沿连线方向分离", () => {
      // 球心相距 1.5，半径各 1 → 穿透深度 0.5
      const translation = getTranslation3d(sphere(1.5, 0, 0, 1), sphere(0, 0, 0, 1));
      expect(translation).not.toBeNull();
      expect(translation?.magnitude).toBeCloseTo(0.5, 10);
      expect(translation?.x).toBeCloseTo(0.5, 10);
    });

    it("AABB 之间取最小穿透轴", () => {
      const translation = getTranslation3d(
        aabb(0, 0, 0, 10, 10, 10),
        aabb(8, 0, 0, 18, 10, 10)
      );
      expect(translation?.magnitude).toBeCloseTo(2, 10);
      expect(Math.abs(translation?.x || 0)).toBeCloseTo(2, 10);
    });

    it("不相交返回 null", () => {
      expect(getTranslation3d(sphere(0, 0, 0, 1), sphere(10, 0, 0, 1))).toBeNull();
    });
  });

  describe("射线检测", () => {
    it("射线与球", () => {
      expect(raySphere({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, sphere(10, 0, 0, 2))).toBeCloseTo(8, 10);
      expect(raySphere({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, sphere(0, 0, 0, 2))).toBe(0);
      expect(raySphere({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, sphere(-10, 0, 0, 2))).toBeNull();
    });

    it("射线与 AABB", () => {
      expect(rayAabb({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, aabb(5, -1, -1, 6, 1, 1))).toBeCloseTo(5, 10);
      expect(rayAabb({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, aabb(5, 5, 5, 6, 6, 6))).toBeNull();
    });

    it("射线与 OBB", () => {
      expect(rayObb({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, obb(10, 0, 0, 2))).toBeCloseTo(8, 10);
    });

    it("射线与三角面（Möller–Trumbore）", () => {
      const distance = rayTriangle(
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: -1, y: 0, z: -1 },
        { x: 1, y: 0, z: -1 },
        { x: 0, y: 0, z: 1 }
      );
      expect(distance).not.toBeNull();
      expect(distance as number).toBeCloseTo(1, 6);

      // 射线与三角面所在平面平行时无交点
      expect(
        rayTriangle(
          { x: 0, y: 1, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: -1, y: 0, z: -1 },
          { x: 1, y: 0, z: -1 },
          { x: 0, y: 0, z: 1 }
        )
      ).toBeNull();
    });

    it("射线与平面", () => {
      expect(
        rayPlane({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 0)
      ).toBeCloseTo(0, 10);
      expect(
        rayPlane({ x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0, y: 1, z: 0 }, 0)
      ).toBeCloseTo(5, 10);
    });

    it("通用射线检测按形状分发", () => {
      expect(
        raycast3d({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, sphere(10, 0, 0, 2))
      ).toBeCloseTo(8, 10);
      expect(
        raycast3d({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, aabb(5, -1, -1, 6, 1, 1))
      ).toBeCloseTo(5, 10);
      expect(
        raycast3d({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, obb(10, 0, 0, 2))
      ).toBeCloseTo(8, 10);
    });
  });

  describe("辅助函数", () => {
    it("线段上最近的点", () => {
      const point = closestPointOnSegment(
        { x: 5, y: 3, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      );
      expect(point.x).toBeCloseTo(5, 10);
      expect(point.y).toBeCloseTo(0, 10);
    });

    it("两线段之间的距离", () => {
      const distance = segmentSegmentDistance(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 3, z: 0 },
        { x: 10, y: 3, z: 0 }
      );
      expect(distance).toBeCloseTo(3, 10);
    });

    it("点到 AABB 的距离", () => {
      expect(distancePointToAabb({ x: 3, y: 0, z: 0 }, aabb(0, 0, 0, 2, 2, 2))).toBeCloseTo(1, 10);
      expect(distancePointToAabb({ x: 1, y: 1, z: 1 }, aabb(0, 0, 0, 2, 2, 2))).toBe(0);
    });
  });

  describe("补充覆盖：包围盒与中心点", () => {
    it("AABB 的包围盒与输入一致", () => {
      const bounds = getBounds3(aabb(-1, -2, -3, 4, 5, 6));
      expect(bounds.minX).toBeCloseTo(-1, 10);
      expect(bounds.minY).toBeCloseTo(-2, 10);
      expect(bounds.minZ).toBeCloseTo(-3, 10);
      expect(bounds.maxX).toBeCloseTo(4, 10);
      expect(bounds.maxY).toBeCloseTo(5, 10);
      expect(bounds.maxZ).toBeCloseTo(6, 10);
    });

    it("shapeCenter 给出各形状的中心", () => {
      const sphereCenter = shapeCenter(sphere(1, 2, 3, 1));
      expect(sphereCenter.x).toBeCloseTo(1, 10);
      expect(sphereCenter.y).toBeCloseTo(2, 10);
      expect(sphereCenter.z).toBeCloseTo(3, 10);

      const aabbCenter = shapeCenter(aabb(0, 0, 0, 2, 4, 6));
      expect(aabbCenter.x).toBeCloseTo(1, 10);
      expect(aabbCenter.y).toBeCloseTo(2, 10);
      expect(aabbCenter.z).toBeCloseTo(3, 10);

      const obbCenter = shapeCenter(obb(1, 2, 3, 1));
      expect(obbCenter.x).toBeCloseTo(1, 10);
      expect(obbCenter.y).toBeCloseTo(2, 10);
      expect(obbCenter.z).toBeCloseTo(3, 10);

      const capsuleCenter = shapeCenter(capsule(0, 0, 0, 2, 4, 6, 1));
      expect(capsuleCenter.x).toBeCloseTo(1, 10);
      expect(capsuleCenter.y).toBeCloseTo(2, 10);
      expect(capsuleCenter.z).toBeCloseTo(3, 10);
    });

    it("未知形状落到胶囊的兜底分支", () => {
      const invalid = { shape: "unknown" } as unknown as Shape3D;
      const bounds = getBounds3(invalid);
      expect(Number.isNaN(bounds.minX)).toBe(true);
      expect(Number.isNaN(bounds.maxZ)).toBe(true);
    });
  });

  describe("补充覆盖：线段与距离查询", () => {
    it("退化为点的线段返回该点本身", () => {
      const point = closestPointOnSegment(
        { x: 5, y: 5, z: 5 },
        { x: 1, y: 2, z: 3 },
        { x: 1, y: 2, z: 3 }
      );
      expect(point.x).toBeCloseTo(1, 10);
      expect(point.y).toBeCloseTo(2, 10);
      expect(point.z).toBeCloseTo(3, 10);
    });

    it("两条线段都退化为点时距离为首尾点间距", () => {
      const distance = segmentSegmentDistance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 4, z: 0 },
        { x: 3, y: 4, z: 0 }
      );
      expect(distance).toBeCloseTo(5, 10);
    });

    it("第一条退化为点时按第二条上的投影求距离", () => {
      const distance = segmentSegmentDistance(
        { x: 1, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      );
      expect(distance).toBeCloseTo(0, 10);
    });

    it("第二条退化为点时按第一条上的投影求距离", () => {
      const distance = segmentSegmentDistance(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 5, y: 3, z: 0 },
        { x: 5, y: 3, z: 0 }
      );
      expect(distance).toBeCloseTo(3, 10);
    });

    it("平行线段的距离为两条线的间距", () => {
      const distance = segmentSegmentDistance(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 3, z: 0 },
        { x: 10, y: 3, z: 0 }
      );
      expect(distance).toBeCloseTo(3, 10);
    });

    it("共线重叠的线段距离为 0", () => {
      const distance = segmentSegmentDistance(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 },
        { x: 15, y: 0, z: 0 }
      );
      expect(distance).toBeCloseTo(0, 10);
    });

    it("最近点落在第二条线段延长线上时按端点计算", () => {
      // t > 1：最近点越过第二条线段的终点
      const beyond = segmentSegmentDistance(
        { x: 1, y: 20, z: 0 },
        { x: 2, y: 20, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 }
      );
      expect(beyond).toBeCloseTo(Math.sqrt(101), 10);

      // t < 0：最近点越过第二条线段的起点
      const before = segmentSegmentDistance(
        { x: 0, y: -10, z: 0 },
        { x: 1, y: -10, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 }
      );
      expect(before).toBeCloseTo(10, 10);
    });

    it("线段到 AABB 的距离", () => {
      // 线段穿过盒子，距离为 0
      expect(
        distanceSegmentToAabb(
          { x: -5, y: 0, z: 0 },
          { x: 5, y: 0, z: 0 },
          aabb(-1, -1, -1, 1, 1, 1)
        )
      ).toBeCloseTo(0, 4);

      // 线段平行于盒子且高出 2 个单位
      expect(
        distanceSegmentToAabb(
          { x: -5, y: 3, z: 0 },
          { x: 5, y: 3, z: 0 },
          aabb(-1, -1, -1, 1, 1, 1)
        )
      ).toBeCloseTo(2, 4);
    });
  });

  describe("补充覆盖：OBB 分离轴", () => {
    it("在混合轴上分离的两个 OBB 不相交", () => {
      const a = obb(0, 0, 0, 1, Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4));
      const b = obb(0, 0, 3, 1, Quaternion.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 4));
      expect(obbObb(a, b)).toBe(false);
      expect(intersects3d(a, b)).toBe(false);
      expect(intersects3d(b, a)).toBe(false);
    });

    it("只沿第二个 OBB 自身轴分离时也不相交", () => {
      const a = obb(0, 0, 0, 1);
      const b = obb(
        3 * Math.SQRT1_2,
        3 * Math.SQRT1_2,
        0,
        1,
        Quaternion.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 4)
      );
      expect(obbObb(a, b)).toBe(false);
      expect(intersects3d(a, b)).toBe(false);
      expect(intersects3d(b, a)).toBe(false);
    });

    it("同一位置不同朝向的 OBB 仍然相交", () => {
      const a = obb(0, 0, 0, 1);
      const b = obb(0, 0, 0, 1, Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4));
      expect(obbObb(a, b)).toBe(true);
      expect(intersects3d(a, b)).toBe(true);
      expect(intersects3d(b, a)).toBe(true);
    });
  });

  describe("补充覆盖：通用相交的兜底分支", () => {
    it("所有形状两两组合的相交判定都对称", () => {
      const shapes: Shape3D[] = [
        sphere(0, 0, 0, 2),
        aabb(-1, -1, -1, 1, 1, 1),
        obb(0, 0, 0, 2),
        capsule(0, 0, 0, 4, 0, 0, 1),
      ];

      for (const a of shapes) {
        for (const b of shapes) {
          expect(intersects3d(a, b)).toBe(intersects3d(b, a));
        }
      }
    });

    it("AABB 与 OBB 完全重合时相交", () => {
      const a = aabb(-1, -1, -1, 1, 1, 1);
      const b = obb(0, 0, 0, 1);
      expect(intersects3d(a, b)).toBe(true);
      expect(intersects3d(b, a)).toBe(true);
    });

    it("AABB 与 OBB 明显分离时不相交", () => {
      const a = aabb(-1, -1, -1, 1, 1, 1);
      const b = obb(10, 0, 0, 1);
      expect(intersects3d(a, b)).toBe(false);
      expect(intersects3d(b, a)).toBe(false);
    });

    it("胶囊与 OBB 相交", () => {
      const a = capsule(0, 0, 0, 10, 0, 0, 1);
      const b = obb(5, 0, 0, 1);
      expect(intersects3d(a, b)).toBe(true);
      expect(intersects3d(b, a)).toBe(true);
    });

    it("胶囊与 OBB 明显分离时不相交", () => {
      const a = capsule(0, 0, 0, 10, 0, 0, 1);
      const b = obb(50, 0, 0, 1);
      expect(intersects3d(a, b)).toBe(false);
      expect(intersects3d(b, a)).toBe(false);
    });

    it("未知形状的点包含判定返回 false", () => {
      const invalid = { shape: "unknown" } as unknown as Shape3D;
      expect(pointInShape3d({ x: 0, y: 0, z: 0 }, invalid)).toBe(false);
    });
  });

  describe("补充覆盖：平移向量的对称性", () => {
    it("球与 AABB 两种顺序的幅度相同、方向相反", () => {
      // 球心在盒子右侧、压在盒面上，���穿深度 0.5
      const s = sphere(2.5, 0, 0, 1);
      const b = aabb(0, 0, 0, 2, 2, 2);

      const sphereFirst = getTranslation3d(s, b);
      const boxFirst = getTranslation3d(b, s);

      expect(sphereFirst?.magnitude).toBeCloseTo(0.5, 10);
      expect(boxFirst?.magnitude).toBeCloseTo(0.5, 10);
      // 作用力与反作用力：方向相反
      expect(boxFirst?.x).toBeCloseTo(-(sphereFirst?.x as number), 10);
      expect(boxFirst?.y).toBeCloseTo(-(sphereFirst?.y as number), 10);
      expect(boxFirst?.z).toBeCloseTo(-(sphereFirst?.z as number), 10);
    });

    it("球心在 AABB 内时两种顺序同样对称", () => {
      const s = sphere(1, 1, 1, 1);
      const b = aabb(0, 0, 0, 10, 10, 10);

      const sphereFirst = getTranslation3d(s, b);
      const boxFirst = getTranslation3d(b, s);

      expect(sphereFirst).not.toBeNull();
      expect(boxFirst).not.toBeNull();
      expect(boxFirst?.magnitude).toBeCloseTo(sphereFirst?.magnitude as number, 10);
      expect(boxFirst?.x).toBeCloseTo(-(sphereFirst?.x as number), 10);
      expect(boxFirst?.y).toBeCloseTo(-(sphereFirst?.y as number), 10);
      expect(boxFirst?.z).toBeCloseTo(-(sphereFirst?.z as number), 10);
    });
  });

  describe("补充覆盖：最小平移向量", () => {
    it("同心球沿 x 轴推出", () => {
      const translation = getTranslation3d(sphere(0, 0, 0, 1), sphere(0, 0, 0, 1));
      expect(translation?.magnitude).toBeCloseTo(2, 10);
      expect(translation?.x).toBeCloseTo(2, 10);
      expect(translation?.y).toBeCloseTo(0, 10);
      expect(translation?.z).toBeCloseTo(0, 10);
    });

    it("球在 AABB 外侧时沿最近点方向推出", () => {
      const translation = getTranslation3d(sphere(2.5, 0, 0, 1), aabb(0, 0, 0, 2, 2, 2));
      expect(translation?.magnitude).toBeCloseTo(0.5, 10);
      expect(translation?.x).toBeCloseTo(0.5, 10);
      expect(translation?.y).toBeCloseTo(0, 10);
      expect(translation?.z).toBeCloseTo(0, 10);
    });

    it("球心在 AABB 内时沿最浅方向推出", () => {
      const left = getTranslation3d(sphere(1, 1, 1, 1), aabb(0, 0, 0, 2, 2, 2));
      expect(left?.x).toBeCloseTo(-2, 10);
      expect(left?.magnitude).toBeCloseTo(2, 10);

      const right = getTranslation3d(sphere(1.5, 1, 1, 1), aabb(0, 0, 0, 2, 2, 2));
      expect(right?.x).toBeCloseTo(1.5, 10);
      expect(right?.magnitude).toBeCloseTo(1.5, 10);

      const bottom = getTranslation3d(sphere(1, 0.5, 1, 1), aabb(0, 0, 0, 2, 2, 2));
      expect(bottom?.y).toBeCloseTo(-1.5, 10);
      expect(bottom?.magnitude).toBeCloseTo(1.5, 10);

      const top = getTranslation3d(sphere(1, 1.5, 1, 1), aabb(0, 0, 0, 2, 2, 2));
      expect(top?.y).toBeCloseTo(1.5, 10);

      const back = getTranslation3d(sphere(1, 1, 0.5, 1), aabb(0, 0, 0, 2, 2, 2));
      expect(back?.z).toBeCloseTo(-1.5, 10);

      const front = getTranslation3d(sphere(1, 1, 1.5, 1), aabb(0, 0, 0, 2, 2, 2));
      expect(front?.z).toBeCloseTo(1.5, 10);
    });

    it("AABB 之间按最小穿透轴选择方向", () => {
      const xAxis = getTranslation3d(
        aabb(0, 0, 0, 10, 10, 10),
        aabb(8, 0, 0, 18, 10, 10)
      );
      expect(xAxis?.x).toBeCloseTo(-2, 10);
      expect(xAxis?.magnitude).toBeCloseTo(2, 10);

      const xAxisReversed = getTranslation3d(
        aabb(8, 0, 0, 18, 10, 10),
        aabb(0, 0, 0, 10, 10, 10)
      );
      expect(xAxisReversed?.x).toBeCloseTo(2, 10);

      const yAxis = getTranslation3d(
        aabb(0, 0, 0, 10, 10, 10),
        aabb(0, 8, 0, 10, 18, 10)
      );
      expect(yAxis?.y).toBeCloseTo(-2, 10);
      expect(yAxis?.magnitude).toBeCloseTo(2, 10);

      const yAxisReversed = getTranslation3d(
        aabb(0, 8, 0, 10, 18, 10),
        aabb(0, 0, 0, 10, 10, 10)
      );
      expect(yAxisReversed?.y).toBeCloseTo(2, 10);

      const zAxis = getTranslation3d(
        aabb(0, 0, 0, 10, 10, 10),
        aabb(0, 0, 8, 10, 10, 18)
      );
      expect(zAxis?.z).toBeCloseTo(-2, 10);
      expect(zAxis?.magnitude).toBeCloseTo(2, 10);

      const zAxisReversed = getTranslation3d(
        aabb(0, 0, 8, 10, 10, 18),
        aabb(0, 0, 0, 10, 10, 10)
      );
      expect(zAxisReversed?.z).toBeCloseTo(2, 10);
    });

    it("胶囊与球按球心到轴线方向分离", () => {
      const translation = getTranslation3d(
        capsule(0, 0, 0, 10, 0, 0, 1),
        sphere(5, 1, 0, 1)
      );
      expect(translation?.magnitude).toBeCloseTo(1, 10);
      expect(translation?.x).toBeCloseTo(0, 10);
      expect(translation?.y).toBeCloseTo(-1, 10);
      expect(translation?.z).toBeCloseTo(0, 10);

      // 球心正好落在胶囊轴线上
      const onAxis = getTranslation3d(
        capsule(0, 0, 0, 10, 0, 0, 1),
        sphere(5, 0, 0, 1)
      );
      expect(onAxis?.magnitude).toBeCloseTo(2, 10);
      expect(onAxis?.x).toBeCloseTo(2, 10);
    });

    it("未特化的组合按中心连线做微小分离", () => {
      const translation = getTranslation3d(obb(10, 0, 0, 2), sphere(9, 0, 0, 1));
      expect(translation?.magnitude).toBeCloseTo(0.001, 10);
      expect(translation?.x).toBeCloseTo(0.001, 10);
      expect(translation?.y).toBeCloseTo(0, 10);

      // 中心重合时无法给出方向
      const sameCenter = getTranslation3d(obb(0, 0, 0, 2), sphere(0, 0, 0, 1));
      expect(sameCenter?.magnitude).toBeCloseTo(0, 10);
      expect(sameCenter?.x).toBeCloseTo(0, 10);
    });
  });

  describe("补充覆盖：射线的退化与边界", () => {
    const triA = { x: -1, y: 0, z: -1 };
    const triB = { x: 1, y: 0, z: -1 };
    const triC = { x: 0, y: 0, z: 1 };

    it("零方向向量不与任何形状相交", () => {
      expect(
        raySphere({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, sphere(0, 0, 0, 2))
      ).toBeNull();
      expect(
        rayAabb({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, aabb(-1, -1, -1, 1, 1, 1))
      ).toBeNull();
      expect(
        rayTriangle({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 0 }, triA, triB, triC)
      ).toBeNull();
      expect(
        rayPlane({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 0)
      ).toBeNull();
    });

    it("射线与球完全错过时返回 null", () => {
      // 射线沿 +X，球心在 (0, 1, 0)，弹道与球心距离为 1 > 半径 0.5
      expect(
        raySphere({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, sphere(0, 1, 0, 0.5))
      ).toBeNull();
    });

    it("射线沿负方向命中 AABB", () => {
      expect(
        rayAabb({ x: 10, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, aabb(0, -1, -1, 2, 1, 1))
      ).toBeCloseTo(8, 10);
    });

    it("射线在进入 AABB 区间前就错过时返回 null", () => {
      expect(
        rayAabb({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, aabb(-5, -1, -1, -4, 1, 1))
      ).toBeNull();
    });

    it("射线命中点落在三角形外时返回 null", () => {
      // 命中点越过 v0-v2 边：u 越界
      expect(
        rayTriangle({ x: 2, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }, triA, triB, triC)
      ).toBeNull();
      // 命中点越过 v0-v1 边：v 越界
      expect(
        rayTriangle({ x: 0, y: 1, z: -2 }, { x: 0, y: -1, z: 0 }, triA, triB, triC)
      ).toBeNull();
      // 命中点越过 v1-v2 边：u + v 越界
      expect(
        rayTriangle({ x: 1.2, y: 1, z: -0.2 }, { x: 0, y: -1, z: 0 }, triA, triB, triC)
      ).toBeNull();
    });

    it("命中点位于射线起点之后时返回 null", () => {
      expect(
        rayTriangle({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, triA, triB, triC)
      ).toBeNull();
    });

    it("射线与平面平行时返回 null", () => {
      expect(
        rayPlane({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 0)
      ).toBeNull();
    });

    it("交点位于射线起点之后时返回 null", () => {
      expect(
        rayPlane({ x: 0, y: 5, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 0)
      ).toBeNull();
    });

    it("通用射线检测对胶囊使用球形近似", () => {
      // 胶囊 (0,0,0)-(10,0,0) 半径 1：近似球心 (5,0,0)、半径 6
      const distance = raycast3d(
        { x: -20, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        capsule(0, 0, 0, 10, 0, 0, 1)
      );
      expect(distance).toBeCloseTo(19, 10);
    });

    it("未知形状的通用射线检测返回 null", () => {
      const invalid = { shape: "unknown" } as unknown as Shape3D;
      expect(
        raycast3d({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, invalid)
      ).toBeNull();
    });
  });
});
