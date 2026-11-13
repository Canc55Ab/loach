import { describe, it, expect } from "vitest";
import { PerlinNoise3D } from "../src/math/noise3d";

describe("PerlinNoise3D", () => {
  it("同 seed 的两次采样完全一致", () => {
    const a = new PerlinNoise3D(12345);
    const b = new PerlinNoise3D(12345);
    for (let i = 0; i < 50; i++) {
      const x = i * 0.37;
      const y = i * 0.11;
      const z = i * 0.23;
      expect(a.noise(x, y, z)).toBe(b.noise(x, y, z));
    }
  });

  it("不同 seed 的结果不同", () => {
    const a = new PerlinNoise3D(1);
    const b = new PerlinNoise3D(2);
    expect(a.noise(1.5, 2.5, 3.5)).not.toBe(b.noise(1.5, 2.5, 3.5));
  });

  it("输出落在 [-1, 1]", () => {
    const noise = new PerlinNoise3D(7);
    for (let i = 0; i < 500; i++) {
      const value = noise.noise(i * 0.13, i * 0.29, i * 0.17);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("整数格点处噪声为 0", () => {
    const noise = new PerlinNoise3D(9);
    expect(noise.noise(3, 4, 5)).toBeCloseTo(0, 10);
  });

  it("period 模式下三轴首尾相接可平铺", () => {
    const noise = new PerlinNoise3D(11);
    expect(noise.noise(4, 0, 0, 4)).toBeCloseTo(noise.noise(0, 0, 0, 4), 10);
    expect(noise.noise(0, 4, 0, 4)).toBeCloseTo(noise.noise(0, 0, 0, 4), 10);
    expect(noise.noise(0, 0, 4, 4)).toBeCloseTo(noise.noise(0, 0, 0, 4), 10);
  });

  it("fbm 输出在 [-1, 1] 且可复现", () => {
    const a = new PerlinNoise3D(3);
    const b = new PerlinNoise3D(3);
    for (let i = 0; i < 50; i++) {
      const value = a.fbm(i * 0.21, i * 0.17, i * 0.13, { octaves: 4 });
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
      expect(value).toBe(b.fbm(i * 0.21, i * 0.17, i * 0.13, { octaves: 4 }));
    }
  });

  it("noise3D 是 noise 的别名", () => {
    const noise = new PerlinNoise3D(5);
    expect(noise.noise3D(1.2, 3.4, 5.6)).toBe(noise.noise(1.2, 3.4, 5.6));
  });
});

describe("PerlinNoise3D ridge", () => {
  it("ridge 等于 fbm 的脊状变换", () => {
    const noise = new PerlinNoise3D(31);
    const options = { octaves: 3, lacunarity: 2, gain: 0.5 };
    for (let i = 0; i < 50; i++) {
      const x = i * 0.31;
      const y = i * 0.17;
      const z = i * 0.23;
      expect(noise.ridge(x, y, z, options)).toBeCloseTo(
        1 - Math.abs(noise.fbm(x, y, z, options)) * 2,
        10
      );
    }
  });

  it("ridge 输出落在 [-1, 1] 且同 seed 可复现", () => {
    const a = new PerlinNoise3D(32);
    const b = new PerlinNoise3D(32);
    for (let i = 0; i < 50; i++) {
      const value = a.ridge(i * 0.19, i * 0.27, i * 0.11);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
      expect(value).toBe(b.ridge(i * 0.19, i * 0.27, i * 0.11));
    }
  });

  it("ridge 缺省参数可用", () => {
    const noise = new PerlinNoise3D(33);
    expect(noise.ridge(1.5, 2.5, 3.5)).toBeCloseTo(
      1 - Math.abs(noise.fbm(1.5, 2.5, 3.5)) * 2,
      10
    );
  });
});

describe("PerlinNoise3D fbm 参数", () => {
  it("octaves 为 0 时返回 0", () => {
    const noise = new PerlinNoise3D(34);
    expect(noise.fbm(1.5, 2.5, 3.5, { octaves: 0 })).toBe(0);
  });

  it("缺省 octaves 为 4", () => {
    const noise = new PerlinNoise3D(35);
    expect(noise.fbm(1.5, 2.5, 3.5)).toBe(noise.fbm(1.5, 2.5, 3.5, { octaves: 4 }));
  });

  it("gain 为 0 时只剩第一层", () => {
    const noise = new PerlinNoise3D(36);
    expect(noise.fbm(1.5, 2.5, 3.5, { octaves: 3, gain: 0 })).toBeCloseTo(
      noise.noise(1.5, 2.5, 3.5),
      10
    );
  });

  it("lacunarity 为 1 时各层同频", () => {
    const noise = new PerlinNoise3D(37);
    expect(noise.fbm(1.5, 2.5, 3.5, { octaves: 2, lacunarity: 1 })).toBeCloseTo(
      noise.noise(1.5, 2.5, 3.5),
      10
    );
  });

  it("period 模式下三轴均可平铺", () => {
    const noise = new PerlinNoise3D(38);
    const period = 4;
    for (let i = 0; i < 20; i++) {
      const x = i * 0.37;
      const y = i * 0.11;
      const z = i * 0.53;
      const base = noise.fbm(x, y, z, { period, octaves: 3 });
      expect(noise.fbm(x + period, y, z, { period, octaves: 3 })).toBeCloseTo(base, 10);
      expect(noise.fbm(x, y + period, z, { period, octaves: 3 })).toBeCloseTo(base, 10);
      expect(noise.fbm(x, y, z + period, { period, octaves: 3 })).toBeCloseTo(base, 10);
    }
  });
});
