/**
 * 上下文管理器
 * 
 * 这是上下文管理系统的核心类，负责：
 * - 上下文的创建和销毁
 * - 上下文的查找和获取
 * - 上下文的继承和合并
 * - 上下文的生命周期管理
 * - 上下文作用域管理
 * - 上下文中间件管理
 */

import type { Context, ContextOptions, ContextState, ContextEvent, ContextEventListener, ContextQuery, ContextStats } from './Context'
import type { ContextStore, StoreOptions } from './ContextStore'
import type { ScopeManager, ScopeOptions, ScopeType } from './ContextScope'
import type { MiddlewareManager, MiddlewareChain, ContextManager as MiddlewareContextManager } from './ContextMiddleware'
import { MemoryContextStore } from './ContextStore'
import { DefaultScopeManager } from './ContextScope'
import { DefaultMiddlewareManager, DefaultMiddlewareChain } from './ContextMiddleware'

/**
 * 上下文管理器配置选项
 */
export interface ContextManagerOptions {
  /** 存储配置选项 */
  storeOptions?: StoreOptions
  /** 是否启用中间件 */
  enableMiddleware?: boolean
  /** 是否启用作用域 */
  enableScope?: boolean
  /** 默认作用域类型 */
  defaultScopeType?: ScopeType
  /** 上下文清理间隔（毫秒） */
  cleanupInterval?: number
  /** 是否启用自动清理 */
  enableAutoCleanup?: boolean
}

/**
 * 上下文管理器接口
 */
export interface ContextManagerInterface {
  /**
   * 初始化上下文管理器
   * @returns Promise<void>
   */
  initialize(): Promise<void>

  /**
   * 创建上下文
   * @param options - 上下文配置选项
   * @returns Promise<Context>
   */
  createContext(options: ContextOptions): Promise<Context>

  /**
   * 获取上下文
   * @param id - 上下文 ID
   * @returns Promise<Context | undefined>
   */
  getContext(id: string): Promise<Context | undefined>

  /**
   * 更新上下文
   * @param context - 要更新的上下文
   * @returns Promise<void>
   */
  updateContext(context: Context): Promise<void>

  /**
   * 删除上下文
   * @param id - 上下文 ID
   * @returns Promise<boolean>
   */
  deleteContext(id: string): Promise<boolean>

  /**
   * 检查上下文是否存在
   * @param id - 上下文 ID
   * @returns Promise<boolean>
   */
  contextExists(id: string): Promise<boolean>

  /**
   * 查询上下文
   * @param query - 查询条件
   * @returns Promise<Context[]>
   */
  queryContexts(query: ContextQuery): Promise<Context[]>

  /**
   * 获取所有上下文
   * @returns Promise<Context[]>
   */
  getAllContexts(): Promise<Context[]>

  /**
   * 获取上下文数量
   * @returns Promise<number>
   */
  getContextCount(): Promise<number>

  /**
   * 合并上下文
   * @param targetId - 目标上下文 ID
   * @param sourceId - 源上下文 ID
   * @returns Promise<void>
   */
  mergeContexts(targetId: string, sourceId: string): Promise<void>

  /**
   * 克隆上下文
   * @param id - 上下文 ID
   * @param newName - 新上下文名称
   * @returns Promise<Context>
   */
  cloneContext(id: string, newName: string): Promise<Context>

  /**
   * 激活上下文
   * @param id - 上下文 ID
   * @returns Promise<void>
   */
  activateContext(id: string): Promise<void>

  /**
   * 暂停上下文
   * @param id - 上下文 ID
   * @returns Promise<void>
   */
  pauseContext(id: string): Promise<void>

  /**
   * 销毁上下文
   * @param id - 上下文 ID
   * @returns Promise<void>
   */
  destroyContext(id: string): Promise<void>

  /**
   * 注册事件监听器
   * @param eventType - 事件类型
   * @param listener - 事件监听器
   * @returns void
   */
  on(eventType: string, listener: ContextEventListener): void

  /**
   * 移除事件监听器
   * @param eventType - 事件类型
   * @param listener - 事件监听器
   * @returns void
   */
  off(eventType: string, listener: ContextEventListener): void

