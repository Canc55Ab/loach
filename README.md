# loach

TypeScript 数据结构与游戏开发算法工具库。零运行时依赖。

## 安装

```bash
npm install 55ab-loach
```

## 使用

```typescript
import {
  Stack,
  Queue,
  QuadTree,
  AsyncQueue,
  Vector2,
  PriorityQueue,
  ObjectPool,
  StateMachine,
  SpatialGrid,
  PerlinNoise,
  findPath,
  computeFlowField,
  math,
  easing,
  random,
  noise,
  collision,
  steering,
  aStar,
  flowField,
} from "55ab-loach";
```

### 入口与摇树优化

包通过 `exports` 字段区分入口，ESM 与 CJS 各走一份产物：

| 消费方式         | 解析到                | 说明                                   |
| ---------------- | --------------------- | -------------------------------------- |
| `import`（ESM）  | `dist/index.esm.js`   | 真 ESM 产物，支持 tree-shaking        |
| `require`（CJS） | `dist/index.cjs.cjs`  | CommonJS 产物                         |
| TypeScript       | `dist/index.d.ts`     | 类型声明                              |

命名空间导出（`math` / `easing` / `collision` / `collision3d` 等）在产物中已标注 `/* @__PURE__ */`，
下游打包器可以整体摇掉没用到的那一组。实测（esbuild 压缩后）：

| 导入方式                 | 产物体积     |
| ------------------------ | ------------ |
| 仅 `Vector3`             | 约 3.9 KB    |
| 仅 `Frustum`             | 约 6.0 KB    |
| `import * as m`（全量）  | 约 81.6 KB   |

> 命名空间是「整组引入」——`import { collision3d }` 会带上该命名空间的全部成员。
> 只需要单个能力时，优先用具名导出（如 `import { Vector3 }`），摇树效果最好。

---

## Stack 栈

后进先出（LIFO）数据结构。

### 构造

```typescript
const stack = new Stack<number>();
const stack = new Stack<number>({ maxCount: 100, items: [1, 2, 3] });
```

### API

| 方法                | 说明                       |
| ------------------- | -------------------------- |
| `push(item)`        | 入栈                       |
| `pushs(items)`      | 批量入栈                   |
| `pop()`             | 出栈，空栈返回 `undefined` |
| `pops(count)`       | 批量出栈                   |
| `peek()`            | 返回栈顶元素               |
| `isEmpty()`         | 栈是否为空                 |
| `isFull()`          | 栈是否已满                 |
| `size()`            | 栈长度                     |
| `clear()`           | 清空栈                     |
| `includes(item)`    | 是否包含元素               |
| `indexOf(item)`     | 查找元素索引               |
| `remove(item)`      | 移除指定元素               |
| `toArray()`         | 转为数组                   |
| `forEach(callback)` | 遍历                       |
| `toString()`        | 字符串表示                 |

**属性**：`maxCount`（可读写，默认 1000）

---

## Queue 队列

先进先出（FIFO）数据结构。

### 构造

```typescript
const queue = new Queue<number>();
const queue = new Queue<number>({ maxCount: 100, items: [1, 2, 3] });
```

### API

| 方法                | 说明                         |
| ------------------- | ---------------------------- |
| `enQueue(item)`     | 入队                         |
| `enQueues(items)`   | 批量入队                     |
| `deQueue()`         | 出队，空队列返回 `undefined` |
| `deQueues(count)`   | 批量出队                     |
| `front()`           | 返回队首元素                 |
| `back()`            | 返回队尾元素                 |
| `isEmpty()`         | 队列是否为空                 |
| `isFull()`          | 队列是否已满                 |
| `size()`            | 队列长度                     |
| `clear()`           | 清空队列                     |
| `includes(item)`    | 是否包含元素                 |
| `indexOf(item)`     | 查找元素索引                 |
| `remove(item)`      | 移除指定元素                 |
| `toArray()`         | 转为数组                     |
| `forEach(callback)` | 遍历                         |
| `toString()`        | 字符串表示                   |

**属性**：`maxCount`（可读写，默认 1000）

---

## QuadTree 四叉树

空间分区数据结构，适用于碰撞检测、空间查询等场景。支持矩形和圆形两种形状。

### 构造

```typescript
const qt = new QuadTree<IQuadItemObject>({
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  maxObjects: 10, // 每个节点最大对象数，默认 10
  maxLevels: 4, // 最大分割层级，默认 4
});
```

