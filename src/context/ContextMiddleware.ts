/**
 * 上下文中间件接口
 * 定义上下文中间件的核心接口
 */
import type { Context, ContextEvent } from './Context'

/**
 * 中间件上下文
 * 定义中间件执行时的上下文信息
 */
export interface MiddlewareContext {
  /** 当前上下文 */
  context: Context
  /** 中间件链中的下一个中间件 */
  next: () => Promise<void>
  /** 中间件元数据 */
  metadata: MiddlewareMetadata
  /** 自定义数据 */
  data?: Record<string, any>
}

/**
 * 中间件元数据
 */
export interface MiddlewareMetadata {
  /** 中间件名称 */
  name: string
  /** 中间件版本 */
  version?: string
  /** 中间件描述 */
  description?: string
  /** 中间件优先级（数字越大优先级越高） */
  priority?: number
  /** 中间件是否异步 */
  async?: boolean
  /** 中间件是否只运行一次 */
  runOnce?: boolean
  /** 中间件是否启用 */
  enabled?: boolean
  /** 中间件的自定义属性 */
  customProperties: Record<string, any>
}

/**
 * 中间件执行结果
 */
export interface MiddlewareResult {
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: Error
  /** 执行耗时（毫秒） */
  duration: number
  /** 自定义数据 */
  data?: any
}

/**
 * 中间件接口
 * 定义中间件的核心接口
 */
export interface ContextMiddleware {
  /** 获取中间件元数据 */
  getMetadata(): MiddlewareMetadata

  /**
   * 执行中间件
   * @param ctx - 中间件上下文
   * @returns Promise<MiddlewareResult>
   */
  execute(ctx: MiddlewareContext): Promise<MiddlewareResult>

  /**
   * 处理错误
   * @param error - 错误对象
   * @param ctx - 中间件上下文
   * @returns Promise<MiddlewareResult>
   */
  handleError?(error: Error, ctx: MiddlewareContext): Promise<MiddlewareResult>

  /**
   * 初始化中间件
   * @returns Promise<void>
   */
  initialize?(): Promise<void>

  /**
   * 清理中间件
   * @returns Promise<void>
   */
  cleanup?(): Promise<void>
}

/**
 * 中间件链接口
 * 定义中间件链的核心接口
 */
export interface MiddlewareChain {
  /**
   * 添加中间件到链
   * @param middleware - 要添加的中间件
   * @returns void
   */
  use(middleware: ContextMiddleware): void

  /**
   * 移除中间件
   * @param name - 中间件名称
   * @returns boolean - 是否移除成功
   */
  remove(name: string): boolean

  /**
   * 获取中间件
   * @param name - 中间件名称
   * @returns ContextMiddleware | undefined
   */
  get(name: string): ContextMiddleware | undefined

  /**
   * 检查中间件是否存在
   * @param name - 中间件名称
   * @returns boolean
   */
  has(name: string): boolean

  /**
   * 获取所有中间件
   * @returns ContextMiddleware[]
   */
  getAll(): ContextMiddleware[]

  /**
   * 清空中间件链
   * @returns void
   */
  clear(): void

  /**
   * 执行中间件链
   * @param context - 上下文
   * @returns Promise<MiddlewareResult[]>
   */
  execute(context: Context): Promise<MiddlewareResult[]>

  /**
   * 设置错误处理器
   * @param handler - 错误处理器
   * @returns void
   */
  setErrorHandler(
    handler: (error: Error, context: Context) => Promise<void>
  ): void
}

/**
 * 中间件管理器接口
 * 定义中间件管理器的核心接口
 */
export interface MiddlewareManager {
  /**
   * 初始化中间件管理器
   * @returns Promise<void>
   */
  initialize(): Promise<void>

  /**
   * 注册中间件
   * @param middleware - 要注册的中间件
   * @returns void
   */
  register(middleware: ContextMiddleware): void

  /**
   * 注销中间件
   * @param name - 中间件名称
   * @returns boolean - 是否注销成功
   */
  unregister(name: string): boolean

  /**
   * 获取中间件
   * @param name - 中间件名称
   * @returns ContextMiddleware | undefined
   */
  get(name: string): ContextMiddleware | undefined

