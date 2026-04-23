# 异步函数执行队列 (AsyncQueue) 功能设计

## 1. 概述

实现一个支持并发控制的异步任务队列，类似于 `async` 库的 `parallelLimit` 或 `p-limit` 的功能，但提供更丰富的状态追踪和事件回调能力。

---

## 2. 接口设计

### 2.1 任务状态枚举

```typescript
/**
 * 任务状态
 */
enum TaskStatus {
  PENDING = 'pending',    // 等待执行
  RUNNING = 'running',    // 执行中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed',       // 执行失败
}
```

### 2.2 任务项接口

```typescript
/**
 * 任务项
 */
interface ITaskItem<T = unknown, R = unknown> {
  id: string;                    // 任务唯一标识
  fn: () => Promise<R>;          // 异步函数
  status: TaskStatus;             // 当前状态
  result?: R;                     // 执行结果
  error?: { code: number; msg: string }; // 错误信息
  addedAt: number;                // 入队时间戳
  startedAt?: number;             // 开始执行时间戳
  completedAt?: number;            // 完成时间戳
  retries: number;                // 已重试次数
}
```

### 2.3 事件回调接口

```typescript
/**
 * 任务事件回调
 */
interface ITaskEvents<T = unknown, R = unknown> {
  onTaskComplete?: (task: ITaskItem<T, R>, results: R[]) => void;      // 任务完成
  onTaskFail?: (task: ITaskItem<T, R>, error: { code: number; msg: string }) => void; // 任务失败
  onTaskRetry?: (task: ITaskItem<T, R>, attempt: number) => void;       // 任务重试
  onQueueEmpty?: () => void;                                           // 队列为空
  onQueueFull?: () => void;                                            // 队列已满
  onComplete?: (results: R[]) => void;                                // 全部完成
  onProgress?: (completed: number, total: number) => void;            // 进度回调
}

/**
 * 队列配置项
 */
interface IAsyncQueueProps<T = unknown, R = unknown> {
  concurrency?: number;          // 最大并发数，默认 1
  maxQueueSize?: number;         // 队列最大容量，默认 Infinity
  retryAttempts?: number;        // 失败重试次数，默认 0
  retryDelay?: number;           // 重试间隔(ms)，默认 1000
  autoStart?: boolean;           // 添加任务后自动开始，默认 true
  events?: ITaskEvents<T, R>;    // 事件回调
}
```

### 2.4 队列统计接口

```typescript
/**
 * 队列统计信息
 */
interface IQueueStats {
  pending: number;      // 等待任务数
  running: number;      // 执行中任务数
  completed: number;    // 已完成任务数
  failed: number;       // 失败任务数
  total: number;        // 总任务数
  concurrency: number;  // 当前并发数
}
```

---

## 3. 类设计

### 3.1 AsyncQueue 类

