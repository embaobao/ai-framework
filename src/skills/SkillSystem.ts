/**
 * 技能系统主类
 * 
 * 负责管理技能的注册、查找、执行和依赖管理
 * 技能系统是 AI 框架的核心组件之一，为 Agent 提供可执行的能力
 */

import { EventEmitter } from 'events'
import type { Skill } from './Skill'
import type { SkillRegistry } from './SkillRegistry'
import type { SkillLoader } from './SkillLoader'
import type { SkillExecutor } from './SkillExecutor'
import type { ToolSystem } from '../tools/ToolSystem'
import type { Logger } from '../logger/Logger'

/**
 * 技能系统配置
 */
export interface SkillSystemConfig {
  /** 是否启用技能缓存 */
  enableCache?: boolean
  /** 是否启用技能热重载 */
  enableHotReload?: boolean
  /** 技能加载路径 */
  skillPaths?: string[]
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number
  /** 最大并发执行数 */
  maxConcurrentExecutions?: number
}

/**
 * 技能系统事件类型
 */
export enum SkillSystemEventType {
  /** 技能注册事件 */
  SKILL_REGISTERED = 'skill_registered',
  /** 技能注销事件 */
  SKILL_UNREGISTERED = 'skill_unregistered',
  /** 技能执行开始事件 */
  SKILL_EXECUTION_STARTED = 'skill_execution_started',
  /** 技能执行完成事件 */
  SKILL_EXECUTION_COMPLETED = 'skill_execution_completed',
  /** 技能执行失败事件 */
  SKILL_EXECUTION_FAILED = 'skill_execution_failed',
  /** 技能加载事件 */
  SKILL_LOADED = 'skill_loaded',
  /** 技能卸载事件 */
  SKILL_UNLOADED = 'skill_unloaded',
  /** 技能错误事件 */
  SKILL_ERROR = 'skill_error',
}

/**
 * 技能系统事件数据
 */
export interface SkillSystemEventData {
  type: SkillSystemEventType
  timestamp: number
  data?: {
    skillName?: string
    executionId?: string
    error?: Error
    [key: string]: unknown
  }
}

/**
 * 技能系统状态
 */
export enum SkillSystemState {
  /** 未初始化 */
  UNINITIALIZED = 'uninitialized',
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 已就绪 */
  READY = 'ready',
  /** 运行中 */
  RUNNING = 'running',
  /** 已停止 */
  STOPPED = 'stopped',
  /** 错误状态 */
  ERROR = 'error',
}

/**
 * 技能系统主类
 */
export class SkillSystem extends EventEmitter {
  private state: SkillSystemState = SkillSystemState.UNINITIALIZED
  private config: SkillSystemConfig
  private registry: SkillRegistry
  private loader: SkillLoader
  private executor: SkillExecutor
  private toolSystem?: ToolSystem
  private logger: Logger
  private executionCount: number = 0
  private activeExecutions: Map<string, Promise<unknown>> = new Map()

  constructor(
    registry: SkillRegistry,
    loader: SkillLoader,
    executor: SkillExecutor,
    logger: Logger,
    config: SkillSystemConfig = {},
  ) {
    super()
    this.registry = registry
    this.loader = loader
    this.executor = executor
    this.logger = logger
    this.config = {
      enableCache: true,
      enableHotReload: false,
      skillPaths: [],
      defaultTimeout: 30000,
      maxConcurrentExecutions: 10,
      ...config,
    }
    this.setupEventHandlers()
  }

  /**
   * 初始化技能系统
   */
  async initialize(): Promise<void> {
    if (this.state !== SkillSystemState.UNINITIALIZED) {
      throw new Error(`SkillSystem is already initialized or in invalid state: ${this.state}`)
    }

    this.state = SkillSystemState.INITIALIZING
    this.logger.info('Initializing Skill System...')

    try {
      // 初始化注册表
      await this.registry.initialize()

      // 初始化加载器
      await this.loader.initialize()

      // 初始化执行器
      await this.executor.initialize()

      // 加载技能
      if (this.config.skillPaths && this.config.skillPaths.length > 0) {
        await this.loadSkillsFromPaths(this.config.skillPaths)
      }

      this.state = SkillSystemState.READY
      this.logger.info('Skill System initialized successfully')
    } catch (error) {
      this.state = SkillSystemState.ERROR
      this.logger.error('Failed to initialize Skill System:', error)
      throw error
    }
  }

  /**
   * 启动技能系统
   */
  async start(): Promise<void> {
    if (this.state !== SkillSystemState.READY) {
      throw new Error(`SkillSystem is not ready to start. Current state: ${this.state}`)
    }

    this.state = SkillSystemState.RUNNING
    this.logger.info('Skill System started')
  }

