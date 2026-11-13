/**
 * 缓动函数集合
 *
 * 约定：入参 t 统一做 clamp01 处理，输出 f(0)=0、f(1)=1
 * back / elastic 族在区间内会溢出（overshoot），这是预期行为
 */

/** 缓动函数签名 */
export type EasingFunction = (t: number) => number;

/** 将 t 限制到 [0, 1] */
export function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

// ---------------- 基础 ----------------

/** 线性 */
export function linear(t: number): number {
  return clamp01(t);
}

/** 二次缓入 */
export function easeInQuad(t: number): number {
  const x = clamp01(t);
  return x * x;
}

/** 二次缓出 */
export function easeOutQuad(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

/** 二次缓入缓出 */
export function easeInOutQuad(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

// ---------------- 三次 ----------------

/** 三次缓入 */
export function easeInCubic(t: number): number {
  const x = clamp01(t);
  return x * x * x;
}

/** 三次缓出 */
export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

/** 三次缓入缓出 */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// ---------------- 四次 ----------------

/** 四次缓入 */
export function easeInQuart(t: number): number {
  const x = clamp01(t);
  return x * x * x * x;
}

/** 四次缓出 */
export function easeOutQuart(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 4);
}

/** 四次缓入缓出 */
export function easeInOutQuart(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

// ---------------- 五次 ----------------

/** 五次缓入 */
export function easeInQuint(t: number): number {
  const x = clamp01(t);
  return x * x * x * x * x;
}

/** 五次缓出 */
export function easeOutQuint(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 5);
}

/** 五次缓入缓出 */
export function easeInOutQuint(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

// ---------------- 正弦 ----------------

/** 正弦缓入 */
export function easeInSine(t: number): number {
  const x = clamp01(t);
  return 1 - Math.cos((x * Math.PI) / 2);
}

/** 正弦缓出 */
export function easeOutSine(t: number): number {
  const x = clamp01(t);
  return Math.sin((x * Math.PI) / 2);
}

/** 正弦缓入缓出 */
export function easeInOutSine(t: number): number {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

// ---------------- 指数 ----------------

/** 指数缓入 */
export function easeInExpo(t: number): number {
  const x = clamp01(t);
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}

/** 指数缓出 */
export function easeOutExpo(t: number): number {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

/** 指数缓入缓出 */
export function easeInOutExpo(t: number): number {
  const x = clamp01(t);
  if (x === 0) return 0;
  if (x === 1) return 1;
  return x < 0.5
    ? Math.pow(2, 20 * x - 10) / 2
    : (2 - Math.pow(2, -20 * x + 10)) / 2;
}

// ---------------- 圆形 ----------------

/** 圆形缓入 */
export function easeInCirc(t: number): number {
  const x = clamp01(t);
  return 1 - Math.sqrt(Math.max(0, 1 - x * x));
}

/** 圆形缓出 */
export function easeOutCirc(t: number): number {
  const x = clamp01(t);
  return Math.sqrt(Math.max(0, 1 - Math.pow(x - 1, 2)));
}

/** 圆形缓入缓出 */
export function easeInOutCirc(t: number): number {
  const x = clamp01(t);
  return x < 0.5
    ? (1 - Math.sqrt(Math.max(0, 1 - Math.pow(2 * x, 2)))) / 2
    : (Math.sqrt(Math.max(0, 1 - Math.pow(-2 * x + 2, 2))) + 1) / 2;
}

// ---------------- 回弹 ----------------

const BACK_SCALE = 1.70158;

/** 回弹缓入（会过冲） */
export function easeInBack(t: number): number {
  const x = clamp01(t);
  const c = BACK_SCALE + 1;
  return c * x * x * x - BACK_SCALE * x * x;
}

/** 回弹缓出（会过冲） */
export function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c = BACK_SCALE + 1;
  return 1 + c * Math.pow(x - 1, 3) + BACK_SCALE * Math.pow(x - 1, 2);
}

/** 回弹缓入缓出（会过冲） */
export function easeInOutBack(t: number): number {
  const x = clamp01(t);
  const c = BACK_SCALE * 1.525;
  return x < 0.5
    ? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2
    : (Math.pow(2 * x - 2, 2) * ((c + 1) * (2 * x - 2) + c) + 2) / 2;
}

// ---------------- 弹性 ----------------

/** 弹性缓入 */
export function easeInElastic(t: number): number {
  const x = clamp01(t);
  if (x === 0) return 0;
  if (x === 1) return 1;
  const c = (2 * Math.PI) / 3;
  return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c);
}

/** 弹性缓出 */
export function easeOutElastic(t: number): number {
  const x = clamp01(t);
  if (x === 0) return 0;
  if (x === 1) return 1;
  const c = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c) + 1;
}

/** 弹性缓入缓出 */
export function easeInOutElastic(t: number): number {
  const x = clamp01(t);
  if (x === 0) return 0;
  if (x === 1) return 1;
  const c = (2 * Math.PI) / 4.5;
  return x < 0.5
    ? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c)) / 2
    : (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c)) / 2 + 1;
}

// ---------------- 反弹 ----------------

/** 反弹缓出 */
export function easeOutBounce(t: number): number {
  const x = clamp01(t);
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) {
    const v = x - 1.5 / d1;
    return n1 * v * v + 0.75;
  }
  if (x < 2.5 / d1) {
    const v = x - 2.25 / d1;
    return n1 * v * v + 0.9375;
  }
  const v = x - 2.625 / d1;
  return n1 * v * v + 0.984375;
}

/** 反弹缓入 */
export function easeInBounce(t: number): number {
  return 1 - easeOutBounce(1 - clamp01(t));
}

/** 反弹缓入缓出 */
export function easeInOutBounce(t: number): number {
  const x = clamp01(t);
  if (x < 0.5) return (1 - easeOutBounce(1 - 2 * x)) / 2;
  return (1 + easeOutBounce(2 * x - 1)) / 2;
}

// ---------------- 工具类 ----------------

/** 平滑阶跃：在 [edge0, edge1] 区间内做平滑过渡 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** 更平滑的阶跃（二阶导连续） */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 反向插值：已知起止值反推 t */
export function inverseLerp(from: number, to: number, value: number): number {
  if (from === to) return 0;
  return (value - from) / (to - from);
}

/** 区间重映射 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMin === inMax) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * t;
}

/** 乒乓：在 0→1→0 之间往复 */
export function pingPong(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? x * 2 : 1 - (x - 0.5) * 2;
}

/** 全部缓动函数的集合 */
export const easings = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
} as const;

/** 缓动函数名称 */
export type EasingName = keyof typeof easings;
