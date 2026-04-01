/**
 * 工具权限管理
 * 
 * 负责工具的权限检查、权限规则定义和权限结果管理
 * 提供灵活的权限控制机制
 */

import type { Logger } from '../logger/Logger'

/**
 * 权限结果
 */
export interface PermissionResult {
  /** 是否有权限 */
  granted: boolean
  /** 权限 ID */
  permissionId: string
  /** 用户 ID */
  userId: string
  /** 工具名称 */
  toolName: string
  /** 拒绝原因 */
  reason?: string
  /** 检查时间戳 */
  timestamp: number
  /** 额外信息 */
  metadata?: Record<string, unknown>
}

/**
 * 权限规则
 */
export interface PermissionRule {
  /** 规则 ID */
  id: string
  /** 规则名称 */
  name: string
  /** 规则描述 */
  description: string
  /** 适用的用户 ID（空表示所有用户） */
  userIds?: string[]
  /** 适用的用户角色（空表示所有角色） */
  roles?: string[]
  /** 适用的工具名称（空表示所有工具） */
  toolNames?: string[]
  /** 适用的工具分类（空表示所有分类） */
  toolCategories?: string[]
  /** 权限操作 */
  action: 'allow' | 'deny'
  /** 规则优先级（数字越大优先级越高） */
  priority: number
  /** 规则条件函数 */
  condition?: (context: PermissionContext) => boolean
  /** 规则是否启用 */
  enabled: boolean
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

/**
 * 权限上下文
 */
export interface PermissionContext {
  /** 用户 ID */
  userId: string
  /** 用户角色 */
  roles: string[]
  /** 工具名称 */
  toolName: string
  /** 工具分类 */
  toolCategory?: string
  /** 执行参数 */
  parameters?: Record<string, unknown>
  /** 会话 ID */
  sessionId?: string
  /** 请求 ID */
  requestId?: string
  /** 时间戳 */
  timestamp: number
  /** 自定义数据 */
  data?: Record<string, unknown>
}

/**
 * 用户权限配置
 */
export interface UserPermissions {
  /** 用户 ID */
  userId: string
  /** 用户角色 */
  roles: string[]
  /** 允许的工具列表 */
  allowedTools?: string[]
  /** 拒绝的工具列表 */
  deniedTools?: string[]
  /** 允许的工具分类 */
  allowedCategories?: string[]
  /** 拒绝的工具分类 */
  deniedCategories?: string[]
  /** 自定义权限规则 */
  customRules?: PermissionRule[]
}

/**
 * 权限检查选项
 */
export interface PermissionCheckOptions {
  /** 是否缓存结果 */
  cacheResult?: boolean
  /** 缓存过期时间（毫秒） */
  cacheExpiration?: number
  /** 是否记录检查历史 */
  logHistory?: boolean
}

/**
 * 权限统计信息
 */
export interface PermissionStats {
  /** 总检查次数 */
  totalChecks: number
  /** 允许次数 */
  grantedCount: number
  /** 拒绝次数 */
  deniedCount: number
  /** 缓存命中次数 */
  cacheHits: number
  /** 缓存未命中次数 */
  cacheMisses: number
}

/**
 * 工具权限管理器接口
 */
export interface ToolPermissionManager {
  /**
   * 检查权限
   * @param userId 用户 ID
   * @param toolName 工具名称
   * @param context 权限上下文
   * @returns 权限结果
   */
  checkPermission(
    userId: string,
    toolName: string,
    context?: Partial<PermissionContext>,
  ): Promise<PermissionResult>

  /**
   * 添加权限规则
   * @param rule 权限规则
   */
  addRule(rule: PermissionRule): void

  /**
   * 移除权限规则
   * @param ruleId 规则 ID
   */
  removeRule(ruleId: string): void

  /**
   * 获取所有规则
   * @returns 规则数组
   */
  getAllRules(): PermissionRule[]

  /**
   * 设置用户权限
   * @param permissions 用户权限配置
   */
  setUserPermissions(permissions: UserPermissions): void

  /**
   * 获取用户权限
   *   @param userId 用户 ID
   * @returns 用户权限配置
   */
  getUserPermissions(userId: string): UserPermissions | undefined

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): PermissionStats
}

/**
 * 工具权限管理器实现
 * 
 * 提供完整的权限管理功能
 */
export class DefaultToolPermissionManager implements ToolPermissionManager {
  private rules: Map<string, PermissionRule> = new Map()
  private userPermissions: Map<string, UserPermissions> = new Map()
  private permissionHistory: PermissionResult[] = []
  private cache: Map<string, { result: PermissionResult; expiresAt: number }> = new Map()
  private stats: PermissionStats = {
    totalChecks: 0,
    grantedCount: 0,
    deniedCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }
  private logger: Logger
  private options: PermissionCheckOptions

