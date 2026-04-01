/**
 * Agent 能力类型定义
 * 定义 Agent 可以执行的能力类型
 */
export type AgentCapability = string;

/**
 * Agent 状态枚举
 * 定义 Agent 的生命周期状态
 */
export enum AgentState {
  /** Agent 已创建但未初始化 */
  CREATED = 'created',
  /** Agent 正在初始化 */
  INITIALIZING = 'initializing',
  /** Agent 已就绪，可以接收任务 */
  READY = 'ready',
  /** Agent 正在执行任务 */
  RUNNING = 'running',
  /** Agent 已暂停 */
  PAUSED = 'paused',
  /** Agent 正在停止 */
  STOPPING = 'stopping',
  /** Agent 已停止 */
  STOPPED = 'stopped',
  /** Agent 发生错误 */
  ERROR = 'error'
}

/**
 * Agent 配置接口
 * 定义 Agent 的配置参数
 */
export interface AgentConfig {
  /** Agent 的唯一标识符 */
  id: string;
  /** Agent 的名称 */
  name: string;
  /** Agent 的描述 */
  description?: string;
  /** Agent 的能力列表 */
  capabilities: AgentCapability[];
  /** Agent 的版本 */
  version?: string;
  /** Agent 的最大并发任务数 */
  maxConcurrentTasks?: number;
  /** Agent 的任务超时时间（毫秒） */
  taskTimeout?: number;
  /** Agent 是否启用 */
  enabled?: boolean;
  /** Agent 的自定义配置 */
  customConfig?: Record<string, any>;
}

/**
 * Agent 消息接口
 * 定义 Agent 之间通信的消息格式
 */
export interface AgentMessage {
  /** 消息的唯一标识符 */
  id: string;
  /** 发送消息的 Agent ID */
  from: string;
  /** 接收消息的 Agent ID */
  to: string;
  /** 消息类型 */
  type: string;
  /** 消息内容 */
  payload: any;
  /** 消息时间戳 */
  timestamp: number;
  /** 消息是否需要回复 */
  requiresResponse?: boolean;
  /** 关联的消息 ID（用于回复） */
  correlationId?: string;
}

/**
 * Agent 任务接口
 * 定义 Agent 执行的任务格式
 */
export interface AgentTask {
  /** 任务的唯一标识符 */
  id: string;
  /** 任务类型 */
  type: string;
  /** 任务数据 */
  data: any;
  /** 任务优先级（数字越大优先级越高） */
  priority?: number;
  /** 任务超时时间（毫秒） */
  timeout?: number;
  /** 任务依赖的其他任务 ID */
  dependencies?: string[];
  /** 任务创建时间 */
  createdAt: number;
  /** 任务开始时间 */
  startedAt?: number;
  /** 任务完成时间 */
  completedAt?: number;
  /** 任务状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** 任务结果 */
  result?: any;
  /** 任务错误信息 */
  error?: Error;
}

/**
 * Agent 事件类型
 * 定义 Agent 可以触发的事件类型
 */
export enum AgentEventType {
  /** Agent 初始化事件 */
  INITIALIZED = 'initialized',
  /** Agent 启动事件 */
  STARTED = 'started',
  /** Agent 停止事件 */
  STOPPED = 'stopped',
  /** Agent 暂停事件 */
  PAUSED = 'paused',
  /** Agent 恢复事件 */
  RESUMED = 'resumed',
  /** Agent 错误事件 */
  ERROR = 'error',
  /** Agent 任务开始事件 */
  TASK_STARTED = 'task_started',
  /** Agent 任务完成事件 */
  TASK_COMPLETED = 'task_completed',
  /** Agent 任务失败事件 */
  TASK_FAILED = 'task_failed',
  /** Agent 接收消息事件 */
  MESSAGE_RECEIVED = 'message_received',
  /** Agent 发送消息事件 */
  MESSAGE_SENT = 'message_sent'
}

/**
 * Agent 事件接口
 * 定义 Agent 事件的格式
 */