### 数据类型

```typescript
// 矩形对象
const rect: IQuadItemObject = {
  shape: "rect",
  x: 10,
  y: 10,
  width: 20,
  height: 20,
};

// 圆形对象
const circle: IQuadItemObject = { shape: "circle", x: 50, y: 50, radius: 10 };
```

### API

| 方法                     | 说明                         |
| ------------------------ | ---------------------------- |
| `insert(item)`           | 插入对象，超出阈值自动分割   |
| `inserts(items)`         | 批量插入                     |
| `remove(item)`           | 移除对象（会移除全部副本）   |
| `query(item)`            | 查询对象所在象限中的所有对象 |
| `queryRange(range)`      | 查询矩形范围内的所有对象     |
| `contains(item)`         | 是否包含指定对象             |
| `getAllObjects()`        | 获取所有对象（按引用去重）   |
| `getSize()`              | 获取对象总数（唯一对象计数） |
| `getDepth()`             | 获取四叉树深度               |
| `clear()`                | 清除所有对象和子节点         |
| `isPointInBounds(point)` | 判断点是否在范围内           |
| `subdivide()`            | 手动分割为四个子节点         |

**属性**：`x`, `y`, `width`, `height`, `level`, `maxObjects`（可读写）, `maxLevels`（可读写）, `nodes`, `objects`

### 碰撞检测示例

```typescript
const qt = new QuadTree<IQuadItemObject>({
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  maxObjects: 4,
});

const player = { shape: "rect", x: 100, y: 100, width: 20, height: 20 };
qt.insert(player);

// 查询与 player 同象限的候选对象
const candidates = qt.query(player);

// 查询指定矩形范围内的对象
const nearby = qt.queryRange({
  shape: "rect",
  x: 90,
  y: 90,
  width: 40,
  height: 40,
});
```

> 跨越象限的对象会存进多个子节点，`getSize()` / `getAllObjects()` 已按唯一对象去重。

---

## AsyncQueue 异步队列

并发控制的异步函数执行队列，支持任务调度、暂停/恢复、重试与事件订阅。

### 构造

```typescript
const queue = new AsyncQueue<number, number>({
  concurrency: 3, // 最大并发数，默认 1
  maxQueueSize: 100, // 队列最大容量，默认 Infinity
  retryAttempts: 2, // 失败重试次数，默认 0
  retryDelay: 1000, // 重试间隔（ms），默认 1000
  autoStart: true, // 是否自动开始，默认 true
});
```

### API

| 方法                         | 说明                 |
| ---------------------------- | -------------------- |
| `add(fn, id?)`               | 添加任务，返回任务 ID |
| `addMany(fns)`               | 批量添加任务         |
| `start()`                    | 开始执行队列         |
| `pause()`                    | 暂停执行             |
| `resume()`                   | 恢复执行             |
| `clear()`                    | 清空等待中的任务     |
| `cancel()`                   | 取消所有任务         |
| `getTaskStatus(id)`          | 获取任务状态         |
| `getTaskResult(id)`          | 获取任务结果         |
| `getResults()`               | 获取全部结果         |
| `isPaused()` / `isRunning()` | 运行状态             |
| `setConcurrency(n)`          | 动态调整并发数       |
| `setRetryAttempts(n)`        | 动态调整重试次数     |
| `on(event, callback)`        | 订阅事件             |
| `off(event)`                 | 取消订阅             |

### 事件

| 事件             | 说明     |
| ---------------- | -------- |
| `onTaskComplete` | 任务完成 |
| `onTaskFail`     | 任务错误 |
| `onTaskRetry`    | 任务重试 |
| `onQueueEmpty`   | 队列空   |
| `onQueueFull`    | 队列满   |
| `onComplete`     | 全部完成 |
| `onProgress`     | 进度回调 |

### 示例

```typescript
const queue = new AsyncQueue<string, number>({ concurrency: 2 });

queue.on("onTaskComplete", (task, results) => {
  console.log("任务完成:", task.id, results);
});

queue.add(async () => {
  const response = await fetch("https://api.example.com/data");
  return response.json();
});

queue.addMany([async () => "second task", async () => "third task"]);
queue.start();
```

---

## Vector2 二维向量

向量运算的默认风格是**返回新实例**（不修改自身）；带 `InPlace` 后缀的方法原地修改并返回自身，适合游戏主循环热路径。

