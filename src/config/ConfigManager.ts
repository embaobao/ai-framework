/**
 * 配置管理器主类文件
 * 提供配置的读取、写入、监听、更新、合并和热重载功能
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Config,
  ConfigSection,
  ConfigValue,
  ConfigMetadata,
  ConfigSource,
  ConfigFormat,
  ConfigError,
  ConfigErrorType,
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigOptions
} from './Config';
import { Schema, SchemaRegistry, DefaultSchemaRegistry } from './ConfigSchema';
import {
  ConfigValidator,
  DefaultConfigValidator,
  ValidationResult,
  ValidationOptions
} from './ConfigValidator';
import {
  ConfigLoader,
  DefaultConfigLoader,
  ConfigLoadOptions,
  ConfigLoadResult
} from './ConfigLoader';

/**
 * 配置管理器实现类
 */
export class ConfigManager implements Config {
  /** 配置数据存储 */
  private data: ConfigSection = {};
  /** 配置元数据存储 */
  private metadata: Map<string, ConfigMetadata> = new Map();
  /** 配置加载器 */
  private loader: ConfigLoader;
  /** 配置验证器 */
  private validator: ConfigValidator;
  /** 模式注册表 */
  private schemaRegistry: SchemaRegistry;
  /** 配置变更监听器列表 */
  private listeners: Set<ConfigChangeListener> = new Set();
  /** 配置文件路径 */
  private filePath?: string;
  /** 配置文件格式 */
  private format?: ConfigFormat;
  /** 是否启用热重载 */
  private hotReload: boolean = false;
  /** 文件监视器 */
  private fileWatcher?: fs.FSWatcher;
  /** 是否启用严格模式 */
  private strict: boolean = false;
  /** 配置模式 */
  private schema?: Schema;
  /** 配置选项 */
  private options: ConfigOptions;

  constructor(options: ConfigOptions = {}) {
    this.options = options;
    this.loader = new DefaultConfigLoader();
    this.schemaRegistry = new DefaultSchemaRegistry();
    this.validator = new DefaultConfigValidator(this.schemaRegistry);

    // 异步初始化配置
    this.initialize(options).catch(error => {
      console.error('配置管理器初始化失败:', error);
    });
  }

  /**
   * 初始化配置管理器
   * @param options 配置选项
   */
  private async initialize(options: ConfigOptions): Promise<void> {
    this.filePath = options.filePath;
    this.format = options.format;
    this.hotReload = options.hotReload || false;
    this.strict = options.strict || false;

    // 注册变更监听器
    if (options.onChange) {
      this.addListener(options.onChange);
    }

    // 加载配置
    if (options.filePath || options) {
      await this.load({
        filePath: options.filePath,
        format: options.format,
        envPrefix: options.envPrefix,
        loadFromEnv: options.loadFromEnv,
        loadFromCli: options.loadFromCli,
        remoteUrl: options.remoteUrl,
        remoteAuth: options.remoteAuth
      });
    }

    // 启用热重载
    if (this.hotReload && this.filePath) {
      this.enableHotReload();
    }
  }

  /**
   * 加载配置
   * @param options 加载选项
   */
  async load(options: ConfigLoadOptions = {}): Promise<void> {
    try {
      const result = await this.loader.loadFromSources(options);
      
      // 保存旧配置用于变更检测
      const oldData = { ...this.data };
      
      // 合并新配置
      this.merge(result.config, true);
      
      // 触发变更事件
      this.detectChanges(oldData, this.data);
      
      // 更新文件路径
      if (options.filePath) {
        this.filePath = options.filePath;
      }
      
      // 更新格式
      if (options.format) {
        this.format = options.format;
      }
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      throw new ConfigError(
        ConfigErrorType.LOAD_ERROR,
        '配置加载失败',
        undefined,
        error as Error
      );
    }
  }

