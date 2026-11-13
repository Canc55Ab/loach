/**
 * 碰撞检测
 *
 * 形状用判别联合描述：`shape: "rect" | "circle"`
 */

/** 形状类型 */
export type ShapeType = "rect" | "circle";

/** 矩形（以左上角为原点） */
export interface IRectShape {
  shape: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 圆形（以圆心为原点） */
export interface ICircleShape {
  shape: "circle";
  x: number;
  y: number;
  radius: number;
}

/** 任意可碰撞形状 */
export type CollisionShape = IRectShape | ICircleShape;

/** 轴对齐包围盒 */
export interface IBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 点 */
export interface IPoint {
  x: number;
  y: number;
}

/** 最小平移向量（把 A 推出 B 所需的位移） */
export interface ITranslation {
  x: number;
  y: number;
  magnitude: number;
}

/** 带速度的包围盒 */
export interface IMovingBounds extends IBounds {
  vx: number;
  vy: number;
}

/**
 * 计算形状的轴对齐包围盒
 */
export function getBounds(shape: CollisionShape): IBounds {
  if (shape.shape === "circle") {
    return {
      minX: shape.x - shape.radius,
      minY: shape.y - shape.radius,
      maxX: shape.x + shape.radius,
      maxY: shape.y + shape.radius,
    };
  }
  return {
    minX: shape.x,
    minY: shape.y,
    maxX: shape.x + shape.width,
    maxY: shape.y + shape.height,
  };
}

/**
 * 两个包围盒是否相交
 */
export function aabbIntersects(a: IBounds, b: IBounds): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

/**
 * 包围盒与形状是否相交
 */
export function boundsIntersectShape(bounds: IBounds, shape: CollisionShape): boolean {
  return aabbIntersects(bounds, getBounds(shape));
}

/**
 * 两个矩形是否相交
 */
export function rectIntersects(a: IRectShape, b: IRectShape): boolean {
  return aabbIntersects(getBounds(a), getBounds(b));
}

/**
 * 两个圆是否相交
 */
export function circleIntersects(a: ICircleShape, b: ICircleShape): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * 圆与矩形是否相交
 */
export function circleRectIntersects(circle: ICircleShape, rect: IRectShape): boolean {
  const bounds = getBounds(rect);
  const closestX = Math.max(bounds.minX, Math.min(circle.x, bounds.maxX));
  const closestY = Math.max(bounds.minY, Math.min(circle.y, bounds.maxY));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

/**
 * 任意两个形状是否相交
 */
export function intersects(a: CollisionShape, b: CollisionShape): boolean {
  if (a.shape === "rect" && b.shape === "rect") return rectIntersects(a, b);
  if (a.shape === "circle" && b.shape === "circle") return circleIntersects(a, b);
  if (a.shape === "circle" && b.shape === "rect") return circleRectIntersects(a, b);
  return circleRectIntersects(b as ICircleShape, a as IRectShape);
}

/**
 * 点是否在包围盒内
 */
export function pointInBounds(point: IPoint, bounds: IBounds): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/**
 * 点是否在形状内
 */
export function pointInShape(point: IPoint, shape: CollisionShape): boolean {
  if (shape.shape === "circle") {
    const dx = point.x - shape.x;
    const dy = point.y - shape.y;
    return dx * dx + dy * dy <= shape.radius * shape.radius;
  }
  return pointInBounds(point, getBounds(shape));
}

/**
 * 求把 a 推出 b 所需的最小平移向量
 * @returns 两者不相交时返回 null
 */
export function getTranslation(a: CollisionShape, b: CollisionShape): ITranslation | null {
  if (!intersects(a, b)) return null;

  if (a.shape === "rect" && b.shape === "rect") {
    const ba = getBounds(a);
    const bb = getBounds(b);
    const overlapX =
      Math.min(ba.maxX, bb.maxX) - Math.max(ba.minX, bb.minX);
    const overlapY =
      Math.min(ba.maxY, bb.maxY) - Math.max(ba.minY, bb.minY);

    if (overlapX < overlapY) {
      const x = a.x + a.width / 2 < b.x + b.width / 2 ? -overlapX : overlapX;
      return { x, y: 0, magnitude: overlapX };
    }
    const y = a.y + a.height / 2 < b.y + b.height / 2 ? -overlapY : overlapY;
    return { x: 0, y, magnitude: overlapY };
  }

  if (a.shape === "circle" && b.shape === "circle") {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const magnitude = a.radius + b.radius - dist;
    if (dist === 0) {
      return { x: magnitude, y: 0, magnitude };
    }
    return { x: (dx / dist) * magnitude, y: (dy / dist) * magnitude, magnitude };
  }

  // 圆 vs 矩形：沿「圆心到矩形最近点」的方向推出
  const circle = a.shape === "circle" ? a : (b as ICircleShape);
  const rect = a.shape === "rect" ? a : (b as IRectShape);
  const bounds = getBounds(rect);
  const closestX = Math.max(bounds.minX, Math.min(circle.x, bounds.maxX));
  const closestY = Math.max(bounds.minY, Math.min(circle.y, bounds.maxY));
  let dx = circle.x - closestX;
  let dy = circle.y - closestY;
  let dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) {
    // 圆心在矩形内：沿最浅的穿透方向推出
    const left = circle.x - bounds.minX;
    const right = bounds.maxX - circle.x;
    const top = circle.y - bounds.minY;
    const bottom = bounds.maxY - circle.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: -(left + circle.radius), y: 0, magnitude: left + circle.radius };
    if (min === right) return { x: right + circle.radius, y: 0, magnitude: right + circle.radius };
    if (min === top) return { x: 0, y: -(top + circle.radius), magnitude: top + circle.radius };
    return { x: 0, y: bottom + circle.radius, magnitude: bottom + circle.radius };
  }

