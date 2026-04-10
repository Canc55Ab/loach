/**
 * 栈
 * 后进先出 (LIFO)
 */

interface IStackProps<T> {
  maxCount?: number;
  items?: T[];
}

/**
 * 栈
 */
class Stack<T = unknown> {
  private items: T[] = [];
  private _maxCount: number;

  constructor({ maxCount = 1000, items = [] }: IStackProps<T> = {}) {
    this._maxCount = maxCount;
    for (const item of items) {
      this.push(item);
    }
  }

  // 入栈
  public push(item: T): void {
    if (this.isFull()) throw { code: 10000, msg: "栈已满" };
    this.items.push(item);
  }

  // 批量入栈
  public pushs(items: T[]): void {
    for (const item of items) {
      this.push(item);
    }
  }

  // 出栈
  public pop(): T | undefined {
    return this.items.pop();
  }

  // 批量出栈
  public pops(count: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < count && !this.isEmpty(); i++) {
      const item = this.pop();
      if (item !== undefined) result.push(item);
    }
    return result;
  }

  // 返回栈顶
  public peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  // 栈是否已满
  public isFull(): boolean {
    return this.items.length >= this._maxCount;
  }

  // 栈是否为空
  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  // 栈长度
  public size(): number {
    return this.items.length;
  }

  // 清空栈
  public clear(): void {
    this.items = [];
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

  // 查找元素索引（栈底为0，栈顶为 size-1）
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

  // 转为数组（栈底在前，栈顶在后）
  public toArray(): T[] {
    return [...this.items];
  }

  // 遍历栈（不修改栈，从栈底到栈顶）
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

export default Stack;
