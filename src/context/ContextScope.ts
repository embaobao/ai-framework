/**
 * 上下文作用域类型
 * 定义不同类型的作用域
 */
export enum ScopeType {
  /** 全局作用域 */
  GLOBAL = 'global',
  /** 会话作用域 */
  SESSION = 'session',
  /** 请求作用域 */
  REQUEST = 'request',
  /** 用户作用域 */
  USER = 'user',
  /** 应用作用域 */
  APPLICATION = 'application',
  /** 组件作用域 */
  COMPONENT = 'component',
  /** 自定义作用域 */
  CUSTOM = 'custom',
}

/**
 * 作用域配置选项
 */
export interface ScopeOptions {
  /** 作用域类型 */
  type: ScopeType
  /** 作用域名称 */
  name: string
  /** 作用域描述 */
  description?: string
  /** 父作用域 ID */
  parentId?: string
  /** 作用域是否隔离 */
  isolated?: boolean
  /** 作用域是否可继承 */
  inheritable?: boolean
  /** 作用域优先级（数字越大优先级越高） */
  priority?: number
  /** 作用域的自定义属性 */
  customProperties?: Record<string, any>
}

/**
 * 作用域元数据
 */
export interface ScopeMetadata {
  /** 作用域 ID */
  id: string
  /** 作用域类型 */
  type: ScopeType
  /** 作用域名称 */
  name: string
  /** 作用域描述 */
  description?: string
  /** 父作用域 ID */
  parentId?: string
  /** 子作用域 ID 列表 */
  childIds: string[]
  /** 作用域是否隔离 */
  isolated: boolean
  /** 作用域是否可继承 */
  inheritable: boolean
  /** 作用域优先级 */
  priority: number
  /** 作用域创建时间 */
  createdAt: number
  /** 作用域更新时间 */
  updatedAt: number
  /** 作用域的自定义属性 */
  customProperties?: Record<string, any>
}

/**
 * 作用域接口
 * 定义作用域的核心接口
 */
export interface ContextScope {
  /** 获取作用域 ID */
  getId(): string

  /** 获取作用域类型 */
  getType(): ScopeType

  /** 获取作用域名称 */
  getName(): string

  /** 获取作用域描述 */
  getDescription(): string | undefined

  /** 获取作用域元数据 */
  getMetadata(): ScopeMetadata

  /** 获取父作用域 ID */
  getParentId(): string | undefined

  /** 获取子作用域 ID 列表 */
  getChildIds(): string[]

  /** 添加子作用域 */
  addChild(childId: string): void

  /** 移除子作用域 */
  removeChild(childId: string): void

  /** 检查是否包含子作用域 */
  hasChild(childId: string): boolean

  /** 检查是否隔离 */
  isIsolated(): boolean

  /** 检查是否可继承 */
  isInheritable(): boolean

  /** 获取优先级 */
  getPriority(): number

  /** 设置优先级 */
  setPriority(priority: number): void

  /** 获取自定义属性 */
  getCustomProperty<T = any>(key: string): T | undefined

  /** 设置自定义属性 */
  setCustomProperty<T = any>(key: string, value: T): void

  /** 删除自定义属性 */
  deleteCustomProperty(key: string): void

  /** 检查是否为全局作用域 */
  isGlobal(): boolean

  /** 检查是否为根作用域 */
  isRoot(): boolean

  /** 检查是否为指定作用域的后代 */
  isDescendantOf(scopeId: string): boolean

  /** 检查是否为指定作用域的祖先 */
  isAncestorOf(scopeId: string): boolean

  /** 克隆作用域 */
  clone(): ContextScope

  /** 序列化作用域 */
  serialize(): string

  /** 反序列化作用域 */
  static deserialize(serialized: string): ContextScope
}

/**
 * 作用域管理器接口
 * 定义作用域管理器的核心接口
 */
export interface ScopeManager {
  /**
   * 初始化作用域管理器
   */
  initialize(): Promise<void>

  /**
   * 创建作用域
   * @param options - 作用域配置选项
   * @returns Promise<ContextScope>
   */
  createScope(options: ScopeOptions): Promise<ContextScope>

  /**
   * 获取作用域
   * @param id - 作用域 ID
   * @returns Promise<ContextScope | undefined>
   */
  getScope(id: string): Promise<ContextScope | undefined>

  /**
   * 更新作用域
   * @param scope - 要更新的作用域
   * @returns Promise<void>
   */
  updateScope(scope: ContextScope): Promise<void>

  /**
   * 删除作用域
   * @param id - 作用域 ID
   * @returns Promise<boolean>
   */
  deleteScope(id: string): Promise<boolean>

  /**
   * 检查作用域是否存在
   * @param id - 作用域 ID
   * @returns Promise<boolean>
   */
  scopeExists(id: string): Promise<boolean>

  /**
   * 获取所有作用域
   * @returns Promise<ContextScope[]>
   */
  getAllScopes(): Promise<ContextScope[]>

