/**
 * 技能注册表
 * 
 * 负责技能的注册、查找、分组和冲突检测
 */

import type { Skill } from './Skill'
import type { Logger } from '../logger/Logger'

/**
 * 技能注册表配置
 */
export interface SkillRegistryConfig {
  /** 是否启用冲突检测 */
  enableConflictDetection?: boolean
  /** 是否允许覆盖已注册的技能 */
  allowOverride?: boolean
}

/**
 * 技能冲突类型
 */
export enum SkillConflictType {
  /** 名称冲突 */
  NAME_CONFLICT = 'name_conflict',
  /** 依赖冲突 */
  DEPENDENCY_CONFLICT = 'dependency_conflict',
  /** 权限冲突 */
  PERMISSION_CONFLICT = 'permission_conflict',
}

/**
 * 技能冲突信息
 */
export interface SkillConflict {
  /** 冲突类型 */
  type: SkillConflictType
  /** 冲突的技能名称 */
  skillName: string
  /** 冲突的技能名称（另一个） */
  conflictingSkillName: string
  /** 冲突描述 */
  description: string
  /** 严重程度 */
  severity: 'error' | 'warning'
}

/**
 * 技能分组信息
 */
export interface SkillGroup {
  /** 分组名称 */
  name: string
  /** 分组描述 */
  description?: string
  /** 分组中的技能列表 */
  skills: Skill[]
  /** 技能数量 */
  count: number
}

/**
 * 技能注册表类
 */
export class SkillRegistry {
  /** 技能映射表 */
  private skills: Map<string, Skill> = new Map()
  /** 技能分类映射表 */
  private categories: Map<string, Set<string>> = new Map()
  /** 技能标签映射表 */
  private tags: Map<string, Set<string>> = new Map()
  /** 技能依赖映射表 */
  private dependencies: Map<string, Set<string>> = new Map()
  /** 技能权限映射表 */
  private permissions: Map<string, Set<string>> = new Map()
  /** 配置 */
  private config: SkillRegistryConfig
  /** 日志记录器 */
  private logger: Logger
  /** 初始化状态 */
  private initialized: boolean = false

  constructor(logger: Logger, config: SkillRegistryConfig = {}) {
    this.logger = logger
    this.config = {
      enableConflictDetection: true,
      allowOverride: false,
      ...config,
    }
  }