  /**
   * 获取上下文统计信息
   * @returns Promise<ContextStats>
   */
  getStats(): Promise<ContextStats>

  /**
   * 清空所有上下文
   * @returns Promise<void>
   */
  clear(): Promise<void>

  /**
   * 清理上下文管理器
   * @returns Promise<void>
   */
  cleanup(): Promise<void>

  /**
   * 获取存储
   * @returns ContextStore
   */
  getStore(): ContextStore

  /**
   * 获取作用域管理器
   * @returns ScopeManager | undefined
   */
  getScopeManager(): ScopeManager | undefined

  /**
   * 获取中间件管理器
   * @returns MiddlewareManager | undefined
   */
  getMiddlewareManager(): MiddlewareManager | undefined
}

/**
 * 默认上下文实现
 */
class DefaultContext implements Context {
  private metadata: {
    id: string
    name: string
    description?: string
    createdAt: number
    updatedAt: number
    createdBy?: string
    tags?: string[]
    customProperties?: Record<string, any>
  }
  private data: Map<string, any> = new Map()
  private state: ContextState = ContextState.CREATED
  private parentId?: string
  private scope?: string
  private persistent: boolean = false
  private expiryTime?: number
  private eventListeners: Map<string, Set<ContextEventListener>> = new Map()

  constructor(options: ContextOptions) {
    this.metadata = {
      id: options.id || this.generateId(),
      name: options.name,
      description: options.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: options.tags,
      customProperties: options.customProperties,
    }

    this.parentId = options.parentId
    this.scope = options.scope
    this.persistent = options.persistent ?? false

    // 设置过期时间
    if (options.ttl) {
      this.expiryTime = Date.now() + options.ttl
    }

    // 初始化数据
    if (options.data) {
      for (const [key, value] of Object.entries(options.data)) {
        this.data.set(key, value)
      }
    }

    // 触发创建事件
    this.emit({
      type: 'context_created' as any,
      contextId: this.metadata.id,
      timestamp: Date.now(),
    })
  }

  getId(): string {
    return this.metadata.id
  }

  getName(): string {
    return this.metadata.name
  }

  getDescription(): string | undefined {
    return this.metadata.description
  }

  getMetadata(): any {
    return {
      id: this.metadata.id,
      name: this.metadata.name,
      description: this.metadata.description,
      createdAt: this.metadata.createdAt,
      updatedAt: this.metadata.updatedAt,
      createdBy: this.metadata.createdBy,
      tags: this.metadata.tags,
      customProperties: this.metadata.customProperties,
    }
  }

  getState(): ContextState {
    return this.state
  }

  getData(): Record<string, any> {
    return Object.fromEntries(this.data)
  }

  get<T = any>(key: string): T | undefined {
    return this.data.get(key)
  }

  set<T = any>(key: string, value: T): void {
    this.data.set(key, value)
    this.metadata.updatedAt = Date.now()

    // 触发数据设置事件
    this.emit({
      type: 'context_data_set' as any,
      contextId: this.metadata.id,
      data: { key, value },
      timestamp: Date.now(),
    })
  }

  delete(key: string): void {
    this.data.delete(key)
    this.metadata.updatedAt = Date.now()

    // 触发数据删除事件
    this.emit({
      type: 'context_data_deleted' as any,
      contextId: this.metadata.id,
      data: { key },
      timestamp: Date.now(),
    })
  }

  has(key: string): boolean {
    return this.data.has(key)
  }

  keys(): string[] {
    return Array.from(this.data.keys())
  }

  values(): any[] {
    return Array.from(this.data.values())
  }

  entries(): [string, any][] {
    return Array.from(this.data.entries())
  }

  update(data: Partial<Record<string, any>>): void {
    for (const [key, value] of Object.entries(data)) {
      this.data.set(key, value)
    }
    this.metadata.updatedAt = Date.now()

    // 触发数据更新事件
    this.emit({
      type: 'context_data_updated' as any,
      contextId: this.metadata.id,
      data,
      timestamp: Date.now(),
    })
  }

