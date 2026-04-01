/**
 * 工具执行器
 * 
 * 负责工具的执行调度、并发控制、错误处理和结果管理
 * 提供高级的执行功能，如批量执行、并行执行、链式执行等
 */

import type { Tool, ToolResult, ToolExecuteOptions, ToolProgress } from './Tool'
import type { Logger } from '../logger/Logger'

/**
 * 执行任务
 */
export interface ExecutionTask {
  /** 任务 ID */
  id: string
  /** 工具名称 */
  toolName: string
  /** 工具实例 */
  tool: Tool
  /** 执行参数 */
  parameters: Record<string, unknown>
  /** 执行选项 */
  options?: ToolExecuteOptions
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  /** 执行结果 */
  result?: ToolResult
  /** 执行开始时间 */
  startTime?: number
  /** 执行结束时间 */
  endTime?: number
  /** 错误信息 */
  error?: Error
  /** 依赖的任务 ID */
  dependencies?: string[]
}

/**
 * 执行策略
 */
export enum ExecutionStrategy {
  /** 串行执行 */
  SERIAL = 'serial',
  /** 并行执行 */
  PARALLEL = 'parallel',
  /** 批量并行执行 */
  BATCH_PARALLEL = 'batch_parallel',
}

/**
 * 执行配置
 */
export interface ExecutionConfig {
  /** 执行策略 */
  strategy: ExecutionStrategy
  /** 批量大小（仅用于批量并行执行） */
  batchSize?: number
  /** 是否在失败时继续执行 */
  continueOnError: boolean
  /** 最大重试次数 */
  maxRetries: number
  /** 重试延迟（毫秒） */
  retryDelay: number
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * 执行结果汇总
 */
export interface ExecutionSummary {
  /** 总任务数 */
  totalTasks: number
  /** 成功任务数 */
  successfulTasks: number
  /** 失败任务数 */
  failedTasks: number
  /** 取消任务数 */
  cancelledTasks: number
  /** 总执行时间（毫秒） */
  totalDuration: number
  /** 平均执行时间（毫秒） */
  averageDuration: number
  /** 执行结果数组 */
  results: ToolResult[]
  /** 失败的任务 */
  failedTasksList: ExecutionTask[]
}

/**
 * 工具执行器类
 * 
 * 提供高级的工具执行功能，支持多种执行策略和并发控制
 */
export class ToolExecutor {
  private tasks: Map<string, ExecutionTask> = new Map()
  private activeExecutions: Set<string> = new Set()
  private logger: Logger
  private config: ExecutionConfig

  constructor(
    logger: Logger,
    config: Partial<ExecutionConfig> = {},
  ) {
    this.logger = logger
    this.config = {
      strategy: ExecutionStrategy.PARALLEL,
      continueOnError: false,
      maxRetries: 0,
      retryDelay: 1000,
      ...config,
    }
  }