  /**
   * 初始化注册表
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    this.logger.info('Initializing Skill Registry...')
    this.initialized = true
    this.logger.info('Skill Registry initialized')
  }

  /**
   * 注册技能
   * @param skill 要注册的技能
   */
  register(skill: Skill): void {
    const skillName = skill.name

    // 检查是否已存在
    if (this.skills.has(skillName)) {
      if (!this.config.allowOverride) {
        throw new Error(`Skill '${skillName}' is already registered`)
      }
      this.logger.warn(`Overriding existing skill: ${skillName}`)
      this.unregister(skillName)
    }

    // 检测冲突
    if (this.config.enableConflictDetection) {
      const conflicts = this.detectConflicts(skill)
      if (conflicts.length > 0) {
        const errorConflicts = conflicts.filter((c) => c.severity === 'error')
        if (errorConflicts.length > 0) {
          throw new Error(
            `Skill conflicts detected: ${errorConflicts.map((c) => c.description).join(', ')}`,
          )
        }
        // 记录警告
        for (const conflict of conflicts) {
          this.logger.warn(`Skill conflict: ${conflict.description}`)
        }
      }
    }

    // 注册技能
    this.skills.set(skillName, skill)

    // 更新分类索引
    if (skill.config.category) {
      const category = skill.config.category
      if (!this.categories.has(category)) {
        this.categories.set(category, new Set())
      }
      this.categories.get(category)!.add(skillName)
    }

    // 更新标签索引
    if (skill.config.tags) {
      for (const tag of skill.config.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set())
        }
        this.tags.get(tag)!.add(skillName)
      }
    }

    // 更新依赖索引
      const deps = skill.getDependencies()
      if (deps.length > 0) {
        this.dependencies.set(skillName, new Set(deps))
      }

      // 更新权限索引
      if (skill.requiredPermissions && skill.requiredPermissions.length > 0) {
        this.permissions.set(skillName, new Set(skill.requiredPermissions))
      }

      this.logger.debug(`Skill registered: ${skillName}`)
    }
  }

  /**
   * 批量注册技能
   * @param skills 要注册的技能数组
   */
  registerAll(skills: Skill[]): void {
    for (const skill of skills) {
      this.register(skill)
    }
  }

  /**
   * 注销技能
   * @param skillName 技能名称
   */
  unregister(skillName: string): void {
    const skill = this.skills.get(skillName)
    if (!skill) {
      throw new Error(`Skill '${skillName}' not found`)
    }

    // 从分类索引中移除
    if (skill.config.category) {
      const categorySkills = this.categories.get(skill.config.category)
      if (categorySkills) {
        categorySkills.delete(skillName)
        if (categorySkills.size === 0) {
          this.categories.delete(skill.config.category)
        }
      }
    }

    // 从标签索引中移除
    if (skill.config.tags) {
      for (const tag of skill.config.tags) {
        const tagSkills = this.tags.get(tag)
        if (tagSkills) {
          tagSkills.delete(skillName)
          if (tagSkills.size === 0) {
            this.tags.delete(tag)
          }
        }
      }
    }

    // 从依赖索引中移除
    this.dependencies.delete(skillName)

    // 从权限索引中移除
    this.permissions.delete(skillName)

    // 从技能映射表中移除
    this.skills.delete(skillName)

    this.logger.debug(`Skill unregistered: ${skillName}`)
  }

  /**
   * 获取技能
   * @param skillName 技能名称
   * @returns 技能实例，如果不存在则返回 undefined
   */
  get(skillName: string): Skill | undefined {
    return this.skills.get(skillName)
  }

  /**
   * 检查技能是否存在
   * @param skillName 技能名称
   * @returns 是否存在
   */
  has(skillName: string): boolean {
    return this.skills.has(skillName)
  }

  /**
   * 获取所有技能
   * @returns 所有技能的映射
   */
  getAll(): Map<string, Skill> {
    return new Map(this.skills)
  }

  /**
   * 获取所有技能名称
   * @returns 技能名称数组
   */
  getSkillNames(): string[] {
    return Array.from(this.skills.keys())
  }

  /**
   * 根据分类获取技能
   * @param category 技能分类
   * @returns 该分类下的技能列表
   */
  getByCategory(category: string): Skill[] {
    const categorySkills = this.categories.get(category)
    if (!categorySkills) {
      return []
    }

    return Array.from(categorySkills)
      .map((name) => this.skills.get(name))
      .filter((skill): skill is Skill => skill !== undefined)
  }

  /**
   * 获取所有分类
   * @returns 分类名称数组
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys())
  }

  /**
   * 根据标签获取技能
   * @param tag 技能标签
   * @returns 包含该标签的技能列表
   */
  getByTag(tag: string): Skill[] {
    const tagSkills = this.tags.get(tag)
    if (!tagSkills) {
      return []
    }

    return Array.from(tagSkills)
      .map((name) => this.skills.get(name))
      .filter((skill): skill is Skill => skill !== undefined)
  }

  /**
   * 获取所有标签
   * @returns 标签名称数组
   */
  getTags(): string[] {
    return Array.from(this.tags.keys())
  }

  /**
   * 获取技能分组
   * @param groupName 分组名称
   * @returns 分组信息
   */
  getGroup(groupName: string): SkillGroup | undefined {
    const skills = this.getByCategory(groupName)
    if (skills.length === 0) {
      return undefined
    }

    return {
      name: groupName,
      description: `Skills in category: ${groupName}`,
      skills,
      count: skills.length,
    }
  }

  /**
   * 获取所有分组
   * @returns 分组信息数组
   */
  getAllGroups(): SkillGroup[] {
    const groups: SkillGroup[] = []

    for (const categoryName of this.categories.keys()) {
      const group = this.getGroup(categoryName)
      if (group) {
        groups.push(group)
      }
    }

    return groups
  }

  /**
   * 检测技能冲突
   * @param skill 要检测的技能
   * @returns 冲突列表
   */
  detectConflicts(skill: Skill): SkillConflict[] {
    const conflicts: SkillConflict[] = []

    // 检查名称冲突
    if (this.skills.has(skill.name)) {
      conflicts.push({
        type: SkillConflictType.NAME_CONFLICT,
        skillName: skill.name,
        conflictingSkillName: skill.name,
        description: `Skill name '${skill.name}' is already registered`,
        severity: 'error',
      })
    }

    // 检查依赖冲突
    const deps = skill.getDependencies()
    for (const dep of deps) {
      if (!this.skills.has(dep)) {
        conflicts.push({
          type: SkillConflictType.DEPENDENCY_CONFLICT,
          skillName: skill.name,
          conflictingSkillName: dep,
          description: `Skill '${skill.name}' depends on '${dep}' which is not registered`,
          severity: 'error',
        })
      }
    }

    // 检查权限冲突（可选）
    if (skill.requiredPermissions && skill.requiredPermissions.length > 0) {
      // 这里可以添加权限冲突检测逻辑
      // 例如检查权限是否与系统策略冲突
    }

    return conflicts
  }

  /**
   * 检查技能依赖是否满足
   * @param skillName 技能名称
   * @returns 依赖是否满足
   */
  checkDependencies(skillName: string): boolean {
    const deps = this.dependencies.get(skillName)
    if (!deps || deps.size === 0) {
      return true
    }

    for (const dep of deps) {
      if (!this.skills.has(dep)) {
        return false
      }
    }

    return true
  }

  /**
   * 获取技能依赖
   * @param skillName 技能名称
   * @returns 依赖的技能名称列表
   */
  getDependencies(skillName: string): string[] {
    const deps = this.dependencies.get(skillName)
    return deps ? Array.from(deps) : []
  }

  /**
   * 获取依赖某个技能的所有技能
   * @param skillName 技能名称
   * @returns 依赖该技能的技能名称列表
   */
  getDependents(skillName: string): string[] {
    const dependents: string[] = []

    for (const [name, deps] of this.dependencies.entries()) {
      if (deps.has(skillName)) {
        dependents.push(name)
      }
    }

    return dependents
  }

  /**
   * 获取技能权限
   * @param skillName 技能名称
   * @returns 权限列表
   */
  getPermissions(skillName: string): string[] {
    const perms = this.permissions.get(skillName)
    return perms ? Array.from(perms) : []
  }

  /**
   * 搜索技能
   * @param query 搜索查询
   * @returns 匹配的技能列表
   */
  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase()
    const results: Skill[] = []

    for (const skill of this.skills.values()) {
      // 搜索名称
      if (skill.name.toLowerCase().includes(lowerQuery)) {
        results.push(skill)
        continue
      }

      // 搜索描述
      if (skill.config.description?.toLowerCase().includes(lowerQuery)) {
        results.push(skill)
        continue
      }

      // 搜索标签
      if (skill.config.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
        results.push(skill)
        continue
      }

      // 搜索分类
      if (skill.config.category?.toLowerCase().includes(lowerQuery)) {
        results.push(skill)
        continue
      }
    }

    return results
  }

  /**
   * 获取注册表统计信息
   * @returns 统计信息
   */
  getStats(): {
    totalSkills: number
    totalCategories: number
    totalTags: number
    totalDependencies: number
    totalPermissions: number
  } {
    let totalDependencies = 0
    for (const deps of this.dependencies.values()) {
      totalDependencies += deps.size
    }

    let totalPermissions = 0
    for (const perms of this.permissions.values()) {
      totalPermissions += perms.size
    }

    return {
      totalSkills: this.skills.size,
      totalCategories: this.categories.size,
      totalTags: this.tags.size,
      totalDependencies,
      totalPermissions,
    }
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.skills.clear()
    this.categories.clear()
    this.tags.clear()
    this.dependencies.clear()
    this.permissions.clear()
    this.logger.debug('Skill registry cleared')
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Skill Registry...')

    try {
      // 清空注册表
      this.clear()

      this.initialized = false
      this.logger.info('Skill Registry cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
      throw error
    }
  }
}
