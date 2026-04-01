import { AgentTask as IAgentTask } from './Agent'

/**
 * 任务优先级枚举
 * 定义任务的优先级级别
 */
export enum TaskPriority {
  /** 低优先级 */
  LOW = 0,
  /** 中优先级 */
  MEDIUM = 1,
  /** 高优先级 */
  HIGH = 2,
  /** 紧急优先级 */
  URGENT = 3
}

/**
 * 任务状态枚举
 * 扩展基础任务状态，提供更详细的状态管理
 */
export enum TaskStatus {
  /** 任务等待中 */
  PENDING = 'pending',
  /** 任务正在执行 */
  RUNNING = 'running',
  /** 任务已完成 */
  COMPLETED = 'completed',
  /** 任务失败 */
  FAILED = 'failed',
  /** 任务已取消 */
  CANCELLED = 'cancelled',
  /** 任务等待依赖完成 */
  WAITING_DEPENDENCIES = 'waiting_dependencies',
  /** 任务超时 */
  TIMEOUT = 'timeout'
}

/**
 * 任务依赖类型
 * 定义任务之间的依赖关系
 */
export interface TaskDependency {
  /** 依赖的任务 ID */
  taskId: string
  /** 依赖类型 */
  type: 'sequential' | 'parallel' | 'conditional'
  /** 依赖条件（用于条件依赖） */
  condition?: (result: any) => boolean
}

/**
 * 扩展的任务接口
 * 继承基础任务接口，添加更多任务管理功能
 */
export interface ExtendedAgentTask extends IAgentTask {
  /** 任务优先级 */
  priority: TaskPriority
  /** 任务状态 */
  status: TaskStatus
  /** 任务依赖列表 */
  dependencies: TaskDependency[]
  /** 任务重试次数 */
  retryCount?: number
  /** 最大重试次数 */
  maxRetries?: number
  /** 任务进度（0-100） */
  progress?: number
  /** 任务标签 */
  tags?: string[]
  /** 任务元数据 */
  metadata?: Record<string, any>
  /** 任务回调函数 */
  callbacks?: {
    /** 任务开始回调 */
    onStart?: (task: ExtendedAgentTask) => void
    /** 任务进度回调 */
    onProgress?: (task: ExtendedAgentTask, progress: number) => void
    /** 任务完成回调 */
    onComplete?: (task: ExtendedAgentTask, result: any) => void
    /** 任务失败回调 */
    onFail?: (task: ExtendedAgentTask, error: Error) => void
    /** 任务取消回调 */
    onCancel?: (task: ExtendedAgentTask) => void
  }
}

/**
 * 任务队列配置接口
 */
export interface TaskQueueConfig {
  /** 队列最大容量 */
  maxCapacity?: number
  /** 是否启用优先级排序 */
  enablePriority?: boolean
  /** 是否启用任务去重 */
  enableDeduplication?: boolean
  /** 任务去重的键生成器 */
  deduplicationKeyGenerator?: (task: ExtendedAgentTask) => string
}

/**
 * 任务队列接口
 * 定义任务队列的核心功能
 */
export interface ITaskQueue {
  /** 添加任务到队列 */
  enqueue(task: ExtendedAgentTask): Promise<void>

  /** 从队列中取出任务 */
  dequeue(): Promise<ExtendedAgentTask | null>

  /** 获取队列中的任务数量 */
  size(): number

  /** 清空队列 */
  clear(): void

  /** 获取队列中的所有任务 */
  getAllTasks(): ExtendedAgentTask[]

  /** 根据任务 ID 获取任务 */
  getTask(taskId: string): ExtendedAgentTask | undefined

  /** 取消任务 */
  cancelTask(taskId: string): Promise<boolean>

  /** 暂停队列 */
  pause(): void

  /** 恢复队列 */
  resume(): void

  /** 检查队列是否暂停 */
  isPaused(): boolean
}

/**
 * 任务队列实现类
 * 提供基于优先级的任务队列管理
 */
export class TaskQueue implements ITaskQueue {
  private tasks: ExtendedAgentTask[] = []
  private taskMap: Map<string, ExtendedAgentTask> = new Map()
  private deduplicationSet: Set<string> = new Set()
  private paused: boolean = false
  private config: Required<TaskQueueConfig>

  constructor(config: TaskQueueConfig = {}) {
    this.config = {
      maxCapacity: config.maxCapacity ?? 1000,
      enablePriority: config.enablePriority ?? true,
      enableDeduplication: config.enableDeduplication ?? false,
      deduplicationKeyGenerator:
        config.deduplicationKeyGenerator ?? ((task) => task.id)
    }
  }