  constructor(
    logger: Logger,
    options: PermissionCheckOptions = {},
  ) {
    this.logger = logger
    this.options = {
      cacheResult: true,
      cacheExpiration: 60000,
      logHistory: true,
      ...options,
    }
  }

  /**
   * 检查权限
   */
  async checkPermission(
    userId: string,
    toolName: string,
    context?: Partial<PermissionContext>,
  ): Promise<PermissionResult> {
    this.stats.totalChecks++

    // 构建完整的权限上下文
    const fullContext: PermissionContext = {
      userId,
      roles: this.getUserRoles(userId),
      toolName,
      toolCategory: context?.toolCategory,
      parameters: context?.parameters,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      timestamp: Date.now(),
      data: context?.data,
    }

    // 检查缓存
    const cacheKey = this.generateCacheKey(userId, toolName, fullContext)
    if (this.options.cacheResult) {
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        this.stats.cacheHits++
        this.logger.debug(`Permission cache hit for user '${userId}' and tool '${toolName}'`)
        return cached.result
      }
      this.stats.cacheMisses++
    }

    // 执行权限检查
    const result = await this.performPermissionCheck(userId, toolName, fullContext)

    // 缓存结果
    if (this.options.cacheResult) {
      this.cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + (this.options.cacheExpiration || 60000),
      })
    }

    // 记录历史
    if (this.options.logHistory) {
      this.permissionHistory.push(result)
      // 限制历史记录数量
      if (this.permissionHistory.length > 1000) {
        this.permissionHistory = this.permissionHistory.slice(-1000)
      }
    }

    // 更新统计
    if (result.granted) {
      this.stats.grantedCount++
    } else {
      this.stats.deniedCount++
    }

    this.logger.debug(
      `Permission ${result.granted ? 'granted' : 'denied'} for user '${userId}' and tool '${toolName}'`,
    )

    return result
  }

  /**
   * 执行权限检查
   */
  private async performPermissionCheck(
    userId: string,
    toolName: string,
    context: PermissionContext,
  ): Promise<PermissionResult> {
    // 获取用户权限配置
    const userPerms = this.userPermissions.get(userId)

    // 检查明确的拒绝列表
    if (userPerms?.deniedTools?.includes(toolName)) {
      return this.createPermissionResult(false, userId, toolName, 'Tool is explicitly denied for user')
    }

    // 检查明确的允许列表
    if (userPerms?.allowedTools?.includes(toolName)) {
      return this.createPermissionResult(true, userId, toolName)
    }

    // 检查分类拒绝
    if (context.toolCategory && userPerms?.deniedCategories?.includes(context.toolCategory)) {
      return this.createPermissionResult(false, userId, toolName, 'Tool category is denied for user')
    }

    // 检查分类允许
    if (context.toolCategory && userPerms?.allowedCategories?.includes(context.toolCategory)) {
      return this.createPermissionResult(true, userId, toolName)
    }

    // 获取并排序所有启用的规则
    const enabledRules = Array.from(this.rules.values())
      .filter((rule) => rule.enabled)
      .sort((a, b) => b.priority - a.priority)

    // 检查规则
    for (const rule of enabledRules) {
      if (this.ruleMatches(rule, context)) {
        const granted = rule.action === 'allow'
        return this.createPermissionResult(
          granted,
          userId,
          toolName,
          granted ? undefined : `Denied by rule: ${rule.name}`,
        )
      }
    }

    // 默认拒绝
    return this.createPermissionResult(false, userId, toolName, 'No matching permission rule found')
  }

  /**
   * 检查规则是否匹配
   */
  private ruleMatches(rule: PermissionRule, context: PermissionContext): boolean {
    // 检查用户 ID
    if (rule.userIds && rule.userIds.length > 0 && !rule.userIds.includes(context.userId)) {
      return false
    }

    // 检查用户角色
    if (rule.roles && rule.roles.length > 0) {
      const hasRole = context.roles.some((role) => rule.roles!.includes(role))
      if (!hasRole) {
        return false
      }
    }

    // 检查工具名称
    if (rule.toolNames && rule.toolNames.length > 0 && !rule.toolNames.includes(context.toolName)) {
      return false
    }

    // 检查工具分类
    if (rule.toolCategories && rule.toolCategories.length > 0) {
      if (!context.toolCategory || !rule.toolCategories.includes(context.toolCategory)) {
        return false
      }
    }

    // 检查自定义条件
    if (rule.condition && !rule.condition(context)) {
      return false
    }

    return true
  }

  /**
   * 创建权限结果
  
   */
  private createPermissionResult(
    granted: boolean,
    userId: string,
    toolName: string,
    reason?: string,
  ): PermissionResult {
    return {
      granted,
      permissionId: this.generatePermissionId(),
      userId,
      toolName,
      reason,
      timestamp: Date.now(),
    }
  }

  /**
   * 添加权限规则
   */
  addRule(rule: PermissionRule): void {
    this.rules.set(rule.id, rule)
    this.logger.debug(`Permission rule added: ${rule.name}`)
  }

  /**
   * 批量添加权限规则
   * @param rules 规则数组
   */
  addRules(rules: PermissionRule[]): void {
    for (const rule of rules) {
      this.addRule(rule)
    }
  }

  /**
   * 移除权限规则
   */
  removeRule(ruleId: string): void {
    const removed = this.rules.delete(ruleId)
    if (removed) {
      this.logger.debug(`Permission rule removed: ${ruleId}`)
    }
  }

  /**
   * 获取所有规则
   */
  getAllRules(): PermissionRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * 获取规则
   * @param ruleId 规则 ID
   * @returns 规则对象
   */
  getRule(ruleId: string): PermissionRule | undefined {
    return this.rules.get(ruleId)
  }

  /**
   * 更新规则
   * @param ruleId 规则 ID
   * @param updates 更新内容
   */
  updateRule(ruleId: string, updates: Partial<PermissionRule>): void {
    const rule = this.rules.get(ruleId)
    if (!rule) {
      throw new Error(`Rule '${ruleId}' not found`)
    }

    Object.assign(rule, updates, { updatedAt: Date.now() })
    this.logger.debug(`Permission rule updated: ${ruleId}`)
  }

  /**
   * 设置用户权限
   */
  setUserPermissions(permissions: UserPermissions): void {
    this.userPermissions.set(permissions.userId, permissions)
    this.logger.debug(`User permissions set for: ${permissions.userId}`)
  }

  /**
   * 获取用户权限
   */
  getUserPermissions(userId: string): UserPermissions | undefined {
    return this.userPermissions.get(userId)
  }

  /**
   * 移除用户权限
   * @param userId 用户 ID
   */
  removeUserPermissions(userId: string): void {
    const removed = this.userPermissions.delete(userId)
    if (removed) {
      this.logger.debug(`User permissions removed for: ${userId}`)
    }
  }

  /**
   * 获取用户角色
   */
  private getUserRoles(userId: string): string[] {
    const userPerms = this.userPermissions.get(userId)
    return userPerms?.roles || []
  }

  /**
   * 获取统计信息
   */
  getStats(): PermissionStats {
    return { ...this.stats }
  }

  /**
   * 获取权限历史
   * @param limit 返回记录数量限制
   * @returns 权限结果数组
   */
  getPermissionHistory(limit: number = 100): PermissionResult[] {
    return this.permissionHistory.slice(-limit)
  }

  /**
   * 清除权限历史
   */
  clearPermissionHistory(): void {
    this.permissionHistory = []
    this.logger.debug('Permission history cleared cleared')
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
    this.logger.debug('Permission cache cleared')
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      grantedCount: 0,
      deniedCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
    }
    this.logger.debug('Permission stats reset')
  }

  /**
   * 更新选项
   * @param options 选项更新
   */
  updateOptions(options: Partial<PermissionCheckOptions>): void {
    this.options = { ...this.options, ...options }
    this.logger.debug('Permission manager options updated')
  }

  /**
   * 获取选项
   * @returns 选项对象
   */
  getOptions(): PermissionCheckOptions {
    return { ...this.options }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Tool Permission Manager...')

    // 清空所有数据
    this.rules.clear()
    this.userPermissions.clear()
    this.permissionHistory = []
    this.cache.clear()
    
    // 重置统计
    this.resetStats()

    this.logger.info('Tool Permission Manager cleaned up')
  }

  /**
   * 生成权限 ID
   */
  private generatePermissionId(): string {
    return `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    userId: string,
    toolName: string,
    context: PermissionContext,
  ): string {
    const roles = context.roles.sort().join(',')
    return `${userId}:${toolName}:${roles}:${context.timestamp}`
  }
}

/**
 * 创建默认权限规则
 * @returns 默认规则数组
 */
export function createDefaultPermissionRules(): PermissionRule[] {
  return [
    {
      id: 'admin-full-access',
      name: '管理员完全访问',
      description: '允许管理员角色访问所有工具',
      roles: ['admin'],
      action: 'allow',
      priority: 100,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'default-deny',
      name: '默认拒绝',
      description: '默认拒绝所有工具访问',
      action: 'deny',
      priority: 0,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]
}
