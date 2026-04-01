/**
 * 技能接口定义
 * 
 * 定义了技能系统的核心接口，包括技能的基本属性、执行方法、生命周期方法等
 * 技能是 AI 框架中可执行的最小单元，可以由 Agent 调用
 */

/**
 * 技能参数定义
 */
export interface SkillParameter {
  /** 参数名称 */
  name: string
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  /** 参数描述 */
  description: string
  /** 是否必需 */
  required: boolean
  /** 默认值 */
  default?: unknown
  /** 枚举值（可选） */
  enum?: unknown[]
  /** 参数格式（如 email、uri 等） */
  format?: string
  /** 最小值（数字类型） */
  minimum?: number
  /** 最大值（数字类型） */
  maximum?: number
  /** 最小长度（字符串/数组类型） */
  minLength?: number
  /** 最大长度（字符串/数组类型） */
  maxLength?: number
  /** 正则表达式模式（字符串类型） */
  pattern?: string
  /** 子属性（对象类型） */
  properties?: Record<string, SkillParameter>
  /** 数组元素类型（数组类型） */
  items?: SkillParameter
}

/**
 * 技能执行结果
 */
export interface SkillResult {
  /** 执行是否成功 */
  success: boolean
  /** 结果数据 */
  data?: unknown
  /** 错误信息 */
  error?: string
  /** 错误堆栈 */
  stack?: string
  /** 执行耗时（毫秒） */
  duration: number
  /** 结果元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 技能执行进度
 */
export interface SkillProgress {
  /** 当前进度（0-100） */
  progress: number
  /** 当前状态描述 */
  status: string
  /** 已完成的工作量 */
  completed: number
  /** 总工作量 */
  total: number
  /** 预计剩余时间（毫秒） */
  estimatedRemainingTime?: number
  /** 自定义数据 */
  data?: Record<string, unknown>
}

/**
 * 技能执行选项
 */
export interface SkillExecuteOptions {
  /** 执行超时时间（毫秒） */
  timeout?: number
  /** 是否启用进度回调 */
  enableProgress?: boolean
  /** 进度回调函数 */
  onProgress?: (progress: SkillProgress) => void
  /** 执行上下文 */
  context?: SkillContext
  /** 是否异步执行 */
  async?: boolean
}

/**
 * 技能执行上下文
 */
export interface SkillContext {
  /** 执行 ID */
  executionId: string
  /** 用户 ID */
  userId?: string
  /** 会话 ID */
  sessionId?: string
  /** 请求 ID */
  requestId?: string
  /** 执行时间戳 */
  timestamp: number
  /** 环境变量 */
  env?: Record<string, string>
  /** 自定义上下文数据 */
  data?: Record<string, unknown
>}

/**
 * 技能配置
 */
export interface SkillConfig {
  /** 技能名称 */
  name: string
  /** 技能描述 */
  description: string
  /** 技能版本 */
  version: string
  /** 技能作者 */
  author?: string
  /** 技能分类 */
  category?: string
  /** 技能标签 */
  tags?: string[]
  /** 技能图标 */
  icon?: string
  /** 技能文档链接 */
  documentation?: string
  /** 技能示例 */
  examples?: SkillExample[]
  /** 技能依赖的其他技能 */
  dependencies?: string[]
  /** 技能所需权限 */
  permissions?: string[]
  /** 技能是否启用 */
  enabled?: boolean
  /** 技能超时时间（毫秒） */
  timeout?: number
  /** 技能自定义配置 */
  customConfig?: Record<string, unknown>
}

/**
 * 技能示例
 */
export interface SkillExample {
  /** 示例描述 */
  description: string
  /** 示例参数 */
  parameters: Record<string, unknown>
  /** 示例结果 */
  result?: unknown
}

/**
 * 技能元数据
 */
export interface SkillMetadata {
  /** 技能名称 */
  name: string
  /** 技能描述 */
  description: string
  /** 技能版本 */
  version: string
  /** 技能作者 */
  author?: string
  /** 技能分类 */
  category?: string
  /** 技能标签 */
  tags?: string[]
  /** 技能图标 */
  icon?: string
  /** 技能文档链接 */
  documentation?: string
  /** 技能示例 */
  examples?: SkillExample[]
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

/**
 * 技能状态
 */
export enum SkillState {
  /** 未初始化 */
  UNINITIALIZED = 'uninitialized',
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 已就绪 */
  READY = 'ready',
  /** 执行中 */
  EXECUTING = 'executing',
  /** 已暂停 */
  PAUSED = 'paused',
  /** 已停止 */
  STOPPED = 'stopped',
  /** 错误状态 */
  ERROR = 'error',
}

/**
 * 技能统计信息
 */
export interface SkillStats {
  /** 总执行次数 */
  totalExecutions: number
  /** 成功执行次数 */
  successfulExecutions: number
  /** 失败执行次数 */
  failedExecutions: number
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number
  /** 最后执行时间 */
  lastExecutionTime?: number
  /** 总执行时间（毫秒） */
  totalExecutionTime: number
}

/**
 * 技能接口
 * 
 * 所有技能都必须实现此接口
 */
export interface Skill {
  /** 技能名称 */
  readonly name: string
  
