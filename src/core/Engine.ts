/**
 * AI 框架核心引擎
 * 
 * 这是整个框架的核心，负责协调各个子系统的工作
 * 包括工具系统、命令系统、Agent 协调器、技能系统等
 */

import { EventEmitter } from 'events'
import type { Tool } from '../tools/Tool'
import type { Command } from '../commands/Command'
import type { Agent } from '../agents/Agent'
import type { Skill } from '../skills/Skill'
import type { Config } from '../config/Config'
import type { Logger } from '../logger/Logger'
import type { ContextManager } from '../context/ContextManager'
import type { ToolSystem } from '../tools/ToolSystem'
import type { CommandSystem } from '../commands/CommandSystem'
import type { AgentCoordinator } from '../agents/AgentCoordinator'
import type { SkillSystem } from '../skills/SkillSystem'
import type { ConfigManager } from '../config/ConfigManager'

/**
 * 引擎配置选项
 */
export interface EngineOptions {
  /** 配置管理器 */
  configManager: ConfigManager
  /** 日志记录器 */
  logger: Logger
  /** 上下文管理器 */
  contextManager: ContextManager
  /** 工具系统 */
  toolSystem: ToolSystem
  /** 命令系统 */
  commandSystem: CommandSystem
  /** Agent 协调器 */
  agentCoordinator: AgentCoordinator
  /** 技能系统 */
  skillSystem: SkillSystem
  /** 是否启用调试模式 */
  debug?: boolean
}

/**
 * 引擎状态
 */
export enum EngineState {
  /** 未初始化 */
  UNINITIALIZED = 'uninitialized',
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 已就绪 */
  READY = 'ready',
  /** 运行中 */
  RUNNING = 'running',
  /** 已暂停 */
  PAUSED = 'paused',
  /** 已停止 */
  STOPPED = 'stopped',
  /** 错误状态 */
  ERROR = 'error',
}

/**
 * 引擎事件类型
 */
export enum EngineEventType {
  /** 初始化完成 */
  INITIALIZED = 'initialized',
  /** 引擎启动 */
  STARTED = 'started',
  /** 引擎停止 */
  STOPPED = 'stopped',
  /** 引擎暂停 */
  PAUSED = 'paused',
  /** 引擎恢复 */
  RESUMED = 'resumed',
  /** 发生错误 */
  ERROR = 'error',
  /** 工具注册 */
  TOOL_REGISTERED = 'tool_registered',
  /** 工具注销 */
  TOOL_UNREGISTERED = 'tool_unregistered',
  /** 命令注册 */
  COMMAND_REGISTERED = 'command_registered',
  /** 命令注销 */
  COMMAND_UNREGISTERED = 'command_unregistered',
  /** Agent 注册 */
  AGENT_REGISTERED = 'agent_registered',
  /** Agent 注销 */
  AGENT_UNREGISTERED = 'agent_unregistered',
  /** 技能注册 */
  SKILL_REGISTERED = 'skill_registered',
  /** 技能注销 */
  SKILL_UNREGISTERED = 'skill_unregistered',
}

/**
 * 引擎事件数据
 */
export interface EngineEventData {
  type: EngineEventType
  timestamp: number
  data?: unknown
}

/**
 * AI 框架核心引擎类
 * 
 * 负责协调所有子系统的工作，提供统一的接口
 */
export class Engine extends EventEmitter {
  private state: EngineState = EngineState.UNINITIALIZED
  private options: EngineOptions
  private startTime: number = 0
  private error: Error | null = null

  constructor(options: EngineOptions) {
    super()
    this.options = options
    this.setupErrorHandling()
  }

  /**
   * 初始化引擎
   */
  async initialize(): Promise<void> {
    if (this.state !== EngineState.UNINITIALIZED) {
      throw new Error(`Engine is already initialized or in invalid state: ${this.state}`)
    }

    this.setState(EngineState.INITIALIZING)
    this.options.logger.info('Initializing AI Framework Engine...')

    try {
      // 初始化各个子系统
      await this.initializeSubsystems()

      // 设置子系统之间的依赖关系
      this.setupSubsystemDependencies()

      this.setState(EngineState.READY)
      this.emit(EngineEventType.INITIALIZED, {
        type: EngineEventType.INITIALIZED,
        timestamp: Date.now(),
      })
      this.options.logger.info('AI Framework Engine initialized successfully')
    } catch (error) {
      this.error = error as Error
      this.setState(EngineState.ERROR)
      this.emit(EngineEventType.ERROR, {
        type: EngineEventType.ERROR,
        timestamp: Date.now(),
        data: error,
      })
      throw error
    }
  }