  dx /= dist;
  dy /= dist;
  const magnitude = circle.radius - dist;
  const sign = a.shape === "circle" ? 1 : -1;
  return { x: dx * magnitude * sign, y: dy * magnitude * sign, magnitude };
}

/**
 * 射线与包围盒求交
 * @param origin 起点
 * @param direction 方向向量（内部会归一化）
 * @param bounds 目标包围盒
 * @returns 命中距离，未命中返回 null
 */
export function rayBounds(
  origin: IPoint,
  direction: IPoint,
  bounds: IBounds
): number | null {
  const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  if (len === 0) return null;
  const dx = direction.x / len;
  const dy = direction.y / len;

  let tMin = 0;
  let tMax = Infinity;

  if (dx === 0) {
    if (origin.x < bounds.minX || origin.x > bounds.maxX) return null;
  } else {
    const inv = 1 / dx;
    let t1 = (bounds.minX - origin.x) * inv;
    let t2 = (bounds.maxX - origin.x) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (dy === 0) {
    if (origin.y < bounds.minY || origin.y > bounds.maxY) return null;
  } else {
    const inv = 1 / dy;
    let t1 = (bounds.minY - origin.y) * inv;
    let t2 = (bounds.maxY - origin.y) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  return tMin;
}

/**
 * 射线与形状求交
 * @param origin 起点
 * @param direction 方向向量
 * @param shape 目标形状
 * @returns 命中距离，未命中返回 null
 */
export function raycast(
  origin: IPoint,
  direction: IPoint,
  shape: CollisionShape
): number | null {
  if (shape.shape === "circle") {
    const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (len === 0) return null;
    const dx = direction.x / len;
    const dy = direction.y / len;
    const ox = origin.x - shape.x;
    const oy = origin.y - shape.y;
    const b = 2 * (ox * dx + oy * dy);
    const c = ox * ox + oy * oy - shape.radius * shape.radius;
    // 起点已在圆内：立即命中
    if (c <= 0) return 0;
    const disc = b * b - 4 * c;
    if (disc < 0) return null;
    const sqrt = Math.sqrt(disc);
    const t1 = (-b - sqrt) / 2;
    const t2 = (-b + sqrt) / 2;
    if (t1 >= 0) return t1;
    if (t2 >= 0) return t2;
    return null;
  }
  return rayBounds(origin, direction, getBounds(shape));
}

/**
 * 扫掠碰撞：移动中的包围盒与目标包围盒的首次接触时刻
 * @param box 移动包围盒（需带速度）
 * @param target 目标包围盒
 * @param dt 步进时长
 * @returns 碰撞时刻（0 ~ dt），未碰撞返回 null
 */
export function sweptAabb(
  box: IMovingBounds,
  target: IBounds,
  dt: number
): number | null {
  if (dt <= 0) return null;

  const halfW = (box.maxX - box.minX) / 2;
  const halfH = (box.maxY - box.minY) / 2;

  // 目标按移动盒的半尺寸做对称膨胀（闵可夫斯基和）。
  // 运动方向不参与膨胀量：射线会自然地从正确的一侧进入，
  // 若把速度符号乘进半尺寸，负方向时 expanded 会退化成一点，把「首次接触」错算成「完全覆盖」。
  const expanded: IBounds = {
    minX: target.minX - halfW,
    maxX: target.maxX + halfW,
    minY: target.minY - halfH,
    maxY: target.maxY + halfH,
  };

  const origin: IPoint = {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
  };
  const direction: IPoint = { x: box.vx * dt, y: box.vy * dt };
  const t = rayBounds(origin, direction, expanded);
  if (t === null) return null;

  const speed = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  if (speed === 0) return null;
  const time = (t / speed) * dt;
  return time >= 0 && time <= dt ? time : null;
}
