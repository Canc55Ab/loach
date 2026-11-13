import { describe, it, expect } from "vitest";
import { SpatialGrid } from "../src/patterns/spatial-grid";

interface ITestItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function item(id: string, x: number, y: number, width = 10, height = 10): ITestItem {
  return { id, x, y, width, height };
}

describe("SpatialGrid", () => {
  it("默认格子边长为 64", () => {
    const grid = new SpatialGrid<ITestItem>({ width: 1000, height: 1000 });
    expect(grid.cellSize).toBe(64);
    expect(grid.width).toBe(1000);
    expect(grid.height).toBe(1000);
    expect(grid.size).toBe(0);
  });

  it("插入后能按范围查询到对象", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
    const target = item("a", 100, 100);
    grid.insert(target);

    const result = grid.queryRect(90, 90, 50, 50);
    expect(result).toContain(target);
    expect(grid.size).toBe(1);
  });

  it("查询范围外的对象不会被返回", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
    grid.insert(item("a", 10, 10));

    const result = grid.queryRect(200, 200, 50, 50);
    expect(result).toHaveLength(0);
  });

  it("跨格对象在查询中只出现一次", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 10, width: 500, height: 500 });
    const big = item("big", 5, 5, 100, 100);
    grid.insert(big);

    const result = grid.queryRect(0, 0, 200, 200);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(big);
    expect(grid.size).toBe(1);
  });

  it("按点查询", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
    const target = item("a", 100, 100, 20, 20);
    grid.insert(target);

    expect(grid.queryPoint(110, 110)).toContain(target);
    expect(grid.queryPoint(300, 300)).toHaveLength(0);
  });

  it("移除后不再被查询到", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
    const target = item("a", 100, 100);
    grid.insert(target);

    expect(grid.remove(target)).toBe(true);
    expect(grid.remove(target)).toBe(false);
    expect(grid.queryRect(90, 90, 50, 50)).toHaveLength(0);
    expect(grid.size).toBe(0);
  });

  it("批量插入", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
    grid.inserts([item("a", 10, 10), item("b", 50, 50), item("c", 90, 90)]);
    expect(grid.size).toBe(3);
    expect(grid.queryRect(0, 0, 200, 200)).toHaveLength(3);
  });

  it("清空后为空", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
    grid.inserts([item("a", 10, 10), item("b", 50, 50)]);
    grid.clear();
    expect(grid.size).toBe(0);
    expect(grid.cellCount).toBe(0);
    expect(grid.queryRect(0, 0, 200, 200)).toHaveLength(0);
  });

  it("坐标转格子索引", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 10, width: 500, height: 500, x: 100, y: 50 });
    expect(grid.toCellX(100)).toBe(0);
    expect(grid.toCellX(110)).toBe(1);
    expect(grid.toCellY(50)).toBe(0);
    expect(grid.toCellY(60)).toBe(1);
  });

  it("重复插入同一对象只计一次", () => {
    const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
    const target = item("a", 100, 100);
    grid.insert(target);
    grid.insert(target);
    expect(grid.size).toBe(1);
  });

  describe("配置读写", () => {
    it("格子边长可写，且非正数被忽略", () => {
      const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
      grid.cellSize = 16;
      expect(grid.cellSize).toBe(16);
      // 非正数应被忽略，不覆盖已有值
      grid.cellSize = 0;
      expect(grid.cellSize).toBe(16);
      grid.cellSize = -8;
      expect(grid.cellSize).toBe(16);
    });

    it("网格原点可读", () => {
      const grid = new SpatialGrid<ITestItem>({ width: 500, height: 500, x: -100, y: 50 });
      expect(grid.x).toBe(-100);
      expect(grid.y).toBe(50);
      expect(grid.width).toBe(500);
      expect(grid.height).toBe(500);
    });

    it("默认原点为 0", () => {
      const grid = new SpatialGrid<ITestItem>({ width: 500, height: 500 });
      expect(grid.x).toBe(0);
      expect(grid.y).toBe(0);
    });
  });

  describe("移除对象", () => {
    it("移除跨格对象后所有格子的引用都被清空", () => {
      const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
      // 宽 70 的对象会横跨 3 个格子
      const wide = item("wide", 20, 20, 70, 10);
      grid.insert(wide);
      expect(grid.cellCount).toBeGreaterThan(1);

      expect(grid.remove(wide)).toBe(true);
      expect(grid.size).toBe(0);
      // 所有被占用的格子都应被回收
      expect(grid.cellCount).toBe(0);
      expect(grid.queryRect(0, 0, 200, 200)).toHaveLength(0);
    });

    it("移除不存在的对象返回 false", () => {
      const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
      expect(grid.remove(item("ghost", 10, 10))).toBe(false);
    });

    it("移除后再查询不会命中", () => {
      const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
      const target = item("a", 100, 100);
      grid.insert(target);
      expect(grid.queryRect(90, 90, 50, 50)).toContain(target);
      grid.remove(target);
      expect(grid.queryRect(90, 90, 50, 50)).toHaveLength(0);
    });

    it("变更 cellSize 后对象仍可被查询到", () => {
      // 回归：过去 setter 只改数值不重建索引，对象会变成查不到的孤儿
      const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
      const target = item("a", 100, 100);
      grid.insert(target);
      expect(grid.queryRect(90, 90, 50, 50)).toContain(target);

      grid.cellSize = 64;

      expect(grid.queryRect(90, 90, 50, 50)).toContain(target);
      expect(grid.size).toBe(1);
    });

    it("变更 cellSize 后对象仍可被移除干净", () => {
      const grid = new SpatialGrid<ITestItem>({ cellSize: 32, width: 500, height: 500 });
      const target = item("a", 100, 100);
      grid.insert(target);

      grid.cellSize = 64;

      expect(grid.remove(target)).toBe(true);
      expect(grid.size).toBe(0);
      expect(grid.cellCount).toBe(0);
    });
  });
});
