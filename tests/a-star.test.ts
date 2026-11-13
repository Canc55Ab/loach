import { describe, it, expect } from "vitest";
import {
  findPath,
  smoothPath,
  hasLineOfSight,
  isWalkable,
  getHeuristic,
} from "../src/algorithms/a-star";

/** 生成网格：0 为障碍，1 为可通行 */
function makeGrid(width: number, height: number, value: number = 1): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < height; y++) {
    grid.push(new Array<number>(width).fill(value));
  }
  return grid;
}

describe("a-star", () => {
  describe("findPath", () => {
    it("空网格上找到最短路径", () => {
      const grid = makeGrid(5, 5);
      const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 4 });

      expect(path).not.toBeNull();
      expect(path?.length).toBe(5);
      expect(path?.[0]).toEqual({ x: 0, y: 0 });
      expect(path?.[path.length - 1]).toEqual({ x: 4, y: 4 });
    });

    it("路径上的每一步都是相邻格", () => {
      const grid = makeGrid(6, 6);
      const path = findPath(grid, { x: 0, y: 0 }, { x: 5, y: 5 });

      expect(path).not.toBeNull();
      for (let i = 1; i < (path as Array<{ x: number; y: number }>).length; i++) {
        const prev = (path as Array<{ x: number; y: number }>)[i - 1];
        const curr = (path as Array<{ x: number; y: number }>)[i];
        const step = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
        expect(step).toBeLessThanOrEqual(2);
      }
    });

    it("绕开障碍物", () => {
      const grid = makeGrid(5, 5);
      // 在 (2, 0) 到 (2, 4) 之间竖起一堵墙，留出 (0, y) 通道
      for (let y = 0; y < 4; y++) grid[y][2] = 0;

      const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
      expect(path).not.toBeNull();
      for (const point of path as Array<{ x: number; y: number }>) {
        expect(grid[point.y][point.x]).not.toBe(0);
      }
    });

    it("目标被完全包围时返回 null", () => {
      const grid = makeGrid(5, 5);
      grid[1][2] = 0;
      grid[2][1] = 0;
      grid[2][3] = 0;
      grid[3][2] = 0;
      grid[2][2] = 0;

      const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 });
      expect(path).toBeNull();
    });

    it("起点或终点为障碍时返回 null", () => {
      const grid = makeGrid(5, 5);
      grid[0][0] = 0;
      expect(findPath(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBeNull();
      expect(findPath(grid, { x: 1, y: 1 }, { x: 0, y: 0 })).toBeNull();
    });

    it("关闭斜向后路径长度为曼哈顿距离", () => {
      const grid = makeGrid(5, 5);
      const path = findPath(
        grid,
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        { allowDiagonal: false }
      );
      expect(path?.length).toBe(9);
    });

    it("允许斜向时路径更短", () => {
      const grid = makeGrid(5, 5);
      const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 4 });
      expect(path?.length).toBe(5);
    });

    it("禁止穿角时不会斜穿两个障碍的夹角", () => {
      const grid = makeGrid(5, 5);
      // (1,1) → (2,2) 的两个正交邻居都是障碍
      grid[2][1] = 0;
      grid[1][2] = 0;

      const blocked = findPath(
        grid,
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { cornerCutting: false }
      );
      expect(blocked).not.toBeNull();
      expect(blocked?.length).toBeGreaterThan(2);

      const allowed = findPath(
        grid,
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { cornerCutting: true }
      );
      expect(allowed?.length).toBe(2);
    });

    it("起点与终点相同时返回单点路径", () => {
      const grid = makeGrid(3, 3);
      const path = findPath(grid, { x: 1, y: 1 }, { x: 1, y: 1 });
      expect(path).toEqual([{ x: 1, y: 1 }]);
    });

    it("支持自定义地形代价", () => {
      const grid = makeGrid(3, 3);
      const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 }, {
        costOf: (value, x) => (x === 1 ? 10 : 1),
      });
      expect(path).not.toBeNull();
      expect(path?.length).toBeGreaterThan(0);
    });
  });

  describe("hasLineOfSight", () => {
    it("无遮挡时可见", () => {
      const grid = makeGrid(5, 5);
      expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(true);
    });

    it("有遮挡时不可见", () => {
      const grid = makeGrid(5, 5);
      grid[2][2] = 0;
      expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(false);
    });
  });

  describe("smoothPath", () => {
    it("把折线路径拉直", () => {
      const grid = makeGrid(5, 5);
      const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 4 }, {
        allowDiagonal: false,
      }) as Array<{ x: number; y: number }>;

      const smoothed = smoothPath(grid, path);
      expect(smoothed.length).toBeLessThan(path.length);
      expect(smoothed[0]).toEqual(path[0]);
      expect(smoothed[smoothed.length - 1]).toEqual(path[path.length - 1]);
    });

    it("路径不足三点时原样返回", () => {
      const grid = makeGrid(3, 3);
      const path = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];
      expect(smoothPath(grid, path)).toEqual(path);
    });
  });

  describe("辅助函数", () => {
    it("isWalkable 判断格子可通行性", () => {
      const grid = makeGrid(3, 3);
      grid[1][1] = 0;
      expect(isWalkable(grid, 0, 0)).toBe(true);
      expect(isWalkable(grid, 1, 1)).toBe(false);
      expect(isWalkable(grid, 9, 9)).toBe(false);
    });

    it("getHeuristic 三种启发函数", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 3, y: 4 };
      expect(getHeuristic(from, to, "manhattan")).toBe(7);
      expect(getHeuristic(from, to, "euclidean")).toBe(5);
      expect(getHeuristic(from, to, "octile")).toBeCloseTo(4 + (Math.SQRT2 - 1) * 3, 10);
    });
  });
});