  async enqueue(task: ExtendedAgentTask): Promise<void> {
    if (this.paused) {
      throw new Error('Task queue is paused')
    }

    if (this.tasks.length >= this.config.maxCapacity) {
      throw new Error('Task queue is full')
    }

    if (this.config.enableDeduplication) {
      const key = this.config.deduplicationKeyGenerator(task)
      if (this.deduplicationSet.has(key)) {
        throw new Error(`Task with key ${key} already exists in queue`)
      }
      this.deduplicationSet.add(key)
    }

    this.tasks.push(task)
    this.taskMap.set(task.id, task)

    if (this.config.enablePriority) {
      this.sortByPriority()
    }
  }

  async dequeue(): Promise<ExtendedAgentTask | null> {
    if (this.paused || this.tasks.length === 0) {
      return null
    }

    const task = this.tasks.shift()!
    this.taskMap.delete(task.id)

    if (this.config.enableDeduplication) {
      const key = this.config.deduplicationKeyGenerator(task)
      this.deduplicationSet.delete(key)
    }

    return task
  }

  size(): number {
    return this.tasks.length
  }

  clear(): void {
    this.tasks = []
    this.taskMap.clear()
    this.deduplicationSet.clear()
  }

  getAllTasks(): ExtendedAgentTask[] {
    return [...this.tasks]
  }

  getTask(taskId: string): ExtendedAgentTask | undefined {
    return this.taskMap.get(taskId)
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.taskMap.get(taskId)
    if (!task) {
      return false
    }

    const index = this.tasks.findIndex((t) => t.id === taskId)
    if (index === -1) {
      return false
    }

    this.tasks.splice(index, 1)
    this.taskMap.delete(taskId)

    if (this.config.enableDeduplication) {
      const key = this.config.deduplicationKeyGenerator(task)
      this.deduplicationSet.delete(key)
    }

    task.status = TaskStatus.CANCELLED
    if (task.callbacks?.onCancel) {
      task.callbacks.onCancel(task)
    }

    return true
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
  }

  isPaused(): boolean {
    return this.paused
  }

  /**
   * 根据优先级对任务进行排序
   */
  private sortByPriority(): void {
    this.tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return a.createdAt - b.createdAt
    })
  }
}

/**
 * 任务管理器类
 * 提供任务的创建、调度、依赖解析等功能
 */
export class TaskManager {
  private taskQueue: TaskQueue
  private running: Map<string, ExtendedAgentTask> = new Map()
  private completedTasks: Map<string, ExtendedAgentTask> = new Map()
  private taskCounter: number = 0

  constructor(queueConfig?: TaskQueueConfig) {
    this.taskQueue = new TaskQueue(queueConfig)
  }

  /**
   * 创建新任务
   * @param type - 任务类型
   * @param data - 任务数据
   * @param options - 任务选项
   * @returns 创建的任务
   */
  createTask(
    type: string,
    data: any,
    options: Partial<ExtendedAgentTask> = {}
  ): ExtendedAgentTask {
    const taskId = this.generateTaskId()
    const now = Date.now()

    const task: ExtendedAgentTask = {
      id: taskId,
      type,
      data,
      priority: options.priority ?? TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
      dependencies: options.dependencies ?? [],
      createdAt: now,
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      progress: 0,
      tags: options.tags ?? [],
      metadata: options.metadata ?? {},
      callbacks: options.callbacks
    }

    return task
  }

  /**
   * 提交任务到队列
   * @param task - 要提交的任务
   * @returns Promise<void>
   */
  async submitTask(task: ExtendedAgentTask): Promise<void> {
    await this.taskQueue.enqueue(task)
  }

  /**
   * 批量提交任务
   * @param tasks - 要提交的任务列表
   * @returns Promise<void>
   */
  async submitTasks(tasks: ExtendedAgentTask[]): Promise<void> {
    for (const task of tasks) {
      await this.submitTask(task)
    }
  }

  /**
   * 获取下一个待执行的任务
   * @returns Promise<ExtendedAgentTask | null>
   */
  async getNextTask(): Promise<ExtendedAgentTask | null> {
    return await this.taskQueue.dequeue()
  }

  /**
   * 开始执行任务
   * @param task - 要执行的任务
   * @returns Promise<void>
   */
  async startTask(task: ExtendedAgentTask): Promise<void> {
    if (this.running.has(task.id)) {
      throw new Error(`Task ${task.id} is already running`)
    }

    task.status = TaskStatus.RUNNING
    task.startedAt = Date.now()
    this.running.set(task.id, task)

    if (task.callbacks?.onStart) {
      task.callbacks.onStart(task)
    }
  }

