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
 * 返回两点之间的角度
 * @param v
 * @param v2
 * @returns
 */
export function rad(v: { x: number; y: number }, v2: { x: number; y: number }) {
  var x = v2.x - v.x;
  var y = v2.y - v2.x;
  var Hypotenuse = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  var angle = x / Hypotenuse;
  var rad = Math.acos(angle);
  if (v2.y < v.y) {
    rad = -rad;
  }
  return rad;
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
 * 生成随机数
 * @param from 最小值
 * @param to 最大值
 * @param fixed 保留小数位数
 * @returns
 */
export function random(from: number, to: number, fixed: number): number {
  return (
    Math.round(Math.random() * (to - from) * 10 ** fixed) / 10 ** fixed + from
  );
}

/**
 * 生成随机数 uint
 * @param from 最小值
 * @param to 最大值
 * @param fixed 保留小数位数
 * @returns
 */
export function randomUint(from: number, to: number, fixed: number): number {
  return (
    Math.round(Math.random() * (to - from) * 10 ** fixed) / 10 ** fixed + from
  );
}