  /**
   * 检查中间件是否已注册
   * @param name - 中间件名称
   * @returns boolean
   */
  has(name: string): boolean

  /**
   * 获取所有已注册的中间件
   * @returns ContextMiddleware[]
   */
  getAll(): ContextMiddleware[]

  /**
   * 创建中间件链
   * @param middlewareNames - 中间件名称列表
   * @returns MiddlewareChain
   */
  createChain(middlewareNames: string[]): MiddlewareChain

  /**
   * 执行中间件链
   * @param chain - 中间件链
   * @param context - 上下文
   * @returns Promise<MiddlewareResult[]>
   */
  executeChain(
    chain: MiddlewareChain,
    context: Context
  ): Promise<MiddlewareResult[]>

  /**
   * 清理中间件管理器
   * @returns Promise<void>
   */
  cleanup(): Promise<void>
}

/**
 * 默认中间件链实现
 */
export class DefaultMiddlewareChain implements MiddlewareChain {
  private middlewares: ContextMiddleware[] = []
  private errorHandler?: (error: Error, context: Context) => Promise<void>

  use(middleware: ContextMiddleware): void {
    // 检查是否已存在同名中间件
    const existingIndex = this.middlewares.findIndex(
      (m) => m.getMetadata().name === middleware.getMetadata().name
    )

    if (existingIndex !== -1) {
      // 替换已存在的中间件
      this.middlewares[existingIndex] = middleware
    } else {
      // 添加新中间件
      this.middlewares.push(middleware)
    }

    // 按优先级排序
    this.sortByPriority()
  }

  remove(name: string): boolean {
    const index = this.middlewares.findIndex(
      (m) => m.getMetadata().name === name
    )
    if (index !== -1) {
      this.middlewares.splice(index, 1)
      return true
    }
    return false
  }

  get(name: string): ContextMiddleware | undefined {
    return this.middlewares.find((m) => m.getMetadata().name === name)
  }

  has(name: string): boolean {
    return this.middlewares.some((m) => m.getMetadata().name === name)
  }

  getAll(): ContextMiddleware[] {
    return [...this.middlewares]
  }

  clear(): void {
    this.middlewares = []
  }

  async execute(context: Context): Promise<MiddlewareResult[]> {
    const results: MiddlewareResult[] = []
    let currentIndex = 0

    const next = async (): Promise<void> => {
      if (currentIndex >= this.middlewares.length) {
        return
      }

      const middleware = this.middlewares[currentIndex]
      const metadata = middleware.getMetadata()

      // 检查中间件是否启用
      if (metadata.enabled === false) {
        currentIndex++
        await next()
        return
      }

      const startTime = Date.now()

      try {
        // 执行中间件
        const result = await middleware.execute({
          context,
          next,
          metadata
        })

        results.push(result)

        // 如果中间件失败且有错误处理器，调用错误处理器
        if (!result.success && result.error && this.errorHandler) {
          await this.errorHandler(result.error, context)
        }

        currentIndex++
      } catch (error) {
        const duration = Date.now() - startTime
        const result: MiddlewareResult = {
          success: false,
          error: error as Error,
          duration
        }

        results.push(result)

        // 调用错误处理器
        if (this.errorHandler) {
          await this.errorHandler(error as Error, context)
        }

        // 如果中间件有错误处理方法，调用它
        if (middleware.handleError) {
          const handledResult = await middleware.handleError(error as Error, {
            context,
            next,
            metadata
          })
          results.push(handledResult)
        }

        currentIndex++
      }
    }

    await next()
    return results
  }

  setErrorHandler(
    handler: (error: Error, context: Context) => Promise<void>
  ): void {
    this.errorHandler = handler
  }

  /**
   * 按优先级排序中间件
   */
  private sortByPriority(): void {
    this.middlewares.sort((a, b) => {
      const priorityA = a.getMetadata().priority ?? 0
      const priorityB = b.getMetadata().priority ?? 0
      return priorityB - priorityA // 降序排序
    })
  }
}

/**
 * 默认中间件管理器实现
 */
export class DefaultMiddlewareManager implements MiddlewareManager {
  private middlewares: Map<string, ContextMiddleware> = new Map()

