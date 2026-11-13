/**
 * 均匀网格空间索引
 *
 * 实体分布较均匀时，比四叉树更稳定、缓存友好。
 * 跨格对象会在其覆盖的每个格子中各存一份，查询时按引用去重。
 */

/** 可放入网格的对象（需提供轴对齐包围盒） */
export interface ISpatialItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 网格配置 */
export interface ISpatialGridProps {
  /** 格子边长，默认 64 */
  cellSize?: number;
  /** 网格宽度 */
  width: number;
  /** 网格高度 */
  height: number;
  /** 网格原点，默认 0 */
  x?: number;
  /** 网格原点，默认 0 */
  y?: number;
}

/** 查询范围（轴对齐） */
export interface ISpatialQueryRange {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 均匀网格空间索引 */
export class SpatialGrid<T extends ISpatialItem> {
  private readonly _cells: Map<string, Set<T>> = new Map();
  private readonly _items: Set<T> = new Set();
  private _cellSize: number;
  private _width: number;
  private _height: number;
  private _x: number;
  private _y: number;

  constructor(props: ISpatialGridProps) {
    this._cellSize = props.cellSize ?? 64;
    this._width = props.width;
    this._height = props.height;
    this._x = props.x ?? 0;
    this._y = props.y ?? 0;
  }

  /** 格子边长 */
  get cellSize(): number {
    return this._cellSize;
  }

  set cellSize(value: number) {
    if (value <= 0) return;
    if (value === this._cellSize) return;
    this._cellSize = value;
    // 格子边长变化后原有索引失效，需按新边长重建，
    // 否则对象会变成查不到的孤儿（旧桶还会残留引用）
    this._cells.clear();
    for (const item of this._items) {
      this.bucketItem(item);
    }
  }

  /** 网格宽度 */
  get width(): number {
    return this._width;
  }

  /** 网格高度 */
  get height(): number {
    return this._height;
  }

  /** 网格原点 x */
  get x(): number {
    return this._x;
  }

  /** 网格原点 y */
  get y(): number {
    return this._y;
  }

  /** 已插入对象数量 */
  get size(): number {
    return this._items.size;
  }

  /** 已占用格子数量 */
  get cellCount(): number {
    return this._cells.size;
  }

  /**
   * 插入对象
   * @param item 待插入对象
   */
  public insert(item: T): void {
    if (this._items.has(item)) return;
    this._items.add(item);
    this.bucketItem(item);
  }

  /**
   * 把对象登记到它覆盖的各个格子
   */
  private bucketItem(item: T): void {
    const range = this.getCellRange(item.x, item.y, item.x + item.width, item.y + item.height);
    for (let cx = range.minX; cx <= range.maxX; cx++) {
      for (let cy = range.minY; cy <= range.maxY; cy++) {
        const key = SpatialGrid.getKey(cx, cy);
        let bucket = this._cells.get(key);
        if (!bucket) {
          bucket = new Set<T>();
          this._cells.set(key, bucket);
        }
        bucket.add(item);
      }
    }
  }

  /**
   * 批量插入
   */
  public inserts(items: T[]): void {
    for (const item of items) this.insert(item);
  }

  /**
   * 移除对象
   * @returns 是否移除成功
   */
  public remove(item: T): boolean {
    if (!this._items.has(item)) return false;
    this._items.delete(item);

    const range = this.getCellRange(item.x, item.y, item.x + item.width, item.y + item.height);
    for (let cx = range.minX; cx <= range.maxX; cx++) {
      for (let cy = range.minY; cy <= range.maxY; cy++) {
        const key = SpatialGrid.getKey(cx, cy);
        const bucket = this._cells.get(key);
        if (!bucket) continue;
        bucket.delete(item);
        if (!bucket.size) this._cells.delete(key);
      }
    }
    return true;
  }

  /**
   * 查询与范围相交的所有对象
   * @param range 查询范围
   */
  public queryRange(range: ISpatialQueryRange): T[] {
    const result = new Set<T>();
    const cellRange = this.getCellRange(range.minX, range.minY, range.maxX, range.maxY);

    for (let cx = cellRange.minX; cx <= cellRange.maxX; cx++) {
      for (let cy = cellRange.minY; cy <= cellRange.maxY; cy++) {
        const bucket = this._cells.get(SpatialGrid.getKey(cx, cy));
        if (!bucket) continue;
        for (const item of bucket) {
          if (
            item.x <= range.maxX &&
            item.x + item.width >= range.minX &&
            item.y <= range.maxY &&
            item.y + item.height >= range.minY
          ) {
            result.add(item);
          }
        }
      }
    }
    return Array.from(result);
  }

  /**
   * 查询矩形范围内的对象
   */
  public queryRect(x: number, y: number, width: number, height: number): T[] {
    return this.queryRange({
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
    });
  }

  /**
   * 查询某个点所在位置的对象
   */
  public queryPoint(x: number, y: number): T[] {
    const bucket = this._cells.get(
      SpatialGrid.getKey(this.toCellX(x), this.toCellY(y))
    );
    if (!bucket) return [];
    const result: T[] = [];
    for (const item of bucket) {
      if (
        x >= item.x &&
        x <= item.x + item.width &&
        y >= item.y &&
        y <= item.y + item.height
      ) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * 清空所有对象
   */
  public clear(): void {
    this._cells.clear();
    this._items.clear();
  }

  /**
   * 坐标转格子索引
   */
  public toCellX(value: number): number {
    return Math.floor((value - this._x) / this._cellSize);
  }

  /**
   * 坐标转格子索引
   */
  public toCellY(value: number): number {
    return Math.floor((value - this._y) / this._cellSize);
  }

  /**
   * 计算包围范围覆盖的格子区间
   */
  private getCellRange(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    return {
      minX: this.toCellX(minX),
      minY: this.toCellY(minY),
      maxX: this.toCellX(maxX),
      maxY: this.toCellY(maxY),
    };
  }

  /**
   * 格子索引转 key
   */
  private static getKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }
}

export default SpatialGrid;
