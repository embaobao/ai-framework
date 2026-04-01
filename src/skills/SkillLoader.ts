/**
 * 技能加载器
 * 
 * 负责从文件系统加载技能，支持技能验证、缓存和热重载
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { Skill } from './Skill'
import type { Logger } from '../logger/Logger'

/**
 * 技能加载器配置
 */
export interface SkillLoaderConfig {
  /** 是否启用缓存 */
  enableCache?: boolean
  /** 是否启用热重载 */
  enableHotReload?: boolean
  /** 技能文件扩展名 */
  extensions?: string[]
  /** 缓存过期时间（毫秒） */
  cacheExpiry?: number
}

/**
 * 技能加载结果
 */
export interface SkillLoadResult {
  /** 加载的技能 */
  skills: Skill[]
  /** 加载的文件路径 */
  filePaths: string[]
  /** 加载耗时（毫秒） */
  duration: number
}

/**
 * 技能验证结果
 */
export interface SkillValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误信息 */
  errors: string[]
  /** 警告信息 */
  warnings: string[]
}

/**
 * 技能缓存项
 */
interface SkillCacheItem {
  /** 技能实例 */
  skill: Skill
  /** 加载时间 */
  loadTime: number
  /** 文件路径 */
  filePath: string
  /** 文件修改时间 */
  fileMtime: number
}

/**
 * 技能加载器类
 */
export class SkillLoader {
  private config: SkillLoaderConfig
  private logger: Logger
  private cache: Map<string, SkillCacheItem> = new Map()
  private watchers: Map<string, ReturnType<typeof fs.watch>> = new Map()
  private initialized: boolean = false

  constructor(logger: Logger, config: SkillLoaderConfig = {}) {
    this.logger = logger
    this.config = {
      enableCache: true,
      enableHotReload: false,
      extensions: ['.js', '.ts', '.json'],
      cacheExpiry: 3600000, // 1小时
      ...config,
    }
  }

  /**
   * 初始化加载器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    this.logger.info('Initializing Skill Loader...')
    this.initialized = true
    this.logger.info('Skill Loader initialized')
  }

  /**
   * 从指定路径加载技能
   * @param filePath 文件或目录路径
   * @returns 加载的技能数组
   */
  async loadFromPath(filePath: string): Promise<Skill[]> {
    const startTime = Date.now()

    try {
      const stats = await fs.stat(filePath)

      if (stats.isDirectory()) {
        // 从目录加载
        return await this.loadFromDirectory(filePath)
      } else if (stats.isFile()) {
        // 从单个文件加载
        const skill = await this.loadFromFile(filePath)
        return skill ? [skill] : []
      } else {
        throw new Error(`Path is neither a file nor a directory: ${filePath}`)
      }
    } catch (error) {
      this.logger.error(`Failed to load skills from ${filePath}:`, error)
      throw error
    } finally {
      const duration = Date.now() - startTime
      this.logger.debug(`Loading skills from ${filePath} took ${duration}ms`)
    }
  }

  /**
   * 从目录加载技能
   * @param directoryPath 目录路径
   * @returns 加载的技能数组
   */
  async loadFromDirectory(directoryPath: string): Promise<Skill[]> {
    const skills: Skill[] = []

    try {
      // 递归查找所有技能文件
      const files = await this.findSkillFiles(directoryPath)

      // 加载每个文件
      for (const file of files) {
        try {
          const skill = await this.loadFromFile(file)
          if (skill) {
            skills.push(skill)
          }
        } catch (error) {
          this.logger.error(`Failed to load skill from ${file}:`, error)
          // 继续加载其他文件
        }
      }

      this.logger.info(`Loaded ${skills.length} skills from directory: ${directoryPath}`)
      return skills
    } catch (error) {
      this.logger.error(`Failed to load skills from directory ${directoryPath}:`, error)
      throw error
    }
  }