  /**
   * 停止技能系统
   */
  async stop(): Promise<void> {
    if (this.state !== SkillSystemState.RUNNING) {
      throw new Error(`SkillSystem is not running. Current state: ${this.state}`)
    }

    // 等待所有活跃执行完成
    await this.waitForActiveExecutions()

    this.state = SkillSystemState.STOPPED
    this.logger.info('Skill System stopped')
  }

  /**
   * 注册技能
   * @param skill 要注册的技能
   */
  async registerSkill(skill: Skill): Promise<void> {
    try {
      // 检查技能依赖
      const dependencies = skill.getDependencies()
      for (const dep of dependencies) {
        if (!this.hasSkill(dep)) {
          throw new Error(`Skill dependency '${dep}' not found`)
        }
      }

      // 初始化技能
      await skill.initialize()

      // 注册到注册表
      this.registry.register(skill)

      this.emit(SkillSystemEventType.SKILL_REGISTERED, {
        type: SkillSystemEventType.SKILL_REGISTERED,
        timestamp: Date.now(),
        data: { skillName: skill.name },
      })

      this.logger.debug(`Skill registered: ${skill.name}`)
    } catch (error) {
      this.emit(SkillSystemEventType.SKILL_ERROR, {
        type: SkillSystemEventType.SKILL_ERROR,
        timestamp: Date.now(),
        data: { skillName: skill.name, error },
      })
      throw error
    }
  }

  /**
   * 批量注册技能
   * @param skills 要注册的技能数组
   */
  async registerSkills(skills: Skill[]): Promise<void> {
    for (const skill of skills) {
      await this.registerSkill(skill)
    }
  }

  /**
   * 注销技能
   * @param skillName 技能名称
   */
  async unregisterSkill(skillName: string): Promise<void> {
    try {
      const skill = this.getSkill(skillName)
      if (!skill) {
        throw new Error(`Skill '${skillName}' not found`)
      }

      // 清理技能
      await skill.cleanup()

      // 从注册表注销
      this.registry.unregister(skillName)

      this.emit(SkillSystemEventType.SKILL_UNREGISTERED, {
        type: SkillSystemEventType.SKILL_UNREGISTERED,
        timestamp: Date.now(),
        data: { skillName },
      })

      this.logger.debug(`Skill unregistered: ${skillName}`)
    } catch (error) {
      this.emit(SkillSystemEventType.SKILL_ERROR, {
        type: SkillSystemEventType.SKILL_ERROR,
        timestamp: Date.now(),
        data: { skillName, error },
      })
      throw error
    }
  }

  /**
   * 查找技能
   * @param skillName 技能名称
   * @returns 技能实例，如果不存在则返回 undefined
   */
  getSkill(skillName: string): Skill | undefined {
    return this.registry.get(skillName)
  }

  /**
   * 检查技能是否存在
   * @param skillName 技能名称
   * @returns 是否存在
   */
  hasSkill(skillName: string): boolean {
    return this.registry.has(skillName)
  }

  /**
   * 获取所有技能
   * @returns 所有技能的映射
   */
  getAllSkills(): Map<string, Skill> {
    return this.registry.getAll()
  }

  /**
   * 根据分类获取技能
   * @param category 技能分类
   * @returns 该分类下的技能列表
   */
  getSkillsByCategory(category: string): Skill[] {
    return this.registry.getByCategory(category)
  }

  /**
   * 根据标签获取技能
   * @param tag 技能标签
   * @returns 包含该标签的技能列表
   */
  getSkillsByTag(tag: string): Skill[] {
    return this.registry.getByTag(tag)
  }

  /**
   * 执行技能
   * @param skillName 技能名称
   * @param parameters 技能参数
   * @param options 执行选项
   * @returns 执行结果
   */
  async executeSkill(
    skillName: string,
    parameters: Record<string, unknown>,
    options?: { timeout?: number; context?: any },
  ): Promise<any> {
    if (this.state !== SkillSystemState.RUNNING) {
      throw new Error(`SkillSystem is not running. Current state: ${this.state}`)
    }

    // 检查并发执行限制
    if (this.activeExecutions.size >= (this.config.maxConcurrentExecutions || 10)) {
      throw new Error('Maximum concurrent executions reached')
    }

    const skill = this.getSkill(skillName)
    if (!skill) {
      throw new Error(`Skill '${skillName}' not found`)
    }

    const executionId = this.generateExecutionId()
    const executionPromise = this.executeSkillInternal(skill, parameters, executionId, options)

    this.activeExecutions.set(executionId, executionPromise)

    try {
      const result = await executionPromise
      return result
    } finally {
      this.activeExecutions.delete(executionId)
    }
  }

