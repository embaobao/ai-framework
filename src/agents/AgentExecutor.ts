import { Agent, AgentState, AgentEvent, AgentEventType, AgentTask } from './Agent';
import { ExtendedAgentTask, TaskStatus, TaskManager } from './AgentTask';
import { AgentCommunicationManager } from './AgentCommunication';

/**
 * 执行器状态枚举
 */
export enum ExecutorState {
  /** 执行器已创建但未启动 */
  CREATED = 'created',
  /** 执行器正在启动 */
  STARTING = 'starting',
  /** 执行器正在运行 */
  RUNNING = 'running',
  /** 执行器正在停止 */
  STOPPING = 'stopping',
  /** 执行器已停止 */
  STOPPED = 'stopped',
  /** 执行器发生错误 */
  ERROR = 'error'
}

/**
 * 执行器配置接口
 */
export interface ExecutorConfig {
  /** 最大并发执行的任务数 */
  maxConcurrentTasks?: number;
  /** 默认任务超时时间（毫秒） */
  defaultTaskTimeout?: number;
  /** 是否启用任务重试 */
  enableRetry?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟时间（毫秒） */
  retryDelay?: number;
  /** 是否启用任务优先级 */
  enablePriority?: boolean;
  /** 是否启用任务依赖解析 */
  enableDependencyResolution?: boolean;
  /** 执行器心跳间隔（毫秒） */
  heartbeatInterval?: number;
  /** 是否启用健康检查 */
  enableHealthCheck?: boolean;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval?: number;
}

/**
 * 执行结果接口
 */
export interface ExecutionResult {
  /** 任务 ID */
  taskId: string;
  /** Agent ID */
  agentId: string;
  /** 执行是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: Error;
  /** 执行开始时间 */
  startTime: number;
  /** 执行结束时间 */
  endTime: number;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 执行统计信息接口
 */
export interface ExecutionStats {
  /** 总执行任务数 */
  totalTasks: number;
  /** 成功任务数 */
  successfulTasks: number;
  /** 失败任务数 */
  failedTasks: number;
  /** 正在执行的任务数 */
  runningTasks: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 总执行时间（毫秒） */
  totalExecutionTime: number;
}

/**
 * Agent 执行器类
 * 负责 Agent 的执行逻辑、生命周期管理、错误处理和超时控制
 */
export class AgentExecutor {
  private agents: Map<string, Agent> = new Map();
  private taskManager: TaskManager;
  private communicationManager: AgentCommunicationManager;
  private state: ExecutorState = ExecutorState.CREATED;
  private runningTasks: Map<string, {
    task: ExtendedAgentTask;
    agent: Agent;
    timeout: NodeJS.Timeout;
    startTime: number;
  }> = new Map();
  private executionResults: Map<string, ExecutionResult> = new Map();
  private executionStats: ExecutionStats = {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    runningTasks: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0
  };
  private heartbeatInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private config: Required<ExecutorConfig>;

  constructor(
    taskManager: TaskManager,
    communicationManager: AgentCommunicationManager,
    config: ExecutorConfig = {}
  ) {
    this.taskManager = taskManager;
    this.communicationManager = communicationManager;
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 5,
      defaultTaskTimeout: config.defaultTaskTimeout ?? 30000,
      enableRetry: config.enableRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enablePriority: config.enablePriority ?? true,
      enableDependencyResolution: config.enableDependencyResolution ?? true,
      heartbeatInterval: config.heartbeatInterval ?? 5000,
      enableHealthCheck: config.enableHealthCheck ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 10000
    };
  }

  /**
   * 启动执行器
   * @returns Promise<void>
   */
  async start(): Promise<void> {
    if (this.state !== ExecutorState.CREATED && this.state !== ExecutorState.STOPPED) {
      throw new Error('Executor is already running');
    }

    this.state = ExecutorState.STARTING;

    try {
      await this.initializeAgents();
      this.startHeartbeat();
      
      if (this.config.enableHealthCheck) {
        this.startHealthCheck();
      }

      this.state = ExecutorState.RUNNING;
      this.startTaskProcessing();
    } catch (error) {
      this.state = ExecutorState.ERROR;
      throw error;
    }
  }

  /**
   * 停止执行器
   * @returns Promise<void>
   */
  async stop(): Promise<void> {
    if (this.state === ExecutorState.STOPPED || this.state === ExecutorState.STOPPING) {
      return;
    }

    this.state = ExecutorState.STOPPING;

    try {
      await this.stopAllAgents();
      this.stopHeartbeat();
      this.stopHealthCheck();
      this.cancelAllRunningTasks();

      this.state = ExecutorState.STOPPED;
    } catch (error) {
      this.state = ExecutorState.ERROR;
      throw error;
    }
  }