```typescript
/**
 * 异步函数执行队列
 * 支持并发控制、任务状态追踪、事件回调
 */
class AsyncQueue<T = unknown, R = unknown> {
  private tasks: Map<string, ITaskItem<T, R>> = new Map(); // 任务存储
  private pendingQueue: string[] = [];  // 待执行队列（FIFO）
  private runningSet: Set<string> = new Set(); // 正在执行的任务ID集合
  private results: R[] = [];             // 执行结果顺序存储

  private _concurrency: number;         // 最大并发数
  private _maxQueueSize: number;        // 队列最大容量
  private _retryAttempts: number;       // 重试次数
  private _retryDelay: number;          // 重试间隔
  private _autoStart: boolean;           // 自动开始
  private _isPaused: boolean = false;   // 暂停标志
  private _isRunning: boolean = false;  // 运行标志

  private events: ITaskEvents<T, R>;    // 事件回调

  constructor(props: IAsyncQueueProps<T, R> = {}) {
    // 初始化逻辑
  }

  // ========== 队列操作 ==========

  /** 添加任务，返回任务ID */
  public add(fn: () => Promise<R>, id?: string): string;

  /** 批量添加任务 */
  public addMany(fns: Array<() => Promise<R>>): string[];

  /** 开始执行队列 */
  public start(): void;

  /** 暂停执行（正在执行的任务不会中断） */
  public pause(): void;

  /** 恢复执行 */
  public resume(): void;

  /** 清空队列（正在执行的任务会继续） */
  public clear(): void;

  /** 取消所有任务 */
  public cancel(): void;

  // ========== 状态查询 ==========

  /** 获取队列统计 */
  public getStats(): IQueueStats;

  /** 获取任务状态 */
  public getTaskStatus(id: string): TaskStatus | undefined;

  /** 获取任务结果 */
  public getTaskResult(id: string): R | undefined;

  /** 获取所有结果（按入队顺序） */
  public getResults(): R[];

  /** 队列是否为空 */
  public isEmpty(): boolean;

  /** 队列是否已满 */
  public isFull(): boolean;

  /** 队列是否暂停中 */
  public isPaused(): boolean;

  /** 队列是否运行中 */
  public isRunning(): boolean;

  // ========== 配置方法 ==========

  /** 设置并发数（动态调整） */
  public setConcurrency(n: number): void;

  /** 设置重试次数 */
  public setRetryAttempts(n: number): void;

  // ========== 事件绑定 ==========

  /** 绑定事件 */
  public on<K extends keyof ITaskEvents<T, R>>(event: K, callback: ITaskEvents<T, R>[K]): void;

  /** 解绑事件 */
  public off<K extends keyof ITaskEvents<T, R>>(event: K): void;

  // ========== 迭代器 ==========

  /** 迭代任务 */
  public [Symbol.iterator](): Iterator<ITaskItem<T, R>>;
}
```

---

## 4. 内部执行流程

```
                    ┌─────────────────────────────┐
                    │          add(fn)             │
                    │  生成ID，存入 tasks Map    │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │     检查队列是否已满         │
                    │  isFull() → throw error    │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │    任务入 pendingQueue     │
                    │    status = PENDING         │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │      autoStart=true?        │
                    │         start()             │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   检查并发数 < _concurrency │
                    │   且 !isPaused              │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
            ┌───────────────┐           ┌───────────────┐
            │     Yes        │           │      No       │
            │  取出任务执行  │           │  等待信号     │
            └───────┬───────┘           └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ status=RUNNING│
            │ 记录startedAt │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  执行 fn()    │
            └───────┬───────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│    成功        │       │    失败        │
│ status=COMPLETED│     │ status=FAILED │
│ result=返回值   │      │ error=错误信息 │
└───────┬───────┘       └───────┬───────┘
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ 检查重试次数   │       │ retries<limit?│
└───────┬───────┘       └───────┬───────┘
        │               │       │       │
        │               ▼       ▼       ▼
        │         ┌─────────────────────┐
        │         │  retryDelay 后重试  │
        │         │  retries++, 重新入队 │
        │         └─────────────────────┘
        │               │
        └───────────────┼───────────────┘
                        ▼
              ┌─────────────────────┐
              │  从 runningSet 移除  │
              │  results 追加结果    │
              │  触发 onTaskComplete │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  检查是否需要补充任务 │
              │  (并发数未满)       │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   触发 onProgress   │
              │   检查队列是否为空   │
              │   触发 onQueueEmpty │
              │   触发 onComplete   │
              └─────────────────────┘
```

---

## 5. 子模块分解方案

### 5.1 子模块列表

| 模块 | 文件 | 职责 | 可独立验证 |
|------|------|------|-----------|
| **types** | `async-queue/types.ts` | 接口定义、枚举常量 | ✅ |
| **TaskItem** | `async-queue/task-item.ts` | 任务项类封装 | ✅ |
| **EventEmitter** | `async-queue/event-emitter.ts` | 事件发布订阅 | ✅ |
| **AsyncQueueCore** | `async-queue/async-queue-core.ts` | 核心执行逻辑 | ⚠️ 依赖其他模块 |
| **AsyncQueue** | `async-queue/async-queue.ts` | 完整类（组合以上模块） | ✅ |

### 5.2 各模块详细设计

#### 5.2.1 types.ts（类型定义）

