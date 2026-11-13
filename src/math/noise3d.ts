/**
 * 三维 Perlin 噪声
 *
 * 适用于体积云、烟雾、地形细节、洞穴分布等程序化场景。
 * 约定：
 * - 同 seed 的实例采样结果完全一致（可回放）
 * - `noise(x, y, z)` 输出落在 [-1, 1]
 * - 传入 `period` 时噪声在该周期上三轴同时无缝平铺
 */

import { createRandom } from "./random";

/** fBm 等多层噪声的参数 */
export interface IPerlin3DOptions {
  /** 叠加层数，默认 4 */
  octaves?: number;
  /** 每层频率倍率，默认 2 */
  lacunarity?: number;
  /** 每层振幅衰减，默认 0.5 */
  gain?: number;
  /** 平铺周期，0 表示不平铺 */
  period?: number;
}

/** 三维 Perlin 噪声生成器 */
export class PerlinNoise3D {
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

  /** 立方体 12 条棱方向上的梯度 */
  private static grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * 采样三维噪声
   * @param x 采样点 x
   * @param y 采样点 y
   * @param z 采样点 z
   * @param period 平铺周期，0 表示不平铺
   * @returns [-1, 1] 的噪声值
   */
  public noise(x: number, y: number, z: number, period: number = 0): number {
    let xi = Math.floor(x);
    let yi = Math.floor(y);
    let zi = Math.floor(z);
    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;
    let xi1 = xi + 1;
    let yi1 = yi + 1;
    let zi1 = zi + 1;

    if (period > 0) {
      xi = ((xi % period) + period) % period;
      yi = ((yi % period) + period) % period;
      zi = ((zi % period) + period) % period;
      xi1 = ((xi1 % period) + period) % period;
      yi1 = ((yi1 % period) + period) % period;
      zi1 = ((zi1 % period) + period) % period;
    }

    const perm = this.permutation;
    const aaa = perm[perm[perm[xi & 255] + (yi & 255)] + (zi & 255)];
    const aba = perm[perm[perm[xi & 255] + (yi1 & 255)] + (zi & 255)];
    const aab = perm[perm[perm[xi & 255] + (yi & 255)] + (zi1 & 255)];
    const abb = perm[perm[perm[xi & 255] + (yi1 & 255)] + (zi1 & 255)];
    const baa = perm[perm[perm[xi1 & 255] + (yi & 255)] + (zi & 255)];
    const bba = perm[perm[perm[xi1 & 255] + (yi1 & 255)] + (zi & 255)];
    const bab = perm[perm[perm[xi1 & 255] + (yi & 255)] + (zi1 & 255)];
    const bbb = perm[perm[perm[xi1 & 255] + (yi1 & 255)] + (zi1 & 255)];

    const u = PerlinNoise3D.fade(xf);
    const v = PerlinNoise3D.fade(yf);
    const w = PerlinNoise3D.fade(zf);

    const x1 = PerlinNoise3D.lerp(
      PerlinNoise3D.grad(aaa, xf, yf, zf),
      PerlinNoise3D.grad(baa, xf - 1, yf, zf),
      u
    );
    const x2 = PerlinNoise3D.lerp(
      PerlinNoise3D.grad(aba, xf, yf - 1, zf),
      PerlinNoise3D.grad(bba, xf - 1, yf - 1, zf),
      u
    );
    const y1 = PerlinNoise3D.lerp(x1, x2, v);

    const x3 = PerlinNoise3D.lerp(
      PerlinNoise3D.grad(aab, xf, yf, zf - 1),
      PerlinNoise3D.grad(bab, xf - 1, yf, zf - 1),
      u
    );
    const x4 = PerlinNoise3D.lerp(
      PerlinNoise3D.grad(abb, xf, yf - 1, zf - 1),
      PerlinNoise3D.grad(bbb, xf - 1, yf - 1, zf - 1),
      u
    );
    const y2 = PerlinNoise3D.lerp(x3, x4, v);

    const value = PerlinNoise3D.lerp(y1, y2, w);
    // 三维梯度最大幅度略大于 1，这里裁剪保证落在 [-1, 1]
    return value > 1 ? 1 : value < -1 ? -1 : value;
  }

  /** `noise` 的别名 */
  public noise3D(x: number, y: number, z: number, period: number = 0): number {
    return this.noise(x, y, z, period);
  }

  /**
   * 分形布朗运动（多层噪声叠加）
   */
  public fbm(x: number, y: number, z: number, options: IPerlin3DOptions = {}): number {
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
      total +=
        this.noise(x * frequency, y * frequency, z * frequency, layerPeriod) *
        amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return maxValue === 0 ? 0 : total / maxValue;
  }

  /**
   * 山脊噪声
   */
  public ridge(x: number, y: number, z: number, options: IPerlin3DOptions = {}): number {
    return 1 - Math.abs(this.fbm(x, y, z, options)) * 2;
  }
}

export default PerlinNoise3D;
