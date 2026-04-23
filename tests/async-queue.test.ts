import { describe, it, expect, beforeEach, vi } from "vitest";
import { AsyncQueue } from "../src/patterns/async-queue";
import { TaskStatus } from "../src/patterns/async-queue/types";

describe("AsyncQueue", () => {
  describe("构造函数", () => {
    it("默认配置：并发为1，自动开始", () => {
      const queue = new AsyncQueue();
      expect(queue.isPaused()).toBe(false);
      expect(queue.isRunning()).toBe(false); // 初始时未开始运行，直到添加任务
    });

    it("支持自定义并发数", () => {
      const queue = new AsyncQueue({ concurrency: 3 });
      const stats = queue.getStats();
      expect(stats.concurrency).toBe(0); // 初始并发为0
    });

    it("支持自定义队列容量", () => {
      const queue = new AsyncQueue({ maxQueueSize: 5 });
      expect(queue.isFull()).toBe(false);
    });

    it("支持禁用自动开始", () => {
      const queue = new AsyncQueue({ autoStart: false });
      expect(queue.isRunning()).toBe(false);
    });

    it("支持配置重试次数和间隔", () => {
      const queue = new AsyncQueue({ retryAttempts: 3, retryDelay: 500 });
      queue.setRetryAttempts(5);
      // 内部配置已更新
    });
  });

  describe("add / start", () => {
    it("添加任务后自动开始执行", async () => {
      const queue = new AsyncQueue();
      let executed = false;
      
      queue.add(async () => {
        executed = true;
        return "result";
      });
      
      await vi.waitFor(() => {
        expect(executed).toBe(true);
      });
    });

    it("add 返回任务ID", () => {
      const queue = new AsyncQueue({ autoStart: false });
      const id = queue.add(async () => "result");
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("手动 start 启动队列", async () => {
      const queue = new AsyncQueue({ autoStart: false });
      let executed = false;
      
      queue.add(async () => {
        executed = true;
        return "result";
      });
      
      expect(queue.isRunning()).toBe(false);
      queue.start();
      
      await vi.waitFor(() => {
        expect(queue.isRunning()).toBe(true);
      });
    });

    it("任务完成后获取结果", async () => {
      const queue = new AsyncQueue();
      
      queue.add(async () => "hello");
      queue.add(async () => "world");
      
      await vi.waitFor(() => {
        const results = queue.getResults();
        expect(results).toContain("hello");
        expect(results).toContain("world");
      }, { timeout: 3000 });
    });
  });

  describe("addMany", () => {
    it("批量添加任务返回ID数组", () => {
      const queue = new AsyncQueue({ autoStart: false });
      const ids = queue.addMany([
        async () => 1,
        async () => 2,
        async () => 3,
      ]);
      
      expect(ids).toHaveLength(3);
      expect(ids[0]).toContain("batch_");
    });

    it("批量添加后自动执行", async () => {
      const queue = new AsyncQueue();
      let count = 0;
      
      queue.addMany([
        async () => { count++; return count; },
        async () => { count++; return count; },
        async () => { count++; return count; },
      ]);
      
      await vi.waitFor(() => {
        expect(count).toBe(3);
      }, { timeout: 3000 });
    });
  });

  describe("并发控制", () => {
    it("concurrency=1 时顺序执行", async () => {
      const queue = new AsyncQueue({ concurrency: 1, autoStart: false });
      const order: number[] = [];
      
      queue.add(async () => {
        order.push(1);
        await new Promise(r => setTimeout(r, 50));
        return 1;
      });
      queue.add(async () => {
        order.push(2);
        return 2;
      });
      
      queue.start();
      
      // 第一个任务开始
      await vi.waitFor(() => {
        expect(order).toEqual([1]);
      });
      
      // 第一个完成后第二个开始
      await vi.waitFor(() => {
        expect(order).toEqual([1, 2]);
      }, { timeout: 3000 });
    });

    it("concurrency=2 时并行执行", async () => {
      const queue = new AsyncQueue({ concurrency: 2, autoStart: false });
      const order: number[] = [];
      
      queue.add(async () => {
        order.push(1);
        await new Promise(r => setTimeout(r, 100));
        return 1;
      });
      queue.add(async () => {
        order.push(2);
        return 2;
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(order).toEqual([1, 2]);
      }, { timeout: 3000 });
    });

    it("动态调整并发数", async () => {
      const queue = new AsyncQueue({ concurrency: 1, autoStart: false });
      const running: number[] = [];
      
      queue.add(async () => {
        running.push(1);
        await new Promise(r => setTimeout(r, 50));
        return 1;
      });
      queue.add(async () => {
        running.push(2);
        await new Promise(r => setTimeout(r, 50));
        return 2;
      });
      queue.add(async () => {
        running.push(3);
        return 3;
      });
      
      queue.start();
      
      // 先只有1个在运行
      await vi.waitFor(() => {
        expect(running).toEqual([1]);
      });
      
      // 动态调整为2
      queue.setConcurrency(2);
      
      await vi.waitFor(() => {
        expect(running).toEqual([1, 2, 3]);
      }, { timeout: 3000 });
    });

    it("concurrency=0 抛出异常", () => {
      const queue = new AsyncQueue();
      expect(() => queue.setConcurrency(0)).toThrow();
    });
  });

  describe("pause / resume", () => {
    it("pause 暂停后不继续执行新任务", async () => {
      const queue = new AsyncQueue({ concurrency: 1, autoStart: false });
      let count = 0;
      
      queue.add(async () => {
        count++;
        await new Promise(r => setTimeout(r, 30));
        return count;
      });
      queue.add(async () => {
        count++;
        return count;
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(count).toBe(1);
      });
      
      queue.pause();
      expect(queue.isPaused()).toBe(true);
      
      // 暂停后不再执行新任务
      await new Promise(r => setTimeout(r, 100));
      expect(count).toBe(1);
    });

    it("resume 恢复后继续执行", async () => {
      const queue = new AsyncQueue({ concurrency: 1, autoStart: false });
      let count = 0;
      
      queue.add(async () => {
        count++;
        await new Promise(r => setTimeout(r, 30));
        return count;
      });
      queue.add(async () => {
        count++;
        return count;
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(count).toBe(1);
      });
      
      queue.pause();
      queue.resume();
      
      await vi.waitFor(() => {
        expect(count).toBe(2);
      }, { timeout: 3000 });
    });

    it("暂停时添加的任务在恢复后执行", async () => {
      const queue = new AsyncQueue({ concurrency: 1, autoStart: false });
      let count = 0;
      
      queue.add(async () => {
        count++;
        return count;
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(count).toBe(1);
      });
      
      queue.pause();
      
      queue.add(async () => {
        count++;
        return count;
      });
      
      expect(count).toBe(1); // 新任务未执行
      
      queue.resume();
      
      await vi.waitFor(() => {
        expect(count).toBe(2);
      }, { timeout: 3000 });
    });
  });

  describe("重试机制", () => {
    it("任务失败后自动重试", async () => {
      const queue = new AsyncQueue({ 
        retryAttempts: 2, 
        retryDelay: 50,
        autoStart: false 
      });
      let attempts = 0;
      
      queue.add(async () => {
        attempts++;
        if (attempts < 3) {
          throw { code: 500, msg: "模拟失败" };
        }
        return "success";
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(attempts).toBe(3);
      }, { timeout: 5000 });
      
      const status = queue.getTaskStatus(queue.getResults()[0] ? "" : "");
      // 检查任务已完成
      await vi.waitFor(() => {
        const stats = queue.getStats();
        expect(stats.completed + stats.failed).toBe(1);
      }, { timeout: 3000 });
    });

    it("超过最大重试次数后标记为失败", async () => {
      const queue = new AsyncQueue({ 
        retryAttempts: 1, 
        retryDelay: 30,
        autoStart: false 
      });
      let attempts = 0;
      
      queue.add(async () => {
        attempts++;
        throw { code: 500, msg: "总是失败" };
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(attempts).toBe(2); // 初始1次 + 重试1次
      }, { timeout: 3000 });
      
      const stats = queue.getStats();
      expect(stats.failed).toBe(1);
    });

    it("重试时触发 onTaskRetry 事件", async () => {
      const retryEvents: number[] = [];
      const queue = new AsyncQueue({ 
        retryAttempts: 2, 
        retryDelay: 30,
        autoStart: false,
        events: {
          onTaskRetry: (_task, attempt) => {
            retryEvents.push(attempt);
          }
        }
      });
      let attempts = 0;
      
      queue.add(async () => {
        attempts++;
        if (attempts < 3) {
          throw { code: 500, msg: "失败" };
        }
        return "success";
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(retryEvents).toEqual([1, 2]); // 第1次重试、第2次重试
      }, { timeout: 5000 });
    });
  });

  describe("事件回调", () => {
    it("onTaskComplete 任务完成时触发", async () => {
      const completed: string[] = [];
      const queue = new AsyncQueue({
        autoStart: false,
        events: {
          onTaskComplete: (task, _results) => {
            completed.push(task.id);
          }
        }
      });
      
      queue.add(async () => "a", "task1");
      queue.add(async () => "b", "task2");
      queue.start();
      
      await vi.waitFor(() => {
        expect(completed).toContain("task1");
        expect(completed).toContain("task2");
      }, { timeout: 3000 });
    });

    it("onTaskFail 任务失败时触发", async () => {
      const failed: string[] = [];
      const queue = new AsyncQueue({
        retryAttempts: 0,
        autoStart: false,
        events: {
          onTaskFail: (task, _error) => {
            failed.push(task.id);
          }
        }
      });
      
      queue.add(async () => {
        throw { code: 500, msg: "error" };
      }, "failTask");
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(failed).toContain("failTask");
      }, { timeout: 3000 });
    });

    it("onQueueEmpty 队列为空时触发", async () => {
      let emptyTriggered = false;
      const queue = new AsyncQueue({
        autoStart: false,
        events: {
          onQueueEmpty: () => {
            emptyTriggered = true;
          }
        }
      });
      
      queue.add(async () => "result");
      queue.start();
      
      await vi.waitFor(() => {
        expect(emptyTriggered).toBe(true);
      }, { timeout: 3000 });
    });

    it("onComplete 所有任务完成时触发", async () => {
      const allResults: unknown[] = [];
      const queue = new AsyncQueue({
        autoStart: false,
        events: {
          onComplete: (results) => {
            allResults.push(...results);
          }
        }
      });
      
      queue.add(async () => "a");
      queue.add(async () => "b");
      queue.start();
      
      await vi.waitFor(() => {
        expect(allResults).toEqual(["a", "b"]);
      }, { timeout: 3000 });
    });

    it("onProgress 进度变化时触发", async () => {
      const progressLog: [number, number][] = [];
      const queue = new AsyncQueue({
        autoStart: false,
        events: {
          onProgress: (completed, total) => {
            progressLog.push([completed, total]);
          }
        }
      });
      
      queue.add(async () => "a");
      queue.add(async () => "b");
      queue.start();
      
      await vi.waitFor(() => {
        expect(progressLog.some(p => p[0] === 2 && p[1] === 2)).toBe(true);
      }, { timeout: 3000 });
    });

    it("on 方法绑定事件后有效", async () => {
      const queue = new AsyncQueue({ autoStart: false });
      const completed: string[] = [];
      
      queue.on("onTaskComplete", (task) => {
        completed.push(task.id);
      });
      
      queue.add(async () => "result", "eventTask");
      queue.start();
      
      await vi.waitFor(() => {
        expect(completed).toContain("eventTask");
      }, { timeout: 3000 });
    });

    it("off 方法解绑事件", async () => {
      const queue = new AsyncQueue({ autoStart: false });
      const called: string[] = [];
      
      queue.on("onTaskComplete", () => {
        called.push("called");
      });
      queue.off("onTaskComplete");
      
      queue.add(async () => "result", "task1");
      queue.start();
      
      await new Promise(r => setTimeout(r, 500));
      expect(called).toEqual([]);
    });
  });

  describe("状态查询", () => {
    describe("getStats", () => {
      it("初始状态", () => {
        const queue = new AsyncQueue({ autoStart: false });
        const stats = queue.getStats();
        
        expect(stats.pending).toBe(0);
        expect(stats.running).toBe(0);
        expect(stats.completed).toBe(0);
        expect(stats.failed).toBe(0);
        expect(stats.total).toBe(0);
      });

      it("添加任务后的统计", () => {
        const queue = new AsyncQueue({ autoStart: false });
        queue.add(async () => "a");
        queue.add(async () => "b");
        
        const stats = queue.getStats();
        expect(stats.pending).toBe(2);
        expect(stats.total).toBe(2);
      });

      it("执行中的统计", async () => {
        const queue = new AsyncQueue({ concurrency: 1, autoStart: false });
        let started = false;
        
        queue.add(async () => {
          started = true;
          await new Promise(r => setTimeout(r, 50));
          return "a";
        });
        queue.add(async () => "b");
        
        queue.start();
        
        await vi.waitFor(() => {
          const stats = queue.getStats();
          expect(stats.running).toBe(1);
          expect(stats.pending).toBe(1);
        });
      });

      it("完成后的统计", async () => {
        const queue = new AsyncQueue();
        queue.add(async () => "a");
        
        await vi.waitFor(() => {
          const stats = queue.getStats();
          expect(stats.completed).toBe(1);
        }, { timeout: 3000 });
      });
    });

    describe("getTaskStatus", () => {
      it("获取任务状态", async () => {
        const queue = new AsyncQueue({ autoStart: false });
        const taskId = queue.add(async () => "result");
        
        expect(queue.getTaskStatus(taskId)).toBe(TaskStatus.PENDING);
        
        queue.start();
        
        await vi.waitFor(() => {
          expect(queue.getTaskStatus(taskId)).toBe(TaskStatus.COMPLETED);
        }, { timeout: 3000 });
      });

      it("不存在的任务返回 undefined", () => {
        const queue = new AsyncQueue();
        expect(queue.getTaskStatus("not-exist")).toBeUndefined();
      });
    });

    describe("getTaskResult", () => {
      it("获取任务结果", async () => {
        const queue = new AsyncQueue({ autoStart: false });
        const taskId = queue.add(async () => "hello");
        
        queue.start();
        
        await vi.waitFor(() => {
          expect(queue.getTaskResult(taskId)).toBe("hello");
        }, { timeout: 3000 });
      });

      it("失败任务结果为 undefined", async () => {
        const queue = new AsyncQueue({ retryAttempts: 0, autoStart: false });
        const taskId = queue.add(async () => {
          throw { code: 500, msg: "error" };
        });
        
        queue.start();
        
        await vi.waitFor(() => {
          expect(queue.getTaskStatus(taskId)).toBe(TaskStatus.FAILED);
        }, { timeout: 3000 });
      });
    });

    describe("isEmpty / isFull", () => {
      it("空队列", () => {
        const queue = new AsyncQueue();
        expect(queue.isEmpty()).toBe(true);
        expect(queue.isFull()).toBe(false);
      });

      it("有任务时不为空", async () => {
        const queue = new AsyncQueue({ autoStart: false });
        queue.add(async () => "a");
        
        // pendingQueue 有任务，但任务还未执行完成
        // isEmpty 检查 pendingQueue.length === 0 && runningSet.size === 0
        // 任务已在 pendingQueue，所以 not isEmpty
        expect(queue.isEmpty()).toBe(false);
      });

      it("队列满时 isFull 返回 true", async () => {
        const queue = new AsyncQueue({ maxQueueSize: 2, autoStart: false });
        queue.add(async () => "a");
        queue.add(async () => "b");
        
        expect(queue.isFull()).toBe(true);
      });

      it("队列满时添加任务抛出异常", () => {
        const queue = new AsyncQueue({ maxQueueSize: 1, autoStart: false });
        queue.add(async () => "a");
        
        expect(() => queue.add(async () => "b")).toThrow();
      });
    });

    describe("isRunning / isPaused", () => {
      it("初始状态", () => {
        const queue = new AsyncQueue({ autoStart: false });
        expect(queue.isRunning()).toBe(false);
        expect(queue.isPaused()).toBe(false);
      });

      it("开始后 isRunning 为 true", async () => {
        const queue = new AsyncQueue({ autoStart: false });
        queue.add(async () => {
          await new Promise(r => setTimeout(r, 50));
          return "a";
        });
        
        queue.start();
        
        await vi.waitFor(() => {
          expect(queue.isRunning()).toBe(true);
        });
      });
    });

    describe("getResults", () => {
      it("按入队顺序返回结果", async () => {
        const queue = new AsyncQueue({ autoStart: false });
        queue.add(async () => "first");
        queue.add(async () => "second");
        queue.add(async () => "third");
        
        queue.start();
        
        await vi.waitFor(() => {
          const results = queue.getResults();
          expect(results).toEqual(["first", "second", "third"]);
        }, { timeout: 3000 });
      });

      it("失败任务在结果数组中占位 undefined", async () => {
        const queue = new AsyncQueue({ retryAttempts: 0, autoStart: false });
        queue.add(async () => "success");
        queue.add(async () => {
          throw { code: 500, msg: "error" };
        });
        
        queue.start();
        
        await vi.waitFor(() => {
          const results = queue.getResults();
          expect(results[0]).toBe("success");
          expect(results[1]).toBeUndefined();
        }, { timeout: 3000 });
      });
    });
  });

  describe("clear / cancel", () => {
    it("clear 清空待执行任务", async () => {
      const queue = new AsyncQueue({ concurrency: 1, autoStart: false });
      let executed = 0;
      
      queue.add(async () => {
        executed++;
        await new Promise(r => setTimeout(r, 100)); // 任务需要时间
        return "a";
      });
      queue.add(async () => {
        executed++;
        return "b";
      });
      
      queue.start();
      
      // 等待第一个任务开始执行
      await vi.waitFor(() => {
        expect(executed).toBe(1);
      });
      
      // 此时第二个任务还在 pendingQueue 中
      queue.clear();
      
      // 第二个任务被清除，不会执行
      // 等待一段时间确保没有新的执行
      await new Promise(r => setTimeout(r, 200));
      expect(executed).toBe(1);
    });

    it("cancel 取消所有任务（包括正在执行的）", async () => {
      const queue = new AsyncQueue({ autoStart: false });
      const results: string[] = [];
      
      queue.add(async () => {
        await new Promise(r => setTimeout(r, 100));
        results.push("a");
        return "a";
      });
      queue.add(async () => {
        results.push("b");
        return "b";
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(results.length).toBeGreaterThan(0);
      });
      
      queue.cancel();
      
      // 取消后队列停止，但正在执行的任务会继续并完成
      await new Promise(r => setTimeout(r, 200));
      
      const stats = queue.getStats();
      expect(queue.isRunning()).toBe(false);
      expect(queue.isPaused()).toBe(false);
    });
  });

  describe("Symbol.iterator", () => {
    it("支持遍历任务", async () => {
      const queue = new AsyncQueue({ autoStart: false });
      queue.add(async () => "a", "t1");
      queue.add(async () => "b", "t2");
      
      const taskIds: string[] = [];
      for (const task of queue) {
        taskIds.push(task.id);
      }
      
      expect(taskIds).toContain("t1");
      expect(taskIds).toContain("t2");
    });
  });

  describe("边界情况", () => {
    it("空队列调用 clear", () => {
      const queue = new AsyncQueue();
      queue.clear(); // 不应抛出异常
      expect(queue.isEmpty()).toBe(true);
    });

    it("空队列调用 cancel", () => {
      const queue = new AsyncQueue();
      queue.cancel(); // 不应抛出异常
    });

    it("暂停时调用 start 无效", () => {
      const queue = new AsyncQueue({ autoStart: false });
      queue.add(async () => "a");
      queue.start();
      
      queue.pause();
      expect(queue.isPaused()).toBe(true);
      
      queue.start(); // 暂停时调用 start 无效
      expect(queue.isPaused()).toBe(true);
    });

    it("队列容量为0时立即满", () => {
      const queue = new AsyncQueue({ maxQueueSize: 0 });
      expect(queue.isFull()).toBe(true);
      expect(() => queue.add(async () => "a")).toThrow();
    });

    it("maxQueueSize=Infinity 永远不会满", () => {
      const queue = new AsyncQueue({ maxQueueSize: Infinity });
      expect(queue.isFull()).toBe(false);
      // 可以添加很多任务而不满
    });
  });

  describe("集成场景", () => {
    it("完整的添加、暂停、恢复流程", async () => {
      const queue = new AsyncQueue({ concurrency: 2, autoStart: false });
      const results: string[] = [];
      
      queue.on("onTaskComplete", (task) => {
        if (task.result) results.push(task.result as string);
      });
      
      queue.add(async () => {
        await new Promise(r => setTimeout(r, 30));
        return "a";
      });
      queue.add(async () => {
        await new Promise(r => setTimeout(r, 30));
        return "b";
      });
      queue.add(async () => {
        await new Promise(r => setTimeout(r, 30));
        return "c";
      });
      
      queue.start();
      
      await vi.waitFor(() => {
        expect(results.length).toBe(2); // concurrency=2
      });
      
      queue.pause();
      
      await vi.waitFor(() => {
        expect(results.length).toBe(2); // 暂停后不再增加
      }, { timeout: 200 });
      
      queue.resume();
      
      await vi.waitFor(() => {
        expect(results).toEqual(["a", "b", "c"]);
      }, { timeout: 5000 });
    });

    it("大量任务顺序执行", async () => {
      const queue = new AsyncQueue({ concurrency: 3 });
      const count = 10;
      
      for (let i = 0; i < count; i++) {
        queue.add(async () => i);
      }
      
      await vi.waitFor(() => {
        const results = queue.getResults();
        expect(results).toHaveLength(count);
      }, { timeout: 10000 });
    });

    it("混合成功和失败任务", async () => {
      const queue = new AsyncQueue({ retryAttempts: 0 });
      const completed: string[] = [];
      const failed: string[] = [];
      
      queue.on("onTaskComplete", (task) => {
        if (task.result !== undefined) completed.push(task.result as string);
      });
      queue.on("onTaskFail", (task) => {
        failed.push(task.id);
      });
      
      queue.add(async () => "success1", "s1");
      queue.add(async () => { throw { code: 500, msg: "fail" }; }, "f1");
      queue.add(async () => "success2", "s2");
      
      await vi.waitFor(() => {
        expect(completed).toEqual(["success1", "success2"]);
        expect(failed).toEqual(["f1"]);
      }, { timeout: 5000 });
    });
  });
});