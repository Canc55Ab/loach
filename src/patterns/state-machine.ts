/**
 * 有限状态机（FSM）
 *
 * 用于角色 AI 状态切换（Idle / Patrol / Chase / Attack / Dead）、
 * 场景流程控制、UI 界面栈等。
 *
 * 约定：
 * - 通过**事件**驱动状态切换，`dispatch` 返回是否切换成功
 * - 非法事件返回 false，且**不改变**当前状态
 * - 切换过程中再次 dispatch 会被排队，待当前切换结束后依次处理
 */

/** 状态定义 */
export interface IStateDefinition<
  S extends string,
  C = unknown,
  E extends string = string,
  P = unknown
> {
  /** 进入状态时触发 */
  onEnter?: (context: C, from: S | null, payload?: P) => void;
  /** 离开状态时触发 */
  onExit?: (context: C, to: S, payload?: P) => void;
  /** 状态内每帧更新 */
  onUpdate?: (context: C, dt: number, payload?: P) => void;
  /** 事件 → 目标状态 的映射表 */
  transitions?: Partial<Record<E, S>>;
}

/** 状态机配置 */
export interface IStateMachineProps<
  S extends string,
  C = unknown,
  E extends string = string,
  P = unknown
> {
  /** 初始状态 */
  initial: S;
  /** 全部状态定义 */
  states: Record<S, IStateDefinition<S, C, E, P>>;
  /** 共享上下文 */
  context: C;
  /** 历史记录上限，默认 32 */
  maxHistory?: number;
}

/**
 * 有限状态机
 */
export class StateMachine<
  S extends string,
  C = unknown,
  E extends string = string,
  P = unknown
> {
  private readonly _states: Record<S, IStateDefinition<S, C, E, P>>;
  private readonly _maxHistory: number;
  private readonly _history: S[] = [];
  private readonly _pending: Array<{ event: E; payload?: P }> = [];
  private _current: S;
  private _initial: S;
  private _context: C;
  private _processing = false;

  constructor(props: IStateMachineProps<S, C, E, P>) {
    this._states = props.states;
    this._current = props.initial;
    this._initial = props.initial;
    this._context = props.context;
    this._maxHistory = props.maxHistory ?? 32;

    const initial = this._states[props.initial];
    if (initial?.onEnter) {
      initial.onEnter(this._context, null);
    }
  }

  /** 当前状态 */
  get current(): S {
    return this._current;
  }

  /** 共享上下文 */
  get context(): C {
    return this._context;
  }

  set context(value: C) {
    this._context = value;
  }

  /** 状态切换历史（由旧到新，不含当前状态） */
  get history(): S[] {
    return this._history.slice();
  }

  /** 是否处于指定状态 */
  public isIn(state: S): boolean {
    return this._current === state;
  }

  /**
   * 该事件在当前状态下是否会触发切换
   */
  public canDispatch(event: E): boolean {
    const definition = this._states[this._current];
    if (!definition?.transitions) return false;
    return definition.transitions[event] !== undefined;
  }

  /**
   * 触发事件切换状态
   * @param event 事件名
   * @param payload 附带数据
   * @returns 是否切换成功
   */
  public dispatch(event: E, payload?: P): boolean {
    if (!this.canDispatch(event)) return false;

    this._pending.push({ event, payload });
    if (this._processing) return true;

    this._processing = true;
    try {
      while (this._pending.length) {
        const pending = this._pending.shift() as { event: E; payload?: P };
        this.applyEvent(pending.event, pending.payload);
      }
    } finally {
      this._processing = false;
    }
    return true;
  }

  /**
   * 每帧更新当前状态
   * @param dt 帧间隔（秒）
   */
  public update(dt: number, payload?: P): void {
    const definition = this._states[this._current];
    if (definition?.onUpdate) {
      definition.onUpdate(this._context, dt, payload);
    }
  }

  /**
   * 重置回初始状态（会触发 onExit / onEnter）
   */
  public reset(): void {
    this._pending.length = 0;
    this._history.length = 0;

    const from = this._current;
    const definition = this._states[from];
    if (definition?.onExit) {
      definition.onExit(this._context, this._initial);
    }

    this._current = this._initial;
    const initial = this._states[this._initial];
    if (initial?.onEnter) {
      initial.onEnter(this._context, from);
    }
  }

  /**
   * 执行一次状态切换
   */
  private applyEvent(event: E, payload?: P): void {
    const definition = this._states[this._current];
    const next = definition?.transitions?.[event];
    if (next === undefined) return;

    const from = this._current;
    const nextDefinition = this._states[next];

    if (definition?.onExit) {
      definition.onExit(this._context, next, payload);
    }

    this._history.push(from);
    while (this._history.length > this._maxHistory) {
      this._history.shift();
    }
    this._current = next;

    if (nextDefinition?.onEnter) {
      nextDefinition.onEnter(this._context, from, payload);
    }
  }
}

export default StateMachine;