  /**
   * 完成任务
   * @param taskId - 任务 ID
   * @param result - 任务结果
   * @returns Promise<void>
   */
  async completeTask(taskId: string, result: any): Promise<void> {
    const task = this.running.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} is not running`)
    }

    task.status = TaskStatus.COMPLETED
    task.completedAt = Date.now()
    task.result = result
    task.progress = 100

    this.running.delete(taskId)
    this.completedTasks.set(taskId, task)

    if (task.callbacks?.onComplete) {
      task.callbacks.onComplete(task, result)
    }
  }

  /**
   * 任务失败
   * @param taskId - 任务 ID
   * @param error - 错误信息
   * @returns Promise<boolean> - 是否应该重试
   */
  async failTask(taskId: string, error: Error): Promise<boolean> {
    const task = this.running.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} is not running`)
    }

    task.error = error
    task.retryCount = (task.retryCount ?? 0) + 1

    if (task.retryCount! < task.maxRetries!) {
      task.status = TaskStatus.PENDING
      this.running.delete(taskId)
      await this.taskQueue.enqueue(task)
      return true
    }

    task.status = TaskStatus.FAILED
    task.completedAt = Date.now()
    this.running.delete(taskId)
    this.completedTasks.set(taskId, task)

    if (task.callbacks?.onFail) {
      task.callbacks.onFail(task, error)
    }

    return false
  }

  /**
   * 更新任务进度
   * @param taskId - 任务 ID
   * @param progress - 进度值（0-100）
   * @returns void
   */
  updateTaskProgress(taskId: string, progress: number): void {
    const task = this.running.get(taskId)
    if (task) {
      task.progress = Math.max(0, Math.min(100, progress))
      if (task.callbacks?.onProgress) {
        task.callbacks.onProgress(task, task.progress)
      }
    }
  }

  /**
   * 取消任务
   * @param taskId - 任务 ID
   * @returns Promise<boolean>
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const runningTask = this.running.get(taskId)
    if (runningTask) {
      runningTask.status = TaskStatus.CANCELLED
      this.running.delete(taskId)
      if (runningTask.callbacks?.onCancel) {
        runningTask.callbacks.onCancel(runningTask)
      }
      return true
    }

    return await this.taskQueue.cancelTask(taskId)
  }

  /**
   * 解析任务依赖
   * @param task - 要解析的任务
   * @returns Promise<boolean> - 依赖是否已满足
   */
  async resolveDependencies(task: ExtendedAgentTask): Promise<boolean> {
    if (task.dependencies.length === 0) {
      return true
    }

    for (const dependency of task.dependencies) {
      const dependentTask = this.completedTasks.get(dependency.taskId)
      if (!dependentTask) {
        task.status = TaskStatus.WAITING_DEPENDENCIES
        return false
      }

      if (dependency.type === 'conditional' && dependency.condition) {
        if (!dependency.condition(dependentTask.result)) {
          task.status = TaskStatus.CANCELLED
          return false
        }
      }
    }

    return true
  }

  /**
   * 获取任务状态
   * @param taskId - 任务 ID
   * @returns 任务状态或 undefined
   */
  getTaskStatus(taskId: string): TaskStatus | undefined {
    const runningTask = this.running.get(taskId)
    if (runningTask) {
      return runningTask.status
    }

    const completedTask = this.completedTasks.get(taskId)
    if (completedTask) {
      return completedTask.status
    }

    const queuedTask = this.taskQueue.getTask(taskId)
    if (queuedTask) {
      return queuedTask.status
    }

    return undefined
  }

  /**
   * 获取任务
   * @param taskId - 任务 ID
   * @returns 任务或 undefined
   */
  getTask(taskId: string): ExtendedAgentTask | undefined {
    return (
      this.running.get(taskId) ||
      this.completedTasks.get(taskId) ||
      this.taskQueue.getTask(taskId)
    )
  }

  /**
   * 获取队列中的任务数量
   * @returns number
   */
  getQueueSize(): number {
    return this.taskQueue.size()
  }

  /**
   * 获取正在运行的任务数量
   * @returns number
   */
  getRunningTaskCount(): number {
    return this.running.size
  }

  /**
   * 获取已完成的任务数量
   * @returns number
   */
  getCompletedTaskCount(): number {
    return this.completedTasks.size
  }

  /**
   * 清空所有任务
   * @returns void
   */
  clearAll(): void {
    this.taskQueue.clear()
    this.running.clear()
    this.clearCompletedTasks()
  }

  /**
   * 清空已完成的任务
   * @returns void
   */
  clearCompletedTasks(): void {
    this.completedTasks.clear()
  }

  /**
   * 暂停任务队列
   * @returns void
   */
  pause(): void {
    this.taskQueue.pause()
  }

  /**
   * 恢复任务队列
   * @returns void
   */
  resume(): void {
    this.taskQueue.resume()
  }

  /**
   * 检查队列是否暂停
   * @returns boolean
   */
  isPaused(): boolean {
    return this.taskQueue.isPaused()
  }

  /**
   * 生成任务 ID
   * @returns string
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${++this.taskCounter}`
  }
}
