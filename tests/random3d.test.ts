import { describe, it, expect } from "vitest";
import {
  randomPointInSphere,
  randomPointOnSphere,
  randomDirection,
  randomPointInCube,
  randomPointOnCubeFace,
  randomUnitQuaternion,
  randomPointInCapsule,
} from "../src/math/random3d";
import { createRandom } from "../src/math/random";

describe("random3d", () => {
  it("球内随机点落在球内", () => {
    const rand = createRandom(1);
    for (let i = 0; i < 300; i++) {
      const point = randomPointInSphere(10, rand);
      expect(
        Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
      ).toBeLessThanOrEqual(10 + 1e-9);
    }
  });

  it("球面随机点半径恒定", () => {
    const rand = createRandom(3);
    for (let i = 0; i < 200; i++) {
      const point = randomPointOnSphere(5, rand);
      expect(
        Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
      ).toBeCloseTo(5, 10);
    }
  });

  it("随机方向为单位向量", () => {
    const rand = createRandom(5);
    for (let i = 0; i < 200; i++) {
      const point = randomDirection(rand);
      expect(
        Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
      ).toBeCloseTo(1, 10);
    }
  });

  it("立方体内随机点落在立方体内", () => {
    const rand = createRandom(7);
    for (let i = 0; i < 200; i++) {
      const point = randomPointInCube(10, rand);
      expect(Math.abs(point.x)).toBeLessThanOrEqual(5);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(5);
      expect(Math.abs(point.z)).toBeLessThanOrEqual(5);
    }
  });

  it("立方体表面随机点恰在一个面上", () => {
    const rand = createRandom(9);
    for (let i = 0; i < 200; i++) {
      const point = randomPointOnCubeFace(10, rand);
      const onFace =
        Math.abs(Math.abs(point.x) - 5) < 1e-9 ||
        Math.abs(Math.abs(point.y) - 5) < 1e-9 ||
        Math.abs(Math.abs(point.z) - 5) < 1e-9;
      expect(onFace).toBe(true);
    }
  });

  it("随机单位四元数模长恒为 1", () => {
    const rand = createRandom(11);
    for (let i = 0; i < 200; i++) {
      const q = randomUnitQuaternion(rand);
      const length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
      expect(length).toBeCloseTo(1, 10);
    }
  });

  it("胶囊内随机点落在胶囊包围盒内", () => {
    const rand = createRandom(13);
    const start = { x: 0, y: 0, z: 0 };
    const end = { x: 10, y: 0, z: 0 };
    for (let i = 0; i < 200; i++) {
      const point = randomPointInCapsule(start, end, 2, rand);
      expect(point.x).toBeGreaterThanOrEqual(-2);
      expect(point.x).toBeLessThanOrEqual(12);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(point.z)).toBeLessThanOrEqual(2);
    }
  });

  it("同种子结果可复现", () => {
    const a = createRandom(99);
    const b = createRandom(99);
    expect(randomPointOnSphere(3, a)).toEqual(randomPointOnSphere(3, b));
  });
});

describe("random3d 退化输入", () => {
  it("半径为 0 时球内与球面点都退化为原点", () => {
    const rand = createRandom(201);
    for (let i = 0; i < 50; i++) {
      const inside = randomPointInSphere(0, rand);
      expect(inside.x).toBeCloseTo(0, 10);
      expect(inside.y).toBeCloseTo(0, 10);
      expect(inside.z).toBeCloseTo(0, 10);
    }
    const onSurface = randomPointOnSphere(0, rand);
    expect(onSurface.x).toBeCloseTo(0, 10);
    expect(onSurface.y).toBeCloseTo(0, 10);
    expect(onSurface.z).toBeCloseTo(0, 10);
  });

  it("立方体尺寸为 0 时退化为原点", () => {
    const rand = createRandom(202);
    for (let i = 0; i < 50; i++) {
      const inside = randomPointInCube(0, rand);
      expect(inside.x).toBeCloseTo(0, 10);
      expect(inside.y).toBeCloseTo(0, 10);
      expect(inside.z).toBeCloseTo(0, 10);
      const onFace = randomPointOnCubeFace(0, rand);
      expect(onFace.x).toBeCloseTo(0, 10);
      expect(onFace.y).toBeCloseTo(0, 10);
      expect(onFace.z).toBeCloseTo(0, 10);
    }
  });

  it("负半径与同值正半径结果一致", () => {
    const a = createRandom(203);
    const b = createRandom(203);
    expect(randomPointInSphere(-5, a)).toEqual(randomPointInSphere(5, b));
  });

  it("胶囊高度为 0 时退化为球", () => {
    const rand = createRandom(204);
    const center = { x: 1, y: 2, z: 3 };
    for (let i = 0; i < 200; i++) {
      const point = randomPointInCapsule(center, center, 2, rand);
      const distance = Math.sqrt(
        (point.x - center.x) ** 2 + (point.y - center.y) ** 2 + (point.z - center.z) ** 2
      );
      expect(distance).toBeLessThanOrEqual(2 + 1e-9);
    }
  });
});

describe("random3d 统计性质", () => {
  it("胶囊内采样点到轴线线段的距离不超过半径", () => {
    const rand = createRandom(205);
    const start = { x: 0, y: 0, z: 0 };
    const end = { x: 10, y: 0, z: 0 };
    for (let i = 0; i < 500; i++) {
      const point = randomPointInCapsule(start, end, 1.5, rand);
      // 轴线在 x 轴上，先把投影夹到线段范围内再求距离
      const t = Math.min(1, Math.max(0, (point.x - start.x) / (end.x - start.x)));
      const closestX = start.x + (end.x - start.x) * t;
      const distance = Math.sqrt(
        (point.x - closestX) ** 2 + point.y ** 2 + point.z ** 2
      );
      expect(distance).toBeLessThanOrEqual(1.5 + 1e-9);
    }
  });

  it("立方体表面 6 个面分布均匀", () => {
    const rand = createRandom(206);
    const half = 5;
    const counts = [0, 0, 0, 0, 0, 0];
    const total = 10000;
    for (let i = 0; i < total; i++) {
      const point = randomPointOnCubeFace(10, rand);
      const onX = Math.abs(Math.abs(point.x) - half) < 1e-9;
      const onY = Math.abs(Math.abs(point.y) - half) < 1e-9;
      if (onX) {
        counts[point.x > 0 ? 0 : 1]++;
      } else if (onY) {
        counts[point.y > 0 ? 2 : 3]++;
      } else {
        counts[point.z > 0 ? 4 : 5]++;
      }
    }
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(total);
    for (const count of counts) {
      expect(count / total).toBeGreaterThan(0.15);
      expect(count / total).toBeLessThan(0.18);
    }
  });

  it("球内采样点按体积均匀分布（平均半径约 3R/4）", () => {
    const rand = createRandom(207);
    const radius = 5;
    const total = 10000;
    let sum = 0;
    for (let i = 0; i < total; i++) {
      const point = randomPointInSphere(radius, rand);
      sum += Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
    }
    const mean = sum / total;
    expect(mean).toBeGreaterThan(0.73 * radius);
    expect(mean).toBeLessThan(0.77 * radius);
  });
});
