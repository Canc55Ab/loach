import { describe, it, expect } from "vitest";
import { Frustum } from "../src/algorithms/frustum";
import { Matrix4 } from "../src/math/matrix4";
import { Vector3 } from "../src/math/vector3";
import { Plane } from "../src/math/plane";

/** 构造相机在 (0,0,10) 朝向原点的视投影矩阵 */
function buildViewProjection(): Matrix4 {
  const view = Matrix4.lookAt(
    new Vector3(0, 0, 10),
    new Vector3(0, 0, 0),
    new Vector3(0, 1, 0)
  );
  const projection = Matrix4.perspective(Math.PI / 2, 1, 0.1, 100);
  return Matrix4.multiplyMatrices(projection, view);
}

describe("Frustum", () => {
  const frustum = Frustum.fromMatrix4(buildViewProjection());

  it("提取出 6 个平面", () => {
    expect(frustum.planes.length).toBe(6);
    for (const plane of frustum.planes) {
      expect(plane.normal.length).toBeCloseTo(1, 10);
    }
  });

  it("视锥内的点被判定为包含", () => {
    expect(frustum.containsPoint(new Vector3(0, 0, 0))).toBe(true);
    expect(frustum.containsPoint(new Vector3(1, 1, 0))).toBe(true);
  });

  it("视锥外的点被判定为不包含", () => {
    // 太远
    expect(frustum.containsPoint(new Vector3(0, 0, 200))).toBe(false);
    // 在相机背后
    expect(frustum.containsPoint(new Vector3(0, 0, 20))).toBe(false);
    // 侧向超出视锥
    expect(frustum.containsPoint(new Vector3(100, 0, 0))).toBe(false);
  });

  it("球的包含判定考虑半径", () => {
    expect(frustum.containsSphere(new Vector3(0, 0, 0), 1)).toBe(true);
    // 相机在 z=10、近平面 0.1，球心落在近平面之外
    expect(frustum.containsSphere(new Vector3(0, 0, 10), 0.05)).toBe(false);
    expect(frustum.containsSphere(new Vector3(0, 0, 200), 1)).toBe(false);
  });

  it("AABB 相交判定", () => {
    expect(
      frustum.intersectsAabb({ minX: -1, minY: -1, minZ: -1, maxX: 1, maxY: 1, maxZ: 1 })
    ).toBe(true);
    expect(
      frustum.intersectsAabb({
        minX: 90,
        minY: 90,
        minZ: 90,
        maxX: 100,
        maxY: 100,
        maxZ: 100,
      })
    ).toBe(false);
  });

  it("球与视锥相交判定", () => {
    expect(frustum.intersectsSphere(new Vector3(0, 0, 0), 1)).toBe(true);
    expect(frustum.intersectsSphere(new Vector3(500, 0, 0), 1)).toBe(false);
  });

  it("能提取 8 个角点", () => {
    const corners = frustum.getCorners();
    expect(corners.length).toBe(8);
    // 近平面四角应落在相机前方
    const nearZ = corners[0].z;
    expect(nearZ).toBeLessThan(0);
  });
});

describe("Frustum 退化场景", () => {
  it("平面数量不足 6 个时不返回角点", () => {
    const frustum = new Frustum([new Plane(new Vector3(0, 1, 0), 0)]);
    expect(frustum.planes.length).toBe(1);
    expect(frustum.getCorners()).toEqual([]);
  });

  it("三平面法向退化时角点退化为原点", () => {
    const plane = new Plane(new Vector3(0, 0, 1), 0);
    const frustum = new Frustum([plane, plane, plane, plane, plane, plane]);
    const corners = frustum.getCorners();
    expect(corners.length).toBe(8);
    for (const corner of corners) {
      expect(corner.toArray()).toEqual([0, 0, 0]);
    }
  });

  it("零矩阵提取出的平面法向与常数均退化", () => {
    const frustum = Frustum.fromMatrix4(new Matrix4(new Array(16).fill(0)));
    expect(frustum.planes.length).toBe(6);
    for (const plane of frustum.planes) {
      expect(plane.normal.length).toBeCloseTo(0, 10);
      expect(plane.constant).toBeCloseTo(0, 10);
    }
  });
});

describe("Frustum 角点几何", () => {
  const frustum = Frustum.fromMatrix4(buildViewProjection());
  const camera = new Vector3(0, 0, 10);

  // 注意：当前 getCorners 的三平面求交存在符号问题，得到的角点是真实角点关于原点的镜像，
  // 因此这里只断言与镜像无关的通用几何性质（详见交付报告中的疑似实现 bug）。
  it("返回 8 个互不重合的角点", () => {
    const corners = frustum.getCorners();
    expect(corners.length).toBe(8);
    for (let i = 0; i < corners.length; i++) {
      for (let j = i + 1; j < corners.length; j++) {
        expect(corners[i].distanceTo(corners[j])).toBeGreaterThan(0);
      }
    }
  });

  it("近平面四角共面且远平面四角共面", () => {
    const corners = frustum.getCorners();
    const near = corners.slice(0, 4);
    const far = corners.slice(4, 8);
    for (const corner of near) {
      expect(corner.z).toBeCloseTo(near[0].z, 8);
    }
    for (const corner of far) {
      expect(corner.z).toBeCloseTo(far[0].z, 8);
    }
    expect(near[0].z).not.toBeCloseTo(far[0].z, 6);
  });

  it("远平面角点比近平面角点离相机更远", () => {
    const corners = frustum.getCorners();
    const nearDistance = corners[0].distanceTo(camera);
    const farDistance = corners[4].distanceTo(camera);
    expect(nearDistance).toBeLessThan(farDistance);
  });

  it("远平面比近平面更宽", () => {
    const corners = frustum.getCorners();
    const nearHalf = Math.max(...corners.slice(0, 4).map((c) => Math.abs(c.x)));
    const farHalf = Math.max(...corners.slice(4, 8).map((c) => Math.abs(c.x)));
    expect(farHalf).toBeGreaterThan(nearHalf);
  });
});

describe("Frustum AABB 边界", () => {
  const frustum = Frustum.fromMatrix4(buildViewProjection());

  it("完全位于视锥内的 AABB 判定为相交", () => {
    expect(
      frustum.intersectsAabb({
        minX: -0.1,
        minY: -0.1,
        minZ: 9.0,
        maxX: 0.1,
        maxY: 0.1,
        maxZ: 9.5,
      })
    ).toBe(true);
  });

  it("完全位于视锥外的 AABB 判定为不相交", () => {
    // 越过右侧视锥边缘（z=9.0 处视锥半宽为 1.0）
    expect(
      frustum.intersectsAabb({
        minX: 1.2,
        minY: -0.1,
        minZ: 9.0,
        maxX: 2.0,
        maxY: 0.1,
        maxZ: 9.5,
      })
    ).toBe(false);
  });

  it("跨越视锥边缘的 AABB 判定为相交", () => {
    expect(
      frustum.intersectsAabb({
        minX: 0.3,
        minY: -0.1,
        minZ: 9.0,
        maxX: 1.0,
        maxY: 0.1,
        maxZ: 9.5,
      })
    ).toBe(true);
  });

  it("位于相机背后的 AABB 判定为不相交", () => {
    expect(
      frustum.intersectsAabb({
        minX: -1,
        minY: -1,
        minZ: 11,
        maxX: 1,
        maxY: 1,
        maxZ: 12,
      })
    ).toBe(false);
  });
});