  async initialize(): Promise<void> {
    // 初始化所有中间件
    for (const middleware of this.middlewares.values()) {
      if (middleware.initialize) {
        await middleware.initialize()
      }
    }
  }

  register(middleware: ContextMiddleware): void {
    const metadata = middleware.getMetadata()
    this.middlewares.set(metadata.name, middleware)
  }

  unregister(name: string): boolean {
    return this.middlewares.delete(name)
  }

  get(name: string): ContextMiddleware | undefined {
    return this.middlewares.get(name)
  }

  has(name: string): boolean {
    return this.middlewares.has(name)
  }

  getAll(): ContextMiddleware[] {
    return Array.from(this.middlewares.values())
  }

  createChain(middlewareNames: string[]): MiddlewareChain {
    const chain = new DefaultMiddlewareChain()

    for (const name of middlewareNames) {
      const middleware = this.middlewares.get(name)
      if (middleware) {
        chain.use(middleware)
      }
    }

    return chain
  }

  async executeChain(
    chain: MiddlewareChain,
    context: Context
  ): Promise<MiddlewareResult[]> {
    return chain.execute(context)
  }

  async cleanup(): Promise<void> {
    // 清理所有中间件
    for (const middleware of this.middlewares.values()) {
      if (middleware.cleanup) {
        await middleware.cleanup()
      }
    }
    this.middlewares.clear()
  }
}

/**
 * 抽象中间件基类
 * 提供中间件的基本实现
 */
export abstract class AbstractMiddleware implements ContextMiddleware {
  protected metadata: MiddlewareMetadata
  protected executed: boolean = false

  constructor(metadata: MiddlewareMetadata) {
    this.metadata = {
      priority: 0,
      async: true,
      runOnce: false,
      enabled: true,
      customProperties: {},
      ...metadata
    }
  }

  getMetadata(): MiddlewareMetadata {
    return { ...this.metadata }
  }

  async execute(ctx: MiddlewareContext): Promise<MiddlewareResult> {
    const startTime = Date.now()

    // 检查是否只运行一次
    if (this.metadata.runOnce && this.executed) {
      return {
        success: true,
        duration: Date.now() - startTime
      }
    }

    try {
      // 执行中间件逻辑
      await this.onExecute(ctx)

      this.executed = true

      return {
        success: true,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime
      }
    }
  }

  async handleError(
    error: Error,
    ctx: MiddlewareContext
  ): Promise<MiddlewareResult> {
    const startTime = Date.now()

    try {
      // 执行错误处理逻辑
      await this.onError(error, ctx)

      return {
        success: true,
        duration: Date.now() - startTime
      }
    } catch (handlingError) {
      return {
        success: false,
        error: handlingError as Error,
        duration: Date.now() - startTime
      }
    }
  }

  async initialize(): Promise<void> {
    await this.onInitialize()
  }

  async cleanup(): Promise<void> {
    await this.onCleanup()
  }

  /**
   * 子类实现：中间件执行逻辑
   */
  protected abstract onExecute(ctx: MiddlewareContext): Promise<void>

  /**
   * 子类实现：错误处理逻辑
   */
  protected async onError(error: Error, ctx: MiddlewareContext): Promise<void> {
    // 默认不处理错误
  }

  /**
   * 子类实现：初始化逻辑
   */
  protected async onInitialize(): Promise<void> {
    // 默认不执行任何操作
  }

  /**
   * 子类实现：清理逻辑
   */
  protected async onCleanup(): Promise<void> {
    // 默认不执行任何操作
  }
}

/**
 * 日志中间件
 * 记录上下文操作的日志
 */
export class LoggingMiddleware extends AbstractMiddleware {
  constructor() {
    super({
      name: 'logging',
      version: '1.0.0',
      description: '记录上下文操作的日志',
      priority: 100
    })
  }

  protected async onExecute(ctx: MiddlewareContext): Promise<void> {
    const { context, metadata } = ctx

    console.log(
      `[Context Middleware] ${metadata.name} executing on context: ${context.getId()}`
    )
    console.log(`[Context Middleware] Context state: ${context.getState()}`)
    console.log(
      `[Context Middleware] Context data keys: ${context.keys().join(', ')}`
    )
  }
}

