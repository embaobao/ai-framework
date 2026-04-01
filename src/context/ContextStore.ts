/**
 * 上下文存储接口
 * 定义上下文存储的核心接口
 */
import type { Context, ContextQuery, ContextStats } from './Context'

/**
 * 存储配置选项
 */
export interface StoreOptions {
  /** 存储的最大上下文数量 */
  maxContexts?: number
  /** 是否启用缓存 */
  enableCache?: boolean
  /** 缓存的最大条目数 */
  maxCacheSize?: number
  /** 缓存的过期时间（毫秒） */
  cacheTTL?: number
  /** 是否启用持久化 */
  enablePersistence?: boolean
  /** 持久化存储路径 */
  persistencePath?: string
  /** 持久化间隔（毫秒） */
  persistenceInterval?: number
  /** 是否启用压缩 */
  enableCompression?: boolean
}

/**
 * 存储查询结果
 */
export interface QueryResult {
  /** 查询到的上下文列表 */
  contexts: Context[]
  /** 查询总数 */
  total: number
  /** 查询耗时（毫秒） */
  duration: number
}

/**
 * 存储统计信息
 */
export interface StoreStats {
  /** 存储的上下文总数 */
  totalContexts: number
  /** 缓存命中率 */
  cacheHitRate: number
  /** 缓存大小 */
  cacheSize: number
  /** 持久化状态 */
  persistenceEnabled: boolean
  /** 最后持久化时间 */
  lastPersistenceTime?: number
  /** 存储大小（字节） */
  storageSize: number
}

/**
 * 上下文存储接口
 */
export interface ContextStore {
  /**
   * 初始化存储
   */
  initialize(): Promise<void>

  /**
   * 添加上下文到存储
   * @param context - 要添加的上下文
   * @returns Promise<void>
   */
  add(context: Context): Promise<void>

  /**
   * 从存储中获取上下文
   * @param id - 上下文 ID
   * @returns Promise<Context | undefined>
   */
  get(id: string): Promise<Context | undefined>

  /**
   * 更新存储中的上下文
   * @param context - 要更新的上下文
   * @returns Promise<void>
   */
  update(context: Context): Promise<void>

  /**
   * 从存储中删除上下文
   * @param id - 上下文 ID
   * @returns Promise<boolean> - 是否删除成功
   */
  delete(id: string): Promise<boolean>

  /**
   * 检查上下文是否存在
   * @param id - 上下文 ID
   * @returns Promise<boolean>
   */
  exists(id: string): Promise<boolean>

  /**
   * 查询上下文
   * @param query - 查询条件
   * @returns Promise<QueryResult>
   */
  query(query: ContextQuery): Promise<QueryResult>

  /**
   * 获取所有上下文
   * @returns Promise<Context[]>
   */
  getAll(): Promise<Context[]>

  /**
   * 获取上下文数量
   * @returns Promise<number>
   */
  count(): Promise<number>

  /**
   * 清空存储
   * @returns Promise<void>
   */
  clear(): Promise<void>

  /**
   * 获取存储统计信息
   * @returns Promise<StoreStats>
   */
  getStats(): Promise<StoreStats>

  /**
   * 获取上下文统计信息
   * @returns Promise<ContextStats>
   */
  getContextStats(): Promise<ContextStats>

  /**
   * 持久化存储
   * @returns Promise<void>
   */
  persist(): Promise<void>

  /**
   * 从持久化存储加载
   * @returns Promise<void>
   */
  load(): Promise<void>

  /**
   * 清理存储
   * @returns Promise<void>
   */
  cleanup(): Promise<void>
}

/**
 * 内存上下文存储实现
 * 使用内存存储上下文，支持缓存和持久化
 */
export class MemoryContextStore implements ContextStore {
  private contexts: Map<string, Context> = new Map()
  private cache: Map<string, { context: Context; expiry: number }> = new Map()
  private options: StoreOptions
  private persistenceTimer?: NodeJS.Timeout
  private cacheHits: number = 0
  private cacheMisses: number = 0
  private lastPersistenceTime: number = 0