export interface AgentEvent {
  /** 事件类型 */
  type: AgentEventType;
  /** 事件源 Agent ID */
  source: string;
  /** 事件数据 */
  data?: any;
  /** 事件时间戳 */
  timestamp: number;
}

/**
 * Agent 事件监听器类型
 */
export type AgentEventListener = (event: AgentEvent) => void;

/**
 * Agent 接口
 * 定义 Agent 的核心接口和生命周期方法
 */
export interface Agent {
  /** 获取 Agent 配置 */
  getConfig(): AgentConfig;

  /** 获取 Agent 当前状态 */
  getState(): AgentState;

  /** 获取 Agent ID */
  getId(): string;

  /** 获取 Agent 名称 */
  getName(): string;

  /** 获取 Agent 能力列表 */
  getCapabilities(): AgentCapability[];

  /**
   * 检查 Agent 是否具备指定能力
   * @param capability - 要检查的能力
   * @returns 是否具备该能力
   */
  hasCapability(capability: AgentCapability): boolean;

  /**
   * 初始化 Agent
   * @returns Promise<void>
   */
  initialize(): Promise<void>;

  /**
   * 启动 Agent
   * @returns Promise<void>
   */
  start(): Promise<void>;

  /**
   * 停止 Agent
   * @returns Promise<void>
   */
  stop(): Promise<void>;

  /**
   * 暂停 Agent
   * @returns Promise<void>
   */
  pause(): Promise<void>;

  /**
   * 恢复 Agent
   * @returns Promise<void>
   */
  resume(): Promise<void>;

  /**
   * 执行任务
   * @param task - 要执行的任务
   * @returns Promise<any> - 任务执行结果
   */
  executeTask(task: AgentTask): Promise<any>;

  /**
   * 发送消息给其他 Agent
   * @param message - 要发送的消息
   * @returns Promise<void>
   */
  sendMessage(message: AgentMessage): Promise<void>;

  /**
   * 接收来自其他 Agent 的消息
   * @param message - 接收到的消息
   * @returns Promise<void>
   */
  receiveMessage(message: AgentMessage): Promise<void>;

  /**
   * 注册事件监听器
   * @param eventType - 事件类型
   * @param listener - 事件监听器
   */
  on(eventType: AgentEventType, listener: AgentEventListener): void;

  /**
   * 移除事件监听器
   * @param eventType - 事件类型
   * @param listener - 事件监听器
   */
  off(eventType: AgentEventType, listener: AgentEventListener): void;

  /**
   * 触发事件
   * @param event - 要触发的事件
   */
  emit(event: AgentEvent): void;

  /**
   * 获取 Agent 的健康状态
   * @returns Promise<boolean> - Agent 是否健康
   */
  healthCheck(): Promise<boolean>;
}

/**
 * 抽象 Agent 基类
 * 提供 Agent 接口的基本实现，子类可以继承并扩展
 */
export abstract class AbstractAgent implements Agent {
  protected config: AgentConfig;
  protected state: AgentState = AgentState.CREATED;
  protected eventListeners: Map<AgentEventType, Set<AgentEventListener>> = new Map();

