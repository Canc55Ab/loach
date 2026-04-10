type ShapeType = "rect" | "circle";

type Quadrant = 0 | 1 | 2 | 3;

interface IQuadPos {
  x: number;
  y: number;
}

/**
 * Quad item object interface
 */
interface IQuadItemObjectRect extends IQuadPos {
  shape: ShapeType;
  width: number;
  height: number;
}

interface IQuadItemObjectCircle extends IQuadPos {
  shape: ShapeType;
  radius: number;
}

interface IQuadProps extends IQuadPos {
  maxObjects?: number;
  maxLevels?: number;
  level?: number;
  width: number;
  height: number;
}

export type IQuadItemObject = IQuadItemObjectRect | IQuadItemObjectCircle;

/**
 * Quad class
 * 四叉树
 */
class QuadTree<T extends IQuadItemObject> {
  private _level: number = 0;
  private _maxObjects: number = 10;
  private _maxLevels: number = 4;
  private _width: number = 0;
  private _height: number = 0;
  private _x: number = 0;
  private _y: number = 0;
  private _nodes: QuadTree<T>[] = [];
  private _objects: T[] = [];

  constructor(op?: IQuadProps) {
    if (op?.x) this._x = op.x;
    if (op?.y) this._y = op.y;
    if (op?.width) this._width = op.width;
    if (op?.height) this._height = op.height;
    if (op?.maxObjects) this._maxObjects = op.maxObjects;
    if (op?.maxLevels) this._maxLevels = op.maxLevels;
    if (op?.level) this._level = op.level;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get maxObjects(): number {
    return this._maxObjects;
  }

  set maxObjects(value: number) {
    this._maxObjects = value;
  }

  get maxLevels(): number {
    return this._maxLevels;
  }

  set maxLevels(value: number) {
    this._maxLevels = value;
  }

  get nodes(): QuadTree<T>[] {
    return this._nodes;
  }

  get objects(): T[] {
    return this._objects;
  }

  /**
   * 获取当前层级
   */
  get level(): number {
    return this._level;
  }

  /**
   * 判断是否在范围内
   */
  public isPointInBounds(point: IQuadPos): boolean {
    return (
      point.x >= this._x &&
      point.x <= this._x + this._width &&
      point.y >= this._y &&
      point.y <= this._y + this._height
    );
  }

  /**
   * 获取四叉树总深度
   */
  public getDepth(): number {
    if (!this._nodes.length) {
      return this._level;
    }
    return Math.max(...this._nodes.map((node) => node.getDepth()));
  }

  /**
   * 获取四叉树中所有对象的总数
   */
  public getSize(): number {
    let count = this._objects.length;
    for (const node of this._nodes) {
      count += node.getSize();
    }
    return count;
  }

  /**
   * 获取四叉树中所有对象
   */
  public getAllObjects(): T[] {
    const result = [...this._objects];
    for (const node of this._nodes) {
      result.push(...node.getAllObjects());
    }
    return result;
  }

  /**
   * 判断四叉树是否包含某个对象
   */
  public contains(item: T): boolean {
    if (this._objects.includes(item)) {
      return true;
    }
    for (const node of this._nodes) {
      if (node.contains(item)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 分割
   */
  public subdivide() {
    if (this._nodes.length) {
      return;
    }

    const hw = this._width / 2;
    const hh = this._height / 2;
    const coordinates = [
      { x: this._x, y: this._y },
      { x: this._x + hw, y: this._y },
      { x: this._x + hw, y: this._y + hh },
      { x: this._x, y: this._y + hh },
    ];

    for (let i = 0; i < coordinates.length; i++) {
      const { x, y } = coordinates[i];
      this._nodes[i] = new QuadTree<T>({
        x,
        y,
        width: hw,
        height: hh,
        maxObjects: this._maxObjects,
        maxLevels: this._maxLevels,
        level: this._level + 1,
      });
    }
  }

  /**
   * 插入对象
   * @param item
   * @returns
   */
  public insert(item: T) {
    if (this._nodes.length) {
      const idxs = this.getQuadrant(item);
      for (const idx of idxs) {
        this._nodes[idx].insert(item);
      }
      return;
    }

    this._objects.push(item);

    if (this._objects.length > this._maxObjects && this._level < this._maxLevels) {
      if (!this._nodes.length) {
        this.subdivide();
      }

      // 切分象限之后将现有的对象插入到子象限
      for (const obj of this._objects) {
        const idxs = this.getQuadrant(obj);
        for (const idx of idxs) {
          this._nodes[idx].insert(obj);
        }
      }

      this._objects = [];
    }
  }

  /**
   * 插入对象列表
   * @param items
   */
  public inserts(items: T[]) {
    for (const item of items) {
      this.insert(item);
    }
  }

  /**
   * 获取对象所处的象限
   * @param item
   * @returns [0, 1, 2, 3]：0-左上，1-右上，2-右下，3-左下
   */
  private getQuadrant(item: T): Quadrant[] {
    const idx: Quadrant[] = [];
    const verticalMidpoint = this._x + this._width / 2;
    const horizontalMidpoint = this._y + this._height / 2;

    let startIsNorth: boolean, endIsEast: boolean, endIsSouth: boolean, startIsWest: boolean;

    if (item.shape === "rect" && "width" in item && "height" in item) {
      const rectItem = item as IQuadItemObjectRect;
      startIsNorth = rectItem.y < horizontalMidpoint;
      endIsEast = rectItem.x + rectItem.width > verticalMidpoint;
      endIsSouth = rectItem.y + rectItem.height > horizontalMidpoint;
      startIsWest = rectItem.x < verticalMidpoint;
    } else if (item.shape === "circle" && "radius" in item) {
      const circleItem = item as IQuadItemObjectCircle;
      // 圆形使用其边界框来判断象限归属
      startIsNorth = circleItem.y - circleItem.radius < horizontalMidpoint;
      endIsEast = circleItem.x + circleItem.radius > verticalMidpoint;
      endIsSouth = circleItem.y + circleItem.radius > horizontalMidpoint;
      startIsWest = circleItem.x - circleItem.radius < verticalMidpoint;
    } else {
      return idx;
    }

    if (startIsNorth && startIsWest) {
      idx.push(0);
    }
    if (startIsNorth && endIsEast) {
      idx.push(1);
    }
    if (endIsEast && endIsSouth) {
      idx.push(2);
    }
    if (startIsWest && endIsSouth) {
      idx.push(3);
    }

    return idx;
  }

  /**
   * 移除对象
   * @param item 要移除的对象
   * @returns 是否成功移除
   */
  public remove(item: T): boolean {
    const index = this._objects.indexOf(item);
    if (index !== -1) {
      this._objects.splice(index, 1);
      return true;
    }

    for (const node of this._nodes) {
      if (node.remove(item)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 清除
   */
  public clear() {
    this._objects = [];
    for (const node of this._nodes) {
      node.clear();
    }
    this._nodes = [];
  }

  /**
   * 查询某个对象所在象限中的对象
   * @param item
   * @returns
   */
  public query(item: T): T[] {
    const returnObjects = new Set<T>(this._objects);

    if (this._nodes.length) {
      const idxs = this.getQuadrant(item);
      for (const idx of idxs) {
        const subRes = this._nodes[idx].query(item);
        for (const obj of subRes) {
          returnObjects.add(obj);
        }
      }
    }

    return Array.from(returnObjects);
  }

  /**
   * 查询指定范围内的所有对象
   * @param range 矩形范围
   */
  public queryRange(range: IQuadItemObjectRect): T[] {
    const result = new Set<T>();

    // 检查当前节点范围是否与查询范围相交
    if (!this.intersects(range)) {
      return [];
    }

    for (const obj of this._objects) {
      if (this.itemIntersectsRange(obj, range)) {
        result.add(obj);
      }
    }

    for (const node of this._nodes) {
      const subRes = node.queryRange(range);
      for (const obj of subRes) {
        result.add(obj);
      }
    }

    return Array.from(result);
  }

  /**
   * 判断矩形范围是否与当前节点相交
   */
  private intersects(range: IQuadItemObjectRect): boolean {
    return !(
      range.x > this._x + this._width ||
      range.x + range.width < this._x ||
      range.y > this._y + this._height ||
      range.y + range.height < this._y
    );
  }

  /**
   * 判断对象是否与指定范围相交
   */
  private itemIntersectsRange(item: T, range: IQuadItemObjectRect): boolean {
    if (item.shape === "rect" && "width" in item && "height" in item) {
      const rectItem = item as IQuadItemObjectRect;
      return !(
        rectItem.x > range.x + range.width ||
        rectItem.x + rectItem.width < range.x ||
        rectItem.y > range.y + range.height ||
        rectItem.y + rectItem.height < range.y
      );
    } else if (item.shape === "circle" && "radius" in item) {
      const circleItem = item as IQuadItemObjectCircle;
      const closestX = Math.max(range.x, Math.min(circleItem.x, range.x + range.width));
      const closestY = Math.max(range.y, Math.min(circleItem.y, range.y + range.height));
      const dx = circleItem.x - closestX;
      const dy = circleItem.y - closestY;
      return dx * dx + dy * dy <= circleItem.radius * circleItem.radius;
    }
    return false;
  }
}

export default QuadTree;
