import { describe, it, expect } from "vitest";
import { computeFlowField } from "../src/algorithms/flow-field";

function makeGrid(width: number, height: number, value: number = 1): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < height; y++) {
    grid.push(new Array<number>(width).fill(value));
  }
  return grid;
}

describe("flow-field", () => {
  it("目标点距离为 0", () => {
    const grid = makeGrid(5, 5);
    const field = computeFlowField(grid, [{ x: 2, y: 2 }]);
    expect(field.getDistance(2, 2)).toBe(0);
  });

  it("距离随位置单调变化", () => {
    const grid = makeGrid(5, 5);
    const field = computeFlowField(grid, [{ x: 4, y: 4 }]);
    expect(field.getDistance(4, 4)).toBe(0);
    expect(field.getDistance(3, 4)).toBeLessThan(field.getDistance(0, 0));
  });

  it("斜向通行时距离为欧氏代价", () => {
    const grid = makeGrid(5, 5);
    const field = computeFlowField(grid, [{ x: 4, y: 4 }]);
    expect(field.getDistance(0, 0)).toBeCloseTo(4 * Math.SQRT2, 6);
  });

  it("关闭斜向后距离为曼哈顿距离", () => {
    const grid = makeGrid(5, 5);
    const field = computeFlowField(grid, [{ x: 4, y: 4 }], { allowDiagonal: false });
    expect(field.getDistance(0, 0)).toBe(8);
  });

  it("getDirection 指向目标", () => {
    const grid = makeGrid(5, 5);
    const field = computeFlowField(grid, [{ x: 4, y: 4 }]);
    const direction = field.getDirection(0, 0);

    expect(direction).not.toBeNull();
    expect(direction?.x).toBeGreaterThan(0);
    expect(direction?.y).toBeGreaterThan(0);
    expect(Math.sqrt((direction?.x || 0) ** 2 + (direction?.y || 0) ** 2)).toBeCloseTo(1, 10);
  });

  it("目标位置没有下一格", () => {
    const grid = makeGrid(5, 5);
    const field = computeFlowField(grid, [{ x: 2, y: 2 }]);
    expect(field.getNextCell(2, 2)).toBeNull();
    expect(field.getDirection(2, 2)).toBeNull();
  });

  it("不可达格返回 null", () => {
    const grid = makeGrid(5, 5);
    // 用墙把 (0,0) 与目标隔开
    for (let y = 0; y < 5; y++) grid[y][2] = 0;

    const field = computeFlowField(grid, [{ x: 4, y: 4 }]);
    expect(field.getDistance(0, 0)).toBe(Infinity);
    expect(field.getDirection(0, 0)).toBeNull();
    expect(field.getNextCell(0, 0)).toBeNull();
  });

  it("多目标时取最近的一个", () => {
    const grid = makeGrid(9, 3);
    const field = computeFlowField(grid, [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
    ]);
    expect(field.getDistance(0, 0)).toBe(0);
    expect(field.getDistance(8, 0)).toBe(0);
    expect(field.getDistance(4, 0)).toBe(4);
  });

  it("distance 数组维度与网格一致", () => {
    const grid = makeGrid(6, 4);
    const field = computeFlowField(grid, [{ x: 0, y: 0 }]);
    expect(field.width).toBe(6);
    expect(field.height).toBe(4);
    expect(field.distance.length).toBe(4);
    expect(field.distance[0].length).toBe(6);
  });

  it("目标为障碍时被忽略", () => {
    const grid = makeGrid(5, 5);
    grid[2][2] = 0;
    const field = computeFlowField(grid, [{ x: 2, y: 2 }]);
    expect(field.getDistance(2, 2)).toBe(Infinity);
  });

  describe("目标点边界处理", () => {
    it("纵坐标越界的目标被忽略", () => {
      const grid = makeGrid(5, 5);
      const field = computeFlowField(grid, [{ x: 2, y: 99 }]);
      expect(field.getDistance(2, 2)).toBe(Infinity);
      expect(field.getDistance(0, 0)).toBe(Infinity);
    });

    it("负纵坐标的目标被忽略", () => {
      const grid = makeGrid(5, 5);
      const field = computeFlowField(grid, [{ x: 2, y: -1 }]);
      expect(field.getDistance(0, 0)).toBe(Infinity);
    });

    it("横坐标越界的目标被忽略", () => {
      const grid = makeGrid(5, 5);
      const field = computeFlowField(grid, [{ x: 99, y: 2 }]);
      expect(field.getDistance(0, 0)).toBe(Infinity);
    });

    it("重复给出同一个目标不改变结果", () => {
      const grid = makeGrid(5, 5);
      const field = computeFlowField(grid, [
        { x: 2, y: 2 },
        { x: 2, y: 2 },
      ]);
      expect(field.getDistance(2, 2)).toBe(0);
      expect(field.getDistance(0, 0)).toBeCloseTo(2 * Math.SQRT2, 6);
    });

    it("空网格返回空流场", () => {
      const field = computeFlowField([], []);
      expect(field.width).toBe(0);
      expect(field.height).toBe(0);
      expect(field.getDistance(0, 0)).toBe(Infinity);
    });
  });

  describe("查询边界处理", () => {
    it("查询越界坐标返回 Infinity", () => {
      const grid = makeGrid(5, 5);
      const field = computeFlowField(grid, [{ x: 2, y: 2 }]);
      // 纵坐标越界：整行不存在
      expect(field.getDistance(0, 99)).toBe(Infinity);
      // 横坐标越界：行存在但该列不存在
      expect(field.getDistance(99, 0)).toBe(Infinity);
    });

    it("障碍格与越界格没有下一格", () => {
      const grid = makeGrid(3, 3);
      grid[1][1] = 0;
      const field = computeFlowField(grid, [{ x: 0, y: 0 }]);
      expect(field.getNextCell(1, 1)).toBeNull();
      expect(field.getNextCell(-1, 0)).toBeNull();
      expect(field.getNextCell(0, 99)).toBeNull();
    });

    it("长度不足的行也按越界处理", () => {
      const grid = [[1, 1, 1], [1, 1]];
      const field = computeFlowField(grid, [{ x: 0, y: 0 }]);
      expect(field.getNextCell(2, 1)).toBeNull();
    });

    it("目标格自身没有下一格", () => {
      const grid = makeGrid(3, 3);
      const field = computeFlowField(grid, [{ x: 1, y: 1 }]);
      expect(field.getNextCell(1, 1)).toBeNull();
      expect(field.getDirection(1, 1)).toBeNull();
    });
  });

  describe("对角通行开关", () => {
    it("关闭对角通行后距离为曼哈顿距离", () => {
      const grid = makeGrid(3, 3);
      const field = computeFlowField(grid, [{ x: 2, y: 2 }], { allowDiagonal: false });
      expect(field.getDistance(0, 0)).toBeCloseTo(4, 6);
    });

    it("开启对角通行后距离更短", () => {
      const grid = makeGrid(3, 3);
      const withDiagonal = computeFlowField(grid, [{ x: 2, y: 2 }]);
      const withoutDiagonal = computeFlowField(grid, [{ x: 2, y: 2 }], { allowDiagonal: false });
      expect(withDiagonal.getDistance(0, 0)).toBeLessThan(withoutDiagonal.getDistance(0, 0));
    });
  });
});
