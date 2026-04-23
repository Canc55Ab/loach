import { AsyncQueueCore } from './async-queue-core';
import { TaskItem } from './task-item';
import { TaskStatus, IAsyncQueueProps, ITaskEvents } from './types';

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
  public on(event: 'onTaskComplete', callback: ITaskEvents<T, R>['onTaskComplete']): void;
  public on(event: 'onTaskFail', callback: ITaskEvents<T, R>['onTaskFail']): void;
  public on(event: 'onTaskRetry', callback: ITaskEvents<T, R>['onTaskRetry']): void;
  public on(event: 'onQueueEmpty', callback: ITaskEvents<T, R>['onQueueEmpty']): void;
  public on(event: 'onQueueFull', callback: ITaskEvents<T, R>['onQueueFull']): void;
  public on(event: 'onComplete', callback: ITaskEvents<T, R>['onComplete']): void;
  public on(event: 'onProgress', callback: ITaskEvents<T, R>['onProgress']): void;
  public on(event: keyof ITaskEvents<T, R>, callback: ITaskEvents<T, R>[keyof ITaskEvents<T, R>]): void {
    this.emitter.on(event as never, callback as never);
  }

  /** 解绑事件 */
  public off(event: keyof ITaskEvents<T, R>): void {
    this.emitter.off(event as never);
  }

  // ========== 迭代器 ==========

  /** 迭代任务 */
  public [Symbol.iterator](): Iterator<TaskItem<T, R>> {
    return this.tasks.values();
  }
}

export default AsyncQueue;