  constructor(options: StoreOptions = {}) {
    this.options = {
      maxContexts: 1000,
      enableCache: true,
      maxCacheSize: 100,
      cacheTTL: 60000, // 1 分钟
      enablePersistence: false,
      persistenceInterval: 30000, // 30 秒
      enableCompression: false,
      ...options,
    }
  }

  async initialize(): Promise<void> {
    // 如果启用了持久化，从持久化存储加载
    if (this.options.enablePersistence) {
      await this.load()
    }

    // 启动持久化定时器
    if (this.options.enablePersistence && this.options.persistenceInterval) {
      this.persistenceTimer = setInterval(() => {
        this.persist().catch((error) => {
          console.error('Persistence error:', error)
        })
      }, this.options.persistenceInterval)
    }
  }

  async add(context: Context): Promise<void> {
    // 检查是否超过最大上下文数量
    if (this.options.maxContexts && this.contexts.size >= this.options.maxContexts) {
      throw new Error(`Maximum number of contexts (${this.options.maxContexts}) reached`)
    }

    this.contexts.set(context.getId(), context)

    // 如果启用了缓存，添加到缓存
    if (this.options.enableCache) {
      this.addToCache(context)
    }
  }

  async get(id: string): Promise<Context | undefined> {
    // 首先尝试从缓存获取
    if (this.options.enableCache) {
      const cached = this.getFromCache(id)
      if (cached) {
        this.cacheHits++
        return cached
      }
      this.cacheMisses++
    }

    // 从存储获取
    const context = this.contexts.get(id)

    // 如果启用了缓存，添加到缓存
    if (context && this.options.enableCache) {
      this.addToCache(context)
    }

    return context
  }

  async update(context: Context): Promise<void> {
    if (!this.contexts.has(context.getId())) {
      throw new Error(`Context with id ${context.getId()} not found`)
    }

    this.contexts.set(context.getId(), context)

    // 更新缓存
    if (this.options.enableCache) {
      this.addToCache(context)
    }
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.contexts.delete(id)

    // 从缓存删除
    if (this.options.enableCache) {
      this.cache.delete(id)
    }

    return deleted
  }

  async exists(id: string): Promise<boolean> {
    return this.contexts.has(id)
  }

  async query(query: ContextQuery): Promise<QueryResult> {
    const startTime = Date.now()
    const results: Context[] = []

    for (const context of this.contexts.values()) {
      if (this.matchesQuery(context, query)) {
        results.push(context)
      }
    }

    const duration = Date.now() - startTime

    return {
      contexts: results,
      total: results.length,
      duration,
    }
  }

  async getAll(): Promise<Context[]> {
    return Array.from(this.contexts.values())
  }

  async count(): Promise<number> {
    return this.contexts.size
  }