  /** 技能配置 */
  readonly config: SkillConfig
  
  /** 技能参数定义 */
  readonly parameters: Record<string, SkillParameter>
  
  /** 技能当前状态 */
  readonly state: SkillState
  
  /** 技能是否需要权限 */
  readonly requiresPermission: boolean
  
  /** 技能所需权限列表 */
  readonly requiredPermissions: string[]
  
  /** 技能是否支持异步执行 */
  readonly supportsAsync: boolean
  
  /** 技能是否支持进度报告 */
  readonly supportsProgress: boolean
  
  /** 技能是否支持取消 */
  readonly supportsCancellation: boolean
  
  /**
   * 初始化技能
   */
  initialize(): Promise<void>
  
  /**
   * 执行技能
   * @param parameters 技能参数
   * @param options 执行选项
   * @returns 执行结果
   */
  execute(parameters: Record<string, unknown>, options?: SkillExecuteOptions): Promise<SkillResult>
  
  /**
   * 验证参数
   * @param parameters 待验证的参数
   * @returns 验证结果，包含是否有效和错误信息
   */
  validateParameters(parameters: Record<string, unknown>): { valid: boolean; errors: string[] }
  
  /**
   * 获取技能帮助信息
   * @returns 帮助信息字符串
   */
  getHelp(): string
  
  /**
   * 获取技能使用示例
   * @returns 示例数组
   */
  getExamples(): SkillExample[]
  
  /**
   * 暂停技能执行
   */
  pause(): Promise<void>
  
  /**
   * 恢复技能执行
   */
  resume(): Promise<void>
  
  /**
   * 取消技能执行
   */
  cancel(): Promise<void>
  
  /**
   * 清理技能资源
   */
  cleanup(): Promise<void>
  
  /**
   * 获取技能统计信息
   * @returns 统计信息对象
   */
  getStats(): SkillStats
  
  /**
   * 获取技能依赖
   * @returns 依赖的技能名称列表
   */
  getDependencies(): string[]
}

/**
 * 抽象技能基类
 * 
 * 提供技能接口的默认实现，简化技能开发
 */
export abstract class AbstractSkill implements Skill {
  protected _state: SkillState = SkillState.UNINITIALIZED
  protected _stats: SkillStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
  }
  protected _executionId: string = ''
  protected _isCancelled: boolean = false
  protected _isPaused: boolean = false

  constructor(
    public readonly config: SkillConfig,
    public readonly parameters: Record<string, SkillParameter>,
    public readonly requiresPermission: boolean = false,
    public readonly requiredPermissions: string[] = [],
    public readonly supportsAsync: boolean = true,
    public readonly supportsProgress: boolean = false,
    public readonly supportsCancellation: boolean = false,
  ) {}

  get name(): string {
    return this.config.name
  }