  constructor(config: AgentConfig) {
    this.config = config;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getState(): AgentState {
    return this.state;
  }

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getCapabilities(): AgentCapability[] {
    return [...this.config.capabilities];
  }

  hasCapability(capability: AgentCapability): boolean {
    return this.config.capabilities.includes(capability);
  }

  async initialize(): Promise<void> {
    if (this.state !== AgentState.CREATED) {
      throw new Error(`Agent ${this.getId()} is already initialized`);
    }
    this.state = AgentState.INITIALIZING;
    await this.onInitialize();
    this.state = AgentState.READY;
    this.emit({
      type: AgentEventType.INITIALIZED,
      source: this.getId(),
      timestamp: Date.now()
    });
  }

  async start(): Promise<void> {
    if (this.state !== AgentState.READY && this.state !== AgentState.PAUSED) {
      throw new Error(`Agent ${this.getId()} is not ready to start`);
    }
    this.state = AgentState.RUNNING;
    await this.onStart();
    this.emit({
      type: AgentEventType.STARTED,
      source: this.getId(),
      timestamp: Date.now()
    });
  }

  async stop(): Promise<void> {
    if (this.state === AgentState.STOPPED || this.state === AgentState.STOPPING) {
      return;
    }
    this.state = AgentState.STOPPING;
    await this.onStop();
    this.state = AgentState.STOPPED;
    this.emit({
      type: AgentEventType.STOPPED,
      source: this.getId(),
      timestamp: Date.now()
    });
  }

  async pause(): Promise<void> {
    if (this.state !== AgentState.RUNNING) {
      throw new Error(`Agent ${this.getId()} is not running`);
    }
    this.state = AgentState.PAUSED;
    await this.onPause();
    this.emit({
      type: AgentEventType.PAUSED,
      source: this.getId(),
      timestamp: Date.now()
    });
  }

  async resume(): Promise<void> {
    if (this.state !== AgentState.PAUSED) {
      throw new Error(`Agent ${this.getId()} is not paused`);
    }
    await this.onResume();
    await this.start();
    this.emit({
      type: AgentEventType.RESUMED,
      source: this.getId(),
      timestamp: Date.now()
    });
  }

  async executeTask(task: AgentTask): Promise<any> {
    if (this.state !== AgentState.RUNNING) {
      throw new Error(`Agent ${this.getId()} is not running`);
    }
    try {
      this.emit({
        type: AgentEventType.TASK_STARTED,
        source: this.getId(),
        data: { taskId: task.id },
        timestamp: Date.now()
      });
      const result = await this.onExecuteTask(task);
      this.emit({
        type: AgentEventType.TASK_COMPLETED,
        source: this.getId(),
        data: { taskId: task.id, result },
        timestamp: Date.now()
      });
      return result;
    } catch (error) {
      this.emit({
        type: AgentEventType.TASK_FAILED,
        source: this.getId(),
        data: { taskId: task.id, error },
        timestamp: Date.now()
      });
      throw error;
    }
  }

  async sendMessage(message: AgentMessage): Promise<void> {
    await this.onSendMessage(message);
    this.emit({
      type: AgentEventType.MESSAGE_SENT,
      source: this.getId(),
      data: { message },
      timestamp: Date.now()
    });
  }

  async receiveMessage(message: AgentMessage): Promise<void> {
    this.emit({
      type: AgentEventType.MESSAGE_RECEIVED,
      source: this.getId(),
      data: { message },
      timestamp: Date.now()
    });
    await this.onReceiveMessage(message);
  }

  on(eventType: AgentEventType, listener: AgentEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  off(eventType: AgentEventType, listener: AgentEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  emit(event: AgentEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.onHealthCheck();
    } catch (error) {
      this.state = AgentState.ERROR;
      this.emit({
        type: AgentEventType.ERROR,
        source: this.getId(),
        data: { error },
        timestamp: Date.now()
      });
      return false;
    }
  }

  /**
   * 子类实现：初始化逻辑
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * 子类实现：启动逻辑
   */
  protected abstract onStart(): Promise<void>;

  /**
   * 子类实现：停止逻辑
   */
  protected abstract onStop(): Promise<void>;

  /**
   * 子类实现：暂停逻辑
   */
  protected abstract onPause(): Promise<void>;

  /**
   * 子类实现：恢复逻辑
   */
  protected abstract onResume(): Promise<void>;

  /**
   * 子类实现：执行任务逻辑
   */
  protected abstract onExecuteTask(task: AgentTask): Promise<any>;

  /**
   * 子类实现：发送消息逻辑
   */
  protected abstract onSendMessage(message: AgentMessage): Promise<void>;

  /**
   * 子类实现：接收消息逻辑
   */
  protected abstract onReceiveMessage(message: AgentMessage): Promise<void>;

  /**
   * 子类实现：健康检查逻辑
   */
  protected abstract onHealthCheck(): Promise<boolean>;
}