  /**
   * 内部执行技能方法
   */
  private async executeSkillInternal(
    skill: Skill,
    parameters: Record<string, unknown>,
    executionId: string,
    options?: { timeout?: number; context?: any },
  ): Promise<any> {
    this.executionCount++
    const startTime = Date.now()

    this.emit(SkillSystemEventType.SKILL_EXECUTION_STARTED, {
      type: SkillSystemEventType.SKILL_EXECUTION_STARTED,
      timestamp: startTime,
      data: { skillName: skill.name, executionId },
    })

    try {
      // 使用执行器执行技能
      const result = await this.executor.execute(skill, parameters, {
        timeout: options?.timeout || this.config.defaultTimeout,
        context: options?.context,
      })

      this.emit(SkillSystemEventType.SKILL_EXECUTION_COMPLETED, {
        type: SkillSystemEventType.SKILL_EXECUTION_COMPLETED,
        timestamp: Date.now(),
        data: { skillName: skill.name, executionId, result },
      })

      return result
    } catch (error) {
      this.emit(SkillSystemEventType.SKILL_EXECUTION_FAILED, {
        type: SkillSystemEventType.SKILL_EXECUTION_FAILED,
        timestamp: Date.now(),
        data: { skillName: skill.name, executionId, error },
      })
      throw error
    }
  }

  /**
   * 从指定路径加载技能
   * @param paths 技能文件路径数组
   */
  async loadSkillsFromPaths(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        const skills = await this.loader.loadFromPath(path)
        await this.registerSkills(skills)

        this.emit(SkillSystemEventType.SKILL_LOADED, {
          type: SkillSystemEventType.SKILL_LOADED,
          timestamp: Date.now(),
          data: { path, count: skills.length },
        })

        this.logger.info(`Loaded ${skills.length} skills from ${path}`)
      } catch (error) {
        this.logger.error(`Failed to load skills from ${path}:`, error)
        throw error
      }
    }
  }

  /**
   * 重新加载技能
   * @param skillName 技能名称
   */
  async reloadSkill(skillName: string): Promise<void> {
    if (!this.config.enableHotReload) {
      throw new Error('Hot reload is not enabled')
    }

    const skill = this.getSkill(skillName)
    if (!skill) {
      throw new Error(`Skill '${skillName}' not found`)
    }

    try {
      // 注销旧技能
      await this.unregisterSkill(skillName)

      // 重新加载技能
      const reloadedSkill = await this.loader.reload(skillName)
      if (reloadedSkill) {
        await this.registerSkill(reloadedSkill)
      }

      this.logger.info(`Skill reloaded: ${skillName}`)
    } catch (error) {
      this.logger.error(`Failed to reload skill '${skillName}':`, error)
      throw error
    }
  }

  /**
   * 获取技能统计信息
   * @param skillName 技能名称
   * @returns 技能统计信息
   */
  getSkillStats(skillName: string): any {
    const skill = this.getSkill(skillName)
    if (!skill) {
      throw new Error(`Skill '${skillName}' not found`)
    }
    return skill.getStats()
  }

  /**
   * 获取系统统计信息
   * @returns 系统统计信息
   */
  getSystemStats(): {
    totalSkills: number
    totalExecutions: number
    activeExecutions: number
    state: SkillSystemState
  } {
    return {
      totalSkills: this.registry.getAll().size,
      totalExecutions: this.executionCount,
      activeExecutions: this.activeExecutions.size,
      state: this.state,
    }
  }

  /**
   * 设置工具系统
   * @param toolSystem 工具系统实例
   */
  setToolSystem(toolSystem: ToolSystem): void {
    this.toolSystem = toolSystem
    this.executor.setToolSystem(toolSystem)
  }

  /**
   * 获取技能系统状态
   * @returns 当前状态
   */
  getState(): SkillSystemState {
    return this.state
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Skill System...')

    try {
      // 等待所有活跃执行完成
      await this.waitForActiveExecutions()

      // 清理所有技能
      const skills = Array.from(this.registry.getAll().values())
      for (const skill of skills) {
        await skill.cleanup()
      }

      // 清理执行器
      await this.executor.cleanup()

      // 清理加载器
      await this.loader.cleanup()

      // 清理注册表
      await this.registry.cleanup()

      this.state = SkillSystemState.UNINITIALIZED
      this.logger.info('Skill System cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
      throw error
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.on(SkillSystemEventType.SKILL_ERROR, (event: SkillSystemEventData) => {
      this.logger.error('Skill error:', event.data?.error)
    })
  }

  /**
   * 等待所有活跃执行完成
   */
  private async waitForActiveExecutions(): Promise<void> {
    const promises = Array.from(this.activeExecutions.values())
    await Promise.all(promises)
    this.activeExecutions.clear()
  }

  /**
   * 生成执行 ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
