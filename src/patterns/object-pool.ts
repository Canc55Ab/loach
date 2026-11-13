/**
 * 对象池
 *
 * 适用于子弹、粒子、飘字、伤害数字等高频创建销毁的对象，
 * 通过复用实例减少 GC 压力，避免游戏卡顿。
 */

/** 对象池配置 */
export interface IObjectPoolProps<T> {
  /** 创建新实例的工厂 */
  factory: () => T;
  /** 归还时重置实例状态 */
  reset?: (item: T) => void;
  /** 池中最多保留的空闲实例数，默认 Infinity */
  maxSize?: number;
  /** 预热数量，构造时提前创建 */
  prewarm?: number;
}

/**
 * 对象池
 */
export class ObjectPool<T> {
  private readonly _factory: () => T;
  private readonly _reset?: (item: T) => void;
  private readonly _free: T[] = [];
  private readonly _inUse: Set<T> = new Set();
  private _maxSize: number;
  private _created = 0;

  constructor(props: IObjectPoolProps<T>) {
    this._factory = props.factory;
    this._reset = props.reset;
    this._maxSize = props.maxSize ?? Infinity;

    const prewarm = Math.max(0, props.prewarm ?? 0);
    for (let i = 0; i < prewarm; i++) {
      this._free.push(this._factory());
      this._created++;
    }
  }

  /** 池中空闲实例数 */
  get size(): number {
    return this._free.length;
  }

  /** 正在使用的实例数 */
  get usedCount(): number {
    return this._inUse.size;
  }

  /** 累计创建过的实例数 */
  get totalCount(): number {
    return this._created;
  }

  /** 空闲实例上限 */
  get maxSize(): number {
    return this._maxSize;
  }

  set maxSize(value: number) {
    this._maxSize = value;
  }

  /**
   * 取出一个实例（优先复用空闲实例，不足时新建）
   */
  public acquire(): T {
    const item = this._free.pop();
    if (item !== undefined) {
      this._inUse.add(item);
      return item;
    }
    this._created++;
    const created = this._factory();
    this._inUse.add(created);
    return created;
  }

  /**
   * 归还实例
   * @param item 待归还实例
   * @returns 是否归还成功（未在用的实例会被忽略）
   */
  public release(item: T): boolean {
    if (!this._inUse.has(item)) return false;
    this._inUse.delete(item);

    if (this._reset) {
      this._reset(item);
    }

    if (this._free.length < this._maxSize) {
      this._free.push(item);
    }
    return true;
  }

  /**
   * 批量归还
   */
  public releaseAll(items: T[]): void {
    for (const item of items) {
      this.release(item);
    }
  }

  /**
   * 清空空闲实例（不影响正在使用的实例）
   */
  public clear(): void {
    this._free.length = 0;
  }

  /**
   * 重置池：归还全部在用实例并清空空闲区
   */
  public reset(): void {
    for (const item of Array.from(this._inUse)) {
      this.release(item);
    }
    this._free.length = 0;
    this._inUse.clear();
  }
}

export default ObjectPool;
