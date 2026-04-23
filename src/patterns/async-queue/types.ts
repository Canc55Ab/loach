/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',    // 等待执行
  RUNNING = 'running',    // 执行中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed',       // 执行失败
}

/**
 * 任务项
 */
export interface ITaskItem<T = unknown, R = unknown> {
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

/**
 * 任务事件回调
 */
export interface ITaskEvents<T = unknown, R = unknown> {
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
export interface IAsyncQueueProps<T = unknown, R = unknown> {
  concurrency?: number;          // 最大并发数，默认 1
  maxQueueSize?: number;         // 队列最大容量，默认 Infinity
  retryAttempts?: number;        // 失败重试次数，默认 0
  retryDelay?: number;           // 重试间隔(ms)，默认 1000
  autoStart?: boolean;           // 添加任务后自动开始，默认 true
  events?: ITaskEvents<T, R>;    // 事件回调
}

/**
 * 队列统计信息
 */
export interface IQueueStats {
  pending: number;      // 等待任务数
  running: number;      // 执行中任务数
  completed: number;    // 已完成任务数
  failed: number;       // 失败任务数
  total: number;        // 总任务数
  concurrency: number;  // 当前并发数
}