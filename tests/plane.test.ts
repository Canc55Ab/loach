import { describe, it, expect } from "vitest";
import { Plane } from "../src/math/plane";
import { Vector3 } from "../src/math/vector3";

describe("Plane", () => {
  describe("构造", () => {
    it("由三点确定平面，法线正确", () => {
      const plane = Plane.fromPoints(
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 }
      );
      // (1,0,0) × (0,0,1) = (0,-1,0)
      expect(plane.normal.y).toBeCloseTo(-1, 10);
      expect(plane.constant).toBeCloseTo(0, 10);
    });

    it("由法线与平面上一点确定平面", () => {
      const plane = Plane.fromNormalAndPoint(
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 5, z: 0 }
      );
      expect(plane.normal.y).toBeCloseTo(1, 10);
      expect(plane.constant).toBeCloseTo(-5, 10);
    });
  });

  describe("距离与投影", () => {
    it("点到平面的带符号距离", () => {
      const plane = new Plane(new Vector3(0, 1, 0), 0);
      expect(plane.distanceToPoint({ x: 0, y: 3, z: 0 })).toBeCloseTo(3, 10);
      expect(plane.distanceToPoint({ x: 0, y: -2, z: 0 })).toBeCloseTo(-2, 10);
    });

    it("投影到最近点", () => {
      const plane = new Plane(new Vector3(0, 1, 0), 0);
      const projected = plane.projectPoint({ x: 2, y: 5, z: 3 });
      expect(projected.x).toBeCloseTo(2, 10);
      expect(projected.y).toBeCloseTo(0, 10);
      expect(projected.z).toBeCloseTo(3, 10);
    });

    it("coplanar 判定", () => {
      const plane = new Plane(new Vector3(0, 1, 0), 0);
      expect(plane.coplanar({ x: 1, y: 0, z: 1 })).toBe(true);
      expect(plane.coplanar({ x: 1, y: 0.5, z: 1 })).toBe(false);
    });
  });

  describe("复制与字符串", () => {
    it("clone 复制法线与常数并返回新实例", () => {
      const plane = new Plane(new Vector3(0, 1, 0), -3);
      const copy = plane.clone();

      expect(copy).not.toBe(plane);
      expect(copy.normal).not.toBe(plane.normal);
      expect(copy.normal.toArray()).toEqual([0, 1, 0]);
      expect(copy.constant).toBeCloseTo(-3, 10);

      // 修改副本不影响原平面
      copy.normal.set(1, 0, 0);
      expect(plane.normal.toArray()).toEqual([0, 1, 0]);
    });

    it("toString 输出固定格式", () => {
      expect(new Plane(new Vector3(0, 1, 0), -3).toString()).toBe(
        "Plane(Vector3(0, 1, 0), -3)"
      );
      expect(new Plane().toString()).toBe("Plane(Vector3(0, 1, 0), 0)");
    });
  });

  describe("退化输入", () => {
    it("fromPoints 三点共线时退化为默认水平面", () => {
      const plane = Plane.fromPoints(
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 }
      );
      expect(plane.normal.toArray()).toEqual([0, 1, 0]);
      expect(plane.constant).toBeCloseTo(0, 10);
    });

    it("fromPoints 三点重合时同样退化为默认水平面", () => {
      const plane = Plane.fromPoints(
        { x: 1, y: 2, z: 3 },
        { x: 1, y: 2, z: 3 },
        { x: 1, y: 2, z: 3 }
      );
      expect(plane.normal.toArray()).toEqual([0, 1, 0]);
      expect(plane.constant).toBeCloseTo(0, 10);
    });
  });
});
