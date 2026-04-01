/**
 * 上下文数据类型
 * 定义上下文中可以存储的数据类型
 */
export type ContextData = Record<string, any>

/**
 * 上下文元数据类型
 * 定义上下文的元信息
 */
export interface ContextMetadata {
  /** 上下文的唯一标识符 */
  id: string
  /** 上下文的名称 */
  name: string
  /** 上下文的描述 */
  description?: string
  /** 上下文的创建时间 */
  createdAt: number
  /** 上下文的更新时间 */
  updatedAt: number
  /** 上下文的创建者 */
  createdBy?: string
  /** 上下文的标签 */
  tags?: string[]
  /** 上下文的自定义属性 */
  customProperties?: Record<string, any>
}

/**
 * 上下文选项类型
 * 定义创建上下文时的配置选项
 */
export interface ContextOptions {
  /** 上下文的唯一标识符（如果不提供，将自动生成） */
  id?: string
  /** 上下文的名称 */
  name: string
  /** 上下文的描述 */
  description?: string
  /** 上下文的初始数据 */
  data?: ContextData
  /** 上下文的父上下文 ID（用于继承） */
  parentId?: string
  /** 上下文的作用域 */
  scope?: string
  /** 上下文的标签 */
  tags?: string[]
  /** 上下文是否持久化 */
  persistent?: boolean
  /** 上下文的过期时间（毫秒） */
  ttl?: number
  /** 上下文的自定义属性 */
  customProperties?: Record<string, any>
}

/**
 * 上下文状态枚举
 * 定义上下文的生命周期状态
 */
export enum ContextState {
  /** 上下文已创建 */
  CREATED = 'created',
  /** 上下文已激活 */
  ACTIVE = 'active',
  /** 上下文已暂停 */
  PAUSED = 'paused',
  /** 上下文已销毁 */
  DESTROYED = 'destroyed',
  /** 上下文已过期 */
  EXPIRED = 'expired',
}

/**
 * 上下文接口
类型定义上下文的核心接口
 */
export interface Context {
  /** 获取上下文的唯一标识符 */
  getId(): string

  /** 获取上下文的名称 */
  getName(): string

  /** 获取上下文的描述 */
  getDescription(): string | undefined

  /** 获取上下文的元数据 */
  getMetadata(): ContextMetadata

  /** 获取上下文的状态 */
  getState(): ContextState

  /** 获取上下文的数据 */
  getData(): ContextData

  /** 获取上下文中的指定键的值 */
  get<T = any>(key: string): T | undefined

  /** 设置上下文中的指定键的值 */
  set<T = any>(key: string, value: T): void

  /** 删除上下文中的指定键 */
  delete(key: string): void

  /** 检查上下文中是否存在指定键 */
  has(key: string): boolean

  /** 获取上下文的所有键 */
  keys(): string[]

  /** 获取上下文的所有值 */
  values(): any[]

  /** 获取上下文的所有键值对 */
  entries(): [string, any][]

  /** 更新上下文的数据 */
  update(data: Partial<ContextData>): void

  /** 合并其他上下文的数据 */
  merge(other: Context): void

  /** 清空上下文的数据 */
  clear(): void

  /** 获取上下文的父上下文 ID */
  getParentId(): string | undefined

  /** 获取上下文的作用域 */
  getScope(): string | undefined

  /** 检查上下文是否持久化 */
  isPersistent(): boolean

  /** 检查上下文是否已过期 */
  isExpired(): boolean

  /** 获取上下文的过期时间 */
  getExpiryTime(): number | undefined

  /** 设置上下文的过期时间 */
  setExpiryTime(ttl: number): void

  /** 激活上下文 */
  activate(): void

  /** 暂停上下文 */
  pause(): void

  /** 销毁上下文 */
  destroy(): void

  /** 克隆上下文 */
  clone(): Context

  /** 序列化上下文 */
  serialize(): string

  /** 反序列化上下文 */
  static deserialize(serialized: string): Context
}

/**
 * 上下文事件类型
 * 定义上下文可以触发的事件类型
 */
export enum ContextEventType {
  /** 上下文创建事件 */
  CREATED = 'context_created',
  /** 上下文激活事件 */
  ACTIVATED = 'context_activated',
  /** 上下文暂停事件 */
  PAUSED = 'context_paused',
  /** 上下文销毁事件 */
  DESTROYED = 'context_destroyed',
  /** 上下文数据更新事件 */
  DATA_UPDATED = 'context_data_updated',
  /** 上下文数据设置事件 */
  DATA_SET = 'context_data_set',
  /** 上下文数据删除事件 */
  DATA_DELETED = 'context_data_deleted',
  /** 上下文过期事件 */
  EXPIRED = 'context_expired',
  /** 上下文合并事件 */
  MERGED = 'context_merged',
}

/**
 * 上下文事件接口
 * 定义上下文事件的格式
 */
export interface ContextEvent {
  /** 事件类型 */
  type: ContextEventType
  /** 上下文 ID */
  contextId: string
  /** 事件数据 */
  data?: any
  /** 事件时间戳 */
  timestamp: number
}

/**
 * 上下文事件监听器类型
 */
export type ContextEventListener = (event: ContextEvent) => void

/**
 * 上下文查询条件接口
 * 定义查询上下文时的条件
 */
export interface ContextQuery {
  /** 上下文 ID */
  id?: string
  /** 上下文名称（支持模糊匹配） */
  name?: string
  /** 上下文作用域 */
  scope?: string
  /** 上下文状态 */
  state?: ContextState
  /** 上下文标签 */
  tags?: string[]
  /** 上下文创建者 */
  createdBy?: string
  /** 上下文是否持久化 */
  persistent?: boolean
  /** 上下文是否已过期 */
  expired?: boolean
  /** 自定义属性查询条件 */
  customProperties?: Record<string, any>
  /** 数据查询条件 */
  data?: Record<string, any>
}

/**
 * 上下文统计信息接口
 * 定义上下文的统计信息
 */
export interface ContextStats {
  /** 上下文总数 */
  totalContexts: number
  /** 活跃的上下文数量 */
  activeContexts: number
  /** 暂停的上下文数量 */
  pausedContexts: number
  /** 已销毁的上下文数量 */
  destroyedContexts: number
  /** 已过期的上下文数量 */
  expiredContexts: number
  /** 持久化的上下文数量 */
  persistentContexts: number
  /** 上下文数据总大小（字节） */
  totalDataSize: number
  /** 平均上下文数据大小（字节） */
  averageDataSize: number
}
