/**
 * 八叉树（3D 空间分区）
 *
 * 与四叉树同理，适用于 3D 场景的空间查询与粗筛。
 * 约定：
 * - 跨节点的物体会在多个子节点各存一份，计数类 API 按**唯一物体**去重
 * - 完全落在树范围之外的物体会保留在当前节点，且仍可被 `queryRange` 命中
 */

/** 可放入八叉树的对象（轴对齐包围盒，最小角 + 尺寸） */
export interface IOctreeItem {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

/** 八叉树配置 */
export interface IOctreeProps {
  /** 包围盒最小角 x */
  x?: number;
  /** 包围盒最小角 y */
  y?: number;
  /** 包围盒最小角 z */
  z?: number;
  width: number;
  height: number;
  depth: number;
  /** 每个节点最大对象数，默认 10 */
  maxObjects?: number;
  /** 最大分割层级，默认 4 */
  maxLevels?: number;
  /** 当前层级 */
  level?: number;
}

/** 三维包围盒 */
export interface IOctreeBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** 八叉树 */
export class Octree<T extends IOctreeItem> {
  private _nodes: Octree<T>[] = [];
  private _objects: T[] = [];
  private _level: number = 0;
  private _maxObjects: number = 10;
  private _maxLevels: number = 4;
  private _width: number = 0;
  private _height: number = 0;
  private _depth: number = 0;
  private _x: number = 0;
  private _y: number = 0;
  private _z: number = 0;

  constructor(props: IOctreeProps) {
    if (props.x !== undefined) this._x = props.x;
    if (props.y !== undefined) this._y = props.y;
    if (props.z !== undefined) this._z = props.z;
    if (props.width !== undefined) this._width = props.width;
    if (props.height !== undefined) this._height = props.height;
    if (props.depth !== undefined) this._depth = props.depth;
    if (props.maxObjects !== undefined) this._maxObjects = props.maxObjects;
    if (props.maxLevels !== undefined) this._maxLevels = props.maxLevels;
    if (props.level !== undefined) this._level = props.level;
  }

  /** 包围盒最小角 x */
  get x(): number {
    return this._x;
  }

  /** 包围盒最小角 y */
  get y(): number {
    return this._y;
  }

  /** 包围盒最小角 z */
  get z(): number {
    return this._z;
  }

  /** 包围盒宽度 */
  get width(): number {
    return this._width;
  }

  /** 包围盒高度 */
  get height(): number {
    return this._height;
  }

  /** 包围盒深度 */
  get depth(): number {
    return this._depth;
  }

  /** 当前层级 */
  get level(): number {
    return this._level;
  }

  /** 每节点最大对象数 */
  get maxObjects(): number {
    return this._maxObjects;
  }

  set maxObjects(value: number) {
    this._maxObjects = value;
  }

  /** 最大层级 */
  get maxLevels(): number {
    return this._maxLevels;
  }

  set maxLevels(value: number) {
    this._maxLevels = value;
  }

  /** 子节点 */
  get nodes(): Octree<T>[] {
    return this._nodes;
  }

  /** 当前节点直接持有的对象 */
  get objects(): T[] {
    return this._objects;
  }

  /** 当前节点包围盒 */
  get bounds(): IOctreeBounds {
    return {
      minX: this._x,
      minY: this._y,
      minZ: this._z,
      maxX: this._x + this._width,
      maxY: this._y + this._height,
      maxZ: this._z + this._depth,
    };
  }

  /**
   * 判断点是否在包围盒内
   */
  public isPointInBounds(point: { x: number; y: number; z: number }): boolean {
    return (
      point.x >= this._x &&
      point.x <= this._x + this._width &&
      point.y >= this._y &&
      point.y <= this._y + this._height &&
      point.z >= this._z &&
      point.z <= this._z + this._depth
    );
  }

  /**
   * 获取树中所有对象（按引用去重）
   */
  public getAllObjects(): T[] {
    const result = new Set<T>(this._objects);
    for (const node of this._nodes) {
      for (const obj of node.getAllObjects()) {
        result.add(obj);
      }
    }
    return Array.from(result);
  }

  /**
   * 获取唯一对象总数
   */
  public getSize(): number {
    return this.getAllObjects().length;
  }

  /**
   * 获取树深度
   */
  public getDepth(): number {
    if (!this._nodes.length) return this._level;
    return Math.max(...this._nodes.map((node) => node.getDepth()));
  }

  /**
   * 是否包含指定对象
   */
  public contains(item: T): boolean {
    if (this._objects.includes(item)) return true;
    for (const node of this._nodes) {
      if (node.contains(item)) return true;
    }
    return false;
  }

  /**
   * 分割为 8 个子节点
   */
  public subdivide(): void {
    if (this._nodes.length) return;

    const halfWidth = this._width / 2;
    const halfHeight = this._height / 2;
    const halfDepth = this._depth / 2;

    for (let i = 0; i < 8; i++) {
      const offsetX = (i & 1) === 0 ? 0 : halfWidth;
      const offsetY = (i & 2) === 0 ? 0 : halfHeight;
      const offsetZ = (i & 4) === 0 ? 0 : halfDepth;

      this._nodes[i] = new Octree<T>({
        x: this._x + offsetX,
        y: this._y + offsetY,
        z: this._z + offsetZ,
        width: halfWidth,
        height: halfHeight,
        depth: halfDepth,
        maxObjects: this._maxObjects,
        maxLevels: this._maxLevels,
        level: this._level + 1,
      });
    }
  }