  get state(): SkillState {
    return this._state
  }

  /**
   * 初始化技能
   */
  async initialize(): Promise<void> {
    this._state = SkillState.INITIALIZING
    await this.onInitialize()
    this._state = SkillState.READY
  }

  /**
   * 子类可重写的初始化钩子
   */
  protected async onInitialize(): Promise<void> {
    // 默认空实现
  }

  /**
   * 执行技能
   */
  async execute(
    parameters: Record<string, unknown>,
    options?: SkillExecuteOptions,
  ): Promise<SkillResult> {
    if (this._state !== SkillState.READY && this._state !== SkillState.PAUSED) {
      return {
        success: false,
        error: `Skill is not ready to execute. Current state: ${this._state}`,
        duration: 0,
      }
    }

    // 验证参数
    const validation = this.validateParameters(parameters)
    if (!validation.valid) {
      return {
        success: false,
        error: `Parameter validation failed: ${validation.errors.join(', ')}`,
        duration: 0,
      }
    }

    this._state = SkillState.EXECUTING
    this._isCancelled = false
    this._isPaused = false
    this._executionId = options?.context?.executionId || this.generateExecutionId()

    const startTime = Date.now()

    try {
      // 执行技能逻辑
      const result = await this.onExecute(parameters, options)

      const duration = Date.now() - startTime
      this.updateStats(true, duration)

      return {
        ...result,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.updateStats(false, duration)

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      }
    } finally {
      if (!this._isPaused) {
        this._state = SkillState.READY
      }
    }
  }

  /**
   * 子类必须实现的执行逻辑
   */
  protected abstract onExecute(
    parameters: Record<string, unknown>,
    options?: SkillExecuteOptions,
  ): Promise<SkillResult>

  /**
   * 验证参数
   */
  validateParameters(parameters: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 检查必需参数
    for (const [name, param] of Object.entries(this.parameters)) {
      if (param.required && !(name in parameters)) {
        errors.push(`Required parameter '${name}' is missing`)
      }
    }

    // 验证每个参数
    for (const [name, value] of Object.entries(parameters)) {
      const param = this.parameters[name]
      if (!param) {
        errors.push(`Unknown parameter '${name}'`)
        continue
      }

      const paramErrors = this.validateParameter(name, value, param)
      errors.push(...paramErrors)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 验证单个参数
   */
  protected validateParameter(
    name: string,
    value: unknown,
    param: SkillParameter,
  ): string[] {
    const errors: string[] = []

    // 类型验证
    if (!this.validateType(value, param.type)) {
      errors.push(`Parameter '${name}' must be of type '${param.type}'`)
      return errors
    }

    // 枚举值验证
    if (param.enum && !param.enum.includes(value)) {
      errors.push(`Parameter '${name}' must be one of: ${param.enum.join(', ')}`)
    }

    // 字符串验证
    if (param.type === 'string' && typeof value === 'string') {
      if (param.minLength && value.length < param.minLength) {
        errors.push(`Parameter '${name}' must be at least ${param.minLength} characters`)
      }
      if (param.maxLength && value.length > param.maxLength) {
        errors.push(`Parameter '${name}' must be at most ${param.maxLength} characters`)
      }
      if (param.pattern && !new RegExp(param.pattern).test(value)) {
        errors.push(`Parameter '${name}' does not match the required pattern`)
      }
    }

    // 数字验证
    if (param.type === 'number' && typeof value === 'number') {
      if (param.minimum !== undefined && value < param.minimum) {
        errors.push(`Parameter '${name}' must be at least ${param.minimum}`)
      }
      if (param.maximum !== undefined && value > param.maximum) {
        errors.push(`Parameter '${name}' must be at most ${param.maximum}`)
      }
    }

    // 数组验证
    if (param.type === 'array' && Array.isArray(value)) {
      if (param.minLength && value.length < param.minLength) {
        errors.push(`Parameter '${name}' must have at least ${param.minLength} items`)
      }
      if (param.maxLength && value.length > param.maxLength) {
        errors.push(`Parameter '${name}' must have at most ${param.maxLength} items`)
      }
    }

    return errors
  }

  /**
   * 验证类型
   */
  protected validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number'
      case 'boolean':
        return typeof value === 'boolean'
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'array':
        return Array.isArray(value)
      default:
        return false
    }
  }

