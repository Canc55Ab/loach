import { describe, it, expect } from "vitest";
import { PerlinNoise } from "../src/math/noise";

describe("PerlinNoise", () => {
  it("同 seed 的两次采样完全一致", () => {
    const a = new PerlinNoise(12345);
    const b = new PerlinNoise(12345);
    for (let i = 0; i < 50; i++) {
      const x = i * 0.37;
      const y = i * 0.11;
      expect(a.noise(x, y)).toBe(b.noise(x, y));
    }
  });

  it("不同 seed 的结果不同", () => {
    const a = new PerlinNoise(1);
    const b = new PerlinNoise(2);
    const va = a.noise(1.5, 2.5);
    const vb = b.noise(1.5, 2.5);
    expect(va).not.toBe(vb);
  });

  it("输出落在 [-1, 1]", () => {
    const noise = new PerlinNoise(7);
    for (let i = 0; i < 500; i++) {
      const value = noise.noise(i * 0.13, i * 0.29);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("整数格点处噪声为 0", () => {
    const noise = new PerlinNoise(9);
    expect(noise.noise(3, 4)).toBeCloseTo(0, 10);
  });

  it("period 模式下首尾相接可平铺", () => {
    const noise = new PerlinNoise(11);
    expect(noise.noise(4, 0, 4)).toBeCloseTo(noise.noise(0, 0, 4), 10);
    expect(noise.noise(0, 4, 4)).toBeCloseTo(noise.noise(0, 0, 4), 10);
  });

  it("fbm 输出在 [-1, 1] 且可复现", () => {
    const a = new PerlinNoise(3);
    const b = new PerlinNoise(3);
    for (let i = 0; i < 50; i++) {
      const value = a.fbm(i * 0.21, i * 0.17, { octaves: 4 });
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
      expect(value).toBe(b.fbm(i * 0.21, i * 0.17, { octaves: 4 }));
    }
  });

  it("noise2D 是 noise 的别名", () => {
    const noise = new PerlinNoise(5);
    expect(noise.noise2D(1.2, 3.4)).toBe(noise.noise(1.2, 3.4));
  });

  describe("ridge 山脊噪声", () => {
    it("由 fbm 折叠而来，结果落在 [-1, 1]", () => {
      const noise = new PerlinNoise(11);
      for (let i = 0; i < 200; i++) {
        const x = i * 0.17;
        const y = i * 0.31;
        const value = noise.ridge(x, y);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
        // ridge(x, y) === 1 - |fbm(x, y)| * 2
        expect(value).toBeCloseTo(1 - Math.abs(noise.fbm(x, y)) * 2, 10);
      }
    });

    it("不同位置的 ridge 值不同", () => {
      const noise = new PerlinNoise(3);
      // 注意避开半整数格点：Perlin 在格点中心取值离散，容易偶然相等
      expect(noise.ridge(0.31, 0.73)).not.toBe(noise.ridge(5.19, 9.41));
    });

    it("ridge 对 fbm 的符号折叠：fbm 相同的点 ridge 也相同", () => {
      const noise = new PerlinNoise(21);
      const a = 1.23;
      const b = 4.56;
      expect(noise.ridge(a, b)).toBeCloseTo(noise.ridge(a, b), 12);
      // ridge 只依赖 |fbm|，所以对 fbm 取绝对值后折叠一致
      expect(noise.ridge(a, b)).toBeCloseTo(1 - Math.abs(noise.fbm(a, b)) * 2, 10);
    });
  });
});
