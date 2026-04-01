import {
  Agent,
  AgentConfig,
  AgentCapability,
  AgentState,
  AgentEvent,
  AgentEventType
} from './Agent'
import { ExtendedAgentTask, TaskManager, TaskPriority } from './AgentTask'
import {
  AgentCommunicationManager,
  CommunicationConfig
} from './AgentCommunication'
import { AgentExecutor, ExecutorConfig, ExecutionResult } from './AgentExecutor'

/**
 * 协调器状态枚举
 */
export enum CoordinatorState {
  /** 协调器已创建但未启动 */
  CREATED = 'created',
  /** 协调器正在启动 */
  STARTING = 'starting',
  /** 协调器正在运行 */
  RUNNING = 'running',
  /** 协调器正在停止 */
  STOPPING = 'stopping',
  /** 协调器已停止 */
  STOPPED = 'stopped',
  /** 协调器发生错误 */
  ERROR = 'error'
}

/**
 * 协调器配置接口
 */
export interface CoordinatorConfig {
  /** 任务管理器配置 */
  taskManagerConfig?: {
    maxCapacity?: number
    enablePriority?: boolean
    enableDeduplication?: boolean
  }
  /** 通信管理器配置 */
  communicationConfig?: CommunicationConfig
  /** 执行器配置 */
  executorConfig?: ExecutorConfig
  /** 是否启用自动负载均衡 */
  enableAutoLoadBalancing?: boolean
  /** 负载均衡检查间隔（毫秒） */
  loadBalancingInterval?: number
  /** 是否启用自动故障恢复 */
  enableAutoRecovery?: boolean
  /** 故障恢复检查间隔（毫秒） */
  recoveryInterval?: number
  /** 最大故障恢复尝试次数 */
  maxRecoveryAttempts?: number
}

/**
 * Agent 依赖关系接口
 */
export interface AgentDependency {
  /** Agent ID */
  agentId: string
  /** 依赖的 Agent ID 列表 */
  dependsOn: string[]
  /** 依赖类型 */
  type: 'required' | 'optional'
}

/**
 * 协调器统计信息接口
 */
export interface CoordinatorStats {
  /** 注册的 Agent 数量 */
  totalAgents: number
  /** 运行中的 Agent 数量 */
  runningAgents: number
  /** 已停止的 Agent 数量 */
  stoppedAgents: number
  /** 发生错误的 Agent 数量 */
  errorAgents: number
  /** 总任务数 */
  totalTasks: number
  /** 成功任务数 */
  successfulTasks: number
  /** 失败任务数 */
  failedTasks: number
  /** 平均任务执行时间（毫秒） */
  averageTaskExecutionTime: number
  /** 协调器启动时间 */
  startTime: number
  /** 协调器运行时间（毫秒） */
  uptime: number
}

/**
 * Agent 协调器类
 * 负责管理多个 Agent 的注册、注销、任务分发、结果聚合和依赖管理
 */
export class AgentCoordinator {
  private agents: Map<string, Agent> = new Map()
  private agentDependencies: Map<string, AgentDependency> = new Map()
  private taskManager: TaskManager
  private communicationManager: AgentCommunicationManager
  private executor: AgentExecutor
  private state: CoordinatorState = CoordinatorState.CREATED
  private startTime: number = 0
  private loadBalancingInterval?: NodeJS.Timeout
  private recoveryInterval?: NodeJS.Timeout
  private config: Required<CoordinatorConfig>
  private eventListeners: Map<
    AgentEventType,
    Set<(event: AgentEvent) => void>
  > = new Map()

  constructor(config: CoordinatorConfig = {}) {
    this.config = {
      taskManagerConfig: config.taskManagerConfig ?? {},
      communicationConfig: config.communicationConfig ?? {},
      executorConfig: config.executorConfig ?? {},
      enableAutoLoadBalancing: config.enableAutoLoadBalancing ?? true,
      loadBalancingInterval: config.loadBalancingInterval ?? 10000,
      enableAutoRecovery: config.enableAutoRecovery ?? true,
      recoveryInterval: config.recoveryInterval ?? 5000,
      maxRecoveryAttempts: config.maxRecoveryAttempts ?? 3
    }

    this.taskManager = new TaskManager(this.config.taskManagerConfig)
    this.communicationManager = new AgentCommunicationManager(
      this.config.communicationConfig
    )
    this.executor = new AgentExecutor(
      this.taskManager,
      this.communicationManager,
      this.config.executorConfig
    )

    this.setupMessageHandlers()
  }

  /**
   * 启动协调器
   * @returns Promise<void>
   */
  async start(): Promise<void> {
    if (
      this.state !== CoordinatorState.CREATED &&
      this.state !== CoordinatorState.STOPPED
    ) {
      throw new Error('Coordinator is already running')
    }

    this.state = CoordinatorState.STARTING
    this.startTime = Date.now()

    try {
      await this.executor.start()
      await this.startAllAgents()

      if (this.config.enableAutoLoadBalancing) {
        this.startLoadBalancing()
      }

      if (this.config.enableAutoRecovery) {
        this.startAutoRecovery()
      }

      this.state = CoordinatorState.RUNNING
      this.emitEvent({
        type: AgentEventType.STARTED,
        source: 'coordinator',
        timestamp: Date.now()
      })
    } catch (error) {
      this.state = CoordinatorState.ERROR
      throw error
    }
  }

  /**
   * 停止协调器
   * @returns Promise<void>
   */
  async stop(): Promise<void> {
    if (
      this.state === CoordinatorState.STOPPED ||
      this.state === CoordinatorState.STOPPING
    ) {
      return
    }

    this.state = CoordinatorState.STOPPING

    try {
      await this.stopAllAgents()
      await this.executor.stop()
      this.stopLoadBalancing()
      this.stopAutoRecovery()

      this.state = CoordinatorState.STOPPED
      this.emitEvent({
        type: AgentEventType.STOPPED,
        source: 'coordinator',
        timestamp: Date.now()
      })
    } catch (error) {
      this.state = CoordinatorState.ERROR
      throw error
    }
  }

  /**
   * 注册 Agent
   * @param agent - 要注册的 Agent
   * @param dependencies - Agent 依赖关系
   * @returns Promise<void>
   */
  async registerAgent(
    agent: Agent,
    dependencies?: AgentDependency
  ): Promise<void> {
    if (this.agents.has(agent.getId())) {
      throw new Error(`Agent ${agent.getId()} is already registered`)
    }

    if (dependencies) {
      this.agentDependencies.set(agent.getId(), dependencies)
    }

    await this.executor.registerAgent(agent)
    this.agents.set(agent.getId(), agent)

    this.setupAgentEventListeners(agent)

    if (this.state === CoordinatorState.RUNNING) {
      await agent.start()
    }
  }

  /**
   * 批量注册 Agent
   * @param agents - 要注册的 Agent 列表
   * @returns Promise<void>
   */
  async registerAgents(
    agents: Array<{ agent: Agent; dependencies?: AgentDependency }>
  ): Promise<void> {
    for (const { agent, dependencies } of agents) {
      await this.registerAgent(agent, dependencies)
    }
  }