```typescript
const v = new Vector2(3, 4);
const dir = v.normalized(); // 新实例，v 不变
```

### 静态方法

`zero()` `one()` `right()` `left()` `up()` `down()` `from(source)` `fromAngle(angle, radius)` `lerp(from, to, t)`

### 实例方法

| 分类  | 方法                                                                              |
| ----- | --------------------------------------------------------------------------------- |
| 读取 | `length` `lengthSquared` `angle` `isZero`                                         |
| 基础 | `clone()` `set(x, y)` `copyFrom(v)` `equals(v, epsilon?)`                          |
| 算术 | `add(v)` `addScalar(n)` `subtract(v)` `multiply(v\|n)` `divide(v\|n)` `negate()`  |
| 几何 | `dot(v)` `cross(v)` `distanceTo(v)` `distanceToSquared(v)` `normalized()` `angleTo(v)` `reflect(normal)` |
| 变换 | `lerp(target, t)` `rotate(rad)` `rotateAround(pivot, rad)` `floor()` `round()`     |
| 裁剪 | `clamp(min, max)` `clampLength(min, max)` `limit(max)` `withLength(len)`           |
| 输出 | `toArray()` `toString()`                                                         |
| 原地 | `addInPlace(v)` `subtractInPlace(v)` `scaleInPlace(n)` `normalizeInPlace()` `lerpInPlace(target, t)` |

---

## math 数学工具

```typescript
import { math } from "55ab-loach";

math.distance(x1, y1, x2, y2); // 两点距离
math.rad(v, v2); // v 指向 v2 的有向角（弧度，+X 轴为 0）
math.abs(a); // 绝对值
math.random(from, to, fixed?); // [min, max) 随机数
math.randomUint(from, to); // [min, max) 随机整数
```

`math` 命名空间同时包含 `Vector2`、缓动、噪声、随机工具的全部导出。

---

## easing 缓动

```typescript
import { easing } from "55ab-loach";

easing.easeInOutQuad(0.5); // 0.5
easing.smoothstep(0, 1, 0.25); // 平滑阶跃
easing.remap(value, inMin, inMax, outMin, outMax); // 区间重映射
easing.inverseLerp(0, 10, 5); // 0.5
```

**曲线**：`linear`、`easeIn/Out/InOut` × `Quad` `Cubic` `Quart` `Quint` `Sine` `Expo` `Circ` `Back` `Elastic` `Bounce`

> 入参统一 `clamp01`；`f(0)=0`、`f(1)=1`。`Back` / `Elastic` 在区间内会过冲，属预期行为。

---

## noise 噪声

```typescript
import { PerlinNoise } from "55ab-loach";

const perlin = new PerlinNoise(12345); // 同 seed 结果完全可复现

perlin.noise(x, y); // [-1, 1]
perlin.noise(x, y, 64); // 周期 64 上无缝平铺
perlin.fbm(x, y, { octaves: 5, lacunarity: 2, gain: 0.5 }); // 分形布朗运动
perlin.ridge(x, y); // 山脊噪声
```

---

## random 随机

```typescript
import { random } from "55ab-loach";

const rand = random.createRandom(42); // 带种子的 PRNG，可复现

random.randomInt(1, 7, rand); // 1~6 的整数
random.randomFloat(0, 1, rand);
random.randomBool(0.3, rand);
random.weightedPick(items, weights, rand); // 掉落表
random.shuffle(cards, rand);
random.sample(items, 3, rand);
random.gaussian(0, 1, rand); // 高斯分布
random.randomPointInCircle(50, rand);
random.randomPointOnCircle(50, rand);
random.randomUnitVector(rand);
random.bellCurve(rand); // [-1, 1] 钟形分布
```

所有函数都可注入 PRNG（默认 `Math.random`），便于回放与测试。

---

## collision 碰撞检测

```typescript
import { collision } from "55ab-loach";

const player = { shape: "rect", x: 0, y: 0, width: 20, height: 20 };
const bullet = { shape: "circle", x: 10, y: 10, radius: 4 };

collision.intersects(player, bullet); // true
collision.getBounds(player); // { minX, minY, maxX, maxY }
collision.pointInShape({ x: 5, y: 5 }, player); // true
collision.getTranslation(player, bullet); // 最小平移向量
collision.raycast({ x: 0, y: 0 }, { x: 1, y: 0 }, player); // 命中距离
collision.sweptAabb(movingBox, targetBounds, dt); // 扫掠碰撞时刻
```

