import { describe, it, expect } from "vitest";
import { Octree } from "../src/patterns/octree";
import type { IOctreeProps } from "../src/patterns/octree";

interface ITestItem {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

function item(id: string, x: number, y: number, z: number, size = 5): ITestItem {
  return { id, x, y, z, width: size, height: size, depth: size };
}

describe("Octree", () => {
  it("默认参数正确", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
    });
    expect(tree.width).toBe(100);
    expect(tree.depth).toBe(100);
    expect(tree.maxObjects).toBe(10);
    expect(tree.maxLevels).toBe(4);
    expect(tree.level).toBe(0);
    expect(tree.nodes).toEqual([]);
  });

  it("分割产生 8 个子节点", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    tree.subdivide();
    expect(tree.nodes.length).toBe(8);
    expect(tree.nodes[0].width).toBe(50);
    expect(tree.nodes[0].level).toBe(1);
  });

  it("插入后能按范围查询", () => {
    const octree = new Octree<ITestItem>({ width: 500, height: 500, depth: 500 });
    const target = item("a", 100, 100, 100);
    octree.insert(target);

    const result = octree.queryRange({
      minX: 90,
      minY: 90,
      minZ: 90,
      maxX: 150,
      maxY: 150,
      maxZ: 150,
    });
    expect(result).toContain(target);
  });

  it("跨节点物体只计一次", () => {
    const octree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });

    const normal = item("normal", 10, 10, 10);
    // 跨越 x=50 分界线
    const straddling = item("straddling", 40, 10, 10, 60);

    octree.insert(normal);
    octree.insert(straddling);

    expect(octree.getSize()).toBe(2);
    expect(octree.getAllObjects().length).toBe(2);
    expect(octree.getAllObjects()).toContain(straddling);
  });

  it("移除跨节点物体会移除全部副本", () => {
    const octree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });

    const straddling = item("straddling", 40, 10, 10, 60);
    octree.insert(item("normal", 10, 10, 10));
    octree.insert(straddling);

    expect(octree.remove(straddling)).toBe(true);
    expect(octree.getSize()).toBe(1);
    expect(octree.contains(straddling)).toBe(false);
  });

  it("完全落在树范围之外的物体会被保留且可被查询", () => {
    const octree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });

    const outside = item("outside", 500, 500, 500);
    octree.insert(item("normal", 10, 10, 10));
    octree.insert(outside);

    expect(octree.getSize()).toBe(2);
    expect(octree.getAllObjects()).toContain(outside);

    const result = octree.queryRange({
      minX: 495,
      minY: 495,
      minZ: 495,
      maxX: 515,
      maxY: 515,
      maxZ: 515,
    });
    expect(result).toContain(outside);
  });

  it("按点查询", () => {
    const octree = new Octree<ITestItem>({ width: 500, height: 500, depth: 500 });
    const target = item("a", 100, 100, 100, 20);
    octree.insert(target);

    expect(octree.queryPoint({ x: 110, y: 110, z: 110 })).toContain(target);
    expect(octree.queryPoint({ x: 300, y: 300, z: 300 })).toHaveLength(0);
  });

  it("深度不超过 maxLevels", () => {
    const octree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 2,
      maxLevels: 3,
    });
    for (let i = 0; i < 30; i++) {
      octree.insert(item(`i${i}`, i, i, i));
    }
    expect(octree.getDepth()).toBeLessThanOrEqual(3);
  });

  it("清空", () => {
    const octree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    octree.insert(item("a", 10, 10, 10));
    octree.clear();
    expect(octree.getSize()).toBe(0);
    expect(octree.nodes).toEqual([]);
  });

  it("包围盒属性", () => {
    const octree = new Octree<ITestItem>({
      x: 10,
      y: 20,
      z: 30,
      width: 100,
      height: 200,
      depth: 300,
    });
    expect(octree.bounds.minX).toBe(10);
    expect(octree.bounds.maxY).toBe(220);
    expect(octree.bounds.maxZ).toBe(330);
    expect(octree.isPointInBounds({ x: 15, y: 25, z: 35 })).toBe(true);
    expect(octree.isPointInBounds({ x: 5, y: 25, z: 35 })).toBe(false);
  });
});

