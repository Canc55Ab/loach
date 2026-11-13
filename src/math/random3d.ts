/**
 * 三维随机工具
 *
 * 约定：全部函数可注入 PRNG（默认 `Math.random`），便于回放与测试
 */

import type { RandomFn } from "./random";

/**
 * 球内的随机点（体积均匀分布）
 * @param radius 半径
 */
export function randomPointInSphere(
  radius: number = 1,
  rng: RandomFn = Math.random
): { x: number; y: number; z: number } {
  // 立方根保证体积均匀，而不是半径均匀
  const scale = Math.cbrt(rng()) * Math.abs(radius);
  const theta = rng() * Math.PI * 2;
  const phi = Math.acos(2 * rng() - 1);
  const sinPhi = Math.sin(phi);
  return {
    x: scale * sinPhi * Math.cos(theta),
    y: scale * Math.cos(phi),
    z: scale * sinPhi * Math.sin(theta),
  };
}

/**
 * 球面上的随机点（半径恒定）
 */
export function randomPointOnSphere(
  radius: number = 1,
  rng: RandomFn = Math.random
): { x: number; y: number; z: number } {
  const theta = rng() * Math.PI * 2;
  const phi = Math.acos(2 * rng() - 1);
  const sinPhi = Math.sin(phi);
  return {
    x: radius * sinPhi * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * sinPhi * Math.sin(theta),
  };
}

/**
 * 随机单位方向向量
 */
export function randomDirection(
  rng: RandomFn = Math.random
): { x: number; y: number; z: number } {
  return randomPointOnSphere(1, rng);
}

/**
 * 立方体内的随机点
 * @param size 立方体边长
 */
export function randomPointInCube(
  size: number = 1,
  rng: RandomFn = Math.random
): { x: number; y: number; z: number } {
  const half = Math.abs(size) / 2;
  return {
    x: (rng() * 2 - 1) * half,
    y: (rng() * 2 - 1) * half,
    z: (rng() * 2 - 1) * half,
  };
}

/**
 * 立方体表面上的随机点
 */
export function randomPointOnCubeFace(
  size: number = 1,
  rng: RandomFn = Math.random
): { x: number; y: number; z: number } {
  const half = Math.abs(size) / 2;
  const face = Math.floor(rng() * 6);
  const u = (rng() * 2 - 1) * half;
  const v = (rng() * 2 - 1) * half;

  switch (face) {
    case 0:
      return { x: half, y: u, z: v };
    case 1:
      return { x: -half, y: u, z: v };
    case 2:
      return { x: u, y: half, z: v };
    case 3:
      return { x: u, y: -half, z: v };
    case 4:
      return { x: u, y: v, z: half };
    default:
      return { x: u, y: v, z: -half };
  }
}

/**
 * 随机单位四元数（Shoemake 方法，均匀分布在旋转空间）
 */
export function randomUnitQuaternion(rng: RandomFn = Math.random): {
  x: number;
  y: number;
  z: number;
  w: number;
} {
  const u1 = rng();
  const u2 = rng();
  const u3 = rng();
  const sqrt1 = Math.sqrt(1 - u1);
  const sqrt2 = Math.sqrt(u1);
  return {
    x: sqrt1 * Math.sin(2 * Math.PI * u2),
    y: sqrt1 * Math.cos(2 * Math.PI * u2),
    z: sqrt2 * Math.sin(2 * Math.PI * u3),
    w: sqrt2 * Math.cos(2 * Math.PI * u3),
  };
}

/**
 * 胶囊体内的随机点（沿线段分布后加球内偏移）
 */
export function randomPointInCapsule(
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  radius: number,
  rng: RandomFn = Math.random
): { x: number; y: number; z: number } {
  const t = rng();
  const onAxis = {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    z: start.z + (end.z - start.z) * t,
  };
  const offset = randomPointInSphere(radius, rng);
  return {
    x: onAxis.x + offset.x,
    y: onAxis.y + offset.y,
    z: onAxis.z + offset.z,
  };
}