  /**
   * 获取指定类型的所有作用域
   * @param type - 作用域类型
   * @returns Promise<ContextScope[]>
   */
  getScopesByType(type: ScopeType): Promise<ContextScope[]>

  /**
   * 获取子作用域
   * @param parentId - 父作用域 ID
   * @returns Promise<ContextScope[]>
   */
  getChildScopes(parentId: string): Promise<ContextScope[]>

  /**
   * 获取作用域路径
   * @param id - 作用域 ID
   * @returns Promise<string[]> - 作用域 ID 路径
   */
  getScopePath(id: string): Promise<string[]>

  /**
   * 查找最近的公共祖先作用域
   * @param id1 - 第一个作用域 ID
   * @param id2 - 第二个作用域 ID
   * @returns Promise<ContextScope | undefined>
   */
  findCommonAncestor(id1: string, id2: string): Promise<ContextScope | undefined>

  /**
   * 检查作用域是否在另一个作用域的作用域链中
   * @param childId - 子作用域 ID
   * @param parentId - 父作用域 ID
   * @returns Promise<boolean>
   */
  isInScopeChain(childId: string, parentId: string): Promise<boolean>

  /**
   * 清空所有作用域
   * @returns Promise<void>
   */
  clear(): Promise<void>

  /**
   * 清理作用域管理器
   * @returns Promise<void>
   */
  cleanup(): Promise<void>
}

/**
 * 作用域管理器实现
 * 提供作用域的创建、查询、管理等功能
 */
export class DefaultScopeManager implements ScopeManager {
  private scopes: Map<string, ContextScope> = new Map()
  private globalScopeId: string = ''

  async initialize(): Promise<void> {
    // 创建全局作用域
    const globalScope = await this.createScope({
      type: ScopeType.GLOBAL,
      name: 'global',
      description: '全局作用域',
      isolated: false,
      inheritable: true,
      priority: 0,
    })
    this.globalScopeId = globalScope.getId()
  }

  async createScope(options: ScopeOptions): Promise<ContextScope> {
    const scope = new DefaultContextScope(options)
    this.scopes.set(scope.getId(), scope)

    // 如果有父作用域，将当前作用域添加到父作用域的子作用域列表
    if (options.parentId) {
      const parentScope = await this.getScope(options.parentId)
      if (parentScope) {
        parentScope.addChild(scope.getId())
      }
    }

    return scope
  }

  async getScope(id: string): Promise<ContextScope | undefined> {
    return this.scopes.get(id)
  }

  async updateScope(scope: ContextScope): Promise<void> {
    if (!this.scopes.has(scope.getId())) {
      throw new Error(`Scope with id ${scope.getId()} not found`)
    }
    this.scopes.set(scope.getId(), scope)
  }

  async deleteScope(id: string): Promise<boolean> {
    const scope = this.scopes.get(id)
    if (!scope) {
      return false
    }

    // 不能删除全局作用域
    if (scope.isGlobal()) {
      throw new Error('Cannot delete global scope')
    }

    // 从父作用域的子作用域列表中移除
    const parentId = scope.getParentId()
    if (parentId) {
      const parentScope = this.scopes.get(parentId)
      if (parentScope) {
        parentScope.removeChild(id)
      }
    }

    // 递归删除所有子作用域
    const childIds = scope.getChildIds()
    for (const childId of childIds) {
      await this.deleteScope(childId)
    }

    return this.scopes.delete(id)
  }

  async scopeExists(id: string): Promise<boolean> {
    return this.scopes.has(id)
  }

  async getAllScopes(): Promise<ContextScope[]> {
    return Array.from(this.scopes.values())
  }

  async getScopesByType(type: ScopeType): Promise<ContextScope[]> {
    return Array.from(this.scopes.values()).filter((scope) => scope.getType() === type)
  }

  async getChildScopes(parentId: string): Promise<ContextScope[]> {
    const parentScope = this.scopes.get(parentId)
    if (!parentScope) {
      return []
    }

    const childIds = parentScope.getChildIds()
    const childScopes: ContextScope[] = []

    for (const childId of childIds) {
      const childScope = this.scopes.get(childId)
      if (childScope) {
        childScopes.push(childScope)
      }
    }

    return childScopes
  }

  async getScopePath(id: string): Promise<string[]> {
    const path: string[] = []
    let currentScope = this.scopes.get(id)

    while (currentScope) {
      path.unshift(currentScope.getId())
      const parentId = currentScope.getParentId()
      currentScope = parentId ? this.scopes.get(parentId) : undefined
    }

    return path
  }

  async findCommonAncestor(id1: string, id2: string): Promise<ContextScope | undefined> {
    const path1 = await this.getScopePath(id1)
    const path2 = await this.getScopePath(id2)

    // 从根开始查找第一个不同的节点
    let commonAncestorId: string | undefined
    for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
      if (path1[i] === path2[i]) {
        commonAncestorId = path1[i]
      } else {
        break
      }
    }