describe("Octree 边界与分支覆盖", () => {
  it("读取包围盒原点与高度", () => {
    const tree = new Octree<ITestItem>({
      x: 1,
      y: 2,
      z: 3,
      width: 10,
      height: 20,
      depth: 30,
    });
    expect(tree.x).toBe(1);
    expect(tree.y).toBe(2);
    expect(tree.z).toBe(3);
    expect(tree.height).toBe(20);
    expect(tree.bounds.maxZ).toBe(33);
  });

  it("设置 maxObjects 与 maxLevels 立即生效", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    tree.maxObjects = 3;
    tree.maxLevels = 2;
    expect(tree.maxObjects).toBe(3);
    expect(tree.maxLevels).toBe(2);
  });

  it("未提供 width/height/depth 时退化为 0", () => {
    const props = {
      width: undefined,
      height: undefined,
      depth: undefined,
    } as unknown as IOctreeProps;
    const tree = new Octree<ITestItem>(props);
    expect(tree.width).toBe(0);
    expect(tree.height).toBe(0);
    expect(tree.depth).toBe(0);
  });

  it("重复分割不会改变子节点", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    tree.subdivide();
    const positions = tree.nodes.map((node) => `${node.x}:${node.y}:${node.z}`);
    tree.subdivide();
    expect(tree.nodes.length).toBe(8);
    expect(tree.nodes.map((node) => `${node.x}:${node.y}:${node.z}`)).toEqual(positions);
  });

  it("contains 能定位当前节点与子节点中的对象", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    const inRoot = item("in-root", 10, 10, 10);
    tree.insert(inRoot);
    expect(tree.contains(inRoot)).toBe(true);

    // 触发分割后对象下沉到子节点
    tree.insert(item("far", 60, 60, 60));
    expect(tree.nodes.length).toBe(8);
    expect(tree.contains(inRoot)).toBe(true);
    expect(tree.contains(item("missing", 20, 20, 20))).toBe(false);
  });

  it("跨多个子节点的对象在子节点各存一份但只计一次", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    tree.insert(item("a", 10, 10, 10));
    // 包围盒跨越三个方向的 50 分界线
    const big = item("big", 40, 40, 40, 30);
    tree.insert(big);

    let copies = 0;
    const countCopies = (node: Octree<ITestItem>): void => {
      for (const obj of node.objects) if (obj === big) copies++;
      for (const child of node.nodes) countCopies(child);
    };
    countCopies(tree);

    expect(copies).toBe(8);
    expect(tree.getSize()).toBe(2);
    expect(tree.getAllObjects().length).toBe(2);
  });

  it("对象完全在子节点之外时保留在当前节点", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    tree.insert(item("a", 10, 10, 10));
    tree.insert(item("b", 60, 60, 60)); // 触发分割
    const outside = item("outside", 500, 500, 500);
    tree.insert(outside);

    expect(tree.objects).toEqual([outside]);
    expect(tree.getSize()).toBe(3);
    const found = tree.queryRange({
      minX: 495,
      minY: 495,
      minZ: 495,
      maxX: 515,
      maxY: 515,
      maxZ: 515,
    });
    expect(found).toEqual([outside]);
  });

  it("空树移除对象返回 false", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    expect(tree.remove(item("a", 10, 10, 10))).toBe(false);
  });

  it("批量插入等价于逐个插入", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    const items = [item("a", 10, 10, 10), item("b", 20, 20, 20)];
    tree.inserts(items);
    expect(tree.getSize()).toBe(2);
    expect(tree.getAllObjects()).toEqual(items);
  });

  it("重复插入同一对象只计一个唯一对象", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    const a = item("a", 10, 10, 10);
    tree.insert(a);
    tree.insert(a);
    expect(tree.getSize()).toBe(1);
    expect(tree.getAllObjects()).toEqual([a]);
  });

  it("达到 maxLevels 后不再分割", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 0,
    });
    tree.insert(item("a", 10, 10, 10));
    tree.insert(item("b", 20, 20, 20));
    expect(tree.nodes.length).toBe(0);
    expect(tree.objects.length).toBe(2);
    expect(tree.getDepth()).toBe(0);
  });

  it("query 返回对象所在子块中的对象", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    const a = item("a", 10, 10, 10);
    const b = item("b", 60, 60, 60);
    tree.insert(a);
    tree.insert(b); // 触发分割
    expect(tree.query(a)).toEqual([a]);
  });

  it("query 在未分割的树上返回当前节点的对象", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    const a = item("a", 10, 10, 10);
    tree.insert(a);
    expect(tree.query(a)).toEqual([a]);
  });

  it("queryRange 跳过不相交的子节点并递归收集结果", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    const a = item("a", 10, 10, 10);
    const b = item("b", 60, 60, 60);
    tree.insert(a);
    tree.insert(b); // 触发分割
    const result = tree.queryRange({
      minX: 5,
      minY: 5,
      minZ: 5,
      maxX: 45,
      maxY: 45,
      maxZ: 45,
    });
    expect(result).toEqual([a]);
    expect(result).not.toContain(b);

    // 范围与子节点相交但与子节点内的对象不相交
    const miss = tree.queryRange({
      minX: 52,
      minY: 52,
      minZ: 52,
      maxX: 55,
      maxY: 55,
      maxZ: 55,
    });
    expect(miss).toHaveLength(0);
  });

  it("范围在各个方向都与子节点不相交时跳过该子节点", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    tree.insert(item("a", 10, 10, 10));
    tree.insert(item("b", 60, 60, 60)); // 触发分割

    const belowX = { minX: -10, minY: 0, minZ: 0, maxX: -1, maxY: 100, maxZ: 100 };
    const aboveX = { minX: 200, minY: 0, minZ: 0, maxX: 300, maxY: 100, maxZ: 100 };
    const belowY = { minX: 0, minY: -10, minZ: 0, maxX: 100, maxY: -1, maxZ: 100 };
    const aboveY = { minX: 0, minY: 200, minZ: 0, maxX: 100, maxY: 300, maxZ: 100 };
    const belowZ = { minX: 0, minY: 0, minZ: -10, maxX: 100, maxY: 100, maxZ: -1 };
    const aboveZ = { minX: 0, minY: 0, minZ: 200, maxX: 100, maxY: 100, maxZ: 300 };

    expect(tree.queryRange(belowX)).toHaveLength(0);
    expect(tree.queryRange(aboveX)).toHaveLength(0);
    expect(tree.queryRange(belowY)).toHaveLength(0);
    expect(tree.queryRange(aboveY)).toHaveLength(0);
    expect(tree.queryRange(belowZ)).toHaveLength(0);
    expect(tree.queryRange(aboveZ)).toHaveLength(0);
  });

  it("queryPoint 在分割后的树上递归子节点", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    const a = item("a", 10, 10, 10);
    tree.insert(a);
    tree.insert(item("b", 60, 60, 60)); // 触发分割
    expect(tree.queryPoint({ x: 12, y: 12, z: 12 })).toEqual([a]);
    // 根节点范围之外的点不会进入任何子节点
    expect(tree.queryPoint({ x: 500, y: 500, z: 500 })).toHaveLength(0);
  });

  it("queryPoint 对根节点与子节点中的同一对象只返回一次", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    const a = item("a", 10, 10, 10, 20);
    tree.insert(a);
    tree.subdivide(); // 手动分割，已有对象仍留在根节点
    expect(tree.objects).toEqual([a]);
    tree.insert(a); // 再次插入 → 同一对象同时存在于根节点与子节点
    const result = tree.queryPoint({ x: 15, y: 15, z: 15 });
    expect(result).toEqual([a]);
  });

  it("叶子节点计算子块索引返回空数组", () => {
    const tree = new Octree<ITestItem>({ width: 100, height: 100, depth: 100 });
    // 私有方法在公开 API 中不可达，此处直接验证叶子节点的守卫分支
    const leaf = tree as unknown as { getOctants(item: ITestItem): number[] };
    expect(leaf.getOctants(item("a", 10, 10, 10))).toEqual([]);
  });

  it("清空分割后的树会递归清空子节点", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    tree.insert(item("a", 10, 10, 10));
    tree.insert(item("b", 60, 60, 60)); // 触发分割
    expect(tree.nodes.length).toBe(8);

    tree.clear();
    expect(tree.nodes).toEqual([]);
    expect(tree.objects).toEqual([]);
    expect(tree.getSize()).toBe(0);
  });
});

