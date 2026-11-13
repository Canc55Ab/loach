import { describe, it, expect } from "vitest";
import { SpatialGrid3D } from "../src/patterns/spatial-grid3d";

interface ITestItem {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

function item(id: string, x: number, y: number, z: number, size = 10): ITestItem {
  return { id, x, y, z, width: size, height: size, depth: size };
}

describe("SpatialGrid3D", () => {
  it("默认格子边长为 64", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      width: 1000,
      height: 1000,
      depth: 1000,
    });
    expect(grid.cellSize).toBe(64);
    expect(grid.width).toBe(1000);
    expect(grid.depth).toBe(1000);
    expect(grid.size).toBe(0);
  });

  it("插入后能按范围查询", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const target = item("a", 100, 100, 100);
    grid.insert(target);

    expect(grid.queryBox(90, 90, 90, 50, 50, 50)).toContain(target);
  });

  it("范围外的对象不会被返回", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    grid.insert(item("a", 10, 10, 10));

    expect(grid.queryBox(200, 200, 200, 50, 50, 50)).toHaveLength(0);
  });

  it("跨格对象在查询中只出现一次", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 10,
      width: 500,
      height: 500,
      depth: 500,
    });
    const big = item("big", 5, 5, 5, 100);
    grid.insert(big);

    const result = grid.queryBox(0, 0, 0, 200, 200, 200);
    expect(result).toHaveLength(1);
    expect(grid.size).toBe(1);
  });

  it("按点查询", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const target = item("a", 100, 100, 100, 20);
    grid.insert(target);

    expect(grid.queryPoint(110, 110, 110)).toContain(target);
    expect(grid.queryPoint(300, 300, 300)).toHaveLength(0);
  });

  it("移除后不再被查询到", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const target = item("a", 100, 100, 100);
    grid.insert(target);

    expect(grid.remove(target)).toBe(true);
    expect(grid.remove(target)).toBe(false);
    expect(grid.queryBox(90, 90, 90, 50, 50, 50)).toHaveLength(0);
    expect(grid.size).toBe(0);
  });

  it("坐标转格子索引", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 10,
      width: 500,
      height: 500,
      depth: 500,
      x: 100,
      y: 50,
      z: 25,
    });
    expect(grid.toCellX(100)).toBe(0);
    expect(grid.toCellX(110)).toBe(1);
    expect(grid.toCellY(50)).toBe(0);
    expect(grid.toCellZ(25)).toBe(0);
    expect(grid.toCellZ(35)).toBe(1);
  });

  it("清空", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    grid.insert(item("a", 10, 10, 10));
    grid.clear();
    expect(grid.size).toBe(0);
    expect(grid.cellCount).toBe(0);
  });
});