**API**：`getBounds` `aabbIntersects` `boundsIntersectShape` `rectIntersects` `circleIntersects` `circleRectIntersects` `intersects` `pointInBounds` `pointInShape` `getTranslation` `raycast` `rayBounds` `sweptAabb`

---

## SpatialGrid 空间网格

实体分布均匀时，比四叉树更稳定的高性能空间索引。

```typescript
import { SpatialGrid } from "55ab-loach";

const grid = new SpatialGrid({
  cellSize: 64,
  width: 2000,
  height: 2000,
});

grid.insert({ x: 100, y: 100, width: 20, height: 20 });
grid.queryRect(90, 90, 50, 50); // 范围内的候选对象（已去重）
grid.queryPoint(110, 110); // 某点上的对象
grid.remove(item); // 移除
grid.clear(); // 清空
```

---

## PriorityQueue 优先队列

二叉堆实现，A\* 开放集、Dijkstra 流场、任务调度的基础。

```typescript
import { PriorityQueue, MaxPriorityQueue } from "55ab-loach";

const queue = new PriorityQueue<string>();
queue.push("低", 10);
queue.push("高", 1);
queue.pop(); // "高"

const maxQueue = new MaxPriorityQueue<number>(); // 大顶堆
```

同优先级按入队顺序 FIFO 出队。

---

## ObjectPool 对象池

复用子弹、粒子、飘字等高频对象，减少 GC 卡顿。

```typescript
import { ObjectPool } from "55ab-loach";

const pool = new ObjectPool<Bullet>({
  factory: () => new Bullet(),
  reset: (b) => b.reset(),
  maxSize: 200,
  prewarm: 50,
});

const bullet = pool.acquire(); // 取出（复用或新建）
pool.release(bullet); // 归还并自动 reset
```

---

## StateMachine 状态机

事件驱动的有限状态机，用于角色 AI 状态切换。

```typescript
import { StateMachine } from "55ab-loach";

const machine = new StateMachine<
  "idle" | "chase" | "attack" | "dead",
  Context,
  "seePlayer" | "die"
>({
  initial: "idle",
  context,
  states: {
    idle: {
      transitions: { seePlayer: "chase", die: "dead" },
      onEnter: (ctx, from) => {},
      onExit: (ctx, to) => {},
    },
    chase: { transitions: { die: "dead" } },
    attack: { transitions: {} },
    dead: { transitions: {} },
  },
});

machine.dispatch("seePlayer"); // true，状态切换到 chase
machine.dispatch("unknown"); // false，状态不变
machine.update(dt); // 触发当前状态的 onUpdate
machine.history; // 状态切换历史
```

---

## A\* 寻路

```typescript
import { findPath, smoothPath, hasLineOfSight } from "55ab-loach";

// grid[y][x]，值为 0 表示障碍
const grid = [
  [1, 1, 1],
  [1, 0, 1],
  [1, 1, 1],
];

const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 });
// [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]

const straight = smoothPath(grid, path); // 拉直拐点
hasLineOfSight(grid, { x: 0, y: 0 }, { x: 2, y: 2 }); // true
```

**选项**：`allowDiagonal`（默认 true）、`diagonalCost`（默认 √2）、`cornerCutting`（默认 false，禁止斜穿障碍夹角）、`blockedValue`（默认 0）、`heuristic`（`manhattan` / `euclidean` / `octile`）、`costOf`（地形代价）、`maxVisited`（安全阀）。

---

## flowField 流场寻路

大量单位追逐同一目标时，一次计算供全体查询，比逐个跑 A\* 更省。

```typescript
import { computeFlowField } from "55ab-loach";

const field = computeFlowField(grid, [{ x: 9, y: 9 }]);

field.getDistance(0, 0); // 到目标的代价
field.getDirection(0, 0); // 单位方向向量
field.getNextCell(0, 0); // 下一格坐标
```

---

## steering 转向行为

```typescript
import { steering } from "55ab-loach";

steering.seek(position, target, maxSpeed);
steering.flee(position, target, maxSpeed);
steering.arrive(position, target, maxSpeed, slowRadius);
steering.pursuit(position, targetPos, targetVel, maxSpeed);
steering.wander(position, velocity, maxSpeed, { radius: 30 }, rand);
steering.separation(position, neighbors, maxSpeed, radius);
steering.alignment(position, neighbors, maxSpeed);
steering.cohesion(position, neighbors, maxSpeed);
steering.steer(currentVelocity, desiredVelocity, maxForce);
```

