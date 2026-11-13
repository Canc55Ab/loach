/**
 * 随机数工具
 *
 * 约定：
 * - 全部函数可注入 PRNG（默认 `Math.random`），便于回放与测试
 * - `createRandom(seed)` 返回独立的伪随机函数，不污染全局状态
 */

/** 随机数函数签名，返回 [0, 1) */
export type RandomFn = () => number;

/**
 * 创建带种子的伪随机数发生器（mulberry32）
 * @param seed 种子，相同种子产生完全相同的序列
 * @returns 返回 [0, 1) 的随机函数
 */
export function createRandom(seed: number = Date.now()): RandomFn {
  let state = seed >>> 0;
  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 区间内的随机整数 [min, max)
 * @param min 下界（含）
 * @param max 上界（不含）
 * @param rng 随机源
 */
export function randomInt(
  min: number,
  to: number,
  rng: RandomFn = Math.random
): number {
  const lo = Math.ceil(Math.min(min, to));
  const hi = Math.floor(Math.max(min, to));
  if (hi <= lo) return lo;
  return lo + Math.floor(rng() * (hi - lo));
}

/**
 * 区间内的随机浮点数 [min, max)
 */
export function randomFloat(
  min: number,
  max: number,
  rng: RandomFn = Math.random
): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + rng() * (hi - lo);
}

/**
 * 以给定概率返回 true
 * @param probability 概率，0~1
 */
export function randomBool(
  probability: number = 0.5,
  rng: RandomFn = Math.random
): boolean {
  return rng() < probability;
}

/**
 * 随机返回 1 或 -1
 */
export function randomSign(rng: RandomFn = Math.random): number {
  return rng() < 0.5 ? -1 : 1;
}

/**
 * 随机取数组中的一个元素
 */
export function randomPick<T>(
  items: T[],
  rng: RandomFn = Math.random
): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(rng() * items.length)];
}

/**
 * 按权重随机取一个元素
 * @param items 候选项
 * @param weights 与候选项一一对应的权重，权重总和为 0 时退化为等概率
 */
export function weightedPick<T>(
  items: T[],
  weights: number[],
  rng: RandomFn = Math.random
): T | undefined {
  if (!items.length) return undefined;
  let total = 0;
  for (const weight of weights) {
    total += Math.max(0, weight);
  }
  if (total <= 0) return randomPick(items, rng);

  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= Math.max(0, weights[i] || 0);
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * 洗牌（返回新数组，不修改原数组）
 */
export function shuffle<T>(items: T[], rng: RandomFn = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/**
 * 无重复随机取样 count 个元素
 */
export function sample<T>(
  items: T[],
  count: number,
  rng: RandomFn = Math.random
): T[] {
  if (count >= items.length) return shuffle(items, rng);
  return shuffle(items, rng).slice(0, Math.max(0, count));
}

/**
 * 高斯分布（Box-Muller），用于伤害浮动等场景
 * @param mean 均值
 * @param standardDeviation 标准差
 */
export function gaussian(
  mean: number = 0,
  standardDeviation: number = 1,
  rng: RandomFn = Math.random
): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * standardDeviation;
}

/**
 * 圆内的随机点
 * @param radius 半径
 */
export function randomPointInCircle(
  radius: number = 1,
  rng: RandomFn = Math.random
): { x: number; y: number } {
  const angle = rng() * Math.PI * 2;
  const radius2 = Math.sqrt(rng()) * Math.abs(radius);
  return {
    x: Math.cos(angle) * radius2,
    y: Math.sin(angle) * radius2,
  };
}

/**
 * 圆周上的随机点
 */
export function randomPointOnCircle(
  radius: number = 1,
  rng: RandomFn = Math.random
): { x: number; y: number } {
  const angle = rng() * Math.PI * 2;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * 矩形内的随机点
 */
export function randomPointInRect(
  width: number,
  height: number,
  rng: RandomFn = Math.random
): { x: number; y: number } {
  return { x: rng() * width, y: rng() * height };
}

/**
 * 单位圆上的随机单位向量
 */
export function randomUnitVector(
  rng: RandomFn = Math.random
): { x: number; y: number } {
  const angle = rng() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/**
 * 近似正态的钟形分布（-1 ~ 1），常用于属性抖动
 */
export function bellCurve(rng: RandomFn = Math.random): number {
  return (rng() + rng() + rng() - 1.5) / 1.5;
}
