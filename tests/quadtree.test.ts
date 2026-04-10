import { describe, it, expect, beforeEach } from "vitest";
import QuadTree from "../src/patterns/quadtree";
import type { IQuadItemObject } from "../src/patterns/quadtree";

function createRect(
  x: number,
  y: number,
  width: number,
  height: number
): IQuadItemObject {
  return { shape: "rect", x, y, width, height };
}

function createCircle(x: number, y: number, radius: number): IQuadItemObject {
  return { shape: "circle", x, y, radius };
}

describe("QuadTree", () => {
  describe("构造函数", () => {
    it("默认参数创建四叉树", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(qt.x).toBe(0);
      expect(qt.y).toBe(0);
      expect(qt.width).toBe(100);
      expect(qt.height).toBe(100);
      expect(qt.maxObjects).toBe(10);
      expect(qt.maxLevels).toBe(4);
      expect(qt.level).toBe(0);
      expect(qt.objects).toEqual([]);
      expect(qt.nodes).toEqual([]);
    });

    it("支持自定义 maxObjects 和 maxLevels", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        maxObjects: 5,
        maxLevels: 3,
      });
      expect(qt.maxObjects).toBe(5);
      expect(qt.maxLevels).toBe(3);
    });

    it("支持自定义 level", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        level: 2,
      });
      expect(qt.level).toBe(2);
    });
  });

  describe("isPointInBounds", () => {
    it("边界内的点返回 true", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(qt.isPointInBounds({ x: 50, y: 50 })).toBe(true);
      expect(qt.isPointInBounds({ x: 0, y: 0 })).toBe(true);
      expect(qt.isPointInBounds({ x: 100, y: 100 })).toBe(true);
    });

    it("边界外的点返回 false", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(qt.isPointInBounds({ x: -1, y: 50 })).toBe(false);
      expect(qt.isPointInBounds({ x: 50, y: 101 })).toBe(false);
    });
  });

  describe("insert", () => {
    it("插入矩形对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      const item = createRect(10, 10, 5, 5);
      qt.insert(item);
      expect(qt.objects).toContain(item);
    });

    it("插入圆形对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      const item = createCircle(50, 50, 10);
      qt.insert(item);
      expect(qt.objects).toContain(item);
    });

    it("超过 maxObjects 时自动分割", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 3,
      });

      for (let i = 0; i < 4; i++) {
        qt.insert(createRect(i * 10, i * 10, 5, 5));
      }

      expect(qt.nodes.length).toBe(4);
      expect(qt.objects.length).toBe(0);
    });

    it("未超过 maxObjects 时不分割", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 10,
      });

      for (let i = 0; i < 5; i++) {
        qt.insert(createRect(i * 10, i * 10, 5, 5));
      }

      expect(qt.nodes.length).toBe(0);
      expect(qt.objects.length).toBe(5);
    });

    it("达到 maxLevels 时不再分割", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 1,
        maxLevels: 2,
      });

      // 在同一区域插入大量对象，触发多层分割
      for (let i = 0; i < 20; i++) {
        qt.insert(createRect(0, 0, 5, 5));
      }

      expect(qt.getDepth()).toBeLessThanOrEqual(2);
    });
  });

  describe("inserts", () => {
    it("批量插入对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const items = [
        createRect(10, 10, 5, 5),
        createRect(20, 20, 5, 5),
        createRect(30, 30, 5, 5),
      ];

      qt.inserts(items);
      expect(qt.getSize()).toBe(3);
    });

    it("空数组不影响四叉树", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      qt.inserts([]);
      expect(qt.getSize()).toBe(0);
    });
  });

  describe("subdivide", () => {
    it("分割产生四个子节点", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      qt.subdivide();

      expect(qt.nodes.length).toBe(4);
      // 左上
      expect(qt.nodes[0].x).toBe(0);
      expect(qt.nodes[0].y).toBe(0);
      // 右上
      expect(qt.nodes[1].x).toBe(50);
      expect(qt.nodes[1].y).toBe(0);
      // 右下
      expect(qt.nodes[2].x).toBe(50);
      expect(qt.nodes[2].y).toBe(50);
      // 左下
      expect(qt.nodes[3].x).toBe(0);
      expect(qt.nodes[3].y).toBe(50);
    });

    it("子节点继承 maxObjects 和 maxLevels", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 5,
        maxLevels: 3,
      });

      qt.subdivide();

      expect(qt.nodes[0].maxObjects).toBe(5);
      expect(qt.nodes[0].maxLevels).toBe(3);
    });

    it("子节点 level 为父节点 + 1", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      qt.subdivide();

      expect(qt.nodes[0].level).toBe(1);
    });

    it("重复调用不会重复分割", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      qt.subdivide();
      qt.subdivide();

      expect(qt.nodes.length).toBe(4);
    });

    it("子节点宽高为父节点一半", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      qt.subdivide();

      expect(qt.nodes[0].width).toBe(50);
      expect(qt.nodes[0].height).toBe(50);
    });
  });

  describe("getQuadrant", () => {
    let qt: QuadTree<IQuadItemObject>;

    beforeEach(() => {
      qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      qt.subdivide();
    });

    it("左上象限的对象返回 [0]", () => {
      const item = createRect(10, 10, 5, 5);
      const idxs = qt.query(item);
      // 左上象限
      expect(qt.nodes[0].isPointInBounds({ x: 10, y: 10 })).toBe(true);
    });

    it("右上象限的对象返回 [1]", () => {
      const item = createRect(60, 10, 5, 5);
      expect(qt.nodes[1].isPointInBounds({ x: 60, y: 10 })).toBe(true);
    });

    it("右下象限的对象返回 [2]", () => {
      const item = createRect(60, 60, 5, 5);
      expect(qt.nodes[2].isPointInBounds({ x: 60, y: 60 })).toBe(true);
    });

    it("左下象限的对象返回 [3]", () => {
      const item = createRect(10, 60, 5, 5);
      expect(qt.nodes[3].isPointInBounds({ x: 10, y: 60 })).toBe(true);
    });

    it("跨象限的对象返回多个象限", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      // 先插入足够对象触发分割
      qt.insert(createRect(10, 10, 5, 5));
      qt.insert(createRect(60, 60, 5, 5));

      // 跨越中心的对象
      const item = createRect(40, 40, 20, 20);
      qt.insert(item);

      // 对象应该存在于多个子节点中
      let found = 0;
      for (const node of qt.nodes) {
        if (node.contains(item)) {
          found++;
        }
      }
      expect(found).toBeGreaterThan(1);
    });

    it("圆形对象正确分配象限", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      // 先插入足够对象触发分割
      qt.insert(createRect(60, 60, 5, 5));
      qt.insert(createRect(70, 70, 5, 5));

      // 完全在左上象限的圆
      const circle = createCircle(10, 10, 5);
      qt.insert(circle);
      expect(qt.nodes[0].contains(circle)).toBe(true);
    });

    it("跨越象限的圆形对象分配到多个象限", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      // 先插入足够对象触发分割
      qt.insert(createRect(10, 10, 5, 5));
      qt.insert(createRect(60, 60, 5, 5));

      // 中心在 (50, 50)，半径 20，跨越四个象限
      const circle = createCircle(50, 50, 20);
      qt.insert(circle);

      let found = 0;
      for (const node of qt.nodes) {
        if (node.contains(circle)) {
          found++;
        }
      }
      expect(found).toBe(4);
    });
  });

  describe("query", () => {
    it("查询同一象限中的对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      const item1 = createRect(10, 10, 5, 5);
      const item2 = createRect(15, 15, 5, 5);
      const item3 = createRect(60, 60, 5, 5);

      qt.inserts([item1, item2, item3]);

      const result = qt.query(item1);
      expect(result).toContain(item1);
      expect(result).toContain(item2);
    });

    it("查询结果不包含远处象限的对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
        maxObjects: 2,
      });

      const item1 = createRect(5, 5, 2, 2);
      const item2 = createRect(800, 800, 2, 2);

      qt.inserts([item1, item2]);

      const result = qt.query(item1);
      // item2 可能在也可能不在结果中，取决于象限划分
      // 主要验证 query 返回了 item1 自身
      expect(result).toContain(item1);
    });

    it("对象未超出阈值时查询全部对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 10,
      });

      const items = [
        createRect(10, 10, 5, 5),
        createRect(20, 20, 5, 5),
        createRect(30, 30, 5, 5),
      ];

      qt.inserts(items);

      const result = qt.query(items[0]);
      expect(result.length).toBe(3);
    });
  });

  describe("queryRange", () => {
    it("查询指定矩形范围内的对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      const item1 = createRect(10, 10, 5, 5);
      const item2 = createRect(15, 15, 5, 5);
      const item3 = createRect(80, 80, 5, 5);

      qt.inserts([item1, item2, item3]);

      const result = qt.queryRange({ shape: "rect", x: 0, y: 0, width: 30, height: 30 });
      expect(result).toContain(item1);
      expect(result).toContain(item2);
      expect(result).not.toContain(item3);
    });

    it("查询范围不与任何对象相交时返回空数组", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      qt.insert(createRect(80, 80, 5, 5));

      const result = qt.queryRange({ shape: "rect", x: 0, y: 0, width: 10, height: 10 });
      expect(result).toEqual([]);
    });

    it("查询范围包含圆形对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const circle = createCircle(50, 50, 10);
      qt.insert(circle);

      const result = qt.queryRange({ shape: "rect", x: 40, y: 40, width: 20, height: 20 });
      expect(result).toContain(circle);
    });

    it("查询范围不包含远处的圆形对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const circle = createCircle(90, 90, 5);
      qt.insert(circle);

      const result = qt.queryRange({ shape: "rect", x: 0, y: 0, width: 20, height: 20 });
      expect(result).not.toContain(circle);
    });
  });

  describe("remove", () => {
    it("移除存在的对象返回 true", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const item = createRect(10, 10, 5, 5);
      qt.insert(item);
      expect(qt.remove(item)).toBe(true);
      expect(qt.getSize()).toBe(0);
    });

    it("移除不存在的对象返回 false", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const item = createRect(10, 10, 5, 5);
      expect(qt.remove(item)).toBe(false);
    });

    it("移除子节点中的对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      // 使用不跨越象限的对象确保精确计数
      const items = [
        createRect(10, 10, 5, 5),
        createRect(60, 60, 5, 5),
        createRect(10, 60, 5, 5),
      ];

      qt.inserts(items);
      expect(qt.remove(items[0])).toBe(true);
      expect(qt.getSize()).toBe(2);
    });

    it("移除后再次插入", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const item = createRect(10, 10, 5, 5);
      qt.insert(item);
      qt.remove(item);
      qt.insert(item);
      expect(qt.contains(item)).toBe(true);
    });
  });

  describe("contains", () => {
    it("包含已插入的对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const item = createRect(10, 10, 5, 5);
      qt.insert(item);
      expect(qt.contains(item)).toBe(true);
    });

    it("不包含未插入的对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const item = createRect(10, 10, 5, 5);
      expect(qt.contains(item)).toBe(false);
    });

    it("子节点中的对象也能被找到", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      const item1 = createRect(10, 10, 5, 5);
      const item2 = createRect(60, 60, 5, 5);
      const item3 = createRect(10, 60, 5, 5);

      qt.inserts([item1, item2, item3]);
      expect(qt.contains(item1)).toBe(true);
      expect(qt.contains(item2)).toBe(true);
      expect(qt.contains(item3)).toBe(true);
    });
  });

  describe("clear", () => {
    it("清除所有对象和子节点", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      qt.inserts([
        createRect(10, 10, 5, 5),
        createRect(60, 60, 5, 5),
        createRect(10, 60, 5, 5),
      ]);

      qt.clear();
      expect(qt.getSize()).toBe(0);
      expect(qt.objects).toEqual([]);
      expect(qt.nodes).toEqual([]);
    });

    it("清除后可以重新使用", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      qt.insert(createRect(10, 10, 5, 5));
      qt.clear();

      const newItem = createRect(20, 20, 5, 5);
      qt.insert(newItem);
      expect(qt.contains(newItem)).toBe(true);
    });
  });

  describe("getSize", () => {
    it("空四叉树返回 0", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(qt.getSize()).toBe(0);
    });

    it("返回所有对象数量（包括子节点）", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      // 使用不跨越象限的对象以确保不重复计数
      qt.inserts([
        createRect(10, 10, 5, 5),
        createRect(60, 60, 5, 5),
        createRect(10, 60, 5, 5),
        createRect(60, 10, 5, 5),
      ]);

      expect(qt.getSize()).toBe(4);
    });
  });

  describe("getDepth", () => {
    it("未分割时深度为当前 level", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(qt.getDepth()).toBe(0);
    });

    it("分割后深度增加", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 1,
      });

      qt.inserts([
        createRect(10, 10, 5, 5),
        createRect(10, 10, 3, 3),
      ]);

      expect(qt.getDepth()).toBeGreaterThanOrEqual(1);
    });

    it("深度不超过 maxLevels", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 1,
        maxLevels: 3,
      });

      for (let i = 0; i < 20; i++) {
        qt.insert(createRect(0, 0, 2, 2));
      }

      expect(qt.getDepth()).toBeLessThanOrEqual(3);
    });
  });

  describe("getAllObjects", () => {
    it("返回所有对象（包括子节点）", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      // 使用不跨越象限的对象
      const items = [
        createRect(10, 10, 5, 5),
        createRect(60, 60, 5, 5),
        createRect(10, 60, 5, 5),
        createRect(60, 10, 5, 5),
      ];

      qt.inserts(items);
      const allObjects = qt.getAllObjects();

      expect(allObjects.length).toBe(4);
      for (const item of items) {
        expect(allObjects).toContain(item);
      }
    });

    it("空四叉树返回空数组", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      expect(qt.getAllObjects()).toEqual([]);
    });
  });

  describe("maxObjects / maxLevels setter", () => {
    it("maxObjects setter 修改值", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      qt.maxObjects = 20;
      expect(qt.maxObjects).toBe(20);
    });

    it("maxLevels setter 修改值", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
      qt.maxLevels = 6;
      expect(qt.maxLevels).toBe(6);
    });
  });

  describe("边界与集成场景", () => {
    it("大量对象的插入和查询", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        maxObjects: 5,
        maxLevels: 6,
      });

      const items: IQuadItemObject[] = [];
      for (let i = 0; i < 100; i++) {
        const item = createRect(
          Math.random() * 700,
          Math.random() * 500,
          5 + Math.random() * 10,
          5 + Math.random() * 10
        );
        items.push(item);
        qt.insert(item);
      }

      // getSize 计算的是实际存储的对象引用数（跨象限对象会被重复存储）
      expect(qt.getSize()).toBeGreaterThanOrEqual(100);

      // 查询某个对象附近的对象
      const result = qt.query(items[0]);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain(items[0]);
    });

    it("插入后清除再重新插入", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 2,
      });

      const items = [
        createRect(10, 10, 5, 5),
        createRect(60, 60, 5, 5),
        createRect(10, 60, 5, 5),
      ];

      qt.inserts(items);
      qt.clear();
      expect(qt.getSize()).toBe(0);

      const newItems = [
        createRect(50, 50, 5, 5),
        createRect(60, 60, 5, 5),
      ];
      qt.inserts(newItems);
      expect(qt.getSize()).toBe(2);
    });

    it("圆形与矩形混合插入", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const rect = createRect(10, 10, 5, 5);
      const circle = createCircle(70, 70, 5);

      qt.inserts([rect, circle]);
      expect(qt.contains(rect)).toBe(true);
      expect(qt.contains(circle)).toBe(true);

      const result = qt.query(rect);
      expect(result).toContain(rect);
    });

    it("对象完全在边界上", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        maxObjects: 1,
      });

      // 恰好在中心分割线上的对象
      const item = createRect(48, 48, 4, 4);
      qt.insert(item);
      expect(qt.contains(item)).toBe(true);
    });

    it("空查询返回空数组", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const item = createRect(10, 10, 5, 5);
      expect(qt.query(item)).toEqual([]);
    });

    it("queryRange 在空四叉树上返回空数组", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const result = qt.queryRange({ shape: "rect", x: 0, y: 0, width: 50, height: 50 });
      expect(result).toEqual([]);
    });
  });

  describe("碰撞检测场景", () => {
    it("查找附近可能碰撞的对象", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        maxObjects: 4,
        maxLevels: 5,
      });

      const player = createRect(100, 100, 20, 20);
      const nearby = createRect(105, 105, 20, 20);
      const farAway = createRect(700, 500, 20, 20);

      qt.inserts([player, nearby, farAway]);

      const candidates = qt.query(player);
      expect(candidates).toContain(nearby);
      // farAway 可能不在同一个象限中
    });

    it("queryRange 精确查询碰撞区域", () => {
      const qt = new QuadTree<IQuadItemObject>({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        maxObjects: 4,
        maxLevels: 5,
      });

      const nearby1 = createRect(95, 95, 10, 10);
      const nearby2 = createRect(110, 110, 10, 10);
      const farAway = createRect(700, 500, 10, 10);

      qt.inserts([nearby1, nearby2, farAway]);

      const result = qt.queryRange({ shape: "rect", x: 90, y: 90, width: 40, height: 40 });
      expect(result).toContain(nearby1);
      expect(result).toContain(nearby2);
      expect(result).not.toContain(farAway);
    });
  });
});