  /**
   * 获取技能帮助信息
   */
  getHelp(): string {
    let help = `# ${this.config.name}\n\n`
    help += `${this.config.description}\n\n`
    help += `**Version:** ${this.config.version}\n\n`
    
    if (this.config.author) {
      help += `**Author:** ${this.config.author}\n\n`
    }

    if (this.config.category) {
      help += `**Category:** ${this.config.category}\n\n`
    }

    help += '## Parameters\n\n'
    for (const [name, param] of Object.entries(this.parameters)) {
      help += `- **${name}** (${param.type})`
      if (param.required) {
        help += ' *required*'
      }
      help += `\n  - ${param.description}\n`
      if (param.default !== undefined) {
        help += `  - Default: ${JSON.stringify(param.default)}\n`
      }
    }

    return help
  }

  /**
   * 获取技能使用示例
   */
  getExamples(): SkillExample[] {
    return this.config.examples || []
  }

  /**
   * 暂停技能执行
   */
  async pause(): Promise<void> {
    if (this._state === SkillState.EXECUTING) {
      this._isPaused = true
      this._state = SkillState.PAUSED
      await this.onPause()
    }
  }

  /**
   * 子类可重写的暂停钩子
   */
  protected async onPause(): Promise<void> {
    // 默认空实现
  }

  /**
   * 恢复技能执行
   */
  async resume(): Promise<void> {
    if (this._state === SkillState.PAUSED) {
      this._isPaused = false
      this._state = SkillState.EXECUTING
      await this.onResume()
    }
  }

  /**
   * 子类可重写的恢复钩子
   */
  protected async onResume(): Promise<void> {
    // 默认空实现
  }

  /**
   * 取消技能执行
   */
  async cancel(): Promise<void> {
    if (this._state === SkillState.EXECUTING || this._state === SkillState.PAUSED) {
      this._isCancelled = true
      await this.onCancel()
      this._state = SkillState.STOPPED
    }
  }

  /**
   * 子类可重写的取消钩子
   */
  protected async onCancel(): Promise<void> {
    // 默认空实现
  }

  /**
   * 清理技能资源
   */
  async cleanup(): Promise<void> {
    await this.onCleanup()
    this._state = SkillState.UNINITIALIZED
  }

  /**
   * 子类可重写的清理钩子
   */
  protected async onCleanup(): Promise<void> {
    // 默认空实现
  }

  /**
   * 获取技能统计信息
   */
  getStats(): SkillStats {
    return { ...this._stats }
  }

  /**
   * 获取技能依赖
   */
  getDependencies(): string[] {
    return this.config.dependencies || []
  }

  /**
   * 更新统计信息
   */
  protected updateStats(success: boolean, duration: number): void {
    this._stats.totalExecutions++
    if (success) {
      this._stats.successfulExecutions++
    } else {
      this._stats.failedExecutions++
    }
    this._stats.totalExecutionTime += duration
    this._stats.averageExecutionTime =
      this._stats.totalExecutionTime / this._stats.totalExecutions
    this._stats.lastExecutionTime = Date.now()
  }

  /**
   * 生成执行 ID
   */
  protected generateExecutionId(): string {
    return `${this.config.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 检查是否已取消
   */
  protected isCancelled(): boolean {
    return this._isCancelled
  }

  /**
   * 检查是否已暂停
   */
  protected isPaused(): boolean {
    return this._isPaused
  }

  /**
   * 报告进度
   */
  protected reportProgress(
    progress: number,
    status: string,
    completed: number,
    total: number,
    options?: SkillExecuteOptions,
  ): void {
    if (options?.onProgress) {
      options.onProgress({
        progress,
        status,
        completed,
        total,
      })
    }
  }
}
