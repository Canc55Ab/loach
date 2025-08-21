/**
 * 队列
 */
class Queue {
  count: number = 0;
  lowestCount: number = 0;
  items: any = {};

  // 入队
  public enQueue(dt: any): void {
    this.items[this.count++] = dt;
  }

  // 出队
  public deQueue(): any {
    if (this.isEmpty()) return undefined;
    let _result = this.items[this.lowestCount];
    delete this.items[this.lowestCount++];
    return _result;
  }

  // 返回队首
  public front(): any {
    if (this.isEmpty()) return undefined;
    return this.items[this.lowestCount];
  }

  // 返回队尾
  public back(): any {
    return this.items[this.count];
  }

  // 队列是否为空
  public isEmpty(): boolean {
    return this.size() <= 0;
  }

  // 清空队列
  public clear(): void {
    this.items = {};
    this.count = 0;
    this.lowestCount = 0;
  }

  // 队列长度
  public size(): number {
    return this.count - this.lowestCount;
  }
}

export default Queue;
