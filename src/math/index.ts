/**
 * 数学工具
 */

export * from "./vector2";
export * from "./vector3";
export * from "./quaternion";
export * from "./matrix4";
export * from "./plane";
export * from "./easing";
export * from "./noise";
export * from "./noise3d";
export * from "./random";
export * from "./random3d";

/**
 * 计算两点之间的距离
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @returns
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

/**
 * 返回 v 指向 v2 的有向角（弧度）
 *
 * 以 **+X 轴逆时针为正**，值域 (-π, π]；两点重合时返回 0
 * @param v 起点
 * @param v2 终点
 * @returns 弧度角
 */
export function rad(v: { x: number; y: number }, v2: { x: number; y: number }) {
  return Math.atan2(v2.y - v.y, v2.x - v.x);
}

/**
 * 绝对值
 * @param a
 * @returns
 */
export function abs(a: number) {
  if (a > 0) return a;
  if (a < 0) return -a;
  return 0;
}

/**
 * 生成区间内的随机数 [min, max)
 *
 * `from > to` 时自动交换上下界，`fixed` 省略时取 0 位小数
 * @param from 最小值（含）
 * @param to 最大值（不含）
 * @param fixed 保留小数位数
 * @returns
 */
export function random(from: number, to: number, fixed: number = 0): number {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const digits = Math.max(0, Math.floor(fixed));
  const scale = 10 ** digits;
  const step = 1 / scale;

  if (hi === lo) return Number(lo.toFixed(digits));

  const value = Math.round((Math.random() * (hi - lo) + lo) * scale) / scale;
  // 向上取整可能触达上界，这里压回区间内
  return value >= hi ? Number((hi - step).toFixed(digits)) : value;
}

/**
 * 生成区间内的随机非负整数 [min, max)
 *
 * 整数区间取 [ceil(min), floor(max))；`from > to` 时自动交换上下界
 * @param from 最小值（含）
 * @param to 最大值（不含）
 * @returns 整数
 */
export function randomUint(from: number, to: number): number {
  const lo = Math.ceil(Math.min(from, to));
  const hi = Math.floor(Math.max(from, to));
  if (hi <= lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo));
}
