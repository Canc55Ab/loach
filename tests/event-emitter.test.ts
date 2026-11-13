import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "../src/patterns/async-queue/event-emitter";
import { TaskStatus } from "../src/patterns/async-queue/types";
import type { ITaskItem } from "../src/patterns/async-queue/types";

function makeTask(id = "t1"): ITaskItem<unknown, string> {
  return {
    id,
    fn: async () => "ok",
    status: TaskStatus.PENDING,
    addedAt: 0,
    retries: 0,
  };
}

describe("EventEmitter", () => {
  it("绑定后触发对应回调", () => {
    const emitter = new EventEmitter<unknown, string>();
    const onComplete = vi.fn();
    emitter.on("onComplete", onComplete);

    emitter.emitOnComplete(["a", "b"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(["a", "b"]);
  });

  it("任务级回调收到任务与结果", () => {
    const emitter = new EventEmitter<unknown, string>();
    const task = makeTask();
    const onTaskComplete = vi.fn();
    const onTaskFail = vi.fn();
    const onTaskRetry = vi.fn();
    emitter.on("onTaskComplete", onTaskComplete);
    emitter.on("onTaskFail", onTaskFail);
    emitter.on("onTaskRetry", onTaskRetry);

    emitter.emitOnTaskComplete(task, ["r"]);
    expect(onTaskComplete).toHaveBeenCalledWith(task, ["r"]);

    const error = { code: 500, msg: "boom" };
    emitter.emitOnTaskFail(task, error);
    expect(onTaskFail).toHaveBeenCalledWith(task, error);

    emitter.emitOnTaskRetry(task, 2);
    expect(onTaskRetry).toHaveBeenCalledWith(task, 2);
  });

  it("队列状态回调被触发", () => {
    const emitter = new EventEmitter<unknown, string>();
    const onQueueEmpty = vi.fn();
    const onQueueFull = vi.fn();
    const onProgress = vi.fn();
    emitter.on("onQueueEmpty", onQueueEmpty);
    emitter.on("onQueueFull", onQueueFull);
    emitter.on("onProgress", onProgress);

    emitter.emitOnQueueEmpty();
    emitter.emitOnQueueFull();
    emitter.emitOnProgress(3, 10);

    expect(onQueueEmpty).toHaveBeenCalledTimes(1);
    expect(onQueueFull).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(3, 10);
  });

  it("未绑定回调时触发不报错", () => {
    const emitter = new EventEmitter<unknown, string>();
    const task = makeTask();
    expect(() => {
      emitter.emitOnTaskComplete(task, []);
      emitter.emitOnTaskFail(task, { code: 1, msg: "x" });
      emitter.emitOnTaskRetry(task, 1);
      emitter.emitOnQueueEmpty();
      emitter.emitOnQueueFull();
      emitter.emitOnComplete([]);
      emitter.emitOnProgress(0, 0);
    }).not.toThrow();
  });

  it("解绑后回调不再触发", () => {
    const emitter = new EventEmitter<unknown, string>();
    const onComplete = vi.fn();
    emitter.on("onComplete", onComplete);
    emitter.off("onComplete");

    emitter.emitOnComplete([]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("已绑定事件列表可读", () => {
    const emitter = new EventEmitter<unknown, string>();
    expect(emitter.getBoundEvents()).toEqual([]);

    emitter.on("onComplete", vi.fn());
    emitter.on("onQueueEmpty", vi.fn());
    expect(emitter.getBoundEvents().sort()).toEqual(["onComplete", "onQueueEmpty"]);
  });

  it("clear 清空所有绑定", () => {
    const emitter = new EventEmitter<unknown, string>();
    const onComplete = vi.fn();
    emitter.on("onComplete", onComplete);
    emitter.clear();

    expect(emitter.getBoundEvents()).toEqual([]);
    emitter.emitOnComplete([]);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