  /**
   * 插入对象
   */
  public insert(item: T): void {
    // 同一引用重复插入时跳过，避免在节点内产生重复副本
    if (this._objects.includes(item)) return;

    if (this._nodes.length) {
      const indices = this.getOctants(item);
      if (!indices.length) {
        // 无法归入任何子块（如完全落在树范围之外）：保留在当前节点，避免丢失
        this._objects.push(item);
        return;
      }
      for (const index of indices) {
        this._nodes[index].insert(item);
      }
      return;
    }

    this._objects.push(item);

    if (this._objects.length > this._maxObjects && this._level < this._maxLevels) {
      if (!this._nodes.length) this.subdivide();

      const remain: T[] = [];
      for (const obj of this._objects) {
        const indices = this.getOctants(obj);
        if (!indices.length) {
          remain.push(obj);
          continue;
        }
        for (const index of indices) {
          this._nodes[index].insert(obj);
        }
      }
      this._objects = remain;
    }
  }

  /**
   * 批量插入
   */
  public inserts(items: T[]): void {
    for (const item of items) this.insert(item);
  }

  /**
   * 移除对象（会移除全部副本）
   */
  public remove(item: T): boolean {
    let removed = false;

    // 同一引用可能被重复插入，这里移除本节点内的**全部**副本
    for (let i = this._objects.length - 1; i >= 0; i--) {
      if (this._objects[i] === item) {
        this._objects.splice(i, 1);
        removed = true;
      }
    }

    for (const node of this._nodes) {
      if (node.remove(item)) removed = true;
    }

    return removed;
  }

  /**
   * 清空
   */
  public clear(): void {
    this._objects = [];
    for (const node of this._nodes) {
      node.clear();
    }
    this._nodes = [];
  }

  /**
   * 查询对象所在子块中的对象
   */
  public query(item: T): T[] {
    const result = new Set<T>(this._objects);

    if (this._nodes.length) {
      for (const index of this.getOctants(item)) {
        for (const obj of this._nodes[index].query(item)) {
          result.add(obj);
        }
      }
    }

    return Array.from(result);
  }

  /**
   * 查询指定范围内的所有对象
   *
   * 当前节点自身的对象始终参与判定（其中可能包含落在树范围之外的对象），
   * 子节点只在与其范围相交时才递归
   */
  public queryRange(range: IOctreeBounds): T[] {
    const result = new Set<T>();

    for (const obj of this._objects) {
      if (this.itemIntersectsRange(obj, range)) {
        result.add(obj);
      }
    }

    for (const node of this._nodes) {
      if (!node.intersects(range)) continue;
      for (const obj of node.queryRange(range)) {
        result.add(obj);
      }
    }

    return Array.from(result);
  }

  /**
   * 查询某个点所在位置的对象
   */
  public queryPoint(point: { x: number; y: number; z: number }): T[] {
    const result: T[] = [];
    for (const obj of this._objects) {
      if (
        point.x >= obj.x &&
        point.x <= obj.x + obj.width &&
        point.y >= obj.y &&
        point.y <= obj.y + obj.height &&
        point.z >= obj.z &&
        point.z <= obj.z + obj.depth
      ) {
        result.push(obj);
      }
    }
    for (const node of this._nodes) {
      if (!node.isPointInBounds(point)) continue;
      for (const obj of node.queryPoint(point)) {
        if (!result.includes(obj)) result.push(obj);
      }
    }
    return result;
  }

  /**
   * 判断范围是否与当前节点包围盒相交
   */
  private intersects(range: IOctreeBounds): boolean {
    const bounds = this.bounds;
    return !(
      range.maxX < bounds.minX ||
      range.minX > bounds.maxX ||
      range.maxY < bounds.minY ||
      range.minY > bounds.maxY ||
      range.maxZ < bounds.minZ ||
      range.minZ > bounds.maxZ
    );
  }

  /**
   * 判断对象是否与范围相交
   */
  private itemIntersectsRange(item: T, range: IOctreeBounds): boolean {
    return !(
      item.x > range.maxX ||
      item.x + item.width < range.minX ||
      item.y > range.maxY ||
      item.y + item.height < range.minY ||
      item.z > range.maxZ ||
      item.z + item.depth < range.minZ
    );
  }

  /**
   * 计算对象包围盒
   */
  private getItemBounds(item: T): IOctreeBounds {
    return {
      minX: item.x,
      minY: item.y,
      minZ: item.z,
      maxX: item.x + item.width,
      maxY: item.y + item.height,
      maxZ: item.z + item.depth,
    };
  }

  /**
   * 计算对象所处的子块索引
   *
   * 判定依据是包围盒与子块是否**真实相交**（边界相切不算相交）
   */
  private getOctants(item: T): number[] {
    const indices: number[] = [];
    if (!this._nodes.length) return indices;

    const bounds = this.getItemBounds(item);

    for (let i = 0; i < this._nodes.length; i++) {
      const node = this._nodes[i];
      const nodeBounds = node.bounds;
      if (
        bounds.maxX > nodeBounds.minX &&
        bounds.minX < nodeBounds.maxX &&
        bounds.maxY > nodeBounds.minY &&
        bounds.minY < nodeBounds.maxY &&
        bounds.maxZ > nodeBounds.minZ &&
        bounds.minZ < nodeBounds.maxZ
      ) {
        indices.push(i);
      }
    }

    return indices;
  }
}

export default Octree;
