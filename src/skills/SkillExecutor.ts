/**
 * 技能执行器
 * 
 * 负责技能的执行逻辑，包括参数处理、错误处理和超时控制
 */

import type { Skill } from './Skill'
import type { SkillResult, SkillExecuteOptions } from './Skill'
import type { ToolSystem } from '../tools/ToolSystem'
import type { Logger } from '../logger/Logger'

/**
 * 技能执行器配置
 */
export interface SkillExecutorConfig {
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number
  /** 是否启用执行日志 */
  enableExecutionLog?: boolean
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean
  /** 最大重试次数 */
  maxRetries?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  /** 执行 ID */
  executionId: string
  /** 技能名称 */
  skillName: string
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime?: number
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled'
  /** 执行结果 */
  result?: SkillResult
  /** 错误信息 */
  error?: Error
  /** 重试次数 */
  retryCount: number
}

/**
 * 执行统计信息
 */
export interface ExecutionStats {
  /** 总执行次数 */
  totalExecutions: number
  /** 成功执行次数 */
  successfulExecutions: number
  /** 失败执行次数 */
  failedExecutions: number
  /** 超时执行次数 */
  timeoutExecutions: number
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number
  /** 最大执行时间（毫秒） */
  maxExecutionTime: number
  /** 最小执行时间（毫秒） */
  minExecutionTime: number
}

/**
 * 技能执行器类
 */