```typescript
// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 任务项
export interface ITaskItem<T = unknown, R = unknown> {
  id: string;
  fn: () => Promise<R>;
  status: TaskStatus;
  result?: R;
  error?: { code: number; msg: string };
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  retries: number;
}

// 队列配置
export interface IAsyncQueueProps<T = unknown, R = unknown> {
  concurrency?: number;
  maxQueueSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  autoStart?: boolean;
  events?: ITaskEvents<T, R>;
}

// 事件回调
export interface ITaskEvents<T = unknown, R = unknown> {
  onTaskComplete?: (task: ITaskItem<T, R>, results: R[]) => void;
  onTaskFail?: (task: ITaskItem<T, R>, error: { code: number; msg: string }) => void;
  onTaskRetry?: (task: ITaskItem<T, R>, attempt: number) => void;
  onQueueEmpty?: () => void;
  onQueueFull?: () => void;
  onComplete?: (results: R[]) => void;
  onProgress?: (completed: number, total: number) => void;
}

// 队列统计
export interface IQueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
  concurrency: number;
}
```

#### 5.2.2 task-item.ts（任务项封装）

```typescript
import { TaskStatus, ITaskItem } from './types';

/**
 * 任务项管理器
 * 负责创建和管理单个任务项的状态
 */
export class TaskItem<T = unknown, R = unknown> {
  private task: ITaskItem<T, R>;

  constructor(fn: () => Promise<R>, id: string) {
    this.task = {
      id,
      fn,
      status: TaskStatus.PENDING,
      addedAt: Date.now(),
      retries: 0,
    };
  }

  // 获取任务ID
  public get id(): string { return this.task.id; }

  // 获取任务函数
  public get fn(): () => Promise<R> { return this.task.fn; }

  // 获取状态
  public get status(): TaskStatus { return this.task.status; }

  // 设置状态
  public set status(value: TaskStatus) { this.task.status = value; }

  // 获取结果
  public get result(): R | undefined { return this.task.result; }

  // 设置结果
  public set result(value: R | undefined) { this.task.result = value; }

  // 获取错误
  public get error(): { code: number; msg: string } | undefined { return this.task.error; }

  // 设置错误
  public set error(value: { code: number; msg: string } | undefined) { this.task.error = value; }

  // 获取重试次数
  public get retries(): number { return this.task.retries; }

  // 增加重试次数
  public incrementRetries(): number { return ++this.task.retries; }

  // 标记开始执行
  public markStarted(): void {
    this.task.status = TaskStatus.RUNNING;
    this.task.startedAt = Date.now();
  }

  // 标记完成
  public markCompleted(result: R): void {
    this.task.status = TaskStatus.COMPLETED;
    this.task.result = result;
    this.task.completedAt = Date.now();
  }

  // 标记失败
  public markFailed(error: { code: number; msg: string }): void {
    this.task.status = TaskStatus.FAILED;
    this.task.error = error;
    this.task.completedAt = Date.now();
  }

  // 重置状态
  public reset(): void {
    this.task.status = TaskStatus.PENDING;
    this.task.startedAt = undefined;
    this.task.completedAt = undefined;
    this.task.result = undefined;
    this.task.error = undefined;
  }

  // 获取原始任务对象
  public toObject(): ITaskItem<T, R> { return { ...this.task }; }
}
```

#### 5.2.3 event-emitter.ts（事件发布订阅）

```typescript
import { ITaskEvents } from './types';

/**
 * 事件发射器
 * 提供事件绑定和解绑功能
 */
export class EventEmitter<T = unknown, R = unknown> {
  private events: Partial<ITaskEvents<T, R>> = {};

  // 绑定事件
  public on<K extends keyof ITaskEvents<T, R>>(
    event: K,
    callback: ITaskEvents<T, R>[K]
  ): void {
    this.events[event] = callback;
  }

  // 解绑事件
  public off<K extends keyof ITaskEvents<T, R>>(event: K): void {
    delete this.events[event];
  }

  // 触发事件
  public emit<K extends keyof ITaskEvents<T, R>>(
    event: K,
    ...args: Parameters<NonNullable<ITaskEvents<T, R>[K]>>
  ): void {
    const handler = this.events[event];
    if (typeof handler === 'function') {
      handler(...args);
    }
  }

  // 获取已绑定的事件列表
  public getBoundEvents(): Array<keyof ITaskEvents<T, R>> {
    return Object.keys(this.events) as Array<keyof ITaskEvents<T, R>>;
  }

  // 清空所有事件
  public clear(): void {
    this.events = {};
  }
}
```

