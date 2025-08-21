class Stack {
  constructor() {}

  private items: Array<any> = [];

  // 入栈
  push(element: any) {
    this.items.push(element);
  }

  // 出栈
  pop() {
    return this.items.pop();
  }

  // 返回队尾
  peek() {
    return this.items[this.items.length - 1];
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
