import { distance } from "../utils/math";

interface IQuadPos {
  x: number;
  y: number;
}

/**
 * Quad item object interface
 */
interface IQuadItemObjectRect extends IQuadPos {
  width: number;
  height: number;
}

interface IQuadItemObjectCircle extends IQuadPos {
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
  private level: number = 0;
  public maxObjects: number = 10;
  public maxLevels: number = 4;
  public width: number = 0;
  public height: number = 0;
  public x: number = 0;
  public y: number = 0;
  public nodes: QuadTree<T>[] = [];
  public objects: T[] = [];

  constructor(op?: IQuadProps) {
    if (op?.x) this.x = op.x;
    if (op?.y) this.y = op.y;
    if (op?.width) this.width = op.width;
    if (op?.height) this.height = op.height;
    if (op?.maxObjects) this.maxObjects = op.maxObjects;
    if (op?.maxLevels) this.maxLevels = op.maxLevels;
    if (op?.level) this.level = op.level;

    this.nodes = [];
    this.objects = [];
  }

  // 判断是否在范围内
  public isPointInBounds(point: IQuadPos): boolean {
    return (
      point.x >= this.x &&
      point.x <= this.x + this.width &&
      point.y >= this.y &&
      point.y <= this.y + this.height
    );
  }

  // 分割
  public subdivide() {
    if (this.nodes.length) {
      return;
    }

    const hw = this.width / 2;
    const hh = this.height / 2;
    const coodinates = [
      { x: this.x, y: this.y },
      { x: this.x + hw, y: this.y },
      { x: this.x + hw, y: this.y + hh },
      { x: this.x, y: this.y + hh },
    ];

    for (let i = 0; i < coodinates.length; i++) {
      const { x, y } = coodinates[i];
      this.nodes[i] = new QuadTree({
        x,
        y,
        width: hw,
        height: hh,
        maxObjects: this.maxObjects,
        maxLevels: this.maxLevels,
        level: this.level + 1,
      });
    }
  }

  /**
   * 插入对象
   * @param item
   * @returns
   */
  public insert(item: T) {
    let i = 0,
      j = 0,
      idxs,
      idxs2;

    if (this.nodes.length) {
      idxs = this.getQuadrant(item);
      for (i = 0; i < idxs.length; i++) {
        this.nodes[idxs[i]].insert(item);
      }
      return;
    }

    this.objects.push(item);

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (!this.nodes.length) {
        this.subdivide();
      }

      // 切分象限之后将现有的对象插入到子象限
      for (i = 0; i < this.objects.length; i++) {
        idxs2 = this.getQuadrant(this.objects[i]);
        for (j = 0; j < idxs2.length; j++) {
          this.nodes[idxs2[j]].insert(this.objects[i]);
        }
      }

      this.objects = [];
    }
  }

  /**
   * 插入对象列表
   * @param item
   * @returns
   */
  public inserts(items: T[]) {
    for (let i = 0; i < items.length; i++) {
      const element = items[i];
      this.insert(element);
    }
  }

  /**
   * 获取对象所处的象限
   * @param item
   * @returns [0, 1, 2, 3]：第一象限，1：第二象限，2：第三象限，3：第四象限
   */
  private getQuadrant(item: T): number[] {
    const idx = [],
      verticalMidpoint = this.x + this.width / 2,
      horizontalMidpoint = this.y + this.height / 2;

    if ("width" in item && "height" in item) {
      const rectItem = item as IQuadItemObjectRect;
      const startIsNorth = rectItem.y < horizontalMidpoint,
        endIsEast = rectItem.x + rectItem.width > verticalMidpoint,
        endIsSouth = rectItem.y + rectItem.height > horizontalMidpoint,
        startIsWest = rectItem.x < verticalMidpoint;
      if (startIsNorth && endIsEast) {
        idx.push(1);
      }
      if (startIsWest && startIsNorth) {
        idx.push(0);
      }
      if (startIsWest && endIsSouth) {
        idx.push(3);
      }
      if (endIsEast && endIsSouth) {
        idx.push(2);
      }
    } else if ("radius" in item) {
      const circleItem = item as IQuadItemObjectCircle;

      const _distance = distance(
        circleItem.x,
        circleItem.y,
        verticalMidpoint,
        horizontalMidpoint
      );

      const startIsNorth = _distance - circleItem.radius < horizontalMidpoint,
        endIsEast = _distance + circleItem.radius > verticalMidpoint,
        endIsSouth = _distance + circleItem.radius > horizontalMidpoint,
        startIsWest = _distance - circleItem.radius < verticalMidpoint;

      if (startIsNorth && endIsEast) {
        idx.push(1);
      }
      if (startIsWest && startIsNorth) {
        idx.push(0);
      }
      if (startIsWest && endIsSouth) {
        idx.push(3);
      }
      if (endIsEast && endIsSouth) {
        idx.push(2);
      }
    }

    return idx;
  }

  /**
   * 清除
   */
  public clear() {
    this.objects = [];
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes.length) {
        this.nodes[i].clear();
      }
    }
    this.nodes = [];
  }

  /**
   * 查询某个对象所在象限中的对象
   * @param item
   * @returns
   */
  public query(item: T): T[] {
    const returnObjects = new Set<T>(this.objects);

    if (this.nodes.length) {
      const idxs = this.getQuadrant(item);
      for (const idx of idxs) {
        const subRes = this.nodes[idx].query(item);
        for (const obj of subRes) {
          returnObjects.add(obj);
        }
      }
    }

    return Array.from(returnObjects);
  }
}

export default QuadTree;
