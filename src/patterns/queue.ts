/**
 * 队列
 * 先进先出 (FIFO)
 */

interface IQueueProps<T> {
  maxCount?: number;
  items?: T[];
}

/**
 * 队列
 */
class Queue<T = unknown> {
  private items: T[] = [];
  private _maxCount: number;

  constructor({ maxCount = 1000, items = [] }: IQueueProps<T> = {}) {
    this._maxCount = maxCount;
    for (const item of items) {
      this.enQueue(item);
    }
  }

  // 入队
  public enQueue(item: T): void {
    if (this.isFull()) throw { code: 10000, msg: "队列已满" };
    this.items.push(item);
  }

  // 批量入队
  public enQueues(items: T[]): void {
    for (const item of items) {
      this.enQueue(item);
    }
  }

  // 出队
  public deQueue(): T | undefined {
    return this.items.shift();
  }

  // 批量出队
  public deQueues(count: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < count && !this.isEmpty(); i++) {
      const item = this.deQueue();
      if (item !== undefined) result.push(item);
    }
    return result;
  }

  // 返回队首
  public front(): T | undefined {
    return this.items[0];
  }

  // 返回队尾
  public back(): T | undefined {
    return this.items[this.items.length - 1];
  }

  // 队列是否为空
  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  // 队列是否已满
  public isFull(): boolean {
    return this.items.length >= this._maxCount;
  }

  // 清空队列
  public clear(): void {
    this.items = [];
  }

  // 队列长度
  public size(): number {
    return this.items.length;
  }

  // 最大容量
  public get maxCount(): number {
    return this._maxCount;
  }

  // 设置最大容量
  public set maxCount(value: number) {
    this._maxCount = value;
  }

  // 是否包含某元素
  public includes(item: T): boolean {
    return this.indexOf(item) !== -1;
  }

  // 查找元素索引
  public indexOf(item: T): number {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i] === item) return i;
    }
    return -1;
  }

  // 移除指定元素（仅第一个匹配项）
  public remove(item: T): boolean {
    const idx = this.items.indexOf(item);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }

  // 转为数组
  public toArray(): T[] {
    return [...this.items];
  }

  // 遍历队列（不修改队列）
  public forEach(callback: (item: T, index: number) => void): void {
    this.items.forEach(callback);
  }

  // 迭代器
  public [Symbol.iterator](): Iterator<T> {
    let index = 0;
    const items = this.items;
    return {
      next() {
        if (index < items.length) {
          return { value: items[index++], done: false };
        }
        return { value: undefined, done: true };
      },
    };
  }

  // 字符串表示
  public toString(): string {
    return this.items.toString();
  }
}

export default Queue;