  /**
   * 启动引擎
   */
  async start(): Promise<void> {
    if (this.state !== EngineState.READY) {
      throw new Error(`Engine is not ready to start. Current state: ${this.state}`)
    }

    this.setState(EngineState.RUNNING)
    this.startTime = Date.now()
    this.options.logger.info('AI Framework Engine started')

    this.emit(EngineEventType.STARTED, {
      type: EngineEventType.STARTED,
      timestamp: Date.now(),
    })
  }

  /**
   * 停止引擎
   */
  async stop(): Promise<void> {
    if (this.state !== EngineState.RUNNING && this.state !== EngineState.PAUSED) {
      throw new Error(`Engine is not running. Current state: ${this.state}`)
    }

    this.setState(EngineState.STOPPED)
    this.options.logger.info('AI Framework Engine stopped')

    this.emit(EngineEventType.STOPPED, {
      type: EngineEventType.STOPPED,
      timestamp: Date.now(),
    })
  }

  /**
   * 暂停引擎
   */
  async pause(): Promise<void> {
    if (this.state !== EngineState.RUNNING) {
      throw new Error(`Engine is not running. Current state: ${this.state}`)
    }

    this.setState(EngineState.PAUSED)
    this.options.logger.info('AI Framework Engine paused')

    this.emit(EngineEventType.PAUSED, {
      type: EngineEventType.PAUSED,
      timestamp: Date.now(),
    })
  }

  /**
   * 恢复引擎
   */
  async resume(): Promise<void> {
    if (this.state !== EngineState.PAUSED) {
      throw new Error(`Engine is not paused. Current state: ${this.state}`)
    }

    this.setState(EngineState.RUNNING)
    this.options.logger.info('AI Framework Engine resumed')

    this.emit(EngineEventType.RESUMED, {
      type: EngineEventType.RESUMED,
      timestamp: Date.now(),
    })
  }

  /**
   * 注册工具
   */
  registerTool(tool: Tool): void {
    this.options.toolSystem.registerTool(tool)
    this.emit(EngineEventType.TOOL_REGISTERED, {
      type: EngineEventType.TOOL_REGISTERED,
      timestamp: Date.now(),
      data: { toolName: tool.name },
    })
    this.options.logger.debug(`Tool registered: ${tool.name}`)
  }

  /**
   * 注销工具
   */
  unregisterTool(toolName: string): void {
    this.options.toolSystem.unregisterTool(toolName)
    this.emit(EngineEventType.TOOL_UNREGISTERED, {
      type: EngineEventType.TOOL_UNREGISTERED,
      timestamp: Date.now(),
      data: { toolName },
    })
    this.options.logger.debug(`Tool unregistered: ${toolName}`)
  }

  /**
   * 注册命令
   */
  registerCommand(command: Command): void {
    this.options.commandSystem.registerCommand(command)
    this.emit(EngineEventType.COMMAND_REGISTERED, {
      type: EngineEventType.COMMAND_REGISTERED,
      timestamp: Date.now(),
      data: { commandName: command.name },
    })
    this.options.logger.debug(`Command registered: ${command.name}`)
  }

  /**
   * 注销命令
   */
  unregisterCommand(commandName: string): void {
    this.options.commandSystem.unregisterCommand(commandName)
    this.emit(EngineEventType.COMMAND_UNREGISTERED, {
      type: EngineEventType.COMMAND_UNREGISTERED,
      timestamp: Date.now(),
      data: { commandName },
    })
    this.options.logger.debug(`Command unregistered: ${commandName}`)
  }

  /**
   * 注册 Agent
   */
  registerAgent(agent: Agent): void {
    this.options.agentCoordinator.registerAgent(agent)
    this.emit(EngineEventType.AGENT_REGISTERED, {
      type: EngineEventType.AGENT_REGISTERED,
      timestamp: Date.now(),
      data: { agentName: agent.name },
    })
    this.options.logger.debug(`Agent registered: ${agent.name}`)
  }

