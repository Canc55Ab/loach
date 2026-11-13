/**
 * 转向行为（Steering Behaviors）
 *
 * 适用于群体 AI：追逐、逃跑、到达、游荡、避让等。
 * 约定：所有函数返回**期望速度向量**，不修改传入参数。
 */

import { Vector2 } from "../math/vector2";
import type { RandomFn } from "../math/random";

/** 游荡参数 */
export interface IWanderOptions {
  /** 游荡半径，默认 30 */
  radius?: number;
  /** 角度抖动幅度（弧度），默认 0.5 */
  jitter?: number;
  /** 当前朝向角 */
  angle?: number;
}

/**
 * 追逐目标
 */
export function seek(
  position: Vector2,
  target: Vector2,
  maxSpeed: number
): Vector2 {
  const desired = target.subtract(position);
  if (desired.isZero) return Vector2.zero();
  return desired.normalized().multiply(maxSpeed);
}

/**
 * 逃离目标
 */
export function flee(
  position: Vector2,
  target: Vector2,
  maxSpeed: number
): Vector2 {
  const desired = position.subtract(target);
  if (desired.isZero) return Vector2.zero();
  return desired.normalized().multiply(maxSpeed);
}

/**
 * 抵达目标：进入减速半径后逐步降低速度
 * @param slowRadius 减速半径
 */
export function arrive(
  position: Vector2,
  target: Vector2,
  maxSpeed: number,
  slowRadius: number = 100
): Vector2 {
  const offset = target.subtract(position);
  const distance = offset.length;
  if (distance === 0) return Vector2.zero();

  if (distance >= slowRadius) {
    return offset.normalized().multiply(maxSpeed);
  }

  const speed = (distance / Math.max(slowRadius, Number.EPSILON)) * maxSpeed;
  return offset.normalized().multiply(speed);
}

/**
 * 追踪目标（预测目标位置）
 * @param targetPosition 目标位置
 * @param targetVelocity 目标速度
 */
export function pursuit(
  position: Vector2,
  targetPosition: Vector2,
  targetVelocity: Vector2,
  maxSpeed: number,
  lookAhead: number = 1
): Vector2 {
  const predicted = targetPosition.add(targetVelocity.multiply(lookAhead));
  return seek(position, predicted, maxSpeed);
}

/**
 * 游荡：在当前朝向附近随机偏移
 * @param options 游荡参数
 * @param rng 随机源
 * @returns 期望速度
 */
export function wander(
  position: Vector2,
  velocity: Vector2,
  maxSpeed: number,
  options: IWanderOptions = {},
  rng: RandomFn = Math.random
): Vector2 {
  const radius = options.radius ?? 30;
  const jitter = options.jitter ?? 0.5;
  const currentAngle = options.angle ?? velocity.angle;

  const target = position.add(
    Vector2.fromAngle(currentAngle + (rng() * 2 - 1) * jitter, radius)
  );
  return seek(position, target, maxSpeed);
}

/**
 * 分离：远离过近的邻居
 * @param neighbors 邻居位置列表
 * @param radius 影响半径
 */
export function separation(
  position: Vector2,
  neighbors: Vector2[],
  maxSpeed: number,
  radius: number = 50
): Vector2 {
  let steerX = 0;
  let steerY = 0;
  let count = 0;

  for (const neighbor of neighbors) {
    const diff = position.subtract(neighbor);
    const distance = diff.length;
    if (distance === 0 || distance > radius) continue;
    steerX += (diff.x / distance) * (radius - distance);
    steerY += (diff.y / distance) * (radius - distance);
    count++;
  }

  if (!count) return Vector2.zero();
  const steer = new Vector2(steerX, steerY);
  if (steer.isZero) return Vector2.zero();
  return steer.normalized().multiply(maxSpeed);
}

/**
 * 对齐：与邻居平均朝向一致
 */
export function alignment(
  position: Vector2,
  neighbors: Vector2[],
  maxSpeed: number
): Vector2 {
  if (!neighbors.length) return Vector2.zero();
  let sumX = 0;
  let sumY = 0;
  for (const neighbor of neighbors) {
    sumX += neighbor.x - position.x;
    sumY += neighbor.y - position.y;
  }
  const average = new Vector2(sumX / neighbors.length, sumY / neighbors.length);
  if (average.isZero) return Vector2.zero();
  return average.normalized().multiply(maxSpeed);
}

/**
 * 聚集：朝向邻居质心
 */
export function cohesion(
  position: Vector2,
  neighbors: Vector2[],
  maxSpeed: number
): Vector2 {
  if (!neighbors.length) return Vector2.zero();
  let sumX = 0;
  let sumY = 0;
  for (const neighbor of neighbors) {
    sumX += neighbor.x;
    sumY += neighbor.y;
  }
  const center = new Vector2(sumX / neighbors.length, sumY / neighbors.length);
  return seek(position, center, maxSpeed);
}

/**
 * 转向力合成：把期望速度转换成受最大转向力约束的加速度
 * @param currentVelocity 当前速度
 * @param desiredVelocity 期望速度
 * @param maxForce 最大转向力
 * @returns 转向力向量
 */
export function steer(
  currentVelocity: Vector2,
  desiredVelocity: Vector2,
  maxForce: number
): Vector2 {
  const force = desiredVelocity.subtract(currentVelocity);
  return force.limit(maxForce);
}

/**
 * 限制向量长度
 */
export function clampLength(vector: Vector2, max: number): Vector2 {
  return vector.limit(max);
}
