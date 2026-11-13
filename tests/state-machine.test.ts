import { describe, it, expect } from "vitest";
import { StateMachine } from "../src/patterns/state-machine";

interface IContext {
  log: string[];
  hp: number;
}

type State = "idle" | "chase" | "attack" | "dead";
type Event = "seePlayer" | "losePlayer" | "inRange" | "die";

function createMachine() {
  const context: IContext = { log: [], hp: 100 };
  const machine = new StateMachine<State, IContext, Event>({
    initial: "idle",
    context,
    states: {
      idle: {
        transitions: { seePlayer: "chase", die: "dead" },
        onEnter: (_ctx, from) => context.log.push(`enter:idle from:${from}`),
        onExit: (_ctx, to) => context.log.push(`exit:idle to:${to}`),
      },
      chase: {
        transitions: { inRange: "attack", losePlayer: "idle", die: "dead" },
        onEnter: (_ctx, from) => context.log.push(`enter:chase from:${from}`),
        onExit: (_ctx, to) => context.log.push(`exit:chase to:${to}`),
      },
      attack: {
        transitions: { losePlayer: "chase", die: "dead" },
        onEnter: (_ctx, from) => context.log.push(`enter:attack from:${from}`),
        onExit: (_ctx, to) => context.log.push(`exit:attack to:${to}`),
      },
      dead: {
        transitions: {},
        onEnter: (_ctx, from) => context.log.push(`enter:dead from:${from}`),
      },
    },
  });
  return { machine, context };
}

describe("StateMachine", () => {
  it("初始进入 idle 状态", () => {
    const { machine, context } = createMachine();
    expect(machine.current).toBe("idle");
    expect(machine.isIn("idle")).toBe(true);
    expect(context.log).toEqual(["enter:idle from:null"]);
  });

  it("事件触发状态切换", () => {
    const { machine } = createMachine();
    expect(machine.dispatch("seePlayer")).toBe(true);
    expect(machine.current).toBe("chase");
    expect(machine.isIn("chase")).toBe(true);
  });

  it("非法事件返回 false 且状态不变", () => {
    const { machine } = createMachine();
    expect(machine.dispatch("inRange")).toBe(false);
    expect(machine.current).toBe("idle");
  });

  it("canDispatch 正确反映可切换性", () => {
    const { machine } = createMachine();
    expect(machine.canDispatch("seePlayer")).toBe(true);
    expect(machine.canDispatch("inRange")).toBe(false);
    machine.dispatch("seePlayer");
    expect(machine.canDispatch("inRange")).toBe(true);
  });

  it("onExit 先于 onEnter 调用", () => {
    const { machine, context } = createMachine();
    machine.dispatch("seePlayer");
    expect(context.log).toEqual([
      "enter:idle from:null",
      "exit:idle to:chase",
      "enter:chase from:idle",
    ]);
  });

  it("记录状态切换历史", () => {
    const { machine } = createMachine();
    machine.dispatch("seePlayer");
    machine.dispatch("inRange");
    expect(machine.history).toEqual(["idle", "chase"]);
  });

  it("update 触发当前状态的 onUpdate", () => {
    const context: IContext = { log: [], hp: 100 };
    const machine = new StateMachine<State, IContext, Event>({
      initial: "idle",
      context,
      states: {
        idle: {
          transitions: {},
          onUpdate: (_ctx, dt) => context.log.push(`update:${dt}`),
        },
        chase: { transitions: {} },
        attack: { transitions: {} },
        dead: { transitions: {} },
      },
    });

    machine.update(0.016);
    expect(context.log).toEqual(["update:0.016"]);
  });

  it("切换过程中再次 dispatch 会被排队处理", () => {
    const context: IContext = { log: [], hp: 100 };
    const machine = new StateMachine<State, IContext, Event>({
      initial: "idle",
      context,
      states: {
        idle: {
          transitions: { seePlayer: "chase" },
        },
        chase: {
          transitions: { inRange: "attack" },
          // 进入 chase 后立刻再触发一次事件
          onEnter: () => {
            machine.dispatch("inRange");
          },
        },
        attack: { transitions: {} },
        dead: { transitions: {} },
      },
    });

    machine.dispatch("seePlayer");
    expect(machine.current).toBe("attack");
  });

  it("重置回初始状态", () => {
    const { machine } = createMachine();
    machine.dispatch("seePlayer");
    machine.reset();
    expect(machine.current).toBe("idle");
    expect(machine.history).toEqual([]);
  });

  it("上下文可读写", () => {
    const { machine, context } = createMachine();
    expect(machine.context).toBe(context);
    const next: IContext = { log: [], hp: 50 };
    machine.context = next;
    expect(machine.context.hp).toBe(50);
  });

  describe("无 transitions / 无回调的状态", () => {
    interface IBareContext {
      log: string[];
      machine?: StateMachine<"a" | "b", IBareContext, "go" | "again">;
    }

    function createBareMachine(): StateMachine<"a" | "b", IBareContext, "go" | "again"> {
      const context: IBareContext = { log: [] };
      const machine = new StateMachine<"a" | "b", IBareContext, "go" | "again">({
        initial: "a",
        context,
        states: {
          a: {
            transitions: { go: "b", again: "b" },
            onExit: (ctx) => {
              ctx.log.push("exit:a");
              // 切换尚未提交时再派发一次事件，事件会在新状态下被消费
              ctx.machine?.dispatch("again");
            },
          },
          // 刻意不声明 transitions
          b: {},
        },
      });
      context.machine = machine;
      return machine;
    }

    it("无 transitions 的状态不能派发任何事件", () => {
      const machine = createBareMachine();
      machine.dispatch("go");
      expect(machine.current).toBe("b");
      expect(machine.canDispatch("go")).toBe(false);
      expect(machine.canDispatch("again")).toBe(false);
      expect(machine.dispatch("go")).toBe(false);
    });

    it("切换过程中当前状态已变时忽略无对应转换的事件", () => {
      const machine = createBareMachine();
      machine.dispatch("go");
      // "again" 在 a 上有转换，但被消费时当前状态已是 b（无转换）→ 被忽略
      expect(machine.current).toBe("b");
      expect(machine.context.log).toEqual(["exit:a"]);
    });

    it("无 onUpdate 的状态调用 update 不会报错", () => {
      const machine = createBareMachine();
      expect(() => machine.update(0.016)).not.toThrow();
    });

    it("reset 遇到无 onExit / onEnter 的状态不会报错", () => {
      const machine = createBareMachine();
      machine.dispatch("go");
      expect(machine.current).toBe("b");
      expect(() => machine.reset()).not.toThrow();
      expect(machine.current).toBe("a");
      expect(machine.history).toEqual([]);
    });
  });

  describe("历史记录上限", () => {
    it("超过 maxHistory 后旧记录被丢弃", () => {
      const context: IContext = { log: [], hp: 100 };
      const machine = new StateMachine<State, IContext, Event>({
        initial: "idle",
        context,
        maxHistory: 2,
        states: {
          idle: { transitions: { seePlayer: "chase" } },
          chase: { transitions: { losePlayer: "idle" } },
          attack: { transitions: { losePlayer: "chase" } },
          dead: { transitions: {} },
        },
      });

      machine.dispatch("seePlayer");
      machine.dispatch("losePlayer");
      machine.dispatch("seePlayer");
      machine.dispatch("losePlayer");
      machine.dispatch("seePlayer");
      // 历史只保留最近 2 条
      expect(machine.history.length).toBe(2);
      expect(machine.history).toEqual(["chase", "idle"]);
    });
  });
});