export class SkillExecutor {
  private config: SkillExecutorConfig
  private logger: Logger
  private toolSystem?: ToolSystem
  private executionContexts: Map<string, ExecutionContext> = new Map()
  private stats: ExecutionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    timeoutExecutions: 0,
    averageExecutionTime: 0,
    maxExecutionTime: 0,
    minExecutionTime: Infinity,
  }
  private initialized: boolean = false

  constructor(logger: Logger, config: SkillExecutorConfig = {}) {
    this.logger = logger
    this.config = {
      defaultTimeout: 30000, // 30秒
      enableExecutionLog: true,
      enablePerformanceMonitoring: true,
      maxRetries: 3,
      retryDelay: 1000, // 1秒
      ...config,
    }
  }

  /**
   * 初始化执行器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    this.logger.info('Initializing Skill Executor...')
    this.initialized = true
    this.logger.info('Skill Executor initialized')
  }

  /**
   * 执行技能
   * @param skill 要执行的技能
   * @param parameters 技能参数
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    skill: Skill,
    parameters: Record<string, unknown>,
    options?: SkillExecuteOptions,
  ): Promise<SkillResult> {
    const executionId = this.generateExecutionId()
    const startTime = Date.now()

    // 创建执行上下文
    const context: ExecutionContext = {
      executionId,
      skillName: skill.name,
      startTime,
      status: 'pending',
      retryCount: 0,
    }
    this.executionContexts.set(executionId, context)

    try {
      // 记录执行开始
      if (this.config.enableExecutionLog) {
        this.logger.info(`Executing skill: ${skill.name} (ID: ${executionId})`)
      }

      // 更新上下文状态
      context.status = 'running'

      // 处理参数
      const processedParameters = await this.processParameters(skill, parameters)

      // 执行技能（带重试）
      const result = await this.executeWithRetry(
        skill,
        processedParameters,
        options,
        context,
      )

      // 更新统计信息
      this.updateStats(result, Date.now() - startTime)

      // 更新上下文
      context.status = 'completed'
      context.endTime = Date.now()
      context.result = result

      // 记录执行完成
      if (this.config.enableExecutionLog) {
        this.logger.info(
          `Skill execution completed: ${skill.name} (ID: ${executionId}, Duration: ${result.duration}ms)`,
        )
      }

      return result
    } catch (error) {
      // 更新上下文
      context.status = 'failed'
      context.endTime = Date.now()
      context.error = error instanceof Error ? error : new Error(String(error))

      // 记录执行失败
      this.logger.error(`Skill execution failed: ${skill.name} (ID: ${executionId})`, error)

      // 返回错误结果
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      }
    } finally {
      // 清理执行上下文（保留一段时间用于调试）
      setTimeout(() => {
        this.executionContexts.delete(executionId)
      }, 60000) // 1分钟后清理
    }
  }

  /**
   * 带重试的执行
   * @param skill 技能实例
   * @param parameters 处理后的参数
   * @param options 执行选项
   * @param context 执行上下文
   * @returns 执行结果
   */
  private async executeWithRetry(
    skill: Skill,
    parameters: Record<string, unknown>,
    options?: SkillExecuteOptions,
    context?: ExecutionContext,
  ): Promise<SkillResult> {
    const maxRetries = this.config.maxRetries || 0
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 执行技能（带超时控制）
        const result = await this.executeWithTimeout(skill, parameters, options)

        // 如果成功，返回结果
        if (result.success) {
          return result
        }

        // 如果失败且还有重试机会，继续重试
        if (attempt < maxRetries) {
          lastError = new Error(result.error || 'Execution failed')
          if (context) {
            context.retryCount = attempt + 1
          }
          this.logger.warn(
            `Skill execution failed, retrying (${attempt + 1}/${maxRetries}): ${skill.name}`,
          )
          await this.delay(this.config.retryDelay || 1000)
        } else {
          // 没有重试机会了，返回失败结果
          return result
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // 如果还有重试机会，继续重试
        if (attempt < maxRetries) {
          if (context) {
            context.retryCount = attempt + 1
          }
          this.logger.warn(
            `Skill execution failed, retrying (${attempt + 1}/${maxRetries}): ${skill.name}`,
            error,
          )
          await this.delay(this.config.retryDelay || 1000)
        } else {
          // 没有重试机会了，抛出错误
          throw error
        }
      }
    }

    // 所有重试都失败了
    throw lastError || new Error('Execution failed after all retries')
  }

  /**
   * 带超时控制的执行
   * @param skill 技能实例
   * @param parameters 技能参数
   * @param options 执行选项
   * @returns 执行结果
   */
  private async executeWithTimeout(
    skill: Skill,
    parameters: Record<string, unknown>,
    options?: SkillExecuteOptions,
  ): Promise<SkillResult> {
    const timeout = options?.timeout || this.config.defaultTimeout || 30000

    // 创建超时 Promise
    const timeoutPromise = new Promise<SkillResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Skill execution timeout after ${timeout}ms`))
      }, timeout)
    })

    // 创建执行 Promise
    const executionPromise = skill.execute(parameters, options)

    // 竞争执行和超时
    return Promise.race([executionPromise, timeoutPromise])
  }

  /**
   * 处理参数
   * @param skill 技能实例
   * @param parameters 原始参数
   * @returns 处理后的参数
   */
  private async processParameters(
    skill: Skill,
    parameters: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const processed: Record<string, unknown> = { ...parameters }

    // 应用默认值
    for (const [name, param] of Object.entries(skill.parameters)) {
      if (!(name in parameters) && param.default !== undefined) {
        processed[name] = param.default
      }
    }

    // 参数转换和验证
    for (const [name, value] of Object.entries(processed)) {
      const param = skill.parameters[name]
      if (param) {
        processed[name] = await this.transformParameter(value, param)
      }
    }

    return processed
  }

  /**
   * 转换参数值
   * @param value 参数值
   * @param param 参数定义
   * @returns 转换后的值
   */
  private async transformParameter(
    value: unknown,
    param: any,
  ): Promise<unknown> {
    // 类型转换
    switch (param.type) {
      case 'number':
        if (typeof value === 'string') {
          return parseFloat(value)
        }
        return value
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true'
        }
        return Boolean(value)
      case 'array':
        if (typeof value === 'string') {
          return JSON.parse(value)
        }
        return value
      case 'object':
        if (typeof value === 'string') {
          return JSON.parse(value)
        }
        return value
      default:
        return value
    }
  }

  /**
   * 更新统计信息
   * @param result 执行结果
   * @param duration 执行时间
   */
  private updateStats(result: SkillResult, duration: number): void {
    if (!this.config.enablePerformanceMonitoring) {
      return
    }

    this.stats.totalExecutions++

    if (result.success) {
      this.stats.successfulExecutions++
    } else {
      this.stats.failedExecutions++

      // 检查是否超时
      if (result.error?.includes('timeout')) {
        this.stats.timeoutExecutions++
      }
    }

    // 更新执行时间统计
    this.stats.maxExecutionTime = Math.max(this.stats.maxExecutionTime, duration)
    this.stats.minExecutionTime = Math.min(this.stats.minExecutionTime, duration)

    // 计算平均执行时间
    this.stats.averageExecutionTime =
      (this.stats.averageExecutionTime * (this.stats.totalExecutions - 1) + duration) /
      this.stats.totalExecutions
  }

  /**
   * 获取执行统计信息
   * @returns 统计信息
   */
  getStats(): ExecutionStats {
    return { ...this.stats }
  }

  /**
   * 获取执行上下文
   * @param executionId 执行 ID
   * @returns 执行上下文，如果不存在则返回 undefined
   */
  getExecutionContext(executionId: string): ExecutionContext | undefined {
    return this.executionContexts.get(executionId)
  }

  /**
   * 获取所有活跃的执行上下文
   * @returns 执行上下文数组
   */
  getActiveExecutions(): ExecutionContext[] {
    return Array.from(this.executionContexts.values()).filter(
      (ctx) => ctx.status === 'running' || ctx.status === 'pending',
    )
  }

  /**
   * 取消执行
   * @param executionId 执行 ID
   * @returns 是否成功取消
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const context = this.executionContexts.get(executionId)
    if (!context) {
      return false
    }

    if (context.status !== 'running' && context.status !== 'pending') {
      return false
    }

    // 更新上下文状态
    context.status = 'cancelled'
    context.endTime = Date.now()

    this.logger.info(`Execution cancelled: ${executionId}`)
    return true
  }

  /**
   * 设置工具系统
   * @param toolSystem 工具系统实例
   */
  setToolSystem(toolSystem: ToolSystem): void {
    this.toolSystem = toolSystem
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Skill Executor...')

    try {
      // 取消所有活跃执行
      const activeExecutions = this.getActiveExecutions()
      for (const execution of activeExecutions) {
        await this.cancelExecution(execution.executionId)
      }

      // 清理执行上下文
      this.executionContexts.clear()

      // 重置统计信息
      this.stats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        timeoutExecutions: 0,
        averageExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: Infinity,
      }

      this.initialized = false
      this.logger.info('Skill Executor cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
      throw error
    }
  }

  /**
   * 生成执行 ID
   * @returns 执行 ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 延迟函数
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
