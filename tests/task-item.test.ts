import { describe, it, expect } from "vitest";
import { TaskItem } from "../src/patterns/async-queue/task-item";
import { TaskStatus } from "../src/patterns/async-queue/types";

describe("TaskItem", () => {
  it("构造后为等待执行状态", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    expect(item.id).toBe("task-1");
    expect(item.status).toBe(TaskStatus.PENDING);
    expect(item.retries).toBe(0);
    expect(item.result).toBeUndefined();
    expect(item.error).toBeUndefined();
    expect(typeof item.fn).toBe("function");
  });

  it("状态可写", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    item.status = TaskStatus.RUNNING;
    expect(item.status).toBe(TaskStatus.RUNNING);
  });

  it("结果可写", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    item.result = "done";
    expect(item.result).toBe("done");
    item.result = undefined;
    expect(item.result).toBeUndefined();
  });

  it("错误可写", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    const error = { code: 500, msg: "boom" };
    item.error = error;
    expect(item.error).toBe(error);
    item.error = undefined;
    expect(item.error).toBeUndefined();
  });

  it("重试次数自增", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    expect(item.incrementRetries()).toBe(1);
    expect(item.incrementRetries()).toBe(2);
    expect(item.retries).toBe(2);
  });

  it("标记开始执行", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    item.markStarted();
    expect(item.status).toBe(TaskStatus.RUNNING);
    const raw = item.toObject();
    expect(raw.startedAt).toBeGreaterThan(0);
    expect(raw.completedAt).toBeUndefined();
  });

  it("标记完成", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    item.markCompleted("result");
    expect(item.status).toBe(TaskStatus.COMPLETED);
    expect(item.result).toBe("result");
    expect(item.toObject().completedAt).toBeGreaterThan(0);
  });

  it("标记失败", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    item.markFailed({ code: 500, msg: "boom" });
    expect(item.status).toBe(TaskStatus.FAILED);
    expect(item.error).toEqual({ code: 500, msg: "boom" });
    expect(item.toObject().completedAt).toBeGreaterThan(0);
  });

  it("reset 清空运行痕迹", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    item.markStarted();
    item.markCompleted("result");
    item.incrementRetries();

    item.reset();
    expect(item.status).toBe(TaskStatus.PENDING);
    expect(item.result).toBeUndefined();
    expect(item.error).toBeUndefined();
    const raw = item.toObject();
    expect(raw.startedAt).toBeUndefined();
    expect(raw.completedAt).toBeUndefined();
    // 重试次数属于累计计数，reset 不清零
    expect(raw.retries).toBe(1);
  });

  it("toObject 返回原始任务的浅拷贝", () => {
    const item = new TaskItem<unknown, string>(async () => "ok", "task-1");
    const raw = item.toObject();
    expect(raw.id).toBe("task-1");
    expect(raw.fn).toBe(item.fn);
    // 修改副本不影响内部状态
    raw.status = TaskStatus.FAILED;
    expect(item.status).toBe(TaskStatus.PENDING);
  });
});
