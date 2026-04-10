import { describe, it, expect, beforeEach } from "vitest";
import Queue from "../src/patterns/queue";

describe("Queue", () => {
  describe("构造函数", () => {
    it("默认创建空队列，maxCount 为 1000", () => {
      const q = new Queue<number>();
      expect(q.size()).toBe(0);
      expect(q.isEmpty()).toBe(true);
      expect(q.maxCount).toBe(1000);
    });

    it("支持自定义 maxCount", () => {
      const q = new Queue<number>({ maxCount: 5 });
      expect(q.maxCount).toBe(5);
    });

    it("支持传入初始 items", () => {
      const q = new Queue<number>({ items: [1, 2, 3] });
      expect(q.size()).toBe(3);
      expect(q.front()).toBe(1);
      expect(q.back()).toBe(3);
    });

    it("传入初始 items 时超过 maxCount 应抛出异常", () => {
      expect(() => new Queue<number>({ maxCount: 2, items: [1, 2, 3] })).toThrow();
    });
  });

  describe("enQueue / deQueue", () => {
    let q: Queue<number>;

    beforeEach(() => {
      q = new Queue<number>({ maxCount: 3 });
    });

    it("入队后 size 增加", () => {
      q.enQueue(1);
      expect(q.size()).toBe(1);
      q.enQueue(2);
      expect(q.size()).toBe(2);
    });

    it("出队符合 FIFO 顺序", () => {
      q.enQueue(1);
      q.enQueue(2);
      q.enQueue(3);
      expect(q.deQueue()).toBe(1);
      expect(q.deQueue()).toBe(2);
      expect(q.deQueue()).toBe(3);
    });

    it("空队列出队返回 undefined", () => {
      expect(q.deQueue()).toBeUndefined();
    });

    it("队列满时入队抛出异常", () => {
      q.enQueue(1);
      q.enQueue(2);
      q.enQueue(3);
      expect(() => q.enQueue(4)).toThrow();
    });

    it("出队后可以继续入队", () => {
      q.enQueue(1);
      q.enQueue(2);
      q.enQueue(3);
      q.deQueue();
      q.enQueue(4);
      expect(q.size()).toBe(3);
      expect(q.front()).toBe(2);
      expect(q.back()).toBe(4);
    });
  });

  describe("enQueues / deQueues", () => {
    it("批量入队", () => {
      const q = new Queue<number>({ maxCount: 10 });
      q.enQueues([1, 2, 3]);
      expect(q.size()).toBe(3);
      expect(q.toArray()).toEqual([1, 2, 3]);
    });

    it("批量入队超过容量应抛出异常（部分入队后满）", () => {
      const q = new Queue<number>({ maxCount: 2 });
      expect(() => q.enQueues([1, 2, 3])).toThrow();
      expect(q.size()).toBe(2);
    });

    it("批量出队指定数量", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3, 4, 5]);
      const items = q.deQueues(3);
      expect(items).toEqual([1, 2, 3]);
      expect(q.size()).toBe(2);
    });

    it("批量出队数量超过队列长度时返回全部", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2]);
      const items = q.deQueues(10);
      expect(items).toEqual([1, 2]);
      expect(q.isEmpty()).toBe(true);
    });

    it("空队列批量出队返回空数组", () => {
      const q = new Queue<number>();
      expect(q.deQueues(5)).toEqual([]);
    });
  });

  describe("front / back", () => {
    it("front 返回队首元素", () => {
      const q = new Queue<number>();
      q.enQueue(10);
      q.enQueue(20);
      expect(q.front()).toBe(10);
    });

    it("back 返回队尾元素", () => {
      const q = new Queue<number>();
      q.enQueue(10);
      q.enQueue(20);
      expect(q.back()).toBe(20);
    });

    it("空队列 front/back 返回 undefined", () => {
      const q = new Queue<number>();
      expect(q.front()).toBeUndefined();
      expect(q.back()).toBeUndefined();
    });

    it("front/back 不影响队列", () => {
      const q = new Queue<number>();
      q.enQueue(1);
      q.enQueue(2);
      q.front();
      q.back();
      expect(q.size()).toBe(2);
    });
  });

  describe("isEmpty / isFull", () => {
    it("空队列 isEmpty 为 true", () => {
      const q = new Queue<number>();
      expect(q.isEmpty()).toBe(true);
      expect(q.isFull()).toBe(false);
    });

    it("队列满时 isFull 为 true", () => {
      const q = new Queue<number>({ maxCount: 2 });
      q.enQueue(1);
      q.enQueue(2);
      expect(q.isFull()).toBe(true);
      expect(q.isEmpty()).toBe(false);
    });

    it("部分填充时两个都为 false", () => {
      const q = new Queue<number>({ maxCount: 5 });
      q.enQueue(1);
      expect(q.isEmpty()).toBe(false);
      expect(q.isFull()).toBe(false);
    });
  });

  describe("clear", () => {
    it("清空队列", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      q.clear();
      expect(q.size()).toBe(0);
      expect(q.isEmpty()).toBe(true);
      expect(q.front()).toBeUndefined();
    });
  });

  describe("maxCount getter/setter", () => {
    it("getter 返回当前最大容量", () => {
      const q = new Queue<number>({ maxCount: 50 });
      expect(q.maxCount).toBe(50);
    });

    it("setter 修改最大容量", () => {
      const q = new Queue<number>({ maxCount: 5 });
      q.maxCount = 10;
      expect(q.maxCount).toBe(10);
    });

    it("缩小 maxCount 后已满的队列变为未满", () => {
      const q = new Queue<number>({ maxCount: 5 });
      q.enQueues([1, 2, 3]);
      q.maxCount = 2;
      expect(q.isFull()).toBe(true);
      q.deQueue();
      expect(q.isFull()).toBe(true);
      q.deQueue();
      expect(q.isFull()).toBe(false);
    });
  });

  describe("includes / indexOf", () => {
    let q: Queue<string>;

    beforeEach(() => {
      q = new Queue<string>();
      q.enQueues(["a", "b", "c"]);
    });

    it("includes 返回是否包含元素", () => {
      expect(q.includes("a")).toBe(true);
      expect(q.includes("b")).toBe(true);
      expect(q.includes("z")).toBe(false);
    });

    it("indexOf 返回元素索引", () => {
      expect(q.indexOf("a")).toBe(0);
      expect(q.indexOf("b")).toBe(1);
      expect(q.indexOf("c")).toBe(2);
      expect(q.indexOf("z")).toBe(-1);
    });
  });

  describe("remove", () => {
    it("移除存在的元素返回 true", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      expect(q.remove(2)).toBe(true);
      expect(q.toArray()).toEqual([1, 3]);
    });

    it("移除不存在的元素返回 false", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      expect(q.remove(99)).toBe(false);
      expect(q.size()).toBe(3);
    });

    it("仅移除第一个匹配项", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 2, 3]);
      q.remove(2);
      expect(q.toArray()).toEqual([1, 2, 3]);
    });

    it("移除队首元素", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      q.remove(1);
      expect(q.front()).toBe(2);
    });

    it("移除队尾元素", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      q.remove(3);
      expect(q.back()).toBe(2);
    });
  });

  describe("toArray / toString", () => {
    it("toArray 返回队列的浅拷贝数组", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      const arr = q.toArray();
      expect(arr).toEqual([1, 2, 3]);
      arr.push(4);
      expect(q.size()).toBe(3);
    });

    it("toString 返回字符串表示", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      expect(q.toString()).toBe("1,2,3");
    });

    it("空队列 toString 返回空字符串", () => {
      const q = new Queue<number>();
      expect(q.toString()).toBe("");
    });
  });

  describe("forEach", () => {
    it("遍历所有元素并传入正确的参数", () => {
      const q = new Queue<string>();
      q.enQueues(["a", "b", "c"]);
      const result: { item: string; index: number }[] = [];
      q.forEach((item, index) => result.push({ item, index }));
      expect(result).toEqual([
        { item: "a", index: 0 },
        { item: "b", index: 1 },
        { item: "c", index: 2 },
      ]);
    });

    it("遍历不修改队列", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      q.forEach(() => {});
      expect(q.size()).toBe(3);
    });
  });

  describe("Symbol.iterator", () => {
    it("支持 for...of 遍历", () => {
      const q = new Queue<number>();
      q.enQueues([10, 20, 30]);
      const result: number[] = [];
      for (const item of q) {
        result.push(item);
      }
      expect(result).toEqual([10, 20, 30]);
    });

    it("支持展开运算符", () => {
      const q = new Queue<number>();
      q.enQueues([1, 2, 3]);
      expect([...q]).toEqual([1, 2, 3]);
    });
  });

  describe("泛型", () => {
    it("支持字符串类型", () => {
      const q = new Queue<string>();
      q.enQueue("hello");
      q.enQueue("world");
      expect(q.deQueue()).toBe("hello");
      expect(q.front()).toBe("world");
    });

    it("支持对象类型", () => {
      const q = new Queue<{ id: number; name: string }>();
      q.enQueue({ id: 1, name: "a" });
      q.enQueue({ id: 2, name: "b" });
      expect(q.front()!.name).toBe("a");
      expect(q.back()!.id).toBe(2);
    });
  });

  describe("边界与集成场景", () => {
    it("入队出队交替操作", () => {
      const q = new Queue<number>();
      q.enQueue(1);
      expect(q.deQueue()).toBe(1);
      q.enQueue(2);
      q.enQueue(3);
      expect(q.deQueue()).toBe(2);
      q.enQueue(4);
      expect(q.toArray()).toEqual([3, 4]);
    });

    it("maxCount = 1 的极端容量", () => {
      const q = new Queue<number>({ maxCount: 1 });
      q.enQueue(1);
      expect(q.isFull()).toBe(true);
      expect(() => q.enQueue(2)).toThrow();
      expect(q.deQueue()).toBe(1);
      expect(q.isEmpty()).toBe(true);
      q.enQueue(2);
      expect(q.front()).toBe(2);
    });

    it("clear 后可以重新使用", () => {
      const q = new Queue<number>({ maxCount: 2 });
      q.enQueues([1, 2]);
      q.clear();
      expect(q.isEmpty()).toBe(true);
      q.enQueue(3);
      expect(q.size()).toBe(1);
      expect(q.front()).toBe(3);
    });
  });
});
