import { ITaskItem } from './types';

/**
 * 事件发射器
 * 提供事件绑定和解绑功能
 */
export class EventEmitter<T = unknown, R = unknown> {
  private events: {
    onTaskComplete?: (task: ITaskItem<T, R>, results: R[]) => void;
    onTaskFail?: (task: ITaskItem<T, R>, error: { code: number; msg: string }) => void;
    onTaskRetry?: (task: ITaskItem<T, R>, attempt: number) => void;
    onQueueEmpty?: () => void;
    onQueueFull?: () => void;
    onComplete?: (results: R[]) => void;
    onProgress?: (completed: number, total: number) => void;
  } = {};

  // 绑定事件
  public on<K extends keyof typeof this.events>(
    event: K,
    callback: (typeof this.events)[K]
  ): void {
    this.events[event] = callback;
  }

  // 解绑事件
  public off<K extends keyof typeof this.events>(event: K): void {
    delete this.events[event];
  }

  // 触发 onTaskComplete
  public emitOnTaskComplete(task: ITaskItem<T, R>, results: R[]): void {
    this.events.onTaskComplete?.(task, results);
  }

  // 触发 onTaskFail
  public emitOnTaskFail(task: ITaskItem<T, R>, error: { code: number; msg: string }): void {
    this.events.onTaskFail?.(task, error);
  }

  // 触发 onTaskRetry
  public emitOnTaskRetry(task: ITaskItem<T, R>, attempt: number): void {
    this.events.onTaskRetry?.(task, attempt);
  }

  // 触发 onQueueEmpty
  public emitOnQueueEmpty(): void {
    this.events.onQueueEmpty?.();
  }

  // 触发 onQueueFull
  public emitOnQueueFull(): void {
    this.events.onQueueFull?.();
  }

  // 触发 onComplete
  public emitOnComplete(results: R[]): void {
    this.events.onComplete?.(results);
  }

  // 触发 onProgress
  public emitOnProgress(completed: number, total: number): void {
    this.events.onProgress?.(completed, total);
  }

  // 获取已绑定的事件列表
  public getBoundEvents(): Array<keyof typeof this.events> {
    return Object.keys(this.events) as Array<keyof typeof this.events>;
  }

  // 清空所有事件
  public clear(): void {
    this.events = {};
  }
}