#### 5.2.4 async-queue-core.ts（核心执行逻辑）

```typescript
import { TaskItem } from './task-item';
import { EventEmitter } from './event-emitter';
import { TaskStatus, IAsyncQueueProps, IQueueStats } from './types';

/**
 * 异步队列核心
 * 包含任务调度的核心逻辑
 */
export class AsyncQueueCore<T = unknown, R = unknown> {
  protected tasks: Map<string, TaskItem<T, R>> = new Map();
  protected pendingQueue: string[] = [];
  protected runningSet: Set<string> = new Set();
  protected results: R[] = [];
  protected emitter: EventEmitter<T, R>;

  protected _concurrency: number;
  protected _maxQueueSize: number;
  protected _retryAttempts: number;
  protected _retryDelay: number;
  protected _autoStart: boolean;
  protected _isPaused: boolean = false;
  protected _isRunning: boolean = false;

  constructor(props: IAsyncQueueProps<T, R> = {}) {
    this._concurrency = props.concurrency ?? 1;
    this._maxQueueSize = props.maxQueueSize ?? Infinity;
    this._retryAttempts = props.retryAttempts ?? 0;
    this._retryDelay = props.retryDelay ?? 1000;
    this._autoStart = props.autoStart ?? true;
    this.emitter = new EventEmitter<T, R>();

    if (props.events) {
      Object.entries(props.events).forEach(([key, value]) => {
        if (value) this.emitter.on(key as keyof ITaskEvents<T, R>, value);
      });
    }
  }

  // 添加任务
  protected _addTask(fn: () => Promise<R>, id?: string): string {
    if (this.isFull()) {
      throw { code: 10001, msg: '队列已满' };
    }

    const taskId = id ?? `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const taskItem = new TaskItem(fn, taskId);
    this.tasks.set(taskId, taskItem);
    this.pendingQueue.push(taskId);

    if (this._autoStart && !this._isRunning) {
      this.start();
    }

    return taskId;
  }

  // 填充任务槽位
  protected _fillSlots(): void {
    while (
      this.runningSet.size < this._concurrency &&
      this.pendingQueue.length > 0 &&
      !this._isPaused
    ) {
      const taskId = this.pendingQueue.shift()!;
      this._executeTask(taskId);
    }
  }

  // 执行单个任务
  protected async _executeTask(taskId: string): Promise<void> {
    const taskItem = this.tasks.get(taskId);
    if (!taskItem) return;

    this.runningSet.add(taskId);
    taskItem.markStarted();
    this._isRunning = true;

    try {
      const result = await taskItem.fn();
      this._handleTaskSuccess(taskItem, result);
    } catch (error) {
      this._handleTaskError(taskItem, error);
    }
  }

  // 处理任务成功
  protected _handleTaskSuccess(taskItem: TaskItem<T, R>, result: R): void {
    taskItem.markCompleted(result);
    this.results.push(result);
    this.runningSet.delete(taskItem.id);

    this.emitter.emit('onTaskComplete', taskItem.toObject(), this.results);
    this._emitProgress();
    this._checkQueueEmpty();
    this._fillSlots();
  }

  // 处理任务失败
  protected _handleTaskError(taskItem: TaskItem<T, R>, error: unknown): void {
    const err = this._normalizeError(error);

    if (taskItem.retries < this._retryAttempts) {
      // 需要重试
      taskItem.incrementRetries();
      this.runningSet.delete(taskItem.id);

      this.emitter.emit('onTaskRetry', taskItem.toObject(), taskItem.retries);

      setTimeout(() => {
        taskItem.reset();
        this.pendingQueue.push(taskItem.id);
        this._fillSlots();
      }, this._retryDelay);
    } else {
      // 最终失败
      taskItem.markFailed(err);
      this.results.push(undefined as unknown as R); // 失败任务占位
      this.runningSet.delete(taskItem.id);

      this.emitter.emit('onTaskFail', taskItem.toObject(), err);
      this._emitProgress();
      this._checkQueueEmpty();
      this._fillSlots();
    }
  }

  // 规范化错误格式
  protected _normalizeError(error: unknown): { code: number; msg: string } {
    if (typeof error === 'object' && error !== null && 'code' in error && 'msg' in error) {
      return error as { code: number; msg: string };
    }
    return { code: -1, msg: String(error) };
  }

  // 触发进度事件
  protected _emitProgress(): void {
    const stats = this.getStats();
    this.emitter.emit('onProgress', stats.completed + stats.failed, stats.total);
  }

  // 检查队列是否为空
  protected _checkQueueEmpty(): void {
    if (this.isEmpty()) {
      this._isRunning = false;
      this.emitter.emit('onQueueEmpty');
      this.emitter.emit('onComplete', this.results);
    }
  }

  // 获取统计信息
  public getStats(): IQueueStats {
    let pending = 0, running = 0, completed = 0, failed = 0;

    this.tasks.forEach(task => {
      switch (task.status) {
        case TaskStatus.PENDING: pending++; break;
        case TaskStatus.RUNNING: running++; break;
        case TaskStatus.COMPLETED: completed++; break;
        case TaskStatus.FAILED: failed++; break;
      }
    });

    return {
      pending,
      running,
      completed,
      failed,
      total: this.tasks.size,
      concurrency: this.runningSet.size,
    };
  }

  // 检查队列是否为空
  public isEmpty(): boolean {
    return this.pendingQueue.length === 0 && this.runningSet.size === 0;
  }

  // 检查队列是否已满
  public isFull(): boolean {
    return this.tasks.size >= this._maxQueueSize;
  }
}
```

#### 5.2.5 async-queue.ts（完整实现）

```typescript
import { AsyncQueueCore } from './async-queue-core';
import { TaskItem } from './task-item';
import { TaskStatus, IAsyncQueueProps, IQueueStats, ITaskEvents } from './types';

/**
 * 异步函数执行队列
 * 支持并发控制、任务状态追踪、事件回调
 */
class AsyncQueue<T = unknown, R = unknown> extends AsyncQueueCore<T, R> {

  constructor(props: IAsyncQueueProps<T, R> = {}) {
    super(props);
  }

  // ========== 队列操作 ==========

  /** 添加任务，返回任务ID */
  public add(fn: () => Promise<R>, id?: string): string {
    return this._addTask(fn, id);
  }

  /** 批量添加任务 */
  public addMany(fns: Array<() => Promise<R>>): string[] {
    return fns.map((fn, index) => this._addTask(fn, `batch_${Date.now()}_${index}`));
  }

  /** 开始执行队列 */
  public start(): void {
    if (this._isPaused) return;
    this._isRunning = true;
    this._fillSlots();
  }

  /** 暂停执行（正在执行的任务不会中断） */
  public pause(): void {
    this._isPaused = true;
  }

  /** 恢复执行 */
  public resume(): void {
    this._isPaused = false;
    this._isRunning = true;
    this._fillSlots();
  }

  /** 清空队列（正在执行的任务会继续） */
  public clear(): void {
    this.pendingQueue = [];
    this.tasks.forEach((task) => {
      if (task.status === TaskStatus.PENDING) {
        this.tasks.delete(task.id);
      }
    });
  }

  /** 取消所有任务（包括正在执行的） */
  public cancel(): void {
    this._isRunning = false;
    this._isPaused = false;
    this.pendingQueue = [];
    this.runningSet.clear();
    this.tasks.forEach((task) => {
      if (task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.FAILED) {
        task.markFailed({ code: -999, msg: '任务已取消' });
      }
    });
  }

  // ========== 状态查询 ==========

