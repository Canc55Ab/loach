/**
 * Perlin 噪声
 *
 * 适用于地形生成、随机摆放、粒子扰动、云雾等程序化场景。
 * 约定：
 * - 同 seed 的实例采样结果完全一致（可回放）
 * - `noise(x, y)` 输出落在 [-1, 1]
 * - 传入 `period` 时噪声在该周期上无缝平铺
 */

import { createRandom } from "./random";

/** fBm 等多层噪声的参数 */
export interface IPerlinOptions {
  /** 叠加层数，默认 4 */
  octaves?: number;
  /** 每层频率倍率，默认 2 */
  lacunarity?: number;
  /** 每层振幅衰减，默认 0.5 */
  gain?: number;
  /** 平铺周期，0 表示不平铺 */
  period?: number;
}

/** Perlin 噪声生成器 */
export class PerlinNoise {
  private readonly permutation: Uint8Array;

  constructor(seed: number = 0) {
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;

    const rand = createRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = base[i];
      base[i] = base[j];
      base[j] = tmp;
    }

    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    this.permutation = perm;
  }

  /** 五次平滑插值曲线 */
  private static fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /** 线性插值 */
  private static lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  /** 八个方向的梯度 */
  private static grad(hash: number, x: number, y: number): number {
    switch (hash & 7) {
      case 0:
        return x + y;
      case 1:
        return -x + y;
      case 2:
        return x - y;
      case 3:
        return -x - y;
      case 4:
        return x;
      case 5:
        return -x;
      case 6:
        return y;
      default:
        return -y;
    }
  }

  /**
   * 采样二维噪声
   * @param x 采样点 x
   * @param y 采样点 y
   * @param period 平铺周期，0 表示不平铺；大于 0 时噪声在该周期上首尾相接
   * @returns [-1, 1] 的噪声值
   */
  public noise(x: number, y: number, period: number = 0): number {
    let xi = Math.floor(x);
    let yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    let xi1 = xi + 1;
    let yi1 = yi + 1;

    if (period > 0) {
      xi = ((xi % period) + period) % period;
      yi = ((yi % period) + period) % period;
      xi1 = ((xi1 % period) + period) % period;
      yi1 = ((yi1 % period) + period) % period;
    }

    const perm = this.permutation;
    const aa = perm[perm[xi & 255] + (yi & 255)];
    const ab = perm[perm[xi & 255] + (yi1 & 255)];
    const ba = perm[perm[xi1 & 255] + (yi & 255)];
    const bb = perm[perm[xi1 & 255] + (yi1 & 255)];

    const u = PerlinNoise.fade(xf);
    const v = PerlinNoise.fade(yf);

    const x1 = PerlinNoise.lerp(
      PerlinNoise.grad(aa, xf, yf),
      PerlinNoise.grad(ba, xf - 1, yf),
      u
    );
    const x2 = PerlinNoise.lerp(
      PerlinNoise.grad(ab, xf, yf - 1),
      PerlinNoise.grad(bb, xf - 1, yf - 1),
      u
    );

    // 经典 Perlin 二维梯度最大幅度约 1.11，这里做一次安全裁剪保证落在 [-1, 1]
    const value = PerlinNoise.lerp(x1, x2, v);
    return value > 1 ? 1 : value < -1 ? -1 : value;
  }

  /** `noise` 的别名 */
  public noise2D(x: number, y: number, period: number = 0): number {
    return this.noise(x, y, period);
  }

  /**
   * 分形布朗运动（多层噪声叠加），用于自然的山地/云雾形态
   * @param x 采样点 x
   * @param y 采样点 y
   * @param options 层数/频率/振幅/平铺周期
   */
  public fbm(x: number, y: number, options: IPerlinOptions = {}): number {
    const octaves = options.octaves ?? 4;
    const lacunarity = options.lacunarity ?? 2;
    const gain = options.gain ?? 0.5;
    const period = options.period ?? 0;

    let amplitude = 1;
    let frequency = 1;
    let total = 0;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const layerPeriod = period > 0 ? period * frequency : 0;
      total += this.noise(x * frequency, y * frequency, layerPeriod) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return maxValue === 0 ? 0 : total / maxValue;
  }

  /**
   * 山脊噪声（ridged noise），适合山脉、裂缝、云层纹理
   */
  public ridge(x: number, y: number, options: IPerlinOptions = {}): number {
    const value = this.fbm(x, y, options);
    return 1 - Math.abs(value) * 2;
  }
}

export default PerlinNoise;