    return commonAncestorId ? this.scopes.get(commonAncestorId) : undefined
  }

  async isInScopeChain(childId: string, parentId: string): Promise<boolean> {
    const childScope = this.scopes.get(childId)
    if (!childScope) {
      return false
    }

    return childScope.isDescendantOf(parentId)
  }

  async clear(): Promise<void> {
    // 保留全局作用域
    const globalScope = this.scopes.get(this.globalScopeId)
    this.scopes.clear()

    if (globalScope) {
      this.scopes.set(this.globalScopeId, globalScope)
    }
  }

  async cleanup(): Promise<void> {
    await this.clear()
  }
}

/**
 * 默认上下文作用域实现
 */
class DefaultContextScope implements ContextScope {
  private metadata: ScopeMetadata
  private customProperties: Map<string, any> = new Map()

  constructor(options: ScopeOptions) {
    this.metadata = {
      id: this.generateId(),
      type: options.type,
      name: options.name,
      description: options.description,
      parentId: options.parentId,
      childIds: [],
      isolated: options.isolated ?? false,
      inheritable: options.inheritable ?? true,
      priority: options.priority ?? 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      customProperties: options.customProperties,
    }

    // 初始化自定义属性
    if (options.customProperties) {
      for (const [key, value] of Object.entries(options.customProperties)) {
        this.customProperties.set(key, value)
      }
    }
  }

  getId(): string {
    return this.metadata.id
  }

  getType(): ScopeType {
    return this.metadata.type
  }

  getName(): string {
    return this.metadata.name
  }

  getDescription(): string | undefined {
    return this.metadata.description
  }

  getMetadata(): ScopeMetadata {
    return { ...this.metadata }
  }

  getParentId(): string | undefined {
    return this.metadata.parentId
  }

  getChildIds(): string[] {
    return [...this.metadata.childIds]
  }

  addChild(childId: string): void {
    if (!this.metadata.childIds.includes(childId)) {
      this.metadata.childIds.push(childId)
      this.metadata.updatedAt = Date.now()
    }
  }

  removeChild(childId: string): void {
    const index = this.metadata.childIds.indexOf(childId)
    if (index !== -1) {
      this.metadata.childIds.splice(index, 1)
      this.metadata.updatedAt = Date.now()
    }
  }

  hasChild(childId: string): boolean {
    return this.metadata.childIds.includes(childId)
  }

  isIsolated(): boolean {
    return this.metadata.isolated
  }

  isInheritable(): boolean {
    return this.metadata.inheritable
  }

  getPriority(): number {
    return this.metadata.priority
  }

  setPriority(priority: number): void {
    this.metadata.priority = priority
    this.metadata.updatedAt = Date.now()
  }

  getCustomProperty<T = any>(key: string): T | undefined {
    return this.customProperties.get(key)
  }

  setCustomProperty<T = any>(key: string, value: T): void {
    this.customProperties.set(key, value)
    this.metadata.updatedAt = Date.now()
  }

  deleteCustomProperty(key: string): void {
    this.customProperties.delete(key)
    this.metadata.updatedAt = Date.now()
  }

  isGlobal(): boolean {
    return this.metadata.type === ScopeType.GLOBAL
  }

  isRoot(): boolean {
    return this.metadata.parentId === undefined
  }

  isDescendantOf(scopeId: string): boolean {
    let currentId = this.metadata.parentId
    while (currentId) {
      if (currentId === scopeId) {
        return true
      }
      // 这里需要访问作用域管理器来获取父作用域
      // 由于循环依赖，这里简化处理
      break
    }
    return false
  }

  isAncestorOf(scopeId: string): boolean {
    return this.metadata.childIds.includes(scopeId)
  }

  clone(): ContextScope {
    const cloned = new DefaultContextScope({
      type: this.metadata.type,
      name: this.metadata.name,
      description: this.metadata.description,
      parentId: this.metadata.parentId,
      isolated: this.metadata.isolated,
      inheritable: this.metadata.inheritable,
      priority: this.metadata.priority,
      customProperties: this.metadata.customProperties,
    })

    // 复制子作用域 ID
    cloned.metadata.childIds = [...this.metadata.childIds]

    return cloned
  }

  serialize(): string {
    const data = {
      metadata: this.metadata,
      customProperties: Object.fromEntries(this.customProperties),
    }
    return JSON.stringify(data)
  }

  static deserialize(serialized: string): ContextScope {
    const data = JSON.parse(serialized)
    const scope = new DefaultContextScope({
      type: data.metadata.type,
      name: data.metadata.name,
      description: data.metadata.description,
      parentId: data.metadata.parentId,
      isolated: data.metadata.isolated,
      inheritable: data.metadata.inheritable,
      priority: data.metadata.priority,
      customProperties: data.customProperties,
    })

    scope.metadata = data.metadata
    scope.customProperties = new Map(Object.entries(data.customProperties))

    return scope
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