/**
 * 验证中间件
 * 验证上下文数据的有效性
 */
export class ValidationMiddleware extends AbstractMiddleware {
  private validators: Map<string, (value: any) => boolean> = new Map()

  constructor() {
    super({
      name: 'validation',
      version: '1.0.0',
      description: '验证上下文数据的有效性',
      priority: 90
    })
  }

  /**
   * 添加验证器
   * @param key - 数据键
   * @param validator - 验证函数
   */
  addValidator(key: string, validator: (value: any) => boolean): void {
    this.validators.set(key, validator)
  }

  /**
   * 移除验证器
   * @param key - 数据键
   */
  removeValidator(key: string): void {
    this.validators.delete(key)
  }

  protected async onExecute(ctx: MiddlewareContext): Promise<void> {
    const { context } = ctx

    for (const [key, validator] of this.validators.entries()) {
      if (context.has(key)) {
        const value = context.get(key)
        if (!validator(value)) {
          throw new Error(`Validation failed for key: ${key}`)
        }
      }
    }
  }
}

/**
 * 缓存中间件
 * 缓存上下文数据以提高性能
 */
export class CachingMiddleware extends AbstractMiddleware {
  private cache: Map<string, any> = new Map()
  private cacheKeys: Set<string> = new Set()

  constructor() {
    super({
      name: 'caching',
      version: '1.0.0',
      description: '缓存上下文数据以提高性能',
      priority: 80
    })
  }

  /**
   * 添加要缓存的键
   * @param key - 数据键
   */
  addCacheKey(key: string): void {
    this.cacheKeys.add(key)
  }

  /**
   * 移除要缓存的键
   * @param key - 数据键
   */
  removeCacheKey(key: string): void {
    this.cacheKeys.delete(key)
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  protected async onExecute(ctx: MiddlewareContext): Promise<void> {
    const { context } = ctx

    // 从缓存加载数据
    for (const key of this.cacheKeys) {
      const cacheKey = `${context.getId()}:${key}`
      if (this.cache.has(cacheKey) && !context.has(key)) {
        context.set(key, this.cache.get(cacheKey))
      }
    }

    // 将数据写入缓存
    for (const key of this.cacheKeys) {
      if (context.has(key)) {
        const cacheKey = `${context.getId()}:${key}`
        this.cache.set(cacheKey, context.get(key))
      }
    }
  }

  protected async onCleanup(): Promise<void> {
    this.cache.clear()
  }
}

/**
 * 性能监控中间件
 * 监控上下文操作的性能
 */
export class PerformanceMonitoringMiddleware extends AbstractMiddleware {
  private metrics: Map<string, number[]> = new Map()

  constructor() {
    super({
      name: 'performance-monitoring',
      version: '1.0.0',
      description: '监控上下文操作的性能',
      priority: 70
    })
  }

  /**
   * 获取性能指标
   * @param contextId - 上下文 ID
   * @returns number[] - 执行时间列表
   */
  getMetrics(contextId: string): number[] {
    return this.metrics.get(contextId) || []
  }

  /**
   * 获取平均执行时间
   * @param contextId - 上下文 ID
   * @returns number - 平均执行时间
   */
  getAverageExecutionTime(contextId: string): number {
    const metrics = this.getMetrics(contextId)
    if (metrics.length === 0) {
      return 0
    }
    return metrics.reduce((sum, time) => sum + time, 0) / metrics.length
  }

  /**
   * 清空性能指标
   * @param contextId - 上下文 ID
   */
  clearMetrics(contextId?: string): void {
    if (contextId) {
      this.metrics.delete(contextId)
    } else {
      this.metrics.clear()
    }
  }

  protected async onExecute(ctx: MiddlewareContext): Promise<void> {
    const { context } = ctx
    const startTime = Date.now()

    // 执行下一个中间件
    await ctx.next()

    const duration = Date.now() - startTime

    // 记录执行时间
    if (!this.metrics.has(context.getId())) {
      this.metrics.set(context.getId(), [])
    }
    this.metrics.get(context.getId())!.push(duration)

    console.log(
      `[Performance] Context ${context.getId()} executed in ${duration}ms`
    )
  }

  protected async onCleanup(): Promise<void> {
    this.metrics.clear()
  }
}