describe("SpatialGrid3D 边界与分支覆盖", () => {
  it("读取网格高度", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 400,
      depth: 300,
    });
    expect(grid.height).toBe(400);
  });

  it("设置 cellSize 生效，非正数被忽略", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    grid.cellSize = 16;
    expect(grid.cellSize).toBe(16);
    grid.cellSize = 0;
    expect(grid.cellSize).toBe(16);
    grid.cellSize = -8;
    expect(grid.cellSize).toBe(16);
  });

  it("批量插入 inserts 逐个登记对象", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const items = [item("a", 10, 10, 10), item("b", 100, 100, 100)];
    grid.inserts(items);
    expect(grid.size).toBe(2);
    expect(grid.queryPoint(15, 15, 15)).toEqual([items[0]]);
    expect(grid.queryPoint(105, 105, 105)).toEqual([items[1]]);
  });

  it("重复插入同一对象只登记一次", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const target = item("a", 10, 10, 10);
    grid.insert(target);
    grid.insert(target);
    expect(grid.size).toBe(1);
    expect(grid.cellCount).toBe(1);
  });

  it("跨格对象在每个格子各存一份但查询结果去重", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 10,
      width: 500,
      height: 500,
      depth: 500,
    });
    // 覆盖 5..25，跨越 3×3×3 个格子
    const big = item("big", 5, 5, 5, 20);
    grid.insert(big);
    expect(grid.cellCount).toBe(27);
    expect(grid.size).toBe(1);
    const result = grid.queryRange({
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: 200,
      maxY: 200,
      maxZ: 200,
    });
    expect(result).toEqual([big]);
  });

  it("同一格子内的其他对象仍在时格子不会被删除", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const a = item("a", 10, 10, 10);
    const b = item("b", 20, 20, 20);
    grid.insert(a);
    grid.insert(b);
    expect(grid.cellCount).toBe(1);
    expect(grid.remove(a)).toBe(true);
    expect(grid.cellCount).toBe(1);
    expect(grid.size).toBe(1);
    expect(grid.queryPoint(25, 25, 25)).toEqual([b]);
  });

  it("queryRange 排除与范围不相交的对象", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const a = item("a", 10, 10, 10);
    const b = item("b", 20, 20, 20);
    grid.insert(a);
    grid.insert(b);
    expect(grid.cellCount).toBe(1);
    // 查询范围只覆盖 a
    const result = grid.queryBox(10, 10, 10, 5, 5, 5);
    expect(result).toEqual([a]);
  });

  it("queryPoint 只返回包含该点的对象", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const a = item("a", 10, 10, 10);
    const b = item("b", 20, 20, 20);
    grid.insert(a);
    grid.insert(b);
    expect(grid.queryPoint(15, 15, 15)).toEqual([a]);
  });

  it("queryBox 与 queryRange 结果一致", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 500,
      height: 500,
      depth: 500,
    });
    const target = item("a", 100, 100, 100);
    grid.insert(target);
    expect(grid.queryBox(10, 20, 30, 40, 50, 60)).toEqual(
      grid.queryRange({
        minX: 10,
        minY: 20,
        minZ: 30,
        maxX: 50,
        maxY: 70,
        maxZ: 90,
      })
    );
  });

  it("负坐标向下取整到负格子", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 10,
      width: 500,
      height: 500,
      depth: 500,
    });
    expect(grid.toCellX(-1)).toBe(-1);
    expect(grid.toCellX(-10)).toBe(-1);
    expect(grid.toCellX(-11)).toBe(-2);
    expect(grid.toCellY(-1)).toBe(-1);
    expect(grid.toCellZ(-1)).toBe(-1);
  });

  it("网格边界外的对象仍可被索引与查询", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 32,
      width: 100,
      height: 100,
      depth: 100,
    });
    const far = item("far", 500, 500, 500);
    grid.insert(far);
    expect(grid.size).toBe(1);
    expect(grid.queryPoint(505, 505, 505)).toEqual([far]);
    expect(grid.queryBox(500, 500, 500, 10, 10, 10)).toEqual([far]);
  });

  it("格子边长变更后移除对象仍能清理干净", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 10,
      width: 500,
      height: 500,
      depth: 500,
    });
    const target = item("a", 25, 5, 5);
    grid.insert(target);
    expect(grid.cellCount).toBe(8);
    grid.cellSize = 100; // 变更格子边长后索引按新边长重建
    expect(grid.remove(target)).toBe(true);
    expect(grid.size).toBe(0);
    expect(grid.cellCount).toBe(0);
  });
});

describe("SpatialGrid3D 变更格子边长", () => {
  it("变更 cellSize 后对象仍可被查询到", () => {
    // 回归：过去 setter 只改数值不重建索引，对象会变成查不到的孤儿
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 10,
      width: 500,
      height: 500,
      depth: 500,
    });
    const target = item("a", 25, 5, 5);
    grid.insert(target);
    expect(grid.queryPoint(25, 5, 5)).toContain(target);

    grid.cellSize = 100;

    expect(grid.queryPoint(25, 5, 5)).toContain(target);
    expect(grid.queryBox(20, 0, 0, 40, 20, 20)).toContain(target);
    expect(grid.size).toBe(1);
  });

  it("变更 cellSize 后旧桶不再残留引用", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 10,
      width: 500,
      height: 500,
      depth: 500,
    });
    const target = item("a", 25, 5, 5);
    grid.insert(target);
    const before = grid.cellCount;

    grid.cellSize = 100;

    // 边长变大后占用的格子数应当不增
    expect(grid.cellCount).toBeLessThanOrEqual(before);
    // 且对象仍然可以被移除干净
    expect(grid.remove(target)).toBe(true);
    expect(grid.size).toBe(0);
    expect(grid.cellCount).toBe(0);
  });

  it("非正数的 cellSize 被忽略", () => {
    const grid = new SpatialGrid3D<ITestItem>({
      cellSize: 10,
      width: 500,
      height: 500,
      depth: 500,
    });
    grid.cellSize = 0;
    expect(grid.cellSize).toBe(10);
    grid.cellSize = -5;
    expect(grid.cellSize).toBe(10);
  });
});
