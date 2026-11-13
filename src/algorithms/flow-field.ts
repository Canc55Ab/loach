/**
 * 流场寻路（Flow Field / Dijkstra 多源）
 *
 * 适用于「大量单位追逐同一个目标」的场景：
 * 一次计算即可供所有单位查询，比逐个跑 A* 的开销低一个量级。
 */

import { PriorityQueue } from "../patterns/priority-queue";

/** 网格坐标点 */
export interface IGridPoint {
  x: number;
  y: number;
}

/** 单位方向 */
export interface IUnitVector {
  x: number;
  y: number;
}

/** 流场配置 */
export interface IFlowFieldOptions {
  /** 是否允许斜向移动，默认 true */
  allowDiagonal?: boolean;
  /** 斜向移动代价，默认 √2 */
  diagonalCost?: number;
  /** 障碍格子的值，默认 0 */
  blockedValue?: number;
  /** 地形通行代价，默认恒为 1 */
  costOf?: (value: number, x: number, y: number) => number;
}

/** 流场结果 */
export interface IFlowField {
  /** 网格宽度 */
  readonly width: number;
  /** 网格高度 */
  readonly height: number;
  /** 到最近目标的距离场，不可达为 Infinity */
  readonly distance: number[][];
  /** 取到最近目标的距离 */
  getDistance(x: number, y: number): number;
  /** 取指向最近目标的方向（单位向量），不可达返回 null */
  getDirection(x: number, y: number): IUnitVector | null;
  /** 取下一格坐标，已到达目标或不可达返回 null */
  getNextCell(x: number, y: number): IGridPoint | null;
}

/** 四方向邻居偏移 */
const ORTHOGONAL: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** 八方向邻居偏移 */
const DIAGONAL: Array<[number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * 计算流场
 * @param grid 网格，`grid[y][x]`
 * @param goals 目标点集合（可多个）
 * @param options 配置
 * @returns 流场
 */
export function computeFlowField(
  grid: number[][],
  goals: IGridPoint[],
  options: IFlowFieldOptions = {}
): IFlowField {
  const height = grid.length;
  const width = height ? grid[0].length : 0;

  const blockedValue = options.blockedValue ?? 0;
  const allowDiagonal = options.allowDiagonal ?? true;
  const diagonalCost = options.diagonalCost ?? Math.SQRT2;
  const costOf = options.costOf ?? (() => 1);

  const distance: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) row.push(Infinity);
    distance.push(row);
  }

  const open = new PriorityQueue<number>();

  for (const goal of goals) {
    if (goal.y < 0 || goal.y >= height) continue;
    const row = grid[goal.y];
    if (!row || goal.x < 0 || goal.x >= row.length) continue;
    if (row[goal.x] === blockedValue) continue;
    if (distance[goal.y][goal.x] === 0) continue;
    distance[goal.y][goal.x] = 0;
    open.push(goal.y * width + goal.x, 0);
  }

  while (!open.isEmpty()) {
    const current = open.pop() as number;
    const cx = current % width;
    const cy = (current - (current % width)) / width;
    const currentDistance = distance[cy][cx];

    const neighbors: Array<[number, number, number]> = [];
    for (const [dx, dy] of ORTHOGONAL) neighbors.push([dx, dy, 1]);
    if (allowDiagonal) {
      for (const [dx, dy] of DIAGONAL) neighbors.push([dx, dy, diagonalCost]);
    }

    for (const [dx, dy, stepCost] of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || ny >= height || nx >= grid[ny].length) continue;
      if (grid[ny][nx] === blockedValue) continue;

      const terrain = costOf(grid[ny][nx], nx, ny);
      const nextDistance = currentDistance + stepCost * terrain;
      if (nextDistance < distance[ny][nx]) {
        distance[ny][nx] = nextDistance;
        open.push(ny * width + nx, nextDistance);
      }
    }
  }

  const isWalkableAt = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || y >= height) return false;
    const row = grid[y];
    if (!row || x >= row.length) return false;
    return row[x] !== blockedValue;
  };

  const getNextCell = (x: number, y: number): IGridPoint | null => {
    if (!isWalkableAt(x, y)) return null;
    const current = distance[y]?.[x];
    if (current === undefined || !isFinite(current)) return null;
    if (current === 0) return null;

    let best: IGridPoint | null = null;
    let bestDistance = current;

    const neighbors: Array<[number, number]> = [];
    for (const [dx, dy] of ORTHOGONAL) neighbors.push([dx, dy]);
    if (allowDiagonal) {
      for (const [dx, dy] of DIAGONAL) neighbors.push([dx, dy]);
    }

    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (!isWalkableAt(nx, ny)) continue;
      const d = distance[ny][nx];
      if (d < bestDistance) {
        bestDistance = d;
        best = { x: nx, y: ny };
      }
    }
    return best;
  };

  const getDirection = (x: number, y: number): IUnitVector | null => {
    const next = getNextCell(x, y);
    if (!next) return null;
    const dx = next.x - x;
    const dy = next.y - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: 0 };
    return { x: dx / len, y: dy / len };
  };

  return {
    width,
    height,
    distance,
    getDistance: (x: number, y: number): number => {
      const row = distance[y];
      if (!row) return Infinity;
      const value = row[x];
      return value === undefined ? Infinity : value;
    },
    getDirection,
    getNextCell,
  };
}
