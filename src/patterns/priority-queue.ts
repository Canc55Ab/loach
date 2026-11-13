/**
 * 二叉堆优先队列
 *
 * 用途：A* 开放集、Dijkstra 流场、任务调度、伤害结算优先级等。
 * 约定：同优先级按入队先后 FIFO 出队。
 */

/** 堆内元素 */
export interface IPriorityEntry<T> {
  /** 业务数据 */
  value: T;
  /** 优先级 */
  priority: number;
  /** 入队序号，用于同优先级保序 */
  seq: number;
}

/** 排序方向 */
export type PriorityOrder = "asc" | "desc";

/**
 * 优先队列（默认小顶堆）
 */
export class PriorityQueue<T> {
  protected readonly heap: IPriorityEntry<T>[] = [];
  protected order: PriorityOrder;
  private _seq = 0;

  constructor(order: PriorityOrder = "asc") {
    this.order = order;
  }

  /** 队列长度 */
  get size(): number {
    return this.heap.length;
  }

  /** 是否为空 */
  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * 入队
   * @param value 数据
   * @param priority 优先级，asc 模式下越小越先出队
   */
  public push(value: T, priority: number = 0): void {
    const entry: IPriorityEntry<T> = { value, priority, seq: this._seq++ };
    this.heap.push(entry);
    this.siftUp(this.heap.length - 1);
  }

  /**
   * 批量入队
   */
  public pushes(items: Array<{ value: T; priority?: number }>): void {
    for (const item of items) {
      this.push(item.value, item.priority ?? 0);
    }
  }

  /**
   * 出队（优先级最高者）
   * @returns 队首数据，空队列返回 undefined
   */
  public pop(): T | undefined {
    const entry = this.popEntry();
    return entry ? entry.value : undefined;
  }

  /**
   * 出队并返回完整条目
   */
  public popEntry(): IPriorityEntry<T> | undefined {
    if (!this.heap.length) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop() as IPriorityEntry<T>;
    if (this.heap.length) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  /**
   * 查看队首数据，不出队
   */
  public peek(): T | undefined {
    return this.heap.length ? this.heap[0].value : undefined;
  }

  /**
   * 查看队首条目，不出队
   */
  public peekEntry(): IPriorityEntry<T> | undefined {
    return this.heap.length ? this.heap[0] : undefined;
  }

  /**
   * 清空队列
   */
  public clear(): void {
    this.heap.length = 0;
    this._seq = 0;
  }

  /**
   * 导出队列内数据（按当前堆顺序）
   */
  public toArray(): T[] {
    return this.heap.map((entry) => entry.value);
  }

  /**
   * 比较两个条目：先比优先级，再比入队序号
   */
  protected compare(a: IPriorityEntry<T>, b: IPriorityEntry<T>): number {
    if (a.priority !== b.priority) {
      return this.order === "asc" ? a.priority - b.priority : b.priority - a.priority;
    }
    return a.seq - b.seq;
  }

  /**
   * 上浮
   */
  private siftUp(index: number): void {
    let i = index;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.heap[i], this.heap[parent]) >= 0) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /**
   * 下沉
   */
  private siftDown(index: number): void {
    let i = index;
    const length = this.heap.length;
    for (;;) {
      const left = i * 2 + 1;
      const right = left + 1;
      let smallest = i;
      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  /**
   * 交换两个元素
   */
  private swap(a: number, b: number): void {
    const tmp = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = tmp;
  }
}

/**
 * 大顶堆优先队列（优先级大者先出队）
 */
export class MaxPriorityQueue<T> extends PriorityQueue<T> {
  constructor() {
    super("desc");
  }
}

export default PriorityQueue;