  /**
   * 注销 Agent
   */
  unregisterAgent(agentName: string): void {
    this.options.agentCoordinator.unregisterAgent(agentName)
    this.emit(EngineEventType.AGENT_UNREGISTERED, {
      type: EngineEventType.AGENT_UNREGISTERED,
      timestamp: Date.now(),
      data: { agentName },
    })
    this.options.logger.debug(`Agent unregistered: ${agentName}`)
  }

  /**
   * 注册技能
   */
  registerSkill(skill: Skill): void {
    this.options.skillSystem.registerSkill(skill)
    this.emit(EngineEventType.SKILL_REGISTERED, {
      type: EngineEventType.SKILL_REGISTERED,
      timestamp: Date.now(),
      data: { skillName: skill.name },
    })
    this.options.logger.debug(`Skill registered: ${skill.name}`)
  }

  /**
   * 注销技能
   */
  unregisterSkill(skillName: string): void {
    this.options.skillSystem.unregisterSkill(skillName)
    this.emit(EngineEventType.SKILL_UNREGISTERED, {
      type: EngineEventType.SKILL_UNREGISTERED,
      timestamp: Date.now(),
      data: { skillName },
    })
    this.options.logger.debug(`Skill unregistered: ${skillName}`)
  }

  /**
   * 获取引擎状态
   */
  getState(): EngineState {
    return this.state
  }

  /**
   * 获取引擎配置
   */
  getConfig(): Config {
    return this.options.configManager.getConfig()
  }

  /**
   * 获取运行时间（毫秒）
   */
  getUptime(): number {
    if (this.state !== EngineState.RUNNING && this.state !== EngineState.PAUSED) {
      return 0
    }
    return Date.now() - this.startTime
  }

  /**
   * 获取最后的错误
   */
  getLastError(): Error | null {
    return this.error
  }

  /**
   * 初始化各个子系统
   */
  private async initializeSubsystems(): Promise<void> {
    // 初始化配置管理器
    await this.options.configManager.initialize()

    // 初始化上下文管理器
    await this.options.contextManager.initialize()

    // 初始化工具系统
    await this.options.toolSystem.initialize()

    // 初始化命令系统
    await this.options.commandSystem.initialize()

    // 初始化 Agent 协调器
    await this.options.agentCoordinator.initialize()

    // 初始化技能系统
    await this.options.skillSystem.initialize()
  }

  /**
   * 设置子系统之间的依赖关系
   */
  private setupSubsystemDependencies(): void {
    // 工具系统需要访问上下文管理器
    this.options.toolSystem.setContextManager(this.options.contextManager)

    // 命令系统需要访问工具系统
    this.options.commandSystem.setToolSystem(this.options.toolSystem)

    // Agent 协调器需要访问工具系统和上下文管理器
    this.options.agentCoordinator.setToolSystem(this.options.toolSystem)
    this.options.agentCoordinator.setContextManager(this.options.contextManager)

    // 技能系统需要访问工具系统
    this.options.skillSystem.setToolSystem(this.options.toolSystem)
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    this.on('error', (error) => {
      this.options.logger.error('Engine error:', error)
    })

    process.on('uncaughtException', (error) => {
      this.options.logger.error('Uncaught exception:', error)
      this.error = error
      this.setState(EngineState.ERROR)
    })

    process.on('unhandledRejection', (reason, promise) => {
      this.options.logger.error('Unhandled rejection at:', promise, 'reason:', reason)
      this.error = reason instanceof Error ? reason : new Error(String(reason))
      this.setState(EngineState.ERROR)
    })
  }

  /**
   * 设置引擎状态
   */
  private setState(state: EngineState): void {
    const oldState = this.state
    this.state = state
    this.options.logger.debug(`Engine state changed: ${oldState} -> ${state}`)
  }

  /**
   * 发出事件
   */
  private emit(type: EngineEventType, data: EngineEventData): void {
    super.emit(type, data)
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.options.logger.info('Cleaning up AI Framework Engine...')

    try {
      // 清理各个子系统
      await this.options.skillSystem.cleanup()
      await this.options.agentCoordinator.cleanup()
      await this.options.commandSystem.cleanup()
      await this.options.toolSystem.cleanup()
      await this.options.contextManager.cleanup()
      await this.options.configManager.cleanup()

      this.setState(EngineState.UNINITIALIZED)
      this.options.logger.info('AI Framework Engine cleaned up successfully')
    } catch (error) {
      this.options.logger.error('Error during cleanup:', error)
      throw error
    }
  }
}