  /**
   * 从文件加载技能
   * @param filePath 文件路径
   * @returns 加载的技能实例，如果失败则返回 undefined
   */
  async loadFromFile(filePath: string): Promise<Skill | undefined> {
    try {
      // 检查缓存
      if (this.config.enableCache) {
        const cached = this.getFromCache(filePath)
        if (cached) {
          this.logger.debug(`Skill loaded from cache: ${filePath}`)
          return cached
        }
      }

      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8')
      const ext = path.extname(filePath)

      // 根据文件扩展名加载
      let skill: Skill | undefined
      if (ext === '.json') {
        skill = await this.loadFromJson(content, filePath)
      } else if (ext === '.js' || ext === '.ts') {
        skill = await this.loadFromModule(filePath)
      } else {
        throw new Error(`Unsupported file extension: ${ext}`)
      }

      if (skill) {
        // 验证技能
        const validation = await this.validateSkill(skill)
        if (!validation.valid) {
          throw new Error(`Skill validation failed: ${validation.errors.join(', ')}`)
        }

        // 添加到缓存
        if (this.config.enableCache) {
          await this.addToCache(skill, filePath)
        }

        // 设置文件监视器（热重)
        if (this.config.enableHotReload) {
          await this.setupFileWatcher(filePath)
        }

        this.logger.debug(`Skill loaded from file: ${filePath}`)
      }

      return skill
    } catch (error) {
      this.logger.error(`Failed to load skill from file ${filePath}:`, error)
      throw error
    }
  }

  /**
   * 从 JSON 内容加载技能
   * @param content JSON 内容
   * @param filePath 文件路径
   * @returns 加载的技能实例
   */
  private async loadFromJson(content: string, filePath: string): Promise<Skill | undefined> {
    try {
      const config = JSON.parse(content)

      // 验证配置
      if (!config.name || !config.version) {
        throw new Error('Invalid skill configuration: missing name or version')
      }

      // 创建技能实例（这里需要根据实际需求实现）
      // 这是一个示例实现，实际使用时需要根据具体的技能类来实现
      this.logger.warn(`JSON skill loading not fully implemented for: ${filePath}`)
      return undefined
    } catch (error) {
      this.logger.error(`Failed to parse JSON skill from ${filePath}:`, error)
      throw error
    }
  }

  /**
   * 从模块加载技能
   * @param filePath 文件路径
   * @returns 加载的技能实例
   */
  private async loadFromModule(filePath: string): Promise<Skill | undefined> {
    try {
      // 动态导入模块
      const module = await import(filePath)

      // 查找默认导出或特定的技能导出
      let skill: Skill | undefined

      if (module.default && typeof module.default === 'function') {
        // 默认导出是工厂函数
        skill = module.default()
      } else if (module.default && typeof module.default.execute === 'function') {
        // 默认导出是技能实例
        skill = module.default
      } else if (module.Skill && typeof module.Skill === 'function') {
        // 命名导出是工厂函数
        skill = module.Skill()
      } else {
        throw new Error('Module does not export a valid skill')
      }

      return skill
    } catch (error) {
      this.logger.error(`Failed to load skill module from ${filePath}:`, error)
      throw error
    }
  }

  /**
   * 验证技能
   * @param skill 技能实例
   * @returns 验证结果
   */
  async validateSkill(skill: Skill): Promise<SkillValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // 检查必需的属性
      if (!skill.name) {
        errors.push('Skill name is required')
      }

      if (!skill.config) {
        errors.push('Skill config is required')
      }

      if (!skill.config.version) {
        errors.push('Skill version is required')
      }

      // 检查必需的方法
      if (typeof skill.execute !== 'function') {
        errors.push('Skill must implement execute method')
      }

      if (typeof skill.initialize !== 'function') {
        errors.push('Skill must implement initialize method')
      }

      if (typeof skill.cleanup !== 'function') {
        errors.push('Skill must implement cleanup method')
      }

      // 检查技能名称格式
      if (skill.name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(skill.name)) {
        errors.push('Skill name must start with a letter and contain only letters, numbers, hyphens, and underscores')
      }

