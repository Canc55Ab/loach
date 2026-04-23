# loach

TypeScript 数据结构与算法工具库。

## 安装

```bash
npm install 55ab-loach
```

## 使用

```typescript
import { Stack, Queue, QuadTree, AsyncQueue, math } from "55ab-loach";
```

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
| `remove(item)`           | 移除对象，返回是否成功       |
| `query(item)`            | 查询对象所在象限中的所有对象 |
| `queryRange(range)`      | 查询矩形范围内的所有对象     |
| `contains(item)`         | 是否包含指定对象             |
| `getAllObjects()`        | 获取所有对象                 |
| `getSize()`              | 获取对象总数                 |
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

---

## AsyncQueue 异步队列

并发控制的异步函数执行队列，支持任务调度、暂停/恢复、优先级和事件订阅。

### 构造

```typescript
const queue = new AsyncQueue<number, number>({
  concurrency: 3,       // 最大并发数，默认 1
  timeout: 5000,        // 任务超时时间（ms），默认 0（不超时）
  retryCount: 2,        // 失败重试次数，默认 0
  retryDelay: 1000,     // 重试间隔（ms），默认 1000
  autoStart: true,      // 是否自动开始，默认 true
});
```

### API

| 方法                | 说明                         |
| ------------------- | ---------------------------- |
| `enqueue(task, priority?)` | 添加任务，支持优先级       |
| `start()`           | 开始执行队列                 |
| `pause()`           | 暂停执行                     |
| `resume()`          | 恢复执行                     |
| `clear()`           | 清空队列                     |
| `abort()`           | 中止所有任务                 |
| `getStats()`        | 获取队列统计信息             |
| `on(event, handler)` | 订阅事件                   |
| `off(event, handler)` | 取消订阅                   |

### 事件

| 事件             | 说明                           |
| ---------------- | ------------------------------ |
| `taskStart`      | 任务开始                       |
| `taskEnd`        | 任务完成                       |
| `taskError`      | 任务错误                       |
| `taskRetry`      | 任务重试                       |
| `queueEmpty`     | 队列空                         |
| `queueFull`      | 队列满                         |
| `pause`          | 暂停                           |
| `resume`         | 恢复                           |
| `statsUpdate`    | 统计更新                       |

### 示例

```typescript
const queue = new AsyncQueue<string, number>({ concurrency: 2 });

queue.on("taskEnd", ({ result }) => {
  console.log("任务完成:", result);
});

queue.enqueue(async () => {
  const response = await fetch("https://api.example.com/data");
  return response.json();
});

queue.enqueue(async () => "second task", 1); // 高优先级

queue.start();
```

---

## math 数学工具

```typescript
import { math } from "55ab-loach";

math.distance(x1, y1, x2, y2); // 两点距离
math.rad(v1, v2); // 两点角度（弧度）
math.abs(a); // 绝对值
math.random(from, to, fixed); // 随机数
math.randomUint(from, to, fixed); // 随机正数
```

---

## 开发

```bash
npm run build       # 构建
npm run test        # 运行测试
npm run test:watch  # 监听模式运行测试
```
