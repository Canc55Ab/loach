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