  /**
   * 注册 Agent
   * @param agent - 要注册的 Agent
   * @returns Promise<void>
   */
  async registerAgent(agent: Agent): Promise<void> {
    if (this.agents.has(agent.getId())) {
      throw new Error(`Agent ${agent.getId()} is already registered`);
    }

    await agent.initialize();
    this.agents.set(agent.getId(), agent);

    if (this.state === ExecutorState.RUNNING) {
      await agent.start();
    }
  }

  /**
   * 注销 Agent
   * @param agentId - Agent ID
   * @returns Promise<boolean>
   */
  async unregisterAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    await agent.stop();
    return this.agents.delete(agentId);
  }

  /**
   * 获取 Agent
   * @param agentId - Agent ID
   * @returns Agent | undefined
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有 Agent
   * @returns Agent[]
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 提交任务执行
   * @param task - 要执行的任务
   * @param agentId - 执行任务的 Agent ID（可选，如果不指定则自动选择）
   * @returns Promise<ExecutionResult>
   */
  async executeTask(
    task: ExtendedAgentTask,
    agentId?: string
  ): Promise<ExecutionResult> {
    if (this.state !== ExecutorState.RUNNING) {
      throw new Error('Executor is not running');
    }

    if (this.config.enableDependencyResolution) {
      const dependenciesResolved = await this.taskManager.resolveDependencies(task);
      if (!dependenciesResolved) {
        throw new Error(`Task ${task.id} dependencies are not resolved`);
      }
    }

    const agent = agentId ? this.getAgent(agentId) : this.selectAgentForTask(task);
    if (!agent) {
      throw new Error(`No suitable agent found for task ${task.id}`);
    }

    await this.taskManager.submitTask(task);
    return await this.waitForTaskCompletion(task.id);
  }

  /**
   * 批量执行任务
   * @param tasks - 要执行的任务列表
   * @returns Promise<ExecutionResult[]>
   */
  async executeTasks(tasks: ExtendedAgentTask[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const task of tasks) {
      try {
        const result = await this.executeTask(task);
        results.push(result);
      } catch (error) {
        results.push({
          taskId: task.id,
          agentId: '',
          success: false,
          error: error as Error,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          retryCount: 0
        });
      }
    }

    return results;
  }

  /**
   * 取消任务
   * @param taskId - 任务 ID
   * @returns Promise<boolean>
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      clearTimeout(runningTask.timeout);
      this.runningTasks.delete(taskId);
      this.executionStats.runningTasks--;
      return await this.taskManager.cancelTask(taskId);
    }

    return await this.taskManager.cancelTask(taskId);
  }

  /**
   * 获取执行结果
   * @param taskId - 任务 ID
   * @returns ExecutionResult | undefined
   */
  getExecutionResult(taskId: string): ExecutionResult | undefined {
    return this.executionResults.get(taskId);
  }

  /**
   * 获取执行统计信息
   * @returns ExecutionStats
   */
  getExecutionStats(): ExecutionStats {
    return { ...this.executionStats };
  }

  /**
   * 获取执行器状态
   * @returns ExecutorState
   */
  getState(): ExecutorState {
    return this.state;
  }

  /**
   * 初始化所有 Agent
   * @returns Promise<void>
   */
  private async initializeAgents(): Promise<void> {
    const initPromises = Array.from(this.agents.values()).map(agent => agent.initialize());
    await Promise.all(initPromises);
  }

  /**
   * 启动所有 Agent
   * @returns Promise<void>
   */
  private async startAllAgents(): Promise<void> {
    const startPromises = Array.from(this.agents.values()).map(agent => agent.start());
    await Promise.all(startPromises);
  }

  /**
   * 停止所有 Agent
   * @returns Promise<void>
   */
  private async stopAllAgents(): Promise<void> {
    const stopPromises = Array.from(this.agents.values()).map(agent => agent.stop());
    await Promise.all(stopPromises);
  }

  /**
   * 为任务选择合适的 Agent
   * @param task - 任务
   * @returns Agent | undefined
   */
  private selectAgentForTask(task: ExtendedAgentTask): Agent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.getState() === AgentState.RUNNING) {
        return agent;
      }
    }
    return undefined;
  }

  /**
   * 开始任务处理循环
   * @returns void
   */
  private startTaskProcessing(): void {
    setInterval(async () => {
      if (this.state !== ExecutorState.RUNNING) {
        return;
      }

      if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
        return;
      }

      const task = await this.taskManager.getNextTask();
      if (task) {
        await this.processTask(task);
      }
    }, 100);
  }

  /**
   * 处理任务
   * @param task - 要处理的任务
   * @returns Promise<void>
   */
  private async processTask(task: ExtendedAgentTask): Promise<void> {
    const agent = this.selectAgentForTask(task);
    if (!agent) {
      await this.taskManager.failTask(task.id, new Error('No suitable agent found'));
      return;
    }

    try {
      await this.taskManager.startTask(task);
      const startTime = Date.now();

      const timeout = setTimeout(async () => {
        await this.handleTaskTimeout(task.id);
      }, task.timeout ?? this.config.defaultTaskTimeout);

      this.runningTasks.set(task.id, {
        task,
        agent,
        timeout,
        startTime
      });

      this.executionStats.runningTasks++;
      this.executionStats.totalTasks++;

      const result = await agent.executeTask(task);

      clearTimeout(timeout);
      this.runningTasks.delete(task.id);
      this.executionStats.runningTasks--;

      const endTime = Date.now();
      const duration = endTime - startTime;

      await this.taskManager.completeTask(task.id, result);

      const executionResult: ExecutionResult = {
        taskId: task.id,
        agentId: agent.getId(),
        success: true,
        result,
        startTime,
        endTime,
        duration,
        retryCount: task.retryCount ?? 0
      };

      this.executionResults.set(task.id, executionResult);
      this.executionStats.successfulTasks++;
      this.executionStats.totalExecutionTime += duration;
      this.executionStats.averageExecutionTime = 
        this.executionStats.totalExecutionTime / this.executionStats.successfulTasks;

    } catch (error) {
      const runningTask = this.runningTasks.get(task.id);
      if (runningTask) {
        clearTimeout(runningTask.timeout);
        this.runningTasks.delete(task.id);
        this.executionStats.runningTasks--;
      }

      const shouldRetry = this.config.enableRetry && 
        (task.retryCount ?? 0) < this.config.maxRetries;

      if (shouldRetry) {
        setTimeout(async () => {
          await this.retryTask(task);
        }, this.config.retryDelay);
      } else {
        await this.taskManager.failTask(task.id, error as Error);

        const executionResult: ExecutionResult = {
          taskId: task.id,
          agentId: agent.getId(),
          success: false,
          error: error as Error,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          retryCount: task.retryCount ?? 0
        };

        this.executionResults.set(task.id, executionResult);
        this.executionStats.failedTasks++;
      }
    }
  }

  /**
   * 重试任务
   * @param task - 要重试的任务
   * @returns Promise<void>
   */
  private async retryTask(task: ExtendedAgentTask): Promise<void> {
    task.retryCount = (task.retryCount ?? 0) + 1;
    await this.taskManager.submitTask(task);
  }

  /**
   * 处理任务超时
   * @param taskId - 任务 ID
   * @returns Promise<void>
   */
  private async handleTaskTimeout(taskId: string): Promise<void> {
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      this.runningTasks.delete(taskId);
      this.executionStats.runningTasks--;

      const timeoutError = new Error(`Task ${taskId} timed out`);
      await this.taskManager.failTask(taskId, timeoutError);

      const executionResult: ExecutionResult = {
        taskId,
        agentId: runningTask.agent.getId(),
        success: false,
        error: timeoutError,
        startTime: runningTask.startTime,
        endTime: Date.now(),
        duration: Date.now() - runningTask.startTime,
        retryCount: runningTask.task.retryCount ?? 0
      };

      this.executionResults.set(taskId, executionResult);
      this.executionStats.failedTasks++;
    }
  }

  /**
   * 等待任务完成
   * @param taskId - 任务 ID
   * @returns Promise<ExecutionResult>
   */
  private async waitForTaskCompletion(taskId: string): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const result = this.executionResults.get(taskId);
        if (result) {
          clearInterval(checkInterval);
          resolve(result);
        }

        const taskStatus = this.taskManager.getTaskStatus(taskId);
        if (taskStatus === TaskStatus.FAILED || taskStatus === TaskStatus.CANCELLED) {
          clearInterval(checkInterval);
          reject(new Error(`Task ${taskId} failed or was cancelled`));
        }
      }, 100);
    });
  }

  /**
   * 取消所有正在运行的任务
   * @returns Promise<void>
   */
  private async cancelAllRunningTasks(): Promise<void> {
    const cancelPromises = Array.from(this.runningTasks.keys()).map(taskId => 
      this.cancelTask(taskId)
    );
    await Promise.all(cancelPromises);
  }

  /**
   * 开始心跳
   * @returns void
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.state !== ExecutorState.RUNNING) {
        return;
      }

      for (const agent of this.agents.values()) {
        if (agent.getState() === AgentState.RUNNING) {
          try {
            await agent.healthCheck();
          } catch (error) {
            console.error(`Health check failed for agent ${agent.getId()}:`, error);
          }
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   * @returns void
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * 开始健康检查
   * @returns void
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (this.state !== ExecutorState.RUNNING) {
        return;
      }

      for (const agent of this.agents.values()) {
        try {
          const isHealthy = await agent.healthCheck();
          if (!isHealthy) {
            console.warn(`Agent ${agent.getId()} is unhealthy`);
          }
        } catch (error) {
          console.error(`Health check error for agent ${agent.getId()}:`, error);
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * 停止健康检查
   * @returns void
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }
}