  /**
   * 注销 Agent
   * @param agentId - Agent ID
   * @returns Promise<boolean>
   */
  async unregisterAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return false
    }

    await this.executor.unregisterAgent(agentId)
    this.agentDependencies.delete(agentId)
    return this.agents.delete(agentId)
  }

  /**
   * 获取 Agent
   * @param agentId - Agent ID
   * @returns Agent | undefined
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId)
  }

  /**
   * 获取所有 Agent
   * @returns Agent[]
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  /**
   * 根据能力获取 Agent
   * @param capability - 能力类型
   * @returns Agent[]
   */
  getAgentsByCapability(capability: AgentCapability): Agent[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.hasCapability(capability)
    )
  }

  /**
   * 分发任务给合适的 Agent
   * @param taskType - 任务类型
   * @param taskData - 任务数据
   * @param options - 任务选项
   * @returns Promise<ExecutionResult>
   */
  async dispatchTask(
    taskType: string,
    taskData: any,
    options: {
      priority?: TaskPriority
      agentId?: string
      capability?: AgentCapability
      timeout?: number
      dependencies?: string[]
    } = {}
  ): Promise<ExecutionResult> {
    const task = this.taskManager.createTask(taskType, taskData, {
      priority: options.priority ?? TaskPriority.MEDIUM,
      timeout: options.timeout,
      dependencies: options.dependencies?.map((depId) => ({
        taskId: depId,
        type: 'sequential' as const
      }))
    })

    return await this.executor.executeTask(task, options.agentId)
  }

  /**
   * 批量分发任务
   * @param tasks - 任务列表
   * @returns Promise<ExecutionResult[]>
   */
  async dispatchTasks(
    tasks: Array<{
      type: string
      data: any
      options?: {
        priority?: TaskPriority
        agentId?: string
        capability?: AgentCapability
        timeout?: number
        dependencies?: string[]
      }
    }>
  ): Promise<ExecutionResult[]> {
    const extendedTasks = tasks.map(({ type, data, options }) =>
      this.taskManager.createTask(type, data, {
        priority: options?.priority ?? TaskPriority.MEDIUM,
        timeout: options?.timeout,
        dependencies: options?.dependencies?.map((depId) => ({
          taskId: depId,
          type: 'sequential' as const
        }))
      })
    )

    return await this.executor.executeTasks(extendedTasks)
  }

  /**
   * 聚合多个 Agent 的结果
   * @param agentIds - Agent ID 列表
   * @param taskType - 任务类型
   * @param taskData - 任务数据
   * @returns Promise<Map<string, any>>
   */
  async aggregateResults(
    agentIds: string[],
    taskType: string,
    taskData: any
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>()
    const promises = agentIds.map(async (agentId) => {
      try {
        const result = await this.dispatchTask(taskType, taskData, { agentId })
        results.set(agentId, result)
      } catch (error) {
        results.set(agentId, { error })
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * 解析 Agent 依赖关系
   * @param agentId - Agent ID
   * @returns Promise<boolean> - 依赖是否已满足
   */
  async resolveAgentDependencies(agentId: string): Promise<boolean> {
    const dependency = this.agentDependencies.get(agentId)
    if (!dependency || dependency.dependsOn.length === 0) {
      return true
    }

    for (const depAgentId of dependency.dependsOn) {
      const depAgent = this.agents.get(depAgentId)
      if (!depAgent) {
        if (dependency.type === 'required') {
          return false
        }
        continue
      }

      if (depAgent.getState() !== AgentState.RUNNING) {
        if (dependency.type === 'required') {
          return false
        }
        continue
      }
    }

    return true
  }

  /**
   * 获取协调器状态
   * @returns CoordinatorState
   */
  getState(): CoordinatorState {
    return this.state
  }

  /**
   * 获取协调器统计信息
   * @returns CoordinatorStats
   */
  getStats(): CoordinatorStats {
    const executionStats = this.executor.getExecutionStats()
    const now = Date.now()

    return {
      totalAgents: this.agents.size,
      runningAgents: Array.from(this.agents.values()).filter(
        (agent) => agent.getState() === AgentState.RUNNING
      ).length,
      stoppedAgents: Array.from(this.agents.values()).filter(
        (agent) => agent.getState() === AgentState.STOPPED
      ).length,
      errorAgents: Array.from(this.agents.values()).filter(
        (agent) => agent.getState() === AgentState.ERROR
      ).length,
      totalTasks: executionStats.totalTasks,
      successfulTasks: executionStats.successfulTasks,
      failedTasks: executionStats.failedTasks,
      averageTaskExecutionTime: executionStats.averageExecutionTime,
      startTime: this.startTime,
      uptime: this.startTime > 0 ? now - this.startTime : 0
    }
  }

  /**
   * 注册事件监听器
   * @param eventType - 事件类型
   * @param listener - 事件监听器
   * @returns void
   */
  on(eventType: AgentEventType, listener: (event: AgentEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  /**
   * 移除事件监听器
   * @param eventType - 事件类型
   * @param listener - 事件监听器
   * @returns void
   */
  off(eventType: AgentEventType, listener: (event: AgentEvent) => void): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 获取任务管理器
   * @returns TaskManager
   */
  getTaskManager(): TaskManager {
    return this.taskManager
  }

  /**
   * 获取通信管理器
   * @returns AgentCommunicationManager
   */
  getCommunicationManager(): AgentCommunicationManager {
    return this.communicationManager
  }

  /**
   * 获取执行器
   * @returns AgentExecutor
   */
  getExecutor(): AgentExecutor {
    return this.executor
  }

  /**
   * 启动所有 Agent
   * @returns Promise<void>
   */
  private async startAllAgents(): Promise<void> {
    const startPromises: Promise<void>[] = []

    for (const [agentId, agent] of this.agents.entries()) {
      const dependenciesResolved = await this.resolveAgentDependencies(agentId)
      if (dependenciesResolved) {
        startPromises.push(agent.start())
      }
    }

    await Promise.all(startPromises)
  }

  /**
   * 停止所有 Agent
   * @returns Promise<void>
   */
  private async stopAllAgents(): Promise<void> {
    const stopPromises = Array.from(this.agents.values()).map((agent) =>
      agent.stop()
    )
    await Promise.all(stopPromises)
  }

  /**
   * 设置 Agent 事件监听器
   * @param agent - Agent
   * @returns void
   */
  private setupAgentEventListeners(agent: Agent): void {
    agent.on(AgentEventType.ERROR, (event) => {
      this.emitEvent(event)
      if (this.config.enableAutoRecovery) {
        this.handleAgentError(agent.getId())
      }
    })

    agent.on(AgentEventType.TASK_COMPLETED, (event) => {
      this.emitEvent(event)
    })

    agent.on(AgentEventType.TASK_FAILED, (event) => {
      this.emitEvent(event)
    })
  }

  /**
   * 设置消息处理器
   * @returns void
   */
  private setupMessageHandlers(): void {
    const handler = {
      id: 'coordinator_handler',
      name: 'Coordinator Message Handler',
      supportedMessageTypes: ['agent_status', 'task_request', 'data_request'],
      async handleMessage(message: any): Promise<void> {
        console.log('Coordinator received message:', message.type)
      }
    }

    this.communicationManager.registerMessageHandler(handler)
  }

  /**
   * 触发事件
   * @param event - 事件
   * @returns void
   */
  private emitEvent(event: AgentEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach((listener) => listener(event))
    }
  }

  /**
   * 开始负载均衡
   * @returns void
   */
  private startLoadBalancing(): void {
    this.loadBalancingInterval = setInterval(async () => {
      if (this.state !== CoordinatorState.RUNNING) {
        return
      }

      await this.performLoadBalancing()
    }, this.config.loadBalancingInterval)
  }

  /**
   * 停止负载均衡
   * @returns void
   */
  private stopLoadBalancing(): void {
    if (this.loadBalancingInterval) {
      clearInterval(this.loadBalancingInterval)
      this.loadBalancingInterval = undefined
    }
  }

  /**
   * 执行负载均衡
   * @returns Promise<void>
   */
  private async performLoadBalancing(): Promise<void> {
    const runningAgents = Array.from(this.agents.values()).filter(
      (agent) => agent.getState() === AgentState.RUNNING
    )

    if (runningAgents.length === 0) {
      return
    }

    const stats = this.executor.getExecutionStats()
    const avgTasksPerAgent = stats.runningTasks / runningAgents.length

    for (const agent of runningAgents) {
      const agentStats = this.getAgentStats(agent.getId())
      if (agentStats && agentStats.runningTasks > avgTasksPerAgent * 1.5) {
        console.log(
          `Agent ${agent.getId()} is overloaded, consider load balancing`
        )
      }
    }
  }

  /**
   * 开始自动故障恢复
   * @returns void
   */
  private startAutoRecovery(): void {
    this.recoveryInterval = setInterval(async () => {
      if (this.state !== CoordinatorState.RUNNING) {
        return
      }

      await this.checkAgentHealth()
    }, this.config.recoveryInterval)
  }

  /**
   * 停止自动故障恢复
   * @returns void
   */
  private stopAutoRecovery(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval)
      this.recoveryInterval = undefined
    }
  }

  /**
   * 检查 Agent 健康状态
   * @returns Promise<void>
   */
  private async checkAgentHealth(): Promise<void> {
    for (const [agentId, agent] of this.agents.entries()) {
      try {
        const isHealthy = await agent.healthCheck()
        if (!isHealthy && agent.getState() === AgentState.RUNNING) {
          await this.handleAgentError(agentId)
        }
      } catch (error) {
        console.error(`Health check failed for agent ${agentId}:`, error)
        await this.handleAgentError(agentId)
      }
    }
  }

  /**
   * 处理 Agent 错误
   * @param agentId - Agent ID
   * @returns Promise<void>
   */
  private async handleAgentError(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    console.warn(`Attempting to recover agent ${agentId}`)

    try {
      await agent.stop()
      await agent.initialize()
      await agent.start()

      console.log(`Agent ${agentId} recovered successfully`)
    } catch (error) {
      console.error(`Failed to recover agent ${agentId}:`, error)
    }
  }

  /**
   * 获取 Agent 统计信息
   * @param agentId - Agent ID
   * @returns any
   */
  private getAgentStats(agentId: string): any {
    return {
      agentId,
      state: this.agents.get(agentId)?.getState(),
      runningTasks: 0
    }
  }
}