所有函数返回期望速度向量，且不修改传入参数。

---

## 3D 工具

3D 套件与 2D 套件保持同一套 API 风格：`Vector3` 的运算默认返回新实例，`Quaternion` 分量为 `(x, y, z, w)`，`Matrix4` 为**列主序**（与 WebGL / three.js 一致）。

### Vector3 三维向量

```typescript
import { Vector3 } from "55ab-loach";

const v = new Vector3(3, 4, 0);
const dir = v.normalized(); // 新实例，v 不变
v.normalizeInPlace(); // 原地修改（热路径）
```

| 分类  | 方法                                                                                  |
| ----- | ------------------------------------------------------------------------------------- |
| 静态  | `zero` `one` `right` `left` `up` `down` `forward` `back` `from` `fromArray` `fromSpherical` `lerp` |
| 读取  | `length` `lengthSquared` `isZero`                                                     |
| 算术  | `add` `addScalar` `subtract` `subtractScalar` `multiply` `divide` `negate`             |
| 几何  | `dot` `cross` `distanceTo` `distanceToSquared` `normalized` `angleTo` `angleToSigned` `reflect` `projectOn` `projectOnPlane` `rotateAroundAxis` |
| 变换  | `lerp` `floor` `round` `clamp` `clampLength` `limit` `withLength`                     |
| 原地  | `addInPlace` `subtractInPlace` `scaleInPlace` `normalizeInPlace` `lerpInPlace`         |

### Quaternion 四元数

```typescript
import { Quaternion } from "55ab-loach";

const q = Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
q.rotateVector({ x: 1, y: 0, z: 0 }); // 绕 Y 轴旋转 90°
q.slerp(target, 0.5); // 球面插值（走最短路径）
q.toEuler("YXZ"); // { x, y, z }
```

**构造**：`identity` `fromAxisAngle` `fromEuler` `fromEulerDegrees` `fromMatrix` `fromUnitVectors` `lookRotation`
**方法**：`multiply` `conjugate` `invert` `normalize` `dot` `slerp` `rotateVector` `toMatrix` `toEuler` `angleTo`

### Matrix4 4x4 矩阵

```typescript
import { Matrix4 } from "55ab-loach";

const m = new Matrix4()
  .makeTranslation(0, 1, 5)
  .multiply(new Matrix4().makeRotationY(Math.PI / 4));

m.transformPoint({ x: 0, y: 0, z: 0 }); // 含透视除法
m.transformDirection({ x: 1, y: 0, z: 0 }); // 忽略平移
m.decompose(); // { position, quaternion, scale }
```

**方法**：`makeIdentity` `makeTranslation` `makeScale` `makeRotationX/Y/Z` `makeRotationFromQuaternion` `compose` `decompose` `multiply` `multiplyMatrices` `invert` `transposed` `determinant` `transformPoint` `transformDirection`
**静态**：`identity` `fromArray` `multiplyMatrices` `lookAt` `perspective` `orthographic`

### Plane 平面

```typescript
import { Plane } from "55ab-loach";

const plane = Plane.fromPoints(a, b, c);
plane.distanceToPoint(point); // 带符号距离
plane.projectPoint(point); // 最近点
```

### 3D 碰撞检测

形状：`sphere` / `aabb` / `obb` / `capsule`，相交判定**对称**（4 种形状的 12 种两两组合全部支持）。

```typescript
import { collision3d } from "55ab-loach";

const player = { shape: "sphere", x: 0, y: 1, z: 0, radius: 0.5 };
const wall = { shape: "aabb", minX: -1, minY: 0, minZ: -1, maxX: 1, maxY: 2, maxZ: 1 };

collision3d.intersects3d(player, wall);
collision3d.getTranslation3d(player, wall); // 最小平移向量
collision3d.raycast3d(origin, direction, wall); // 射线拾取
collision3d.rayTriangle(origin, direction, a, b, c); // Möller–Trumbore
```

**API**：`getBounds3` `sphereSphere` `sphereAabb` `sphereObb` `capsuleSphere` `capsuleCapsule` `capsuleAabb` `capsuleObb` `aabbAabb` `aabbObb` `aabbToObb` `obbObb`（15 轴分离轴）`intersects3d` `pointInShape3d` `getTranslation3d` `raySphere` `rayAabb` `rayObb` `rayTriangle` `rayPlane` `raycast3d` `closestPointOnSegment` `segmentSegmentDistance` `distancePointToAabb`

