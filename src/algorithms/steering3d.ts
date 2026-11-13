/**
 * 三维转向行为（Steering Behaviors）
 *
 * 适用于 3D 群体 AI：追逐、逃跑、抵达、游荡、避让等。
 * 约定：所有函数返回**期望速度向量**，不修改传入参数。
 */

import { Vector3 } from "../math/vector3";
import type { IVector3Like } from "../math/vector3";
import type { RandomFn } from "../math/random";

/** 游荡参数 */
export interface IWander3DOptions {
  /** 游荡半径，默认 30 */
  radius?: number;
  /** 方向抖动幅度（弧度），默认 0.5 */
  jitter?: number;
  /** 当前朝向（单位向量） */
  direction?: IVector3Like;
}

/**
 * 追逐目标
 */
export function seek3d(
  position: IVector3Like,
  target: IVector3Like,
  maxSpeed: number
): Vector3 {
  const desired = new Vector3(target.x, target.y, target.z).subtract(
    new Vector3(position.x, position.y, position.z)
  );
  if (desired.isZero) return Vector3.zero();
  return desired.normalized().multiply(maxSpeed);
}

/**
 * 逃离目标
 */
export function flee3d(
  position: IVector3Like,
  target: IVector3Like,
  maxSpeed: number
): Vector3 {
  const desired = new Vector3(position.x, position.y, position.z).subtract(
    new Vector3(target.x, target.y, target.z)
  );
  if (desired.isZero) return Vector3.zero();
  return desired.normalized().multiply(maxSpeed);
}

/**
 * 抵达目标：进入减速半径后逐步降低速度
 */
export function arrive3d(
  position: IVector3Like,
  target: IVector3Like,
  maxSpeed: number,
  slowRadius: number = 100
): Vector3 {
  const offset = new Vector3(target.x, target.y, target.z).subtract(
    new Vector3(position.x, position.y, position.z)
  );
  const distance = offset.length;
  if (distance === 0) return Vector3.zero();

  if (distance >= slowRadius) {
    return offset.normalized().multiply(maxSpeed);
  }

  const speed = (distance / Math.max(slowRadius, Number.EPSILON)) * maxSpeed;
  return offset.normalized().multiply(speed);
}

/**
 * 追踪目标（预测目标位置）
 */
export function pursuit3d(
  position: IVector3Like,
  targetPosition: IVector3Like,
  targetVelocity: IVector3Like,
  maxSpeed: number,
  lookAhead: number = 1
): Vector3 {
  const predicted = new Vector3(
    targetPosition.x,
    targetPosition.y,
    targetPosition.z
  ).add(new Vector3(targetVelocity.x, targetVelocity.y, targetVelocity.z).multiply(lookAhead));
  return seek3d(position, predicted, maxSpeed);
}

/**
 * 游荡：在当前朝向上随机偏移
 */
export function wander3d(
  position: IVector3Like,
  velocity: IVector3Like,
  maxSpeed: number,
  options: IWander3DOptions = {},
  rng: RandomFn = Math.random
): Vector3 {
  const radius = options.radius ?? 30;
  const jitter = options.jitter ?? 0.5;
  const current = options.direction
    ? new Vector3(options.direction.x, options.direction.y, options.direction.z).normalized()
    : new Vector3(velocity.x, velocity.y, velocity.z).normalized();

  if (current.isZero) current.set(0, 0, 1);

  // 在当前朝向基础上叠加一个随机扰动轴
  const axis = Math.abs(current.y) < 0.9 ? Vector3.up() : Vector3.right();
  const tangent = current.cross(axis).normalized();
  const bitangent = current.cross(tangent).normalized();

  const offset = tangent
    .multiply(Math.cos((rng() * 2 - 1) * jitter))
    .add(bitangent.multiply(Math.sin((rng() * 2 - 1) * jitter)))
    .normalized()
    .multiply(radius);

  const target = new Vector3(position.x, position.y, position.z).add(offset);
  return seek3d(position, target, maxSpeed);
}

/**
 * 分离：远离过近的邻居
 */
export function separation3d(
  position: IVector3Like,
  neighbors: IVector3Like[],
  maxSpeed: number,
  radius: number = 50
): Vector3 {
  let steerX = 0;
  let steerY = 0;
  let steerZ = 0;
  let count = 0;

  for (const neighbor of neighbors) {
    const diff = new Vector3(position.x, position.y, position.z).subtract(
      new Vector3(neighbor.x, neighbor.y, neighbor.z)
    );
    const distance = diff.length;
    if (distance === 0 || distance > radius) continue;
    const weight = (radius - distance) / radius;
    steerX += (diff.x / distance) * weight;
    steerY += (diff.y / distance) * weight;
    steerZ += (diff.z / distance) * weight;
    count++;
  }

  if (!count) return Vector3.zero();
  const steer = new Vector3(steerX, steerY, steerZ);
  if (steer.isZero) return Vector3.zero();
  return steer.normalized().multiply(maxSpeed);
}

/**
 * 对齐：与邻居平均朝向一致
 */
export function alignment3d(
  position: IVector3Like,
  neighbors: IVector3Like[],
  maxSpeed: number
): Vector3 {
  if (!neighbors.length) return Vector3.zero();
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (const neighbor of neighbors) {
    sumX += neighbor.x - position.x;
    sumY += neighbor.y - position.y;
    sumZ += neighbor.z - position.z;
  }
  const average = new Vector3(
    sumX / neighbors.length,
    sumY / neighbors.length,
    sumZ / neighbors.length
  );
  if (average.isZero) return Vector3.zero();
  return average.normalized().multiply(maxSpeed);
}

/**
 * 聚集：朝向邻居质心
 */
export function cohesion3d(
  position: IVector3Like,
  neighbors: IVector3Like[],
  maxSpeed: number
): Vector3 {
  if (!neighbors.length) return Vector3.zero();
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (const neighbor of neighbors) {
    sumX += neighbor.x;
    sumY += neighbor.y;
    sumZ += neighbor.z;
  }
  const center = new Vector3(
    sumX / neighbors.length,
    sumY / neighbors.length,
    sumZ / neighbors.length
  );
  return seek3d(position, center, maxSpeed);
}

/**
 * 转向力合成：把期望速度转换成受最大转向力约束的加速度
 */
export function steer3d(
  currentVelocity: IVector3Like,
  desiredVelocity: IVector3Like,
  maxForce: number
): Vector3 {
  const force = new Vector3(
    desiredVelocity.x - currentVelocity.x,
    desiredVelocity.y - currentVelocity.y,
    desiredVelocity.z - currentVelocity.z
  );
  return force.limit(maxForce);
}