  /**
   * 执行单个工具
   * @param tool 工具实例
   * @param parameters 执行参数
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    tool: Tool,
    parameters: Record<string, unknown>,
    options?: ToolExecuteOptions,
  ): Promise<ToolResult> {
    const taskId = this.generateTaskId()
    const task: ExecutionTask = {
      id: taskId,
      toolName: tool.metadata.name,
      tool,
      parameters,
      options,
      status: 'pending',
    }

    this.tasks.set(taskId, task)

    try {
      return await this.executeTask(task)
    } finally {
      this.tasks.delete(taskId)
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(task: ExecutionTask): Promise<ToolResult> {
    task.status = 'running'
    task.startTime = Date.now()
    this.activeExecutions.add(task.id)

    this.logger.debug(
      `Executing task: ${task.toolName} (taskId: ${task.id})`,
    )

    try {
      // 执行工具
      const result = await this.executeWithRetry(task)

      task.result = result
      task.status = result.success ? 'completed' : 'failed'
      task.endTime = Date.now()

      this.logger.debug(
        `Task ${result.success ? 'completed' : 'failed'}: ${task.toolName} (taskId: ${task.id})`,
      )

      return result
    } catch (error) {
      task.status = 'failed'
      task.error = error as Error
      task.endTime = Date.now()

      this.logger.error(
        `Task failed: ${task.toolName} (taskId: ${task.id})`,
        error,
      )

      throw error
    } finally {
      this.activeExecutions.delete(task.id)
    }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(task: ExecutionTask): Promise<ToolResult> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // 执行工具
        const result = await this.executeWithTimeout(task)

        // 如果成功，返回结果
        if (result.success) {
          return result
        }

        // 如果失败且不是最后一次尝试，继续重试
        if (attempt < this.config.maxRetries) {
          this.logger.warn(
            `Task failed, retrying (${attempt + 1}/${this.config.maxRetries}): ${task.toolName}`,
          )
          await this.delay(this.config.retryDelay)
          continue
        }

        return result
      } catch (error) {
        lastError = error as Error

        // 如果不是最后一次尝试，继续重试
        if (attempt < this.config.maxRetries) {
          this.logger.warn(
            `Task failed with error, retrying (${attempt + 1}/${this.config.maxRetries}): ${task.toolName}`,
            error,
          )
          await this.delay(this.config.retryDelay)
          continue
        }

        throw error
      }
    }

    throw lastError || new Error('Execution failed')
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout(task: ExecutionTask): Promise<ToolResult> {
    const timeout = task.options?.timeout || this.config.timeout

    if (!timeout) {
      return task.tool.execute(task.parameters, task.options)
    }

    return Promise.race([
      task.tool.execute(task.parameters, task.options),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Task timeout after ${timeout}ms`)),
          timeout,
        ),
      ),
    ])
  }

  /**
   * 批量执行工具
   * @param tasks 任务数组
   * @param config 执行配置
   * @returns 执行结果汇总
   */
  async executeBatch(
    tasks: Array<{
      tool: Tool
      parameters: Record<string, unknown>
      options?: ToolExecuteOptions
    }>,
    config?: Partial<ExecutionConfig>,
  ): Promise<ExecutionSummary> {
    const mergedConfig = { ...this.config, ...config }
    const startTime = Date.now()

    // 创建执行任务
    const executionTasks: ExecutionTask[] = tasks.map((task) => ({
      id: this.generateTaskId(),
      toolName: task.tool.metadata.name,
      tool: task.tool,
      parameters: task.parameters,
      options: task.options,
      status: 'pending',
    }))

    // 注册任务
    for (const task of executionTasks) {
      this.tasks.set(task.id, task)
    }

    try {
      // 根据策略执行
      switch (mergedConfig.strategy) {
        case ExecutionStrategy.SERIAL:
          await this.executeSerial(executionTasks, mergedConfig)
          break
        case ExecutionStrategy.PARALLEL:
          await this.executeParallel(executionTasks, mergedConfig)
          break
        case ExecutionStrategy.BATCH_PARALLEL:
          await this.executeBatchParallel(
            executionTasks,
            mergedConfig.batchSize || 5,
            mergedConfig,
          )
          break
      }

      // 生成汇总
      return this.generateSummary(executionTasks, startTime)
    } finally {
      // 清理任务
      for (const task of executionTasks) {
        this.tasks.delete(task.id)
      }
    }
  }

  /**
   * 串行执行
   */
  private async executeSerial(
    tasks: ExecutionTask[],
    config: ExecutionConfig,
  ): Promise<void> {
    for (const task of tasks) {
      try {
        await this.executeTask(task)
      } catch (error) {
        if (!config.continueOnError) {
          throw error
        }
      }
    }
  }

  /**
   * 并行执行
   */
  private async executeParallel(
    tasks: ExecutionTask[],
    config: ExecutionConfig,
  ): Promise<void> {
    const promises = tasks.map(async (task) => {
      try {
        return await this.executeTask(task)
      } catch (error) {
        if (!config.continueOnError) {
          throw error
        }
        return undefined
      }
    })

    await Promise.all(promises)
  }

