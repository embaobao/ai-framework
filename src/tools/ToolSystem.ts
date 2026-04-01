/**
 * 工具系统主类
 * 
 * 负责管理所有工具的注册、查找、执行和权限控制
 * 提供统一的工具管理接口
 */

import { EventEmitter } from 'events'
import type { Tool, ToolResult, ToolExecuteOptions, ToolStats } from './Tool'
import type { ToolPermissionManager } from './ToolPermission'
import type { ContextManager } from '../context/ContextManager'
import type { Logger } from '../logger/Logger'

/**
 * 工具系统事件类型
 */
export enum ToolSystemEventType {
  /** 工具注册 */
  TOOL_REGISTERED = 'tool_registered',
  /** 工具注销 */
  TOOL_UNREGISTERED = 'tool_unregistered',
  /** 工具执行开始 */
  TOOL_EXECUTION_STARTED = 'tool_execution_started',
  /** 工具执行完成 */
  TOOL_EXECUTION_COMPLETED = 'tool_execution_completed',
  /** 工具执行失败 */
  TOOL_EXECUTION_FAILED = 'tool_execution_failed',
  /** 工具权限被拒绝 */
  TOOL_PERMISSION_DENIED = 'tool_permission_denied',
}

/**
 * 工具系统事件数据
 */
export interface ToolSystemEventData {
  type: ToolSystemEventType
  timestamp: number
  toolName?: string
  executionId?: string
  data?: unknown
}

/**
 * 工具系统配置
 */
export interface ToolSystemConfig {
  /** 是否启用权限检查 */
  enablePermissionCheck: boolean
  /** 默认执行超时时间（毫秒） */
  defaultTimeout: number
  /** 最大并发执行数 */
  maxConcurrentExecutions: number
  /** 是否启用工具缓存 */
  enableCache: boolean
  /** 缓存过期时间（毫秒） */
  cacheExpirationTime: number
}

/**
 * 工具系统状态
 */
export enum ToolSystemState {
  /** 未初始化 */
  UNINITIALIZED = 'uninitialized',
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 已就绪 */
  READY = 'ready',
  /** 已停止 */
  STOPPED = 'stopped',
  /** 错误状态 */
  ERROR = 'error',
}

/**
 * 工具执行记录
 */
export interface ToolExecutionRecord {
  /** 执行 ID */
  executionId: string
  /** 工具名称 */
  toolName: string
  /** 执行参数 */
  parameters: Record<string, unknown>
  /** 执行结果 */
  result?: ToolResult
  /** 执行开始时间 */
  startTime: number
  /** 执行结束时间 */
  endTime?: number
  /** 执行状态 */
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  /** 用户 ID */
  userId?: string
  /** 会话 ID */
  sessionId?: string
}

/**
 * 工具系统主类
 * 
 * 管理所有工具的生命周期，提供统一的工具执行接口
 */
export class ToolSystem extends EventEmitter {
  private state: ToolSystemState = ToolSystemState.UNINITIALIZED
  private tools: Map<string, Tool> = new Map()
  private executionRecords: Map<string, ToolExecutionRecord> = new Map()
  private config: ToolSystemConfig
  private permissionManager?: ToolPermissionManager
  private contextManager?: ContextManager
  private logger: Logger
  private activeExecutions: Set<string> = new Set()

  constructor(
    config: Partial<ToolSystemConfig> = {},
    logger: Logger,
  ) {
    super()
    this.config = {
      enablePermissionCheck: true,
      defaultTimeout: 30000,
      maxConcurrentExecutions: 10,
      enableCache: true,
      cacheExpirationTime: 60000,
      ...config,
    }
    this.logger = logger
  }

  /**
   * 初始化工具系统
   */
  async initialize(): Promise<void> {
    if (this.state !== ToolSystemState.UNINITIALIZED) {
      throw new Error(`ToolSystem is already initialized or in invalid state: ${this.state}`)
    }

    this.state = ToolSystemState.INITIALIZING
    this.logger.info('Initializing Tool System...')

    try {
      // 初始化所有已注册的工具
      for (const [name, tool] of this.tools) {
        this.logger.debug(`Initializing tool: ${name}`)
        await tool.initialize()
      }

      this.state = ToolSystemState.READY
      this.logger.info('Tool System initialized successfully')
    } catch (error) {
      this.state = ToolSystemState.ERROR
      this.logger.error('Failed to initialize Tool System:', error)
      throw error
    }
  }