  merge(other: Context): void {
    for (const [key, value] of other.entries()) {
      this.data.set(key, value)
    }
    this.metadata.updatedAt = Date.now()

    // 触发合并事件
    this.emit({
      type: 'context_merged' as any,
      contextId: this.metadata.id,
      data: { sourceId: other.getId() },
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.data.clear()
    this.metadata.updatedAt = Date.now()
  }

  getParentId(): string | undefined {
    return this.parentId
  }

  getScope(): string | undefined {
    return this.scope
  }

  isPersistent(): boolean {
    return this.persistent
  }

  isExpired(): boolean {
    if (!this.expiryTime) {
      return false
    }
    return Date.now() > this.expiryTime
  }

  getExpiryTime(): number | undefined {
    return this.expiryTime
  }

  setExpiryTime(ttl: number): void {
    this.expiryTime = Date.now() + ttl
  }

  activate(): void {
    this.state = ContextState.ACTIVE

    // 触发激活事件
    this.emit({
      type: 'context_activated' as any,
      contextId: this.metadata.id,
      timestamp: Date.now(),
    })
  }

  pause(): void {
    this.state = ContextState.PAUSED

    // 触发暂停事件
    this.emit({
      type: 'context_paused' as any,
      contextId: this.metadata.id,
      timestamp: Date.now(),
    })
  }

  destroy(): void {
    this.state = ContextState.DESTROYED

    // 触发销毁事件
    this.emit({
      type: 'context_destroyed' as any,
      contextId: this.metadata.id,
      timestamp: Date.now(),
    })
  }

  clone(): Context {
    const cloned = new DefaultContext({
      id: undefined,
      name: `${this.metadata.name}_clone`,
      description: this.metadata.description,
      data: this.getData(),
      parentId: this.parentId,
      scope: this.scope,
      tags: this.metadata.tags,
      persistent: this.persistent,
      customProperties: this.metadata.customProperties,
    })

    return cloned
  }

  serialize(): string {
    const data = {
      metadata: this.metadata,
      data: Object.fromEntries(this.data),
      state: this.state,
      parentId: this.parentId,
      scope: this.scope,
      persistent: this.persistent,
      expiryTime: this.expiryTime,
    }
    return JSON.stringify(data)
  }

  static deserialize(serialized: string): Context {
    const data = JSON.parse(serialized)
    const context = new DefaultContext({
      id: data.metadata.id,
      name: data.metadata.name,
      description: data.metadata.description,
      data: data.data,
      parentId: data.parentId,
      scope: data.scope,
      tags: data.metadata.tags,
      persistent: data.persistent,
      customProperties: data.metadata.customProperties,
    })

    context.metadata = data.metadata
    context.state = data.state
    context.expiryTime = data.expiryTime

    return context
  }

  on(eventType: string, listener: ContextEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  off(eventType: string, listener: ContextEventListener): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private emit(event: ContextEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach(listener => listener(event))
    }
  }

  private generateId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * 默认上下文管理器实现
 */
export class DefaultContextManager implements ContextManagerInterface {
  private store: ContextStore
  private scopeManager?: ScopeManager
  private middlewareManager?: MiddlewareManager
  private options: ContextManagerOptions
  private eventListeners: Map<string, Set<ContextEventListener>> = new Map()
  private cleanupTimer?: NodeJS.Timeout

  constructor(options: ContextManagerOptions = {}) {
    this.options = {
      enableMiddleware: true,
      enableScope: true,
      defaultScopeType: 'global' as any,
      cleanupInterval: 60000, // 1 分钟
      enableAutoCleanup: true,
      ...options,
    }

    // 创建存储
    this.store = new MemoryContextStore(this.options.storeOptions)

    // 创建作用域管理器
    if (this.options.enableScope) {
      this.scopeManager = new DefaultScopeManager()
    }

    // 创建中间件管理器
    if (this.options.enableMiddleware) {
      this.middlewareManager = new DefaultMiddlewareManager()
    }
  }

  async initialize(): Promise<void> {
    // 初始化存储
    await this.store.initialize()

    // 初始化作用域管理器
    if (this.scopeManager) {
      await this.scopeManager.initialize()
    }

    // 初始化中间件管理器
    if (this.middlewareManager) {
      await this.middlewareManager.initialize()
    }

    // 启动自动清理定时器
    if (this.options.enableAutoCleanup && this.options.cleanupInterval) {
      this.cleanupTimer = setInterval(() => {
        this.performCleanup().catch(error => {
          console.error('Auto cleanup error:', error)
        })
      }, this.options.cleanupInterval)
    }
  }

  async createContext(options: ContextOptions): Promise<Context> {
    // 如果没有指定作用域，使用默认作用域
    if (!options.scope && this.options.defaultScopeType) {
      options.scope = this.options.defaultScopeType
    }

    // 创建上下文
    const context = new DefaultContext(options)

    // 添加到存储
    await this.store.add(context)

    // 执行中间件链
    if (this.middlewareManager) {
      const chain = this.middlewareManager.createChain(['logging', 'validation', 'caching'])
      await this.middlewareManager.executeChain(chain, context)
    }

    return context
  }

  async getContext(id: string): Promise<Context | undefined> {
    return this.store.get(id)
  }

  async updateContext(context: Context): Promise<void> {
    await this.store.update(context)
  }

  async deleteContext(id: string): Promise<boolean> {
    return this.store.delete(id)
  }

  async contextExists(id: string): Promise<boolean> {
    return this.store.exists(id)
  }

  async queryContexts(query: ContextQuery): Promise<Context[]> {
    const result = await this.store.query(query)
    return result.contexts
  }

  async getAllContexts(): Promise<Context[]> {
    return this.store.getAll()
  }

  async getContextCount(): Promise<number> {
    return this.store.count()
  }

  async mergeContexts(targetId: string, sourceId: string): Promise<void> {
    const target = await this.getContext(targetId)
    const source = await this.getContext(sourceId)

    if (!target) {
      throw new Error(`Target context with id ${targetId} not found`)
    }

    if (!source) {
      throw new Error(`Source context with id ${sourceId} not found`)
    }

    // 合并数据
    target.merge(source)

    // 更新目标上下文
    await this.updateContext(target)
  }

  async cloneContext(id: string, newName: string): Promise<Context> {
    const original = await this.getContext(id)

    if (!original) {
      throw new Error(`Context with id ${id} not found`)
    }

    // 克隆上下文
    const cloned = original.clone()

    // 设置新名称
    cloned.set('name', newName)

    // 添加到存储
    await this.store.add(cloned)

    return cloned
  }

  async activateContext(id: string): Promise<void> {
    const context = await this.getContext(id)

    if (!context) {
      throw new Error(`Context with id ${id} not found`)
    }

    context.activate()
    await this.updateContext(context)
  }

  async pauseContext(id: string): Promise<void> {
    const context = await this.getContext(id)

    if (!context) {
      throw new Error(`Context with id ${id} not found`)
    }

    context.pause()
    await this.updateContext(context)
  }

  async destroyContext(id: string): Promise<void> {
    const context = await this.getContext(id)

    if (!context) {
      throw new Error(`Context with id ${id} not found`)
    }

    context.destroy()
    await this.deleteContext(id)
  }

  on(eventType: string, listener: ContextEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  off(eventType: string, listener: ContextEventListener): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  async getStats(): Promise<ContextStats> {
    return this.store.getContextStats()
  }

  async clear(): Promise<void> {
    await this.store.clear()
  }

  async cleanup(): Promise<void> {
    // 清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }

    // 清理存储
    await this.store.cleanup()

    // 清理作用域管理器
    if (this.scopeManager) {
      await this.scopeManager.cleanup()
    }

    // 清理中间件管理器
    if (this.middlewareManager) {
      await this.middlewareManager.cleanup()
    }
  }

  getStore(): ContextStore {
    return this.store
  }

  getScopeManager(): ScopeManager | undefined {
    return this.scopeManager
  }

  getMiddlewareManager(): MiddlewareManager | undefined {
    return this.middlewareManager
  }

  /**
   * 执行清理操作
   */
  private async performCleanup(): Promise<void> {
    // 清理过期的上下文
    const allContexts = await this.getAllContexts()
    for (const context of allContexts) {
      if (context.isExpired()) {
        await this.destroyContext(context.getId())
      }
    }
  }
}

// 导出类型别名
export type ContextManager = ContextManagerInterface