### 3D 空间索引

```typescript
import { Octree, SpatialGrid3D, BVH } from "55ab-loach";

// 八叉树
const octree = new Octree({ width: 1000, height: 1000, depth: 1000, maxObjects: 10 });
octree.queryRange({ minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 100, maxZ: 100 });

// 均匀网格
const grid = new SpatialGrid3D({ cellSize: 64, width: 2000, height: 2000, depth: 2000 });
grid.queryBox(0, 0, 0, 100, 100, 100);

// BVH（三角形加速结构）
const bvh = new BVH(triangles, { maxLeafSize: 4 });
bvh.queryRange(bounds); // 命中的三角形索引
bvh.raycast(origin, direction); // 最近命中
```

### 体素 3D A* 寻路

网格 `grid[z][y][x]`，`1` 为实心、`0` 为空；路径走在**可站立体素**上（自身为空且正下方实心）。

```typescript
import { findPath3d } from "55ab-loach";

const path = findPath3d(
  grid,
  { x: 0, y: 1, z: 0 },
  { x: 9, y: 1, z: 9 },
  { maxStep: 1, maxJump: 2, maxDrop: 4 }
);
```

**选项**：`maxStep`（最大爬升，默认 1）、`maxJump`（最大跳跃，默认 0）、`maxDrop`（最大坠落，默认无限）、`climbCost` `jumpCost` `dropCost` `blockedValue`

### 3D 转向行为

```typescript
import { steering3d } from "55ab-loach";

steering3d.seek3d(position, target, maxSpeed);
steering3d.flee3d(position, target, maxSpeed);
steering3d.arrive3d(position, target, maxSpeed, slowRadius);
steering3d.pursuit3d(position, targetPos, targetVel, maxSpeed);
steering3d.wander3d(position, velocity, maxSpeed, { radius: 30 }, rand);
steering3d.separation3d(position, neighbors, maxSpeed, radius);
steering3d.alignment3d(position, neighbors, maxSpeed);
steering3d.cohesion3d(position, neighbors, maxSpeed);
steering3d.steer3d(currentVelocity, desiredVelocity, maxForce);
```

### 视锥剔除

```typescript
import { Frustum, Matrix4 } from "55ab-loach";

const view = Matrix4.lookAt(camera.position, camera.target, camera.up);
const projection = Matrix4.perspective(fov, aspect, near, far);
const frustum = Frustum.fromMatrix4(Matrix4.multiplyMatrices(projection, view));

frustum.containsPoint(point);
frustum.containsSphere(center, radius);
frustum.intersectsAabb(bounds);
frustum.getCorners();
```

### 3D 噪声与随机

```typescript
import { PerlinNoise3D, random3d } from "55ab-loach";

const noise = new PerlinNoise3D(42);
noise.noise(x, y, z); // [-1, 1]
noise.fbm(x, y, z, { octaves: 5 });

random3d.randomPointInSphere(10, rand);
random3d.randomPointOnSphere(10, rand);
random3d.randomDirection(rand);
random3d.randomUnitQuaternion(rand);
random3d.randomPointInCube(10, rand);
```

---

## 迁移说明

> **2.0.0 与 2.0.1 是坏版本，无法安装**，请直接使用 2.0.2 及以上。
> 原因：这两个版本的 `package.json` 里带了一条指向自身的 `file:` 依赖，
> npm 解析该依赖时找不到对应文件而报 `ENOENT`，导致 `npm install 55ab-loach` 直接失败。
> 该依赖无任何用途（本库零运行时依赖），已在 2.0.2 中移除。

本版本包含两处**破坏性变更**（均修复了历史缺陷）：

| 变更                        | 旧行为                                 | 新行为                                       |
| --------------------------- | -------------------------------------- | -------------------------------------------- |
| `math.rad(v, v2)`           | 角度基准错误（以 +Y 为 0），实测有偏差 | 标准 `atan2` 约定：**+X 轴为 0，逆时针为正** |
| `math.randomUint(from, to)` | 与 `random` 实现相同，返回浮点         | 返回 `[min, max)` 内的**整数**               |

### 包入口调整（2.0.0）

新增 `exports` 字段，ESM 消费方不再回退到 CommonJS：