  /**
   * 保存配置到文件
   * @param filePath 文件路径（可选，默认使用初始化时的路径）
   */
  async save(filePath?: string): Promise<void> {
    const targetPath = filePath || this.filePath;
    
    if (!targetPath) {
      throw new ConfigError(
        ConfigErrorType.SAVE_ERROR,
        '未指定配置文件路径'
      );
    }

    try {
      // 确保目录存在
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 序列化配置
      const content = this.serialize(this.data, this.format);

      // 写入文件
      fs.writeFileSync(targetPath, content, 'utf-8');
    } catch (error) {
      throw new ConfigError(
        ConfigErrorType.SAVE_ERROR,
        `配置保存失败: ${targetPath}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<void> {
    if (!this.filePath) {
      throw new ConfigError(
        ConfigErrorType.LOAD_ERROR,
        '未指定配置文件路径，无法重新加载'
      );
    }

    await this.load({ filePath: this.filePath, format: this.format });
  }

  /**
   * 启用热重载
   */
  enableHotReload(): void {
    if (!this.filePath) {
      throw new ConfigError(
        ConfigErrorType.LOAD_ERROR,
        '未指定配置文件路径，无法启用热重载'
      );
    }

    if (this.fileWatcher) {
      this.disableHotReload();
    }

    try {
      this.fileWatcher = fs.watch(this.filePath, async (eventType) => {
        if (eventType === 'change') {
          try {
            await this.reload();
          } catch (error) {
            console.error('热重载失败:', error);
          }
        }
      });

      this.hotReload = true;
    } catch (error) {
      throw new ConfigError(
        ConfigErrorType.LOAD_ERROR,
        '启用热重载失败',
        undefined,
        error as Error
      );
    }
  }

  /**
   * 禁用热重载
   */
  disableHotReload(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }
    this.hotReload = false;
  }

  /**
   * 获取配置值
   * @param key 配置键，支持点号分隔的嵌套路径
   * @param defaultValue 默认值
   * @returns 配置值
   */
  get<T = ConfigValue>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.data, key);
    
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      
      if (this.strict) {
        throw new ConfigError(
          ConfigErrorType.KEY_NOT_FOUND,
          `配置键不存在: ${key}`,
          key
        );
      }
      
      return undefined as T;
    }

    return value as T;
  }

  /**
   * 设置配置值
   * @param key 配置键，支持点号分隔的嵌套路径
   * @param value 配置值
   */
  set(key: string, value: ConfigValue): void {
    // 保存旧值
    const oldValue = this.get(key);
    
    // 设置新值
    this.setNestedValue(this.data, key, value);
    
    // 更新元数据
    const metadata = this.metadata.get(key) || {};
    metadata.source = ConfigSource.RUNTIME;
    metadata.modified = true;
    metadata.lastModified = new Date();
    this.metadata.set(key, metadata);
    
    // 触发变更事件
    this.emitChange({
      key,
      oldValue,
      newValue: value,
      type: oldValue === undefined ? 'add' : 'update',
      timestamp: new Date()
    });
  }

  /**
   * 检查配置键是否存在
   * @param key 配置键
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.getNestedValue(this.data, key) !== undefined;
  }

  /**
   * 删除配置项
   * @param key 配置键
   */
  delete(key: string): void {
    // 保存旧值
    const oldValue = this.get(key);
    
    if (oldValue !== undefined) {
      // 删除值
      this.deleteNestedValue(this.data, key);
      
      // 删除元数据
      this.metadata.delete(key);
      
      // 触发变更事件
      this.emitChange({
        key,
        oldValue,
        newValue: undefined,
        type: 'delete',
        timestamp: new Date()
      });
    }
  }

  /**
   * 获取所有配置键
   * @param prefix 键前缀，用于获取特定前缀的所有键
   * @returns 配置键数组
   */
  keys(prefix?: string): string[] {
    const allKeys = this.getAllKeys(this.data, '');
    
    if (!prefix) {
      return allKeys;
    }
    
    return allKeys.filter(key => key.startsWith(prefix));
  }

  /**
   * 获取配置节
   * @param prefix 配置前缀
   * @returns 配置节对象
   */
  getSection(prefix: string): ConfigSection {
    const value = this.get(prefix);
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as ConfigSection;
    }
    
    return {};
  }

  /**
   * 合并配置
   * @param config 要合并的配置对象
   * @param override 是否覆盖现有值
   */
  merge(config: ConfigSection, override: boolean = true): void {
    const oldData = { ...this.data };
    
    if (override) {
      this.deepMerge(this.data, config);
    } else {
      this.deepMerge(config, this.data);
      this.data = config;
    }
    
    // 触发变更事件
    this.detectChanges(oldData, this.data);
  }

  /**
   * 清空所有配置
   */
  clear(): void {
    const oldData = { ...this.data };
    this.data = {};
    this.metadata.clear();
    
    // 触发变更事件
    this.detectChanges(oldData, this.data);
  }

  /**
   * 获取配置元数据
   * @param key 配置键
   * @returns 配置元数据
   */
  getMetadata(key: string): ConfigMetadata | undefined {
    return this.metadata.get(key);
  }

  /**
   * 设置配置元数据
   * @param key 配置键
   * @param metadata 配置元数据
   */
  setMetadata(key: string, metadata: ConfigMetadata): void {
    this.metadata.set(key, metadata);
  }

  /**
   * 获取配置的原始数据
   * @returns 配置对象
   */
  toObject(): ConfigSection {
    return { ...this.data };
  }

  /**
   * 从对象加载配置
   * @param obj 配置对象
   */
  fromObject(obj: ConfigSection): void {
    const oldData = { ...this.data };
    this.data = { ...obj };
    
    // 触发变更事件
    this.detectChanges(oldData, this.data);
  }

  /**
   * 克隆配置
   * @returns 配置的深拷贝
   */
  clone(): Config {
    const cloned = new ConfigManager(this.options);
    cloned.fromObject(this.toObject());
    
    // 克隆元数据
    this.metadata.forEach((metadata, key) => {
      cloned.setMetadata(key, { ...metadata });
    });
    
    return cloned;
  }

  /**
   * 验证配置
   * @param schema 模式定义（可选，使用已注册的模式）
   * @param options 验证选项
   * @returns 验证结果
   */
  validate(schema?: Schema, options?: ValidationOptions): ValidationResult {
    const targetSchema = schema || this.schema;
    
    if (!targetSchema) {
      throw new ConfigError(
        ConfigErrorType.VALIDATION_ERROR,
        '未指定配置模式'
      );
    }

    return this.validator.validate(this.data, targetSchema, options);
  }

  /**
   * 设置配置模式
   * @param schema 模式定义
   */
  setSchema(schema: Schema): void {
    this.schema = schema;
  }

  /**
   * 注册模式
   * @param name 模式名称
   * @param schema 模式定义
   */
  registerSchema(name: string, schema: Schema): void {
    this.schemaRegistry.register(name, schema);
  }

  /**
   * 添加变更监听器
   * @param listener 监听器函数
   */
  addListener(listener: ConfigChangeListener): void {
    this.listeners.add(listener);
  }

  /**
   * 移除变更监听器
   * @param listener 监听器函数
   */
  removeListener(listener: ConfigChangeListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 清除所有监听器
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * 销毁配置管理器
   */
  destroy(): void {
    this.disableHotReload();
    this.clearListeners();
    this.clear();
  }

  /**
   * 获取嵌套值
   * @param obj 对象
   * @param key 键（支持点号分隔）
   * @returns 值
   */
  private getNestedValue(obj: any, key: string): any {
    const parts = key.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * 设置嵌套值
   * @param obj 对象
   * @param key 键（支持点号分隔）
   * @param value 值
   */
  private setNestedValue(obj: any, key: string, value: any): void {
    const parts = key.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * 删除嵌套值
   * @param obj 对象
   * @param key 键（支持点号分隔）
   */
  private deleteNestedValue(obj: any, key: string): void {
    const parts = key.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null) {
        return;
      }
      current = current[part];
    }

    delete current[parts[parts.length - 1]];
  }

  /**
   * 获取所有键
   * @param obj 对象
   * @param prefix 前缀
   * @returns 键数组
   */
  private getAllKeys(obj: any, prefix: string): string[] {
    const keys: string[] = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...this.getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  /**
   * 深度合并对象
   * @param target 目标对象
   * @param source 源对象
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * 检测变更并触发事件
   * @param oldData 旧数据
   * @param newData 新数据
   */
  private detectChanges(oldData: ConfigSection, newData: ConfigSection): void {
    const changes = this.findChanges(oldData, newData, '');
    
    for (const change of changes) {
      this.emitChange(change);
    }
  }

  /**
   * 查找变更
   * @param oldData 旧数据
   * @param newData 新数据
   * @param prefix 前缀
   * @returns 变更事件数组
   */
  private findChanges(oldData: any, newData: any, prefix: string): ConfigChangeEvent[] {
    const changes: ConfigChangeEvent[] = [];
    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {})
    ]);

    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      // 检查是否为对象
      const oldIsObject = typeof oldValue === 'object' && oldValue !== null && !Array.isArray(oldValue);
      const newIsObject = typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue);

      if (oldIsObject && newIsObject) {
        // 递归检查嵌套对象
        changes.push(...this.findChanges(oldValue, newValue, fullKey));
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        // 值发生变化
        let type: 'add' | 'update' | 'delete';
        
        if (oldValue === undefined) {
          type = 'add';
        } else if (newValue === undefined) {
          type = 'delete';
        } else {
          type = 'update';
        }

        changes.push({
          key: fullKey,
          oldValue,
          newValue,
          type,
          timestamp: new Date()
        });
      }
    }

    return changes;
  }

  /**
   * 触发变更事件
   * @param event 变更事件
   */
  private emitChange(event: ConfigChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('配置变更监听器执行失败:', error);
      }
    }
  }

  /**
   * 序列化配置
   * @param config 配置对象
   * @param format 格式
   * @returns 序列化后的字符串
   */
  private serialize(config: ConfigSection, format?: ConfigFormat): string {
    const targetFormat = format || this.format || ConfigFormat.JSON;

    switch (targetFormat) {
      case ConfigFormat.JSON:
        return JSON.stringify(config, null, 2);
      case ConfigFormat.YAML:
        // 需要安装yaml库
        // return yaml.stringify(config);
        return JSON.stringify(config, null, 2);
      case ConfigFormat.TOML:
        // 需要安装toml库
        // return toml.stringify(config);
        return JSON.stringify(config, null, 2);
      case ConfigFormat.INI:
        // 使用INI解析器
        const { IniConfigParser } = require('./ConfigLoader');
        const parser = new IniConfigParser();
        return parser.stringify(config);
      default:
        return JSON.stringify(config, null, 2);
    }
  }
}

/**
 * 配置管理器工厂类
 */
export class ConfigManagerFactory {
  /**
   * 创建配置管理器
   * @param options 配置选项
   * @returns 配置管理器实例
   */
  static async create(options: ConfigOptions = {}): Promise<ConfigManager> {
    const manager = new ConfigManager(options);
    return manager;
  }

  /**
   * 从文件创建配置管理器
   * @param filePath 文件路径
   * @param format 文件格式
   * @returns 配置管理器实例
   */
  static async fromFile(filePath: string, format?: ConfigFormat): Promise<ConfigManager> {
    return this.create({
      filePath,
      format
    });
  }

  /**
   * 从环境变量创建配置管理器
   * @param prefix 环境变量前缀
   * @returns 配置管理器实例
   */
  static async fromEnv(prefix?: string): Promise<ConfigManager> {
    return this.create({
      loadFromEnv: true,
      envPrefix: prefix
    });
  }

  /**
   * 从对象创建配置管理器
   * @param config 配置对象
   * @returns 配置管理器实例
   */
  static fromObject(config: ConfigSection): ConfigManager {
    const manager = new ConfigManager();
    manager.fromObject(config);
    return manager;
  }
}