      // 检查版本格式
      if (skill.config.version && !/^\d+\.\d+\.\d+$/.test(skill.config.version)) {
        warnings.push('Skill version should follow semantic versioning (e.g., 1.0.0)')
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      }
    } catch (error) {
      this.logger.error('Error during skill validation:', error)
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
      }
    }
  }

  /**
   * 重新加载技能
   * @param skillName 技能名称
   * @returns 重新加载的技能实例
   */
  async reload(skillName: string): Promise<Skill | undefined> {
    if (!this.config.enableHotReload) {
      throw new Error('Hot reload is not enabled')
    }

    // 查找缓存中的技能
    for (const [filePath, cacheItem] of this.cache.entries()) {
      if (cacheItem.skill.name === skillName) {
        // 清除旧缓存
        this.cache.delete(filePath)

        // 重新加载
        return await this.loadFromFile(filePath)
      }
    }

    throw new Error(`Skill '${skillName}' not found in cache`)
  }

  /**
   * 查找技能文件
   * @param directoryPath 目录路径
   * @returns 技能文件路径数组
   */
  private async findSkillFiles(directoryPath: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name)

        if (entry.isDirectory()) {
          // 递归查找子目录
          const subFiles = await this.findSkillFiles(fullPath)
          files.push(...subFiles)
        } else if (entry.isFile()) {
          // 检查文件扩展名
          const ext = path.extname(entry.name)
          if (this.config.extensions?.includes(ext)) {
            files.push(fullPath)
          }
        }
      }

      return files
    } catch (error) {
      this.logger.error(`Failed to find skill files in ${directoryPath}:`, error)
      throw error
    }
  }

  /**
   * 添加到缓存
   * @param skill 技能实例
   * @param filePath 文件路径
   */
  private async addToCache(skill: Skill, filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)

      this.cache.set(filePath, {
        skill,
        loadTime: Date.now(),
        filePath,
        fileMtime: stats.mtimeMs,
      })

      this.logger.debug(`Skill added to cache: ${skill.name}`)
    } catch (error) {
      this.logger.error(`Failed to add skill to cache:`, error)
    }
  }

  /**
   * 从缓存获取
   * @param filePath 文件路径
   * @returns 缓存的技能实例，如果不存在或已过期则返回 undefined
   */
  private getFromCache(filePath: string): Skill | undefined {
    const cacheItem = this.cache.get(filePath)

    if (!cacheItem) {
      return undefined
    }

    // 检查缓存是否过期
    const cacheAge = Date.now() - cacheItem.loadTime
    if (cacheAge > (this.config.cacheExpiry || 3600000)) {
      this.cache.delete(filePath)
      return undefined
    }

    return cacheItem.skill
  }

  /**
   * 清除缓存
   * @param filePath 可选的文件路径，如果不提供则清除所有缓存
   */
  clearCache(filePath?: string): void {
    if (filePath) {
      this.cache.delete(filePath)
      this.logger.debug(`Cache cleared for: ${filePath}`)
    } else {
      this.cache.clear()
      this.logger.debug('All cache cleared')
    }
  }

  /**
   * 设置文件监视器（用于热重载）
   * @param filePath 文件路径
   */
  private async setupFileWatcher(filePath: string): Promise<void> {
    try {
      // 清除现有的监视器
      if (this.watchers.has(filePath)) {
        await this.watchers.get(filePath)?.close()
      }

      // 创建新的监视器
      const watcher = fs.watch(filePath, async (eventType) => {
        if (eventType === 'change') {
          this.logger.info(`File changed, reloading skill: ${filePath}`)
          try {
            await this.reload(path.basename(filePath, path.extname(filePath)))
          } catch (error) {
            this.logger.error(`Failed to reload skill: ${filePath}`, error)
          }
        }
      })

      this.watchers.set(filePath, watcher)
      this.logger.debug(`File watcher set up for: ${filePath}`)
    } catch (error) {
      this.logger.error(`Failed to set up file watcher for ${filePath}:`, error)
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Skill Loader...')

    try {
      // 关闭所有文件监视器
      for (const [filePath, watcher] of this.watchers.entries()) {
        try {
          await watcher.close()
          this.logger.debug(`File watcher closed for: ${filePath}`)
        } catch (error) {
          this.logger.error(`Failed to close file watcher for ${filePath}:`, error)
        }
      }
      this.watchers.clear()

      // 清除缓存
      this.cache.clear()

      this.initialized = false
      this.logger.info('Skill Loader cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
      throw error
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  getCacheStats(): {
    size: number
    keys: string[]
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}