| 消费方式         | 旧行为                          | 新行为                                        |
| ---------------- | ------------------------------- | --------------------------------------------- |
| `import`（ESM）  | 加载 CJS，附带 `default` interop | 加载 `dist/index.esm.js`，**无 default 导出** |
| `require`（CJS） | 加载 `dist/index.cjs.js`        | 加载 `dist/index.cjs.cjs`                    |

- Node 原生 `import "55ab-loach"` 现在拿到的是真 ESM，**tree-shaking 可用**。
- `import * as m` 的导出数从 39（38 + Node 补的 `default`）变为 **38**，
  若此前依赖 `m.default` 取整个命名空间，请改用具名导出。
- 深路径引用（`55ab-loach/dist/xxx`）仍然可用。

其他行为变更（与文档对齐，不算破坏）：

- `QuadTree.getSize()` / `getAllObjects()` 改为按**唯一对象**计数与去重（跨象限对象不再重复计数）。
- `QuadTree.remove()` 会移除对象的**全部副本**。
- `math.random(from, to, fixed?)` 的 `fixed` 现在可省略；`from > to` 时自动交换上下界。

### 缺陷修复（2026-11-12，单元测试实测发现并修复）

以下均为**历史缺陷修复**，旧行为是错的：

| 位置                                        | 旧行为                                                       | 新行为                                                       |
| ------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `collision3d.intersects3d`                 | AABB↔OBB、Capsule↔OBB 组合恒返回 `false`（重叠也报不相交） | 补齐全部 12 种两两组合，相交判定对称                         |
| `collision.sweptAabb`                      | 负方向速度下碰撞时刻偏晚 `2×半尺寸/速度`                    | 返回**首次接触**时刻                                         |
| `Quaternion.toEuler`（YXZ / ZXY 万向锁）   | 末角符号错误，重建矩阵对不上原旋转                           | 末角带上 `sin(x)` 符号，往返可还原同一旋转                   |
| `collision3d.getTranslation3d`（aabb/sphere） | 两种顺序幅度不一致（0.001 vs 0.5）                        | 按作用力与反作用力约定对称                                   |
| `Octree.remove`                             | 同一引用重复插入后移除会残留对象                             | 插入去重 + 移除全部副本                                       |
| `SpatialGrid3D.cellSize` / `SpatialGrid.cellSize` | 变更格子边长后对象静默丢失、旧桶残留引用              | 变更后按新边长重建索引                                       |

---

## 开发

```bash
npm install
npm run test           # 运行测试
npm run test:watch     # 监听模式运行测试
npm run test:coverage  # 运行测试并输出 v8 覆盖率
npm run typecheck      # 类型检查（src + tests）
npm run build          # 构建
```

---

## 发布

发布由 GitHub Actions 自动完成，采用 **npm Trusted Publishing（OIDC）** 认证——仓库不保存任何长期 npm token，npm 凭据由 GitHub 运行时签发的短期身份令牌换取，并自动附带 provenance 溯源。

### 一次性配置

| 平台 | 配置项 |
| --- | --- |
| GitHub | Settings → Environments → 新建 `npm-publish` → 勾选 **Required reviewers** 并添加自己 |
| npmjs.com | 包 `55ab-loach` → Settings → Trusted Publisher → GitHub Actions → 填 `Canc55Ab` / `loach` / `release.yml` / `npm-publish` |

### 发布流程

```bash
# 1. 改 package.json 的 version，再提交推送
npm version patch        # 或 minor / major

# 2. 打同名 tag 并推送，CI 自动触发
git tag v2.0.1 && git push origin main --tags
```

推送 tag 后，CI 会依次执行：

1. 安装依赖 → 类型检查 → 单元测试 → 构建
2. **校验 tag 版本与 `package.json` 的 `version` 是否一致**，不一致直接失败
3. 打包产物并上传为 artifact
4. 停在 `npm-publish` 环境，**等待你在 Actions 页面点击 Approve and deploy**
5. 审批通过后发布到 npmjs（`latest` tag），并生成 provenance 证明

> 第 4 步就是发布前的最后确认点：不点击 Approve 不会真正发到 npm。

### 工作流说明

| 工作流 | 触发条件 | 作用 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push / PR 到 `main` | 类型检查、测试、构建、打包演练 |
| `.github/workflows/release.yml` | 推送 `v*` tag | 校验 → 构建 → **人工审批** → 发布到 npmjs |