  /**
   * 注册工具
   * @param tool 要注册的工具
   */
  async registerTool(tool: Tool): Promise<void> {
    const { name } = tool.metadata

    // 检查工具是否已注册
    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`)
    }

    this.logger.debug(`Registering tool: ${name}`)

    // 如果系统已就绪，初始化工具
    if (this.state === ToolSystemState.READY) {
      await tool.initialize()
    }

    // 注册工具
    this.tools.set(name, tool)

    // 发出事件
    this.emit(ToolSystemEventType.TOOL_REGISTERED, {
      type: ToolSystemEventType.TOOL_REGISTERED,
      timestamp: Date.now(),
      toolName: name,
    })

    this.logger.info(`Tool registered: ${name}`)
  }

  /**
   * 批量注册工具
   * @param tools 要注册的工具数组
   */
  async registerTools(tools: Tool[]): Promise<void> {
    for (const tool of tools) {
      await this.registerTool(tool)
    }
  }

  /**
   * 注销工具
   * @param toolName 工具名称
   */
  async unregisterTool(toolName: string): Promise<void> {
    const tool = this.tools.get(toolName)
    if (!tool) {
      throw new Error(`Tool '${toolName}' is not registered`)
    }

    this.logger.debug(`Unregistering tool: ${toolName}`)

    // 清理工具资源
    await tool.cleanup()

    // 注销工具
    this.tools.delete(toolName)

    // 发出事件
    this.emit(ToolSystemEventType.TOOL_UNREGISTERED, {
      type: ToolSystemEventType.TOOL_UNREGISTERED,
      timestamp: Date.now(),
      toolName,
    })

    this.logger.info(`Tool unregistered: ${toolName}`)
  }

  /**
   * 批量注销工具
   * @param toolNames 工具名称数组
   */
  async unregisterTools(toolNames: string[]): Promise<void> {
    for (const toolName of toolNames) {
      await this.unregisterTool(toolName)
    }
  }

  /**
   * 获取工具
   * @param toolName 工具名称
   * @returns 工具实例
   */
  getTool(toolName: string): Tool | undefined {
    return this.tools.get(toolName)
  }

  /**
   * 获取所有工具
   * @returns 工具映射
   */
  getAllTools(): Map<string, Tool> {
    return new Map(this.tools)
  }

  /**
   * 获取工具名称列表
   * @returns 工具名称数组
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * 检查工具是否存在
   * @param toolName 工具名称
   * @returns 是否存在
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName)
  }

  /**
   * 根据分类获取工具
   * @param category 工具分类
   * @returns 工具数组
   */
  getToolsByCategory(category: string): Tool[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.metadata.category === category,
    )
  }

  /**
   * 根据标签获取工具
   * @param tag 工具标签
   * @returns 工具数组
   */
  getToolsByTag(tag: string): Tool[] {
    return Array.from(this.tools.values()).filter((tool) =>
      tool.metadata.tags?.includes(tag),
    )
  }

  /**
   * 搜索工具
   * @param query 搜索查询
   * @returns 匹配的工具数组
   */
  searchTools(query: string): Tool[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.tools.values()).filter(
      (tool) =>
        tool.metadata.name.toLowerCase().includes(lowerQuery) ||
        tool.metadata.description.toLowerCase().includes(lowerQuery) ||
        tool.metadata.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    )
  }

  /**
   * 执行工具
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @param options 执行选项
   * @returns 执行结果
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, unknown>,
    options?: ToolExecuteOptions,
  ): Promise<ToolResult> {
    // 检查系统状态
    if (this.state !== ToolSystemState.READY) {
      throw new Error(`ToolSystem is not ready. Current state: ${this.state}`)
    }

    // 获取工具
    const tool = this.getTool(toolName)
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`)
    }

    // 检查并发执行限制
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      throw new Error(
        `Maximum concurrent executions (${this.config.maxConcurrentExecutions}) reached`,
      )
    }

    // 生成执行 ID
    const executionId = this.generateExecutionId()

    // 创建执行记录
    const record: ToolExecutionRecord = {
      executionId,
      toolName,
      parameters,
      startTime: Date.now(),
      status: 'running',
      userId: options?.context?.userId,
      sessionId: options?.context?.sessionId,
    }
    this.executionRecords.set(executionId, record)
    this.activeExecutions.add(executionId)

    // 发出执行开始事件
    this.emit(ToolSystemEventType.TOOL_EXECUTION_STARTED, {
      type: ToolSystemEventType.TOOL_EXECUTION_STARTED,
      timestamp: Date.now(),
      toolName,
      executionId,
      data: { parameters },
    })

    this.logger.debug(`Executing tool: ${toolName} (executionId: ${executionId})`)

    try {
      // 权限检查
      if (this.config.enablePermissionCheck && tool.requiresPermission) {
        const hasPermission = await this.checkPermission(toolName, options)
        if (!hasPermission) {
          throw new Error(`Permission denied for tool '${toolName}'`)
        }
      }

      // 设置默认超时
      const executeOptions: ToolExecuteOptions = {
        timeout: this.config.defaultTimeout,
        ...options,
        context: {
          executionId,
          timestamp: Date.now(),
          ...options?.context,
        },
      }

      // 执行工具
      const result = await this.executeWithTimeout(tool, parameters, executeOptions)

      // 更新执行记录
      record.result = result
      record.endTime = Date.now()
      record.status = result.success ? 'completed' : 'failed'

      // 发出执行完成事件
      if (result.success) {
        this.emit(ToolSystemEventType.TOOL_EXECUTION_COMPLETED, {
          type: ToolSystemEventType.TOOL_EXECUTION_COMPLETED,
          timestamp: Date.now(),
          toolName,
          executionId,
          data: { result },
        })
      } else {
        this.emit(ToolSystemEventType.TOOL_EXECUTION_FAILED, {
          type: ToolSystemEventType.TOOL_EXECUTION_FAILED,
          timestamp: Date.now(),
          toolName,
          executionId,
          data: { error: result.error },
        })
 })
      this.logger.debug(
        `Tool execution ${result.success ? 'completed' : 'failed'}: ${toolName} (executionId: ${executionId})`,
      )

      return result
    } catch (error) {
      // 更新执行记录
      record.endTime = Date.now()
      record.status = 'failed'
      record.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - record.startTime,
      }

      // 发出执行失败事件
      this.emit(ToolSystemEventType.TOOL_EXECUTION_FAILED, {
        type: ToolSystemEventType.TOOL_EXECUTION_FAILED,
        timestamp: Date.now(),
        toolName,
        executionId,
        data: { error },
      })

      this.logger.error(`Tool execution failed: ${toolName} (executionId: ${executionId})`, error)

      throw error
    } finally {
      this.activeExecutions.delete(executionId)
    }
  }

  /**
   * 带超时的工具执行
   */
  private async executeWithTimeout(
    tool: Tool,
    parameters: Record<string, unknown>,
    options: ToolExecuteOptions,
  ): Promise<ToolResult> {
    const { timeout } = options

    if (!timeout) {
      return tool.execute(parameters, options)
    }

    return Promise.race([
      tool.execute(parameters, options),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timeout after ${timeout}ms`)), timeout),
      ),
    ])
  }

  /**
   * 检查权限
   */
  private async checkPermission(
    toolName: string,
    options?: ToolExecuteOptions,
  ): Promise<boolean> {
    if (!this.permissionManager) {
      return true
    }

    const userId = options?.context?.userId
    if (!userId) {
      return false
    }

    const hasPermission = await this.permissionManager.checkPermission(userId, toolName)

    if (!hasPermission) {
      this.emit(ToolSystemEventType.TOOL_PERMISSION_DENIED, {
        type: ToolSystemEventType.TOOL_PERMISSION_DENIED,
        timestamp: Date.now(),
        toolName,
        data: { userId },
      })
    }

    return hasPermission
  }

  /**
   * 获取执行记录
   * @param executionId 执行 ID
   * @returns 执行记录
   */
  getExecutionRecord(executionId: string): ToolExecutionRecord | undefined {
    return this.executionRecords.get(executionId)
  }

  /**
   * 获取所有执行记录
   * @returns 执行记录数组
   */
  getAllExecutionRecords(): ToolExecutionRecord[] {
    return Array.from(this.executionRecords.values())
  }

  /**
   * 获取工具的执行记录
   * @param toolName 工具名称
   * @returns 执行记录数组
   */
  getToolExecutionRecords(toolName: string): ToolExecutionRecord[] {
    return Array.from(this.executionRecords.values()).filter(
      (record) => record.toolName === toolName,
    )
  }

  /**
   * 获取工具统计信息
   * @param toolName 工具名称
   * @returns 统计信息
   */
  getToolStats(toolName: string): ToolStats | undefined {
    const tool = this.getTool(toolName)
    return tool?.getStats()
  }

  /**
   * 获取所有工具的统计信息
   * @returns 统计信息映射
   */
  getAllToolStats(): Map<string, ToolStats> {
    const stats = new Map<string, ToolStats>()
    for (const [name, tool] of this.tools) {
      stats.set(name, tool.getStats())
    }
    return stats
  }

  /**
   * 获取系统统计信息
   * @returns 系统统计信息
   */
  getSystemStats(): {
    totalTools: number
    active: number
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
  } {
    let totalExecutions = 0
    let successfulExecutions = 0
    let failedExecutions = 0

    for (const tool of this.tools.values()) {
      const stats = tool.getStats()
      totalExecutions += stats.totalExecutions
      successfulExecutions += stats.successfulExecutions
      failedExecutions += stats.failedExecutions
    }

    return {
      totalTools: this.tools.size,
      active: this.activeExecutions.size,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
    }
  }

  /**
   * 设置权限管理器
   * @param permissionManager 权限管理器
   */
  setPermissionManager(permissionManager: ToolPermissionManager): void {
    this.permissionManager = permissionManager
    this.logger.debug('Permission manager set')
  }

  /**
   * 设置上下文管理器
   * @param contextManager 上下文管理器
   */
  setContextManager(contextManager: ContextManager): void {
    this.contextManager = contextManager
    this.logger.debug('Context manager set')
  }

  /**
   * 获取系统状态
   * @returns 系统状态
   */
  getState(): ToolSystemState {
    return this.state
  }

  /**
   * 获取配置
   * @returns 配置对象
   */
  getConfig(): ToolSystemConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   * @param config 配置更新
   */
  updateConfig(config: Partial<ToolSystemConfig>): void {
    this.config = { ...this.config, ...config }
    this.logger.debug('Tool system config updated')
  }

  /**
   * 清理执行记录
   * @param maxAge 最大保留时间（毫秒）
   */
  cleanupExecutionRecords(maxAge: number = 3600000): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [id, record] of this.executionRecords) {
      if (now - record.startTime > maxAge) {
        toDelete.push(id)
      }
    }

    for (const id of toDelete) {
      this.executionRecords.delete(id)
    }

    if (toDelete.length > 0) {
      this.logger.debug(`Cleaned up ${toDelete.length} execution records`)
    }
  }

  /**
   * 停止工具系统
   */
  async stop(): Promise<void> {
    if (this.state !== ToolSystemState.READY) {
      throw new Error(`ToolSystem is not running. Current state: ${this.state}`)
    }

    this.logger.info('Stopping Tool System...')

    // 清理所有工具
    for (const [name, tool] of this.tools) {
      this.logger.debug(`Cleaning up tool: ${name}`)
      await tool.cleanup()
    }

    this.state = ToolSystemState.STOPPED
    this.logger.info('Tool System stopped')
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Tool System...')

    // 清理所有工具
    for (const [name, tool] of this.tools) {
      this.logger.debug(`Cleaning up tool: ${name}`)
      await tool.cleanup()
    }

    // 清空工具和记录
    this.tools.clear()
    this.executionRecords.clear()
    this.activeExecutions.clear()

    this.state = ToolSystemState.UNINITIALIZED
    this.logger.info('Tool System cleaned up')
  }

  /**
   * 生成执行 ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
