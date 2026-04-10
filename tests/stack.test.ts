import { describe, it, expect, beforeEach } from "vitest";
import Stack from "../src/patterns/stack";

describe("Stack", () => {
  describe("构造函数", () => {
    it("默认创建空栈，maxCount 为 1000", () => {
      const s = new Stack<number>();
      expect(s.size()).toBe(0);
      expect(s.isEmpty()).toBe(true);
      expect(s.maxCount).toBe(1000);
    });

    it("支持自定义 maxCount", () => {
      const s = new Stack<number>({ maxCount: 5 });
      expect(s.maxCount).toBe(5);
    });

    it("支持传入初始 items", () => {
      const s = new Stack<number>({ items: [1, 2, 3] });
      expect(s.size()).toBe(3);
      expect(s.peek()).toBe(3);
    });

    it("传入初始 items 时超过 maxCount 应抛出异常", () => {
      expect(() => new Stack<number>({ maxCount: 2, items: [1, 2, 3] })).toThrow();
    });
  });

  describe("push / pop", () => {
    let s: Stack<number>;

    beforeEach(() => {
      s = new Stack<number>({ maxCount: 3 });
    });

    it("入栈后 size 增加", () => {
      s.push(1);
      expect(s.size()).toBe(1);
      s.push(2);
      expect(s.size()).toBe(2);
    });

    it("出栈符合 LIFO 顺序", () => {
      s.push(1);
      s.push(2);
      s.push(3);
      expect(s.pop()).toBe(3);
      expect(s.pop()).toBe(2);
      expect(s.pop()).toBe(1);
    });

    it("空栈出栈返回 undefined", () => {
      expect(s.pop()).toBeUndefined();
    });

    it("栈满时入栈抛出异常", () => {
      s.push(1);
      s.push(2);
      s.push(3);
      expect(() => s.push(4)).toThrow();
    });

    it("出栈后可以继续入栈", () => {
      s.push(1);
      s.push(2);
      s.push(3);
      s.pop();
      s.push(4);
      expect(s.size()).toBe(3);
      expect(s.peek()).toBe(4);
    });
  });

  describe("pushs / pops", () => {
    it("批量入栈", () => {
      const s = new Stack<number>({ maxCount: 10 });
      s.pushs([1, 2, 3]);
      expect(s.size()).toBe(3);
      expect(s.toArray()).toEqual([1, 2, 3]);
    });

    it("批量入栈超过容量应抛出异常（部分入栈后满）", () => {
      const s = new Stack<number>({ maxCount: 2 });
      expect(() => s.pushs([1, 2, 3])).toThrow();
      expect(s.size()).toBe(2);
    });

    it("批量出栈指定数量（LIFO 顺序）", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3, 4, 5]);
      const items = s.pops(3);
      expect(items).toEqual([5, 4, 3]);
      expect(s.size()).toBe(2);
    });

    it("批量出栈数量超过栈长度时返回全部", () => {
      const s = new Stack<number>();
      s.pushs([1, 2]);
      const items = s.pops(10);
      expect(items).toEqual([2, 1]);
      expect(s.isEmpty()).toBe(true);
    });

    it("空栈批量出栈返回空数组", () => {
      const s = new Stack<number>();
      expect(s.pops(5)).toEqual([]);
    });
  });

  describe("peek", () => {
    it("返回栈顶元素", () => {
      const s = new Stack<number>();
      s.push(10);
      s.push(20);
      expect(s.peek()).toBe(20);
    });

    it("空栈 peek 返回 undefined", () => {
      const s = new Stack<number>();
      expect(s.peek()).toBeUndefined();
    });

    it("peek 不影响栈", () => {
      const s = new Stack<number>();
      s.push(1);
      s.push(2);
      s.peek();
      expect(s.size()).toBe(2);
    });
  });

  describe("isEmpty / isFull", () => {
    it("空栈 isEmpty 为 true", () => {
      const s = new Stack<number>();
      expect(s.isEmpty()).toBe(true);
      expect(s.isFull()).toBe(false);
    });

    it("栈满时 isFull 为 true", () => {
      const s = new Stack<number>({ maxCount: 2 });
      s.push(1);
      s.push(2);
      expect(s.isFull()).toBe(true);
      expect(s.isEmpty()).toBe(false);
    });

    it("部分填充时两个都为 false", () => {
      const s = new Stack<number>({ maxCount: 5 });
      s.push(1);
      expect(s.isEmpty()).toBe(false);
      expect(s.isFull()).toBe(false);
    });
  });

  describe("clear", () => {
    it("清空栈", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      s.clear();
      expect(s.size()).toBe(0);
      expect(s.isEmpty()).toBe(true);
      expect(s.peek()).toBeUndefined();
    });
  });

  describe("maxCount getter/setter", () => {
    it("getter 返回当前最大容量", () => {
      const s = new Stack<number>({ maxCount: 50 });
      expect(s.maxCount).toBe(50);
    });

    it("setter 修改最大容量", () => {
      const s = new Stack<number>({ maxCount: 5 });
      s.maxCount = 10;
      expect(s.maxCount).toBe(10);
    });

    it("缩小 maxCount 后已满的栈变为未满", () => {
      const s = new Stack<number>({ maxCount: 5 });
      s.pushs([1, 2, 3]);
      s.maxCount = 2;
      expect(s.isFull()).toBe(true);
      s.pop();
      expect(s.isFull()).toBe(true);
      s.pop();
      expect(s.isFull()).toBe(false);
    });
  });

  describe("includes / indexOf", () => {
    let s: Stack<string>;

    beforeEach(() => {
      s = new Stack<string>();
      s.pushs(["a", "b", "c"]);
    });

    it("includes 返回是否包含元素", () => {
      expect(s.includes("a")).toBe(true);
      expect(s.includes("b")).toBe(true);
      expect(s.includes("z")).toBe(false);
    });

    it("indexOf 返回元素索引（栈底为0）", () => {
      expect(s.indexOf("a")).toBe(0);
      expect(s.indexOf("b")).toBe(1);
      expect(s.indexOf("c")).toBe(2);
      expect(s.indexOf("z")).toBe(-1);
    });
  });

  describe("remove", () => {
    it("移除存在的元素返回 true", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      expect(s.remove(2)).toBe(true);
      expect(s.toArray()).toEqual([1, 3]);
    });

    it("移除不存在的元素返回 false", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      expect(s.remove(99)).toBe(false);
      expect(s.size()).toBe(3);
    });

    it("仅移除第一个匹配项", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 2, 3]);
      s.remove(2);
      expect(s.toArray()).toEqual([1, 2, 3]);
    });

    it("移除栈底元素", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      s.remove(1);
      expect(s.toArray()).toEqual([2, 3]);
    });

    it("移除栈顶元素", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      s.remove(3);
      expect(s.peek()).toBe(2);
    });
  });

  describe("toArray / toString", () => {
    it("toArray 返回栈的浅拷贝数组（栈底在前，栈顶在后）", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      const arr = s.toArray();
      expect(arr).toEqual([1, 2, 3]);
      arr.push(4);
      expect(s.size()).toBe(3);
    });

    it("toString 返回字符串表示", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      expect(s.toString()).toBe("1,2,3");
    });

    it("空栈 toString 返回空字符串", () => {
      const s = new Stack<number>();
      expect(s.toString()).toBe("");
    });
  });

  describe("forEach", () => {
    it("遍历所有元素并传入正确的参数", () => {
      const s = new Stack<string>();
      s.pushs(["a", "b", "c"]);
      const result: { item: string; index: number }[] = [];
      s.forEach((item, index) => result.push({ item, index }));
      expect(result).toEqual([
        { item: "a", index: 0 },
        { item: "b", index: 1 },
        { item: "c", index: 2 },
      ]);
    });

    it("遍历不修改栈", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      s.forEach(() => {});
      expect(s.size()).toBe(3);
    });
  });

  describe("Symbol.iterator", () => {
    it("支持 for...of 遍历", () => {
      const s = new Stack<number>();
      s.pushs([10, 20, 30]);
      const result: number[] = [];
      for (const item of s) {
        result.push(item);
      }
      expect(result).toEqual([10, 20, 30]);
    });

    it("支持展开运算符", () => {
      const s = new Stack<number>();
      s.pushs([1, 2, 3]);
      expect([...s]).toEqual([1, 2, 3]);
    });
  });

  describe("泛型", () => {
    it("支持字符串类型", () => {
      const s = new Stack<string>();
      s.push("hello");
      s.push("world");
      expect(s.pop()).toBe("world");
      expect(s.peek()).toBe("hello");
    });

    it("支持对象类型", () => {
      const s = new Stack<{ id: number; name: string }>();
      s.push({ id: 1, name: "a" });
      s.push({ id: 2, name: "b" });
      expect(s.peek()!.name).toBe("b");
      expect(s.peek()!.id).toBe(2);
    });
  });

  describe("边界与集成场景", () => {
    it("入栈出栈交替操作", () => {
      const s = new Stack<number>();
      s.push(1);
      expect(s.pop()).toBe(1);
      s.push(2);
      s.push(3);
      expect(s.pop()).toBe(3);
      s.push(4);
      expect(s.toArray()).toEqual([2, 4]);
    });

    it("maxCount = 1 的极端容量", () => {
      const s = new Stack<number>({ maxCount: 1 });
      s.push(1);
      expect(s.isFull()).toBe(true);
      expect(() => s.push(2)).toThrow();
      expect(s.pop()).toBe(1);
      expect(s.isEmpty()).toBe(true);
      s.push(2);
      expect(s.peek()).toBe(2);
    });

    it("clear 后可以重新使用", () => {
      const s = new Stack<number>({ maxCount: 2 });
      s.pushs([1, 2]);
      s.clear();
      expect(s.isEmpty()).toBe(true);
      s.push(3);
      expect(s.size()).toBe(1);
      expect(s.peek()).toBe(3);
    });
  });
});
