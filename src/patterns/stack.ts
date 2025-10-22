/**
 * 栈
 * 后进先出 (LIFO)
 */

interface IStackProps {
  maxCount?: number;
}

class Stack {
  public maxCount: number;
  private items: Array<any> = [];

  constructor({ maxCount = 1000 }: IStackProps) {
    this.maxCount = maxCount;
  }

  // 入栈
  push(element: any) {
    if (this.isFull()) throw { code: 10000, msg: "栈已满" };
    this.items.push(element);
  }

  pushs(elements: any[]) {
    this.items.push(...elements);
  }

  // 出栈
  pop() {
    return this.items.pop();
  }

  // 返回队尾
  peek() {
    return this.items[this.items.length - 1];
  }

  // 栈是否已满
  isFull() {
    return this.items.length >= this.maxCount;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }
}

export default Stack;
