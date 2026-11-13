import { describe, it, expect } from "vitest";
import { PriorityQueue, MaxPriorityQueue } from "../src/patterns/priority-queue";

describe("PriorityQueue", () => {
  it("空队列出队返回 undefined", () => {
    const queue = new PriorityQueue<number>();
    expect(queue.isEmpty()).toBe(true);
    expect(queue.size).toBe(0);
    expect(queue.pop()).toBeUndefined();
    expect(queue.peek()).toBeUndefined();
  });

  it("按优先级从小到大出队", () => {
    const queue = new PriorityQueue<string>();
    queue.push("c", 3);
    queue.push("a", 1);
    queue.push("b", 2);

    expect(queue.size).toBe(3);
    expect(queue.pop()).toBe("a");
    expect(queue.pop()).toBe("b");
    expect(queue.pop()).toBe("c");
    expect(queue.isEmpty()).toBe(true);
  });

  it("同优先级按入队顺序 FIFO", () => {
    const queue = new PriorityQueue<string>();
    queue.push("first", 1);
    queue.push("second", 1);
    queue.push("third", 1);

    expect(queue.pop()).toBe("first");
    expect(queue.pop()).toBe("second");
    expect(queue.pop()).toBe("third");
  });

  it("peek 不出队", () => {
    const queue = new PriorityQueue<number>();
    queue.push(1, 5);
    queue.push(2, 1);
    expect(queue.peek()).toBe(2);
    expect(queue.size).toBe(2);
  });

  it("peekEntry 返回完整条目", () => {
    const queue = new PriorityQueue<string>();
    queue.push("a", 7);
    const entry = queue.peekEntry();
    expect(entry?.value).toBe("a");
    expect(entry?.priority).toBe(7);
  });

  it("批量入队", () => {
    const queue = new PriorityQueue<number>();
    queue.pushes([
      { value: 1, priority: 2 },
      { value: 2, priority: 1 },
    ]);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(1);
  });

  it("大顶堆按优先级从大到小出队", () => {
    const queue = new MaxPriorityQueue<number>();
    queue.push(1, 3);
    queue.push(2, 9);
    queue.push(3, 5);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(3);
    expect(queue.pop()).toBe(1);
  });

  it("清空队列", () => {
    const queue = new PriorityQueue<number>();
    queue.push(1, 1);
    queue.clear();
    expect(queue.size).toBe(0);
    expect(queue.pop()).toBeUndefined();
  });

  it("toArray 导出堆内数据", () => {
    const queue = new PriorityQueue<number>();
    queue.push(1, 3);
    queue.push(2, 1);
    expect(queue.toArray().length).toBe(2);
  });
});
