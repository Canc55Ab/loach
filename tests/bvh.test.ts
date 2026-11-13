import { describe, it, expect } from "vitest";
import { BVH, triangleAabbOverlap } from "../src/patterns/bvh";
import type { ITriangle3 } from "../src/patterns/bvh";
import { Vector3 } from "../src/math/vector3";

/** 构造一个位于 z=0 平面的三角形 */
function triangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): ITriangle3 {
  return {
    a: { x: ax, y: ay, z: 0 },
    b: { x: bx, y: by, z: 0 },
    c: { x: cx, y: cy, z: 0 },
  };
}

describe("BVH", () => {
  const triangles: ITriangle3[] = [
    triangle(0, 0, 2, 0, 0, 2),
    triangle(10, 0, 12, 0, 10, 2),
    triangle(20, 0, 22, 0, 20, 2),
    triangle(0, 10, 2, 10, 0, 12),
    triangle(10, 10, 12, 10, 10, 12),
  ];

  it("构建成功并保留三角形数量", () => {
    const bvh = new BVH(triangles);
    expect(bvh.triangleCount).toBe(5);
    expect(bvh.root).not.toBeNull();
  });

  it("不修改传入的三角形数组", () => {
    const input = [triangle(0, 0, 2, 0, 0, 2), triangle(10, 0, 12, 0, 10, 2)];
    const snapshot = JSON.stringify(input);
    new BVH(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("范围查询返回相交的三角形", () => {
    const bvh = new BVH(triangles);
    const result = bvh.queryRange({
      minX: -1,
      minY: -1,
      minZ: -1,
      maxX: 3,
      maxY: 3,
      maxZ: 1,
    });
    expect(result).toContain(0);
    expect(result).not.toContain(2);
  });

  it("范围查询为空时返回空数组", () => {
    const bvh = new BVH(triangles);
    const result = bvh.queryRange({
      minX: 100,
      minY: 100,
      minZ: 100,
      maxX: 110,
      maxY: 110,
      maxZ: 110,
    });
    expect(result).toHaveLength(0);
  });

  it("空三角形数组构建出空树", () => {
    const bvh = new BVH([]);
    expect(bvh.root).toBeNull();
    expect(bvh.queryRange({ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 })).toEqual([]);
    expect(bvh.raycast({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 })).toBeNull();
  });

  it("射线拾取返回最近的命中", () => {
    const bvh = new BVH(triangles);
    const hit = bvh.raycast({ x: 1, y: 0.5, z: 5 }, { x: 0, y: 0, z: -1 });
    expect(hit).not.toBeNull();
    expect(hit?.index).toBe(0);
    expect(hit?.distance).toBeCloseTo(5, 6);
    expect(hit?.point.z).toBeCloseTo(0, 6);
  });

  it("射线未命中返回 null", () => {
    const bvh = new BVH(triangles);
    const hit = bvh.raycast({ x: 100, y: 100, z: 5 }, { x: 0, y: 0, z: -1 });
    expect(hit).toBeNull();
  });

  it("超出最大距离时不命中", () => {
    const bvh = new BVH(triangles);
    const hit = bvh.raycast({ x: 1, y: 0.5, z: 5 }, { x: 0, y: 0, z: -1 }, 1);
    expect(hit).toBeNull();
  });
});

describe("BVH 边界与分支覆盖", () => {
  /** 构造任意三维三角形 */
  function tri3(
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number]
  ): ITriangle3 {
    return {
      a: { x: a[0], y: a[1], z: a[2] },
      b: { x: b[0], y: b[1], z: b[2] },
      c: { x: c[0], y: c[1], z: c[2] },
    };
  }

  it("空 BVH 没有任何三角形", () => {
    const bvh = new BVH([]);
    expect(bvh.triangleCount).toBe(0);
    expect(bvh.root).toBeNull();
    expect(
      bvh.queryRange({ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 })
    ).toEqual([]);
    expect(bvh.raycast({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 })).toBeNull();
  });

  it("单个三角形构造成叶子节点并完全落在根节点包围盒内", () => {
    const only = tri3([0, 0, 0], [2, 0, 0], [0, 2, 0]);
    const bvh = new BVH([only]);
    expect(bvh.root?.indices).toEqual([0]);
    expect(bvh.root?.left).toBeNull();
    expect(bvh.root?.right).toBeNull();
    expect(bvh.root?.bounds).toEqual({
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: 2,
      maxY: 2,
      maxZ: 0,
    });
    const result = bvh.queryRange({
      minX: -1,
      minY: -1,
      minZ: -1,
      maxX: 1,
      maxY: 1,
      maxZ: 1,
    });
    expect(result).toEqual([0]);
  });

  it("方向为零向量的射线不命中", () => {
    const bvh = new BVH([tri3([0, 0, 0], [2, 0, 0], [0, 2, 0])]);
    expect(bvh.raycast({ x: 1, y: 0.5, z: 5 }, { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it("射线与包围盒的 slab 区间不相交时判定为未命中", () => {
    const bvh = new BVH([tri3([0, 0, 0], [2, 0, 0], [0, 0, 2])]);
    expect(bvh.raycast({ x: 0, y: 0, z: 10 }, { x: 1, y: 1, z: -1 })).toBeNull();
  });

  it("同一叶子内命中多个三角形时取最近的", () => {
    const near = tri3([0, 0, 0], [12, 0, 0], [0, 12, 0]);
    const far = tri3([0, 0, -5], [12, 0, -5], [0, 12, -5]);
    const bvh = new BVH([near, far]);
    const hit = bvh.raycast({ x: 5, y: 5, z: 10 }, { x: 0, y: 0, z: -1 });
    expect(hit).not.toBeNull();
    expect(hit?.index).toBe(0);
    expect(hit?.distance).toBeCloseTo(10, 6);
    expect(hit?.point.z).toBeCloseTo(0, 6);
  });

  it("较远的三角形先被遍历时仍返回最近的命中", () => {
    const near = tri3([0, 0, 0], [12, 0, 0], [0, 12, 0]);
    const far = tri3([0, 0, -5], [12, 0, -5], [0, 12, -5]);
    const bvh = new BVH([far, near]);
    const hit = bvh.raycast({ x: 5, y: 5, z: 10 }, { x: 0, y: 0, z: -1 });
    expect(hit).not.toBeNull();
    expect(hit?.index).toBe(1);
    expect(hit?.distance).toBeCloseTo(10, 6);
  });

  it("子节点包围盒的进入距离不小于当前命中时剪枝", () => {
    const near = tri3([0, 0, 0], [12, 0, 0], [0, 12, 0]);
    const far = tri3([2, 0, -5], [14, 0, -5], [2, 12, -5]);
    const bvh = new BVH([near, far], { maxLeafSize: 1 });
    const hit = bvh.raycast({ x: 5, y: 5, z: 10 }, { x: 0, y: 0, z: -1 });
    expect(hit).not.toBeNull();
    expect(hit?.index).toBe(0);
    expect(hit?.distance).toBeCloseTo(10, 6);
  });

  it("包围盒 x 方向最长时沿 x 轴分割", () => {
    const tris = [
      tri3([0, 0, 0], [2, 0, 0], [0, 2, 0]),
      tri3([10, 0, 0], [12, 0, 0], [10, 2, 0]),
      tri3([20, 0, 0], [22, 0, 0], [20, 2, 0]),
      tri3([0, 10, 0], [2, 10, 0], [0, 12, 0]),
      tri3([10, 10, 0], [12, 10, 0], [10, 12, 0]),
    ];
    const bvh = new BVH(tris);
    expect(bvh.root?.left).not.toBeNull();
    expect(bvh.root?.right).not.toBeNull();
    expect(bvh.root?.left?.bounds.maxX).toBe(2);
    expect(bvh.root?.right?.bounds.minX).toBe(10);

    // 内部节点的查询会递归到左右子节点
    const result = bvh.queryRange({
      minX: -1,
      minY: -1,
      minZ: -1,
      maxX: 3,
      maxY: 3,
      maxZ: 1,
    });
    expect(result).toContain(0);
    expect(result).not.toContain(2);
  });

  it("包围盒 y 方向最长时沿 y 轴分割", () => {
    const tris = [
      tri3([0, 0, 0], [2, 0, 0], [0, 0, 2]),
      tri3([0, 10, 0], [2, 10, 0], [0, 10, 2]),
      tri3([0, 20, 0], [2, 20, 0], [0, 20, 2]),
      tri3([0, 30, 0], [2, 30, 0], [0, 30, 2]),
      tri3([0, 40, 0], [2, 40, 0], [0, 40, 2]),
    ];
    const bvh = new BVH(tris);
    expect(bvh.root?.left?.bounds.maxY).toBe(10);
    expect(bvh.root?.right?.bounds.minY).toBe(20);
  });

  it("包围盒 z 方向最长时沿 z 轴分割", () => {
    const tris = [
      tri3([0, 0, 0], [2, 0, 0], [0, 2, 0]),
      tri3([0, 0, 10], [2, 0, 10], [0, 2, 10]),
      tri3([0, 0, 20], [2, 0, 20], [0, 2, 20]),
      tri3([0, 0, 30], [2, 0, 30], [0, 2, 30]),
      tri3([0, 0, 40], [2, 0, 40], [0, 2, 40]),
    ];
    const bvh = new BVH(tris);
    expect(bvh.root?.left?.bounds.maxZ).toBe(10);
    expect(bvh.root?.right?.bounds.minZ).toBe(20);
  });

  it("退化三角形跳过平面判定", () => {
    const v0 = new Vector3(0, 0, 0);
    const v1 = new Vector3(1, 0, 0);
    const v2 = new Vector3(2, 0, 0);
    const around = { minX: -1, minY: -1, minZ: -1, maxX: 3, maxY: 1, maxZ: 1 };
    expect(triangleAabbOverlap(v0, v1, v2, around)).toBe(true);
    const away = { minX: 10, minY: 10, minZ: 10, maxX: 12, maxY: 12, maxZ: 12 };
    expect(triangleAabbOverlap(v0, v1, v2, away)).toBe(false);
  });

  it("斜三角形被所在平面的分离判定排除", () => {
    const v0 = new Vector3(0, 0, 0);
    const v1 = new Vector3(1, 1, 0);
    const v2 = new Vector3(0, 0, 1);
    // 盒子整体位于三角形所在平面的同一侧
    const tight = { minX: 0.5, minY: -0.4, minZ: 0, maxX: 2.5, maxY: 0.4, maxZ: 1 };
    expect(triangleAabbOverlap(v0, v1, v2, tight)).toBe(false);
    // 盒子跨过该平面时判定为相交
    const loose = { minX: 0.5, minY: -0.8, minZ: 0, maxX: 2.5, maxY: 0.8, maxZ: 1 };
    expect(triangleAabbOverlap(v0, v1, v2, loose)).toBe(true);
  });

  it("边与坐标轴叉乘得到的分离轴可以排除相交", () => {
    const v0 = new Vector3(0, 0, 0);
    const v1 = new Vector3(10, 0, 0);
    const v2 = new Vector3(0, 0, 10);
    // 盒子落在三角形之外，但与三角形在三个坐标轴上的投影仍然重叠
    const outside = { minX: 7.5, minY: -0.15, minZ: 7.5, maxX: 8.5, maxY: 0.25, maxZ: 8.5 };
    expect(triangleAabbOverlap(v0, v1, v2, outside)).toBe(false);
    const inside = { minX: -1, minY: -1, minZ: -1, maxX: 1, maxY: 1, maxZ: 1 };
    expect(triangleAabbOverlap(v0, v1, v2, inside)).toBe(true);
  });
});