  /**
   * 批量并行执行
   */
  private async executeBatchParallel(
    tasks: ExecutionTask[],
    batchSize: number,
    config: ExecutionConfig,
  ): Promise<void> {
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize)
      await this.executeParallel(batch, config)
    }
  }

  /**
   * 链式执行工具
   * @param chain 工具链
   * @param initialContext 初始上下文
   * @returns 最终结果
   */
  async executeChain(
    chain: Array<{
      tool: Tool
      parameters: Record<string, unknown> | ((context: unknown) => Record<string, unknown>)
      options?: ToolExecuteOptions
    }>,
    initialContext: unknown = {},
  ): Promise<unknown> {
    let context = initialContext

    for (const link of chain) {
      // 解析参数
      const parameters =
        typeof link.parameters === 'function'
          ? link.parameters(context)
          : link.parameters

      // 执行工具
      const result = await this.execute(link.tool, parameters, link.options)

      if (!result.success) {
        throw new Error(
          `Chain execution failed at tool '${link.tool.metadata.name}': ${result.error}`,
        )
      }

      // 更新上下文
      context = {
        ...context,
        [link.tool.metadata.name]: result.data,
      }
    }

    return context
  }

  /**
   * 并发执行多个工具
   * @param tasks 任务数组
   * @param maxConcurrency 最大并发数
   * @returns 执行结果数组
   */
  async executeConcurrent(
    tasks: Array<{
      tool: Tool
      parameters: Record<string, unknown>
      options?: ToolExecuteOptions
    }>,
    maxConcurrency: number = 5,
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = []
    const executing: Promise<ToolResult>[] = []

    for (const task of tasks) {
      const promise = this.execute(task.tool, task.parameters, task.options)
      executing.push(promise)

      if (executing.length >= maxConcurrency) {
        const result = await Promise.race(executing)
        results.push(result)
        executing.splice(
          executing.findIndex((p) => p === promise),
          1,
        )
      }
    }

    // 等待剩余任务完成
    const remainingResults = await Promise.all(executing)
    results.push(...remainingResults)

    return results
  }

  /**
   * 取消任务
   * @param taskId 任务 ID
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task '${taskId}' not found`)
    }

    if (task.status === 'running') {
      await task.tool.cancel()
      task.status = 'cancelled'
      task.endTime = Date.now()
      this.activeExecutions.delete(taskId)
    }
  }

  /**
   * 取消所有任务
   */
  async cancelAllTasks(): Promise<void> {
    const cancelPromises = Array.from(this.activeExecutions).map((taskId) =>
      this.cancelTask(taskId),
    )
    await Promise.all(cancelPromises)
  }

  /**
   * 获取任务状态
   * @param taskId 任务 ID
   * @returns 任务状态
   */
  getTaskStatus(taskId: string): ExecutionTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取所有任务状态
   * @returns 任务状态数组
   */
  getAllTaskStatus(): ExecutionTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * 获取活动任务数
   * @returns 活动任务数
   */
  getActiveTaskCount(): number {
    return this.activeExecutions.size
  }

  /**
   * 获取待处理任务数
   * @returns 待处理任务数
   */
  getPendingTaskCount(): number {
    return Array.from(this.tasks.values()).filter(
      (task) => task.status === 'pending',
    ).length
  }

  /**
   * 生成执行汇总
   */
  private generateSummary(
    tasks: ExecutionTask[],
    startTime: number,
  ): ExecutionSummary {
    const successfulTasks = tasks.filter((t) => t.status === 'completed')
    const failedTasks = tasks.filter((t) => t.status === 'failed')
    const cancelledTasks = tasks.filter((t) => t.status === 'cancelled')

    const totalDuration = Date.now() - startTime
    const completedTasks = [...successfulTasks, ...failedTasks]
    const averageDuration =
      completedTasks.length > 0
        ? completedTasks.reduce(
            (sum, task) =>
              sum + (task.endTime! - task.startTime!),
            0,
          ) / completedTasks.length
        : 0

    return {
      totalTasks: tasks.length,
      successfulTasks: successfulTasks.length,
      failedTasks: failedTasks.length,
      cancelledTasks: cancelledTasks.length,
      totalDuration,
      averageDuration,
      results: tasks
        .map((task) => task.result)
        .filter((result): result is ToolResult => result !== undefined),
      failedTasksList: failedTasks,
    }
  }

  /**
   * 更新配置
   * @param config 配置更新
   */
  updateConfig(config: Partial<ExecutionConfig>): void {
    this.config = { ...this.config, ...config }
    this.logger.debug('Tool executor config updated')
  }

  /**
   * 获取配置
   * @returns 配置对象
   */
  getConfig(): ExecutionConfig {
    return { ...this.config }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Tool Executor...')

    // 取消所有活动任务
    await this.cancelAllTasks()

    // 清空任务
    this.tasks.clear()
    this.activeExecutions.clear()

    this.logger.info('Tool Executor cleaned up')
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
