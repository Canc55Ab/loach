import { TaskItem } from './task-item';
import { EventEmitter } from './event-emitter';
import { TaskStatus, IAsyncQueueProps, IQueueStats, ITaskEvents } from './types';

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
      const events = props.events as ITaskEvents<T, R>;
      if (events.onTaskComplete) this.emitter.on('onTaskComplete', events.onTaskComplete);
      if (events.onTaskFail) this.emitter.on('onTaskFail', events.onTaskFail);
      if (events.onTaskRetry) this.emitter.on('onTaskRetry', events.onTaskRetry);
      if (events.onQueueEmpty) this.emitter.on('onQueueEmpty', events.onQueueEmpty);
      if (events.onQueueFull) this.emitter.on('onQueueFull', events.onQueueFull);
      if (events.onComplete) this.emitter.on('onComplete', events.onComplete);
      if (events.onProgress) this.emitter.on('onProgress', events.onProgress);
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

    this.emitter.emitOnTaskComplete(taskItem.toObject(), this.results);
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

      this.emitter.emitOnTaskRetry(taskItem.toObject(), taskItem.retries);

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

      this.emitter.emitOnTaskFail(taskItem.toObject(), err);
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
    this.emitter.emitOnProgress(stats.completed + stats.failed, stats.total);
  }

  // 检查队列是否为空
  protected _checkQueueEmpty(): void {
    if (this.isEmpty()) {
      this._isRunning = false;
      this.emitter.emitOnQueueEmpty();
      this.emitter.emitOnComplete(this.results);
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

  // 开始执行队列（供子类或内部调用）
  protected start(): void {
    if (this._isPaused) return;
    this._isRunning = true;
    this._fillSlots();
  }
}