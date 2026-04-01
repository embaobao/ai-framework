/**
 * 配置接口定义文件
 * 定义了配置系统的核心类型和接口
 */

/**
 * 配置值类型
 * 支持基本类型、对象、数组等
 */
export type ConfigValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | ConfigValue[] 
  | { [key: string]: ConfigValue };

/**
 * 配置节类型
 * 表示配置的一个部分或分组
 */
export type ConfigSection = {
  [key: string]: ConfigValue;
};

/**
 * 配置元数据接口
 * 包含配置项的描述信息
 */
export interface ConfigMetadata {
  /** 配置项的描述 */
  description?: string;
  /** 配置项的类型 */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 是否为必需项 */
  required?: boolean;
  /** 默认值 */
  default?: ConfigValue;
  /** 可选值列表 */
  enum?: ConfigValue[];
  /** 最小值（数字）或最小长度（字符串/数组） */
  min?: number;
  /** 最大值（数字）或最大长度（字符串/数组） */
  max?: number;
  /** 正则表达式验证（字符串） */
  pattern?: RegExp;
  /** 自定义验证函数 */
  validator?: (value: ConfigValue) => boolean | string;
  /** 是否敏感信息（如密码、密钥） */
  sensitive?: boolean;
  /** 配置项的来源 */
  source?: ConfigSource;
  /** 配置项是否被修改过 */
  modified?: boolean;
  /** 配置项的最后修改时间 */
  lastModified?: Date;
}

/**
 * 配置源类型
 * 表示配置的来源渠道
 */
export enum ConfigSource {
  /** 默认配置 */
  DEFAULT = 'default',
  /** 配置文件 */
  FILE = 'file',
  /** 环境变量 */
  ENV = 'env',
  /** 命令行参数 */
  CLI = 'cli',
  /** 远程配置 */
  REMOTE = 'remote',
  /** 运行时设置 */
  RUNTIME = 'runtime'
}

/**
 * 配置文件格式类型
 */
export enum ConfigFormat {
  /** JSON格式 */
  JSON = 'json',
  /** YAML格式 */
  YAML = 'yaml',
  /** TOML格式 */
  TOML = 'toml',
  /** INI格式 */
  INI = 'ini'
}

/**
 * 配置接口
 * 主配置接口，定义了配置系统的核心功能
 */
export interface Config {
  /**
   * 获取配置值
   * @param key 配置键，支持点号分隔的嵌套路径
   * @param defaultValue 默认值
   * @returns 配置值
   */
  get<T = ConfigValue>(key: string, defaultValue?: T): T;

  /**
   * 设置配置值
   * @param key 配置键，支持点号分隔的嵌套路径
   * @param value 配置值
   */
  set(key: string, value: ConfigValue): void;

  /**
   * 检查配置键是否存在
   * @param key 配置键
   * @returns 是否存在
   */
  has(key: string): boolean;

  /**
   * 删除配置项
   * @param key 配置键
   */
  delete(key: string): void;

  /**
   * 获取所有配置键
   * @param prefix 键前缀，用于获取特定前缀的所有键
   * @returns 配置键数组
   */
  keys(prefix?: string): string[];

  /**
   * 获取配置节
   * @param prefix 配置前缀
   * @returns 配置节对象
   */
  getSection(prefix: string): ConfigSection;

  /**
   * 合并配置
   * @param config 要合并的配置对象
   * @param override 是否覆盖现有值
   */
  merge(config: ConfigSection, override?: boolean): void;

  /**
   * 清空所有配置
   */
  clear(): void;

  /**
   * 获取配置元数据
   * @param key 配置键
   * @returns 配置元数据
   */
  getMetadata(key: string): ConfigMetadata | undefined;

  /**
   * 设置配置元数据
   * @param key 配置键
   * @param metadata 配置元数据
   */
  setMetadata(key: string, metadata: ConfigMetadata): void;

  /**
   * 获取配置的原始数据
   * @returns 配置对象
   */
  toObject(): ConfigSection;

  /**
   * 从对象加载配置
   * @param obj 配置对象
   */
  fromObject(obj: ConfigSection): void;

  /**
   * 克隆配置
   * @returns 配置的深拷贝
   */
  clone(): Config;
}

/**
 * 配置变更事件接口
 */
export interface ConfigChangeEvent {
  /** 变更的配置键 */
  key: string;
  /** 旧值 */
  oldValue: ConfigValue;
  /** 新值 */
  newValue: ConfigValue;
  /** 变更类型 */
  type: 'add' | 'update' | 'delete';
  /** 变更时间 */
  timestamp: Date;
}

/**
 * 配置变更监听器类型
 */
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;

/**
 * 配置错误类型
 */
export enum ConfigErrorType {
  /** 配置文件不存在 */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  /** 配置文件解析错误 */
  PARSE_ERROR = 'PARSE_ERROR',
  /** 配置验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 配置键不存在 */
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  /** 配置类型错误 */
  TYPE_ERROR = 'TYPE_ERROR',
  /** 配置值超出范围 */
  RANGE_ERROR = 'RANGE_ERROR',
  /** 配置加载错误 */
  LOAD_ERROR = 'LOAD_ERROR',
  /** 配置保存错误 */
  SAVE_ERROR = 'SAVE_ERROR'
}

/**
 * 配置错误类
 */
export class ConfigError extends Error {
  /** 错误类型 */
  public readonly type: ConfigErrorType;
  /** 配置键 */
  public readonly key?: string;
  /** 原始错误 */
  public readonly cause?: Error;

  constructor(
    type: ConfigErrorType,
    message: string,
    key?: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'ConfigError';
    this.type = type;
    this.key = key;
    this.cause = cause;
  }
}

/**
 * 配置选项接口
 */
export interface ConfigOptions {
  /** 配置文件路径 */
  filePath?: string;
  /** 配置文件格式 */
  format?: ConfigFormat;
  /** 是否启用热重载 */
  hotReload?: boolean;
  /** 是否启用严格模式 */
  strict?: boolean;
  /** 是否启用缓存 */
  cache?: boolean;
  /** 环境变量前缀 */
  envPrefix?: string;
  /** 是否从环境变量加载 */
  loadFromEnv?: boolean;
  /** 是否从命令行参数加载 */
  loadFromCli?: boolean;
  /** 远程配置URL */
  remoteUrl?: string;
  /** 远程配置认证信息 */
  remoteAuth?: {
    username?: string;
    password?: string;
    token?: string;
  };
  /** 配置变更监听器 */
  onChange?: ConfigChangeListener;
}