describe("Octree 重复插入与移除", () => {
  it("同一引用重复插入后移除会彻底消失", () => {
    // 回归：remove 过去只移除节点内第一份副本，重复插入会残留对象
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 2,
      maxLevels: 3,
    });
    const target = item("a", 10, 10, 10);

    tree.insert(target);
    tree.insert(target);
    expect(tree.getSize()).toBe(1);

    expect(tree.remove(target)).toBe(true);
    expect(tree.getSize()).toBe(0);
    expect(tree.contains(target)).toBe(false);
    expect(tree.queryPoint({ x: 10, y: 10, z: 10 })).toHaveLength(0);
  });

  it("跨子节点的对象移除后彻底消失", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 1,
      maxLevels: 3,
    });
    // 大对象横跨多个子块，会在多个节点各存一份
    const big: ITestItem = { id: "big", x: 10, y: 10, z: 10, width: 80, height: 80, depth: 80 };
    tree.insert(item("a", 10, 10, 10));
    tree.insert(big); // 触发分割
    expect(tree.getSize()).toBe(2);

    expect(tree.remove(big)).toBe(true);
    expect(tree.contains(big)).toBe(false);
    expect(tree.getSize()).toBe(1);
  });

  it("重复插入不会在节点内产生重复副本", () => {
    const tree = new Octree<ITestItem>({
      width: 100,
      height: 100,
      depth: 100,
      maxObjects: 10,
      maxLevels: 3,
    });
    const target = item("a", 10, 10, 10);
    tree.insert(target);
    tree.insert(target);
    tree.insert(target);
    expect(tree.objects.filter((obj) => obj === target)).toHaveLength(1);
  });
});