  /** 获取任务状态 */
  public getTaskStatus(id: string): TaskStatus | undefined {
    return this.tasks.get(id)?.status;
  }

  /** 获取任务结果 */
  public getTaskResult(id: string): R | undefined {
    return this.tasks.get(id)?.result;
  }

  /** 获取所有结果（按入队顺序） */
  public getResults(): R[] {
    return [...this.results];
  }

  /** 队列是否暂停中 */
  public isPaused(): boolean {
    return this._isPaused;
  }

  /** 队列是否运行中 */
  public isRunning(): boolean {
    return this._isRunning;
  }

  // ========== 配置方法 ==========

  /** 设置并发数（动态调整） */
  public setConcurrency(n: number): void {
    if (n < 1) throw { code: 10002, msg: '并发数必须大于0' };
    this._concurrency = n;
    if (!this._isPaused) {
      this._fillSlots();
    }
  }

  /** 设置重试次数 */
  public setRetryAttempts(n: number): void {
    this._retryAttempts = n;
  }

  // ========== 事件绑定 ==========

  /** 绑定事件 */
  public on<K extends keyof ITaskEvents<T, R>>(event: K, callback: ITaskEvents<T, R>[K]): void {
    this.emitter.on(event, callback);
  }

  /** 解绑事件 */
  public off<K extends keyof ITaskEvents<T, R>>(event: K): void {
    this.emitter.off(event);
  }

  // ========== 迭代器 ==========

  /** 迭代任务 */
  public [Symbol.iterator](): Iterator<TaskItem<T, R>> {
    return this.tasks.values();
  }
}

export default AsyncQueue;
```

---

## 6. 目录结构

```
src/patterns/async-queue/
├── index.ts              # 导出主类
├── types.ts              # 接口定义
├── task-item.ts          # 任务项封装
├── event-emitter.ts      # 事件发射器
├── async-queue-core.ts    # 核心逻辑
└── async-queue.ts        # 完整实现
```

---

## 7. 测试子模块分解

| 测试模块 | 测试内容 | 依赖 |
|----------|----------|------|
| `types.test.ts` | 接口定义验证 | 无 |
| `task-item.test.ts` | 任务项状态转换 | types |
| `event-emitter.test.ts` | 事件绑定/触发 | types |
| `async-queue-core.test.ts` | 核心调度逻辑 | types + task-item + event-emitter |
| `async-queue.test.ts` | 完整功能测试 | 所有子模块 |

---

## 8. 关键设计决策

### 8.1 为什么失败任务结果占位？
- 保证 `results` 数组与任务入队顺序一致
- 便于调用方通过索引匹配结果与任务

### 8.2 为什么重试时重新入队而非直接重试？
- 避免重试时占用当前并发槽位
- 配合 `retryDelay` 实现延迟重试
- 保持 FIFO 公平性

### 8.3 为什么使用 Map 存储任务？
- O(1) 时间复杂度获取任意任务状态
- 便于 `getTaskStatus` / `getTaskResult` 等查询操作

---

## 9. 使用示例

```typescript
const queue = new AsyncQueue<void, number>({
  concurrency: 3,
  maxQueueSize: 100,
  retryAttempts: 2,
  retryDelay: 1000,
  autoStart: false,
  events: {
    onTaskComplete: (task, results) => {
      console.log(`任务 ${task.id} 完成，当前结果数: ${results.length}`);
    },
    onTaskFail: (task, error) => {
      console.log(`任务 ${task.id} 失败: ${error.msg}`);
    },
    onQueueEmpty: () => {
      console.log('队列已空');
    },
    onComplete: (results) => {
      console.log('全部完成，结果:', results);
    },
  },
});

// 添加任务
queue.add(async () => {
  await new Promise(r => setTimeout(r, 100));
  return 1;
}, 'task-1');

queue.add(async () => {
  await new Promise(r => setTimeout(r, 200));
  return 2;
}, 'task-2');

queue.start();

// 获取状态
console.log(queue.getStats());
console.log(queue.getTaskStatus('task-1'));
console.log(queue.getResults());
```
