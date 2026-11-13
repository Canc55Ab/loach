/**
 * A* 网格寻路
 *
 * 约定：
 * - 网格按 `grid[y][x]` 索引，值为 `blockedValue`（默认 0）的格子视为障碍
 * - 返回的路径**包含起点与终点**
 * - 起点或终点为障碍、越界、不可达时返回 null
 */

import { PriorityQueue } from "../patterns/priority-queue";

/** 网格坐标点 */
export interface IGridPoint {
  x: number;
  y: number;
}

/** 启发函数类型 */
export type HeuristicType = "manhattan" | "euclidean" | "octile";

/** A* 配置 */
export interface IAStarOptions {
  /** 是否允许斜向移动，默认 true */
  allowDiagonal?: boolean;
  /** 斜向移动代价，默认 √2 */
  diagonalCost?: number;
  /** 是否允许斜向穿角（两正交邻居都是障碍时仍可斜穿），默认 false */
  cornerCutting?: boolean;
  /** 障碍格子的值，默认 0 */
  blockedValue?: number;
  /** 启发函数，默认 euclidean */
  heuristic?: HeuristicType;
  /** 地形通行代价，默认恒为 1 */
  costOf?: (value: number, x: number, y: number) => number;
  /** 最大访问格子数（安全阀），默认 Infinity */
  maxVisited?: number;
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
 * 判断格子是否可通行
 */
export function isWalkable(
  grid: number[][],
  x: number,
  y: number,
  blockedValue: number = 0
): boolean {
  if (y < 0 || y >= grid.length) return false;
  const row = grid[y];
  if (!row || x < 0 || x >= row.length) return false;
  return row[x] !== blockedValue;
}

/**
 * 计算启发距离
 */
export function getHeuristic(
  from: IGridPoint,
  to: IGridPoint,
  type: HeuristicType = "euclidean"
): number {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  if (type === "manhattan") return dx + dy;
  if (type === "octile") {
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  }
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * A* 寻路
 * @param grid 网格，`grid[y][x]`
 * @param start 起点
 * @param end 终点
 * @param options 配置
 * @returns 路径点数组（包含起点与终点），不可达返回 null
 */
export function findPath(
  grid: number[][],
  start: IGridPoint,
  end: IGridPoint,
  options: IAStarOptions = {}
): IGridPoint[] | null {
  const height = grid.length;
  const width = height ? grid[0].length : 0;
  if (!width || !height) return null;

  const blockedValue = options.blockedValue ?? 0;
  const allowDiagonal = options.allowDiagonal ?? true;
  const diagonalCost = options.diagonalCost ?? Math.SQRT2;
  const cornerCutting = options.cornerCutting ?? false;
  const heuristicType = options.heuristic ?? "euclidean";
  const costOf = options.costOf ?? (() => 1);
  const maxVisited = options.maxVisited ?? Infinity;

  if (!isWalkable(grid, start.x, start.y, blockedValue)) return null;
  if (!isWalkable(grid, end.x, end.y, blockedValue)) return null;

  const size = width * height;
  const gScore = new Float64Array(size);
  gScore.fill(Infinity);
  const cameFrom = new Int32Array(size);
  cameFrom.fill(-1);
  const closed = new Uint8Array(size);
  const open = new PriorityQueue<number>();

  const startIndex = start.y * width + start.x;
  const endIndex = end.y * width + end.x;

  gScore[startIndex] = 0;
  open.push(startIndex, getHeuristic(start, end, heuristicType));

  let visited = 0;

  while (!open.isEmpty()) {
    const current = open.pop() as number;
    if (closed[current]) continue;
    closed[current] = 1;
    visited++;
    if (visited > maxVisited) return null;

    if (current === endIndex) {
      return reconstructPath(cameFrom, current, width);
    }

    const cx = current % width;
    const cy = (current - (current % width)) / width;

    const neighbors: Array<[number, number, number]> = [];
    for (const [dx, dy] of ORTHOGONAL) {
      neighbors.push([dx, dy, 1]);
    }
    if (allowDiagonal) {
      for (const [dx, dy] of DIAGONAL) {
        neighbors.push([dx, dy, diagonalCost]);
      }
    }

    for (const [dx, dy, stepCost] of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(grid, nx, ny, blockedValue)) continue;

      if (dx !== 0 && dy !== 0 && !cornerCutting) {
        if (
          !isWalkable(grid, cx + dx, cy, blockedValue) ||
          !isWalkable(grid, cx, cy + dy, blockedValue)
        ) {
          continue;
        }
      }

      const nextIndex = ny * width + nx;
      if (closed[nextIndex]) continue;

      const terrain = costOf(grid[ny][nx], nx, ny);
      const tentative = gScore[current] + stepCost * terrain;
      if (tentative < gScore[nextIndex]) {
        gScore[nextIndex] = tentative;
        cameFrom[nextIndex] = current;
        open.push(
          nextIndex,
          tentative + getHeuristic({ x: nx, y: ny }, end, heuristicType)
        );
      }
    }
  }

  return null;
}

/**
 * 回溯路径
 */
function reconstructPath(
  cameFrom: Int32Array,
  endIndex: number,
  width: number
): IGridPoint[] {
  const path: IGridPoint[] = [];
  let current = endIndex;
  while (current !== -1) {
    path.push({ x: current % width, y: (current - (current % width)) / width });
    current = cameFrom[current];
  }
  path.reverse();
  return path;
}

/**
 * 两点之间是否可直线通过（视线检测）
 *
 * 用于路径平滑：若可直线通过，则中间拐点可被裁掉
 */
export function hasLineOfSight(
  grid: number[][],
  from: IGridPoint,
  to: IGridPoint,
  options: IAStarOptions = {}
): boolean {
  const blockedValue = options.blockedValue ?? 0;
  if (!isWalkable(grid, to.x, to.y, blockedValue)) return false;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 4);
  if (steps === 0) return isWalkable(grid, from.x, from.y, blockedValue);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(from.x + dx * t);
    const y = Math.round(from.y + dy * t);
    if (!isWalkable(grid, x, y, blockedValue)) return false;
  }
  return true;
}

/**
 * 路径平滑（拉直）
 *
 * 贪心地把可直线通过的中间点裁掉，让路径更短更自然
 * @param grid 网格
 * @param path 原始路径
 * @param options 配置
 * @returns 平滑后的路径
 */
export function smoothPath(
  grid: number[][],
  path: IGridPoint[],
  options: IAStarOptions = {}
): IGridPoint[] {
  if (path.length <= 2) return path.slice();

  const result: IGridPoint[] = [path[0]];
  let anchor = 0;

  while (anchor < path.length - 1) {
    let farthest = anchor + 1;
    for (let j = path.length - 1; j > anchor + 1; j--) {
      if (hasLineOfSight(grid, path[anchor], path[j], options)) {
        farthest = j;
        break;
      }
    }
    result.push(path[farthest]);
    anchor = farthest;
  }

  return result;
}