  async clear(): Promise<void> {
    this.contexts.clear()
    this.cache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  async getStats(): Promise<StoreStats> {
    const totalRequests = this.cacheHits + this.cacheMisses
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0

    return {
      totalContexts: this.contexts.size,
      cacheHitRate,
      cacheSize: this.cache.size,
      persistenceEnabled: this.options.enablePersistence || false,
      lastPersistenceTime: this.lastPersistenceTime || undefined,
      storageSize: this.calculateStorageSize(),
    }
  }

  async getContextStats(): Promise<ContextStats> {
    const contexts = Array.from(this.contexts.values())

    return {
      totalContexts: contexts.length,
      activeContexts: contexts.filter((c) => c.getState() === 'active').length,
      pausedContexts: contexts.filter((c) => c.getState() === 'paused').length,
      destroyedContexts: contexts.filter((c) => c.getState() === 'destroyed').length,
      expiredContexts: contexts.filter((c) => c.isExpired()).length,
      persistentContexts: contexts.filter((c) => c.isPersistent()).length,
      totalDataSize: this.calculateTotalDataSize(contexts),
      averageDataSize: this.calculateAverageDataSize(contexts),
    }
  }

  async persist(): Promise<void> {
    if (!this.options.enablePersistence || !this.options.persistencePath) {
      return
    }

    try {
      const data = Array.from(this.contexts.values()).map((context) => ({
        id: context.getId(),
        serialized: context.serialize(),
      }))

      // 这里应该实现实际的持久化逻辑
      // 例如写入文件系统或数据库
      this.lastPersistenceTime = Date.now()
    } catch (error) {
      console.error('Persistence error:', error)
      throw error
    }
  }

  async load(): Promise<void> {
    if (!this.options.enablePersistence || !this.options.persistencePath) {
      return
    }

    try {
      // 这里应该实现实际的加载逻辑
      // 例如从文件系统或数据库读取
    } catch (error) {
      console.error('Load error:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    // 清理持久化定时器
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer)
      this.persistenceTimer = undefined
    }

    // 清理过期的缓存
    this.cleanupExpiredCache()

    // 清理过期的上下文
    this.cleanupExpiredContexts()
  }

  /**
   * 添加到缓存
   */
  private addToCache(context: Context): void {
    if (!this.options.enableCache || !this.options.maxCacheSize) {
      return
    }

    // 如果缓存已满，删除最最旧的条目
    if (this.cache.size >= this.options.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const expiry = Date.now() + (this.options.cacheTTL || 60000)
    this.cache.set(context.getId(), { context, expiry })
  }

  /**
   * 从缓存获取
   */
  private getFromCache(id: string): Context | undefined {
    const cached = this.cache.get(id)
    if (!cached) {
      return undefined
    }

    // 检查是否过期
    if (Date.now() > cached.expiry) {
      this.cache.delete(id)
      return undefined
    }

    return cached.context
  }

  /**
   * 清理过期的缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now()
    for (const [id, cached] of this.cache.entries()) {
      if (now > cached.expiry) {
        this.cache.delete(id)
      }
    }
  }

  /**
   * 清理过期的上下文
   */
  private cleanupExpiredContexts(): void {
    for (const [id, context] of this.contexts.entries()) {
      if (context.isExpired()) {
        this.contexts.delete(id)
      }
    }
  }

  /**
   * 检查上下文是否匹配查询条件
   */
  private matchesQuery(context: Context, query: ContextQuery): boolean {
    // 检查 ID
    if (query.id && context.getId() !== query.id) {
      return false
    }

    // 检查名称（支持模糊匹配）
    if (query.name && !context.getName().includes(query.name)) {
      return false
    }

    // 检查作用域
    if (query.scope && context.getScope() !== query.scope) {
      return false
    }

    // 检查状态
    if (query.state && context.getState() !== query.state) {
      return false
    }

    // 检查是否持久化
    if (query.persistent !== undefined && context.isPersistent() !== query.persistent) {
      return false
    }

    // 检查是否过期
    if (query.expired !== undefined && context.isExpired() !== query.expired) {
      return false
    }

    // 检查数据
    if (query.data) {
      const data = context.getData()
      for (const [key, value] of Object.entries(query.data)) {
        if (data[key] !== value) {
          return false
        }
      }
    }

    return true
  }

  /**
   * 计算存储大小
   */
  private calculateStorageSize(): number {
    let size = 0
    for (const context of this.contexts.values()) {
      size += context.serialize().length
    }
    return size
  }

  /**
   * 计算总数据大小
   */
  private calculateTotalDataSize(contexts: Context[]): number {
    let size = 0
    for (const context of contexts) {
      size += JSON.stringify(context.getData()).length
    }
    return size
  }

  /**
   * 计算平均数据大小
   */
  private calculateAverageDataSize(contexts: Context[]): number {
    if (contexts.length === 0) {
      return 0
    }
    return this.calculateTotalDataSize(contexts) / contexts.length
  }
}
