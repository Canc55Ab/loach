import { describe, it, expect } from "vitest";
import { findPath3d, isStandable, isSolid, getGridSize3d } from "../src/algorithms/a-star-3d";

/** 创建空体素网格：grid[z][y][x]，0 为空 */
function makeGrid(width: number, height: number, depth: number): number[][][] {
  const grid: number[][][] = [];
  for (let z = 0; z < depth; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < height; y++) {
      layer.push(new Array<number>(width).fill(0));
    }
    grid.push(layer);
  }
  return grid;
}

/** 把体素设为实心 */
function setSolid(grid: number[][][], x: number, y: number, z: number): void {
  grid[z][y][x] = 1;
}

/** 铺设一层地板 */
function addFloor(
  grid: number[][][],
  y: number,
  fromX: number,
  toX: number,
  fromZ: number,
  toZ: number
): void {
  for (let z = fromZ; z <= toZ; z++) {
    for (let x = fromX; x <= toX; x++) {
      setSolid(grid, x, y, z);
    }
  }
}

describe("a-star-3d", () => {
  describe("辅助函数", () => {
    it("网格尺寸读取正确", () => {
      const grid = makeGrid(4, 5, 6);
      expect(getGridSize3d(grid)).toEqual({ width: 4, height: 5, depth: 6 });
    });

    it("实心判定", () => {
      const grid = makeGrid(3, 3, 3);
      setSolid(grid, 1, 1, 1);
      expect(isSolid(grid, 1, 1, 1)).toBe(true);
      expect(isSolid(grid, 0, 0, 0)).toBe(false);
    });

    it("可站立判定依赖下方实心", () => {
      const grid = makeGrid(3, 3, 3);
      setSolid(grid, 1, 0, 1);
      expect(isStandable(grid, 1, 1, 1)).toBe(true);
      // 自身为空但下方也为空 → 悬空，不可站立
      expect(isStandable(grid, 1, 2, 1)).toBe(false);
    });

    it("负高度的坐标不可站立", () => {
      const grid = makeGrid(3, 3, 3);
      setSolid(grid, 1, 0, 1);
      // y = -1 越界，下方也不存在实体 → 不可站立
      expect(isStandable(grid, 1, -1, 1)).toBe(false);
      expect(isStandable(grid, 1, -5, 1)).toBe(false);
    });
  });

  describe("平地寻路", () => {
    it("找到最短路径", () => {
      const grid = makeGrid(5, 3, 1);
      addFloor(grid, 0, 0, 4, 0, 0);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 4, y: 1, z: 0 });
      expect(path).not.toBeNull();
      expect(path?.length).toBe(5);
      expect(path?.[0]).toEqual({ x: 0, y: 1, z: 0 });
      expect(path?.[4]).toEqual({ x: 4, y: 1, z: 0 });
    });

    it("每一步都是相邻格", () => {
      const grid = makeGrid(4, 3, 4);
      addFloor(grid, 0, 0, 3, 0, 3);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 3, y: 1, z: 3 });
      expect(path).not.toBeNull();
      const list = path as Array<{ x: number; y: number; z: number }>;
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        const curr = list[i];
        const step =
          Math.abs(curr.x - prev.x) + Math.abs(curr.z - prev.z) + Math.abs(curr.y - prev.y);
        expect(step).toBeLessThanOrEqual(1);
      }
    });

    it("起点不可站立时返回 null", () => {
      const grid = makeGrid(3, 3, 1);
      expect(findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 2, y: 1, z: 0 })).toBeNull();
    });

    it("终点在实心体内返回 null", () => {
      const grid = makeGrid(3, 3, 1);
      addFloor(grid, 0, 0, 2, 0, 0);
      setSolid(grid, 2, 1, 0);
      expect(findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 2, y: 1, z: 0 })).toBeNull();
    });
  });

  describe("爬升", () => {
    it("一级台阶在 maxStep=1 时可通过", () => {
      const grid = makeGrid(4, 4, 1);
      addFloor(grid, 0, 0, 3, 0, 0);
      // x=2 处多一层，形成一级台阶
      setSolid(grid, 2, 1, 0);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }, {
        maxStep: 1,
      });
      expect(path).not.toBeNull();
      expect(path?.[path.length - 1]).toEqual({ x: 2, y: 2, z: 0 });
    });

    it("maxStep=0 时无法爬升", () => {
      const grid = makeGrid(4, 4, 1);
      addFloor(grid, 0, 0, 3, 0, 0);
      setSolid(grid, 2, 1, 0);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }, {
        maxStep: 0,
      });
      expect(path).toBeNull();
    });

    it("两级台阶在 maxStep=1 时不可达", () => {
      const grid = makeGrid(4, 5, 1);
      addFloor(grid, 0, 0, 3, 0, 0);
      setSolid(grid, 2, 1, 0);
      setSolid(grid, 2, 2, 0);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 2, y: 3, z: 0 }, {
        maxStep: 1,
      });
      expect(path).toBeNull();
    });
  });

  describe("跳跃", () => {
    it("maxJump 足够时可跳上高台", () => {
      const grid = makeGrid(5, 6, 1);
      addFloor(grid, 0, 0, 4, 0, 0);
      // x=2..4 处造一个高台（表面在 y=3）
      addFloor(grid, 1, 2, 4, 0, 0);
      addFloor(grid, 2, 2, 4, 0, 0);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 3, y: 3, z: 0 }, {
        maxStep: 1,
        maxJump: 2,
      });
      expect(path).not.toBeNull();
      expect(path?.[path.length - 1]).toEqual({ x: 3, y: 3, z: 0 });
    });

    it("maxJump 不足时不可达", () => {
      const grid = makeGrid(5, 6, 1);
      addFloor(grid, 0, 0, 4, 0, 0);
      addFloor(grid, 1, 2, 4, 0, 0);
      addFloor(grid, 2, 2, 4, 0, 0);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 3, y: 3, z: 0 }, {
        maxStep: 1,
        maxJump: 1,
      });
      expect(path).toBeNull();
    });
  });

  describe("坠落与阻挡", () => {
    it("可以走下台阶", () => {
      const grid = makeGrid(4, 4, 1);
      addFloor(grid, 0, 0, 1, 0, 0);
      addFloor(grid, 0, 2, 3, 0, 0);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 3, y: 1, z: 0 });
      expect(path).not.toBeNull();
      expect(path?.[path.length - 1]).toEqual({ x: 3, y: 1, z: 0 });
    });

    it("完全被墙隔开时返回 null", () => {
      const grid = makeGrid(5, 4, 1);
      addFloor(grid, 0, 0, 4, 0, 0);
      for (let y = 1; y < 4; y++) setSolid(grid, 2, y, 0);

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 4, y: 1, z: 0 });
      expect(path).toBeNull();
    });
  });

  describe("网格边界", () => {
    it("空网格返回 null", () => {
      expect(findPath3d([], { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBeNull();
      expect(findPath3d([[]], { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBeNull();
      expect(getGridSize3d([])).toEqual({ width: 0, height: 0, depth: 0 });
      expect(getGridSize3d([[]])).toEqual({ width: 0, height: 0, depth: 1 });
    });

    it("z / y 越界的体素视为实心", () => {
      const grid = makeGrid(3, 3, 2);
      expect(isSolid(grid, 0, 0, 5)).toBe(true);
      expect(isSolid(grid, 0, 0, -1)).toBe(true);
      expect(isSolid(grid, 0, 9, 0)).toBe(true);
      expect(isSolid(grid, 0, -1, 0)).toBe(true);
      expect(isSolid(grid, 0, 0, 0)).toBe(false);
    });

    it("x 越界时按空体素处理", () => {
      // 与 z / y 越界（视为实心）行为不一致，这里锁定当前实现
      const grid = makeGrid(3, 3, 2);
      expect(isSolid(grid, 99, 0, 0)).toBe(false);
      expect(isSolid(grid, -1, 0, 0)).toBe(false);
    });

    it("y 小于 0 的体素不可站立", () => {
      const grid = makeGrid(3, 3, 2);
      expect(isStandable(grid, 0, -1, 0)).toBe(false);
    });
  });

  describe("路径边界情况", () => {
    it("起点与终点相同时返回单点路径", () => {
      const grid = makeGrid(3, 3, 1);
      addFloor(grid, 0, 0, 2, 0, 0);

      const path = findPath3d(grid, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 0 });
      expect(path).not.toBeNull();
      expect(path?.length).toBe(1);
      expect(path?.[0]).toEqual({ x: 1, y: 1, z: 0 });
    });

    it("起点四周没有落脚点时返回 null", () => {
      const grid = makeGrid(3, 3, 1);
      setSolid(grid, 0, 0, 0); // 起点正下方
      setSolid(grid, 1, 0, 0); // 唯一相邻列的底部
      setSolid(grid, 1, 1, 0); // 相邻列同层
      setSolid(grid, 1, 2, 0); // 相邻列上层
      setSolid(grid, 2, 1, 0); // 目标正下方
      // 目标本身可站立，失败原因是四周被堵死而不是目标非法
      expect(isStandable(grid, 2, 2, 0)).toBe(true);
      expect(findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 2, y: 2, z: 0 })).toBeNull();
    });

    it("z 层之间被阻断时目标不可达", () => {
      const grid = makeGrid(3, 2, 2);
      // 两层都铺地板，中间的 x=1 整列封死
      addFloor(grid, 0, 0, 2, 0, 0);
      addFloor(grid, 0, 0, 2, 0, 1);
      setSolid(grid, 1, 1, 0);
      setSolid(grid, 1, 1, 1);

      expect(isStandable(grid, 2, 1, 1)).toBe(true);
      expect(findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 2, y: 1, z: 1 })).toBeNull();
    });
  });

  describe("跳跃与坠落的边界", () => {
    it("跳跃落点超出网格顶部时停止向上搜索", () => {
      const grid = makeGrid(4, 4, 1);
      addFloor(grid, 0, 0, 3, 0, 0);
      setSolid(grid, 0, 1, 0);
      setSolid(grid, 1, 1, 0);

      // 起点在 height-2 层，maxJump=2 时跳跃落点高度已越过网格顶部
      const path = findPath3d(grid, { x: 0, y: 2, z: 0 }, { x: 1, y: 2, z: 0 }, {
        maxStep: 1,
        maxJump: 2,
      });
      expect(path).not.toBeNull();
      expect(path?.length).toBe(2);
      expect(path?.[1]).toEqual({ x: 1, y: 2, z: 0 });
    });

    it("位于网格顶层时无法继续向上爬升", () => {
      const grid = makeGrid(4, 3, 1);
      addFloor(grid, 0, 0, 3, 0, 0);
      setSolid(grid, 0, 1, 0);
      setSolid(grid, 1, 1, 0);
      setSolid(grid, 1, 2, 0);
      setSolid(grid, 3, 1, 0);

      // 起点位于顶层 y=2，向上爬升会立刻越过网格边界
      expect(isStandable(grid, 3, 2, 0)).toBe(true);
      expect(findPath3d(grid, { x: 0, y: 2, z: 0 }, { x: 3, y: 2, z: 0 })).toBeNull();
    });

    it("坠落越过网格底部时立即停止", () => {
      // 底层体素正下方是越界，坠落一格即越界
      const grid = makeGrid(3, 2, 1);
      const path = findPath3d(grid, { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 });
      expect(path).not.toBeNull();
      expect(path?.length).toBe(3);
      for (const point of path as Array<{ x: number; y: number; z: number }>) {
        expect(point.y).toBe(0);
      }
    });

    it("跳跃代价高于平走时优先平走", () => {
      const grid = makeGrid(3, 5, 1);
      addFloor(grid, 0, 0, 2, 0, 0);
      setSolid(grid, 2, 2, 0); // (2,3,0) 可站立，构成跳跃落点

      const path = findPath3d(grid, { x: 0, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }, {
        maxStep: 1,
        maxJump: 2,
        jumpCost: 3,
      });
      expect(path).not.toBeNull();
      expect(path?.length).toBe(3);
      // 平走代价 1 小于跳跃代价 1+jumpCost，因此不会选择跳跃落点
      expect(path?.[2]).toEqual({ x: 2, y: 1, z: 0 });
    });

    it("坠落代价高于爬升时优先爬升", () => {
      const grid = makeGrid(3, 5, 1);
      setSolid(grid, 0, 1, 0);
      setSolid(grid, 1, 0, 0);
      setSolid(grid, 1, 2, 0);
      // x=1 列：y=0 实心、y=1 空（坠落落点）、y=2 实心、y=3 空（爬升落点）

      const path = findPath3d(grid, { x: 0, y: 2, z: 0 }, { x: 1, y: 3, z: 0 }, {
        maxStep: 1,
        climbCost: 0,
      });
      expect(path).not.toBeNull();
      expect(path?.length).toBe(2);
      // 爬升代价 1 小于坠落代价 1+dropCost，因此选择爬升落点
      expect(path?.[1]).toEqual({ x: 1, y: 3, z: 0 });
    });
  });

  describe("重复入队", () => {
    it("同一节点以更优代价再次入队时会跳过过期条目", () => {
      // 布局（y 自下而上）：
      //   y=3: 1 0 0 1
      //   y=2: 0 1 0 0
      //   y=1: 1 0 0 1
      //   y=0: 1 0 0 1
      // 该布局会让 (2,0,0) 先以较贵代价入队、随后以更优代价再次入队
      const grid = makeGrid(4, 4, 1);
      setSolid(grid, 0, 0, 0);
      setSolid(grid, 3, 0, 0);
      setSolid(grid, 0, 1, 0);
      setSolid(grid, 3, 1, 0);
      setSolid(grid, 1, 2, 0);
      setSolid(grid, 0, 3, 0);
      setSolid(grid, 3, 3, 0);

      const path = findPath3d(grid, { x: 1, y: 3, z: 0 }, { x: 3, y: 2, z: 0 }, {
        maxStep: 2,
        maxJump: 0,
        climbCost: 3,
        dropCost: 0,
      });
      expect(path).not.toBeNull();
      expect(path?.length).toBe(3);
      expect(path?.[0]).toEqual({ x: 1, y: 3, z: 0 });
      expect(path?.[2]).toEqual({ x: 3, y: 2, z: 0 });
    });
  });
});
