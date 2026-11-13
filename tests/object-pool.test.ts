import { describe, it, expect } from "vitest";
import { ObjectPool } from "../src/patterns/object-pool";

interface IBullet {
  id: number;
  alive: boolean;
}

describe("ObjectPool", () => {
  it("无可用实例时创建新实例", () => {
    let created = 0;
    const pool = new ObjectPool<IBullet>({
      factory: () => ({ id: ++created, alive: true }),
    });

    const bullet = pool.acquire();
    expect(bullet.id).toBe(1);
    expect(pool.usedCount).toBe(1);
    expect(pool.totalCount).toBe(1);
    expect(pool.size).toBe(0);
  });

  it("归还在使用的实例会被复用", () => {
    let created = 0;
    const pool = new ObjectPool<IBullet>({
      factory: () => ({ id: ++created, alive: true }),
    });

    const first = pool.acquire();
    pool.release(first);
    const second = pool.acquire();

    expect(second).toBe(first);
    expect(pool.totalCount).toBe(1);
    expect(pool.size).toBe(0);
    expect(pool.usedCount).toBe(1);
  });

  it("归还时调用 reset", () => {
    const pool = new ObjectPool<IBullet>({
      factory: () => ({ id: 1, alive: true }),
      reset: (bullet) => {
        bullet.alive = false;
      },
    });

    const bullet = pool.acquire();
    bullet.alive = true;
    pool.release(bullet);
    expect(bullet.alive).toBe(false);
  });

  it("归还未在用的实例返回 false", () => {
    const pool = new ObjectPool<IBullet>({ factory: () => ({ id: 1, alive: true }) });
    const orphan = { id: 99, alive: true };
    expect(pool.release(orphan)).toBe(false);
  });

  it("预热实例直接进入空闲区", () => {
    let created = 0;
    const pool = new ObjectPool<IBullet>({
      factory: () => ({ id: ++created, alive: true }),
      prewarm: 3,
    });

    expect(pool.size).toBe(3);
    expect(pool.totalCount).toBe(3);
    expect(pool.usedCount).toBe(0);
  });

  it("maxSize 限制空闲实例数量", () => {
    let created = 0;
    const pool = new ObjectPool<IBullet>({
      factory: () => ({ id: ++created, alive: true }),
      maxSize: 1,
    });

    const a = pool.acquire();
    const b = pool.acquire();
    pool.release(a);
    pool.release(b);

    expect(pool.size).toBe(1);
    expect(pool.totalCount).toBe(2);
  });

  it("批量归还", () => {
    const pool = new ObjectPool<IBullet>({ factory: () => ({ id: 1, alive: true }) });
    const a = pool.acquire();
    const b = pool.acquire();
    pool.releaseAll([a, b]);
    expect(pool.usedCount).toBe(0);
    expect(pool.size).toBe(2);
  });

  it("清空空闲区不影响在用实例", () => {
    const pool = new ObjectPool<IBullet>({ factory: () => ({ id: 1, alive: true }) });
    const used = pool.acquire();
    pool.acquire();
    pool.release(used);

    pool.clear();
    expect(pool.size).toBe(0);
    expect(pool.usedCount).toBe(1);
  });

  it("reset 归还全部在用实例", () => {
    const pool = new ObjectPool<IBullet>({ factory: () => ({ id: 1, alive: true }) });
    pool.acquire();
    pool.acquire();
    pool.reset();
    expect(pool.usedCount).toBe(0);
  });

  describe("空闲上限", () => {
    it("默认空闲上限为 Infinity", () => {
      const pool = new ObjectPool<IBullet>({ factory: () => ({ id: 1, alive: true }) });
      expect(pool.maxSize).toBe(Infinity);
    });

    it("构造时可指定空闲上限", () => {
      const pool = new ObjectPool<IBullet>({
        factory: () => ({ id: 1, alive: true }),
        maxSize: 2,
      });
      expect(pool.maxSize).toBe(2);
    });

    it("上限可写", () => {
      const pool = new ObjectPool<IBullet>({ factory: () => ({ id: 1, alive: true }) });
      pool.maxSize = 5;
      expect(pool.maxSize).toBe(5);
    });

    it("超出上限的多余空闲实例会被丢弃", () => {
      let created = 0;
      const pool = new ObjectPool<IBullet>({
        factory: () => ({ id: ++created, alive: true }),
        maxSize: 1,
      });
      const a = pool.acquire();
      const b = pool.acquire();
      pool.release(a);
      pool.release(b);
      // 只保留 1 个空闲实例
      expect(pool.size).toBe(1);
      // 被丢弃的实例不会被复用
      expect(pool.acquire().id).toBe(a.id);
    });
  });
});
