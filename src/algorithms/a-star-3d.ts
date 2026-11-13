/**
 * 体素 3D A* 寻路
 *
 * 网格约定：`grid[z][y][x]`，值为 `blockedValue`（默认 1）表示实心，0 表示空。
 * 寻路走在**可站立体素**上：自身为空且正下方为实心。
 *
 * 移动规则：
 * - 平走：高度不变，落点可站立
 * - 爬升：目标高度差 ≤ `maxStep`（默认 1）
 * - 坠落：下落高度 ≤ `maxDrop`（默认无限）
 * - 跳跃：目标高度差 ≤ `maxJump`（默认 0，即不允许跳跃），且需要起跳空间
 */

import { PriorityQueue } from "../patterns/priority-queue";
import type { IVector3Like } from "../math/vector3";

/** 3D A* 配置 */
export interface IAStar3DOptions {
  /** 最大爬升高度，默认 1 */
  maxStep?: number;
  /** 最大跳跃高度，默认 0（不允许跳跃） */
  maxJump?: number;
  /** 最大坠落高度，默认 Infinity */
  maxDrop?: number;
  /** 爬升一格的额外代价，默认 1 */
  climbCost?: number;
  /** 跳跃一次的额外代价，默认 3 */
  jumpCost?: number;
  /** 坠落一格的额外代价，默认 0.5 */
  dropCost?: number;
  /** 实心格子的值，默认 1 */
  blockedValue?: number;
}

/** 网格尺寸 */
export interface IVoxelGridSize {
  width: number;
  height: number;
  depth: number;
}

/**
 * 读取网格尺寸
 */
export function getGridSize3d(grid: number[][][]): IVoxelGridSize {
  const depth = grid.length;
  const height = depth ? grid[0].length : 0;
  const width = height ? grid[0][0].length : 0;
  return { width, height, depth };
}

/**
 * 判断体素是否实心
 */
export function isSolid(
  grid: number[][][],
  x: number,
  y: number,
  z: number,
  blockedValue: number = 1
): boolean {
  const layer = grid[z];
  if (!layer) return true;
  const row = layer[y];
  if (!row) return true;
  return row[x] === blockedValue;
}

/**
 * 判断体素是否可站立（自身为空且下方实心）
 */
export function isStandable(
  grid: number[][][],
  x: number,
  y: number,
  z: number,
  blockedValue: number = 1
): boolean {
  if (isSolid(grid, x, y, z, blockedValue)) return false;
  if (y < 0) return false;
  return isSolid(grid, x, y - 1, z, blockedValue);
}

/**
 * 体素 3D A* 寻路
 * @param grid 体素网格 `grid[z][y][x]`
 * @param start 起点（需可站立）
 * @param end 终点（需可站立）
 * @param options 配置
 * @returns 路径点数组（包含起点与终点），不可达返回 null
 */
export function findPath3d(
  grid: number[][][],
  start: IVector3Like,
  end: IVector3Like,
  options: IAStar3DOptions = {}
): IVector3Like[] | null {
  const { width, height, depth } = getGridSize3d(grid);
  if (!width || !height || !depth) return null;

  const blockedValue = options.blockedValue ?? 1;
  const maxStep = options.maxStep ?? 1;
  const maxJump = options.maxJump ?? 0;
  const maxDrop = options.maxDrop ?? Infinity;
  const climbCost = options.climbCost ?? 1;
  const jumpCost = options.jumpCost ?? 3;
  const dropCost = options.dropCost ?? 0.5;

  const startX = Math.round(start.x);
  const startY = Math.round(start.y);
  const startZ = Math.round(start.z);
  const endX = Math.round(end.x);
  const endY = Math.round(end.y);
  const endZ = Math.round(end.z);

  if (!isStandable(grid, startX, startY, startZ, blockedValue)) return null;
  if (!isStandable(grid, endX, endY, endZ, blockedValue)) return null;

  const size = width * height * depth;
  const gScore = new Float64Array(size);
  gScore.fill(Infinity);
  const cameFrom = new Int32Array(size);
  cameFrom.fill(-1);
  const closed = new Uint8Array(size);
  const open = new PriorityQueue<number>();

  const toIndex = (x: number, y: number, z: number): number =>
    (z * height + y) * width + x;

  const heuristic = (x: number, y: number, z: number): number => {
    const dx = Math.abs(x - endX);
    const dy = Math.abs(y - endY);
    const dz = Math.abs(z - endZ);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const startIndex = toIndex(startX, startY, startZ);
  const endIndex = toIndex(endX, endY, endZ);

  gScore[startIndex] = 0;
  open.push(startIndex, heuristic(startX, startY, startZ));

  /** 水平方向四邻居 */
  const directions: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (!open.isEmpty()) {
    const current = open.pop() as number;
    if (closed[current]) continue;
    closed[current] = 1;

    if (current === endIndex) {
      return reconstruct3d(cameFrom, current, width, height);
    }

    const cx = current % width;
    const cy = Math.floor(current / width) % height;
    const cz = Math.floor(current / (width * height));

    for (const [dx, dz] of directions) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= depth) continue;

      // 收集该列上的候选落点，取代价最低者
      let bestCost = Infinity;
      let bestY = -1;

      // 平走 / 爬升：自下而上找最近的可站立高度
      for (let dy = 0; dy <= maxStep; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= height) break;
        // 不是落脚点就继续往上找（台阶本身是实心的，不算阻挡）
        if (!isStandable(grid, nx, ny, nz, blockedValue)) continue;

        const cost = 1 + climbCost * dy;
        if (cost < bestCost) {
          bestCost = cost;
          bestY = ny;
        }
        break; // 只取最近的落脚点
      }

      // 跳跃：落点高于 maxStep，允许越过障碍（墙、平台侧面）
      if (maxJump > maxStep && !isSolid(grid, cx, cy + 1, cz)) {
        for (let dy = maxStep + 1; dy <= maxJump; dy++) {
          const ny = cy + dy;
          if (ny >= height) break;
          if (!isStandable(grid, nx, ny, nz, blockedValue)) continue;

          const cost = 1 + jumpCost;
          if (cost < bestCost) {
            bestCost = cost;
            bestY = ny;
          }
          break;
        }
      }

      // 坠落
      for (let dy = 1; dy <= maxDrop; dy++) {
        const ny = cy - dy;
        if (ny < 0) break;
        if (isSolid(grid, nx, ny, nz, blockedValue)) break;
        if (!isStandable(grid, nx, ny, nz, blockedValue)) continue;
        const cost = 1 + dropCost * dy;
        if (cost < bestCost) {
          bestCost = cost;
          bestY = ny;
        }
        break;
      }

      if (bestY < 0) continue;

      const nextIndex = toIndex(nx, bestY, nz);
      if (closed[nextIndex]) continue;

      const tentative = gScore[current] + bestCost;
      if (tentative < gScore[nextIndex]) {
        gScore[nextIndex] = tentative;
        cameFrom[nextIndex] = current;
        open.push(nextIndex, tentative + heuristic(nx, bestY, nz));
      }
    }
  }

  return null;
}

/**
 * 回溯路径
 */
function reconstruct3d(
  cameFrom: Int32Array,
  endIndex: number,
  width: number,
  height: number
): IVector3Like[] {
  const path: IVector3Like[] = [];
  let current = endIndex;

  while (current !== -1) {
    const x = current % width;
    const y = Math.floor(current / width) % height;
    const z = Math.floor(current / (width * height));
    path.push({ x, y, z });
    current = cameFrom[current];
  }

  path.reverse();
  return path;
}
