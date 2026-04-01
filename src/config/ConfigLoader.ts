/**
 * 配置加载器文件
 * 提供从多种来源加载配置的功能，包括文件、环境变量、远程配置等
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigSection, ConfigValue, ConfigError, ConfigErrorType, ConfigFormat, ConfigSource } from './Config';

/**
 * 配置加载选项接口
 */
export interface ConfigLoadOptions {
  /** 配置文件路径 */
  filePath?: string;
  /** 配置文件格式 */
  format?: ConfigFormat;
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
  /** 远程配置超时时间（毫秒） */
  remoteTimeout?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpire?: number;
}

/**
 * 配置加载结果接口
 */
export interface ConfigLoadResult {
  /** 加载的配置 */
  config: ConfigSection;
  /** 配置来源 */
  source: ConfigSource;
  /** 加载时间 */
  timestamp: Date;
  /** 是否来自缓存 */
  cached: boolean;
}

/**
 * 配置解析器接口
 */
export interface ConfigParser {
  /** 解析配置字符串 */
  parse(content: string): ConfigSection;
  /** 序列化配置对象 */
  stringify(config: ConfigSection): string;
  /** 文件扩展名 */
  extension: string;
}

/**
 * JSON配置解析器
 */
export class JsonConfigParser implements ConfigParser {
  extension = '.json';

  parse(content: string): ConfigSection {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new ConfigError(
        ConfigErrorType.PARSE_ERROR,
        'JSON解析失败',
        undefined,
        error as Error
      );
    }
  }

  stringify(config: ConfigSection): string {
    return JSON.stringify(config, null, 2);
  }
}

/**
 * YAML配置解析器
 */
export class YamlConfigParser implements ConfigParser {
  extension = '.yaml';

  parse(content: string): ConfigSection {
    try {
      // 这里需要安装yaml库
      // import * as yaml from 'yaml';
      // return yaml.parse(content);
      // 临时实现：尝试使用JSON格式
      return JSON.parse(content);
    } catch (error) {
      throw new ConfigError(
        ConfigErrorType.PARSE_ERROR,
        'YAML解析失败',
        undefined,
        error as Error
      );
    }
  }

  stringify(config: ConfigSection): string {
    // 这里需要安装yaml库
    // import * as yaml from 'yaml';
    // return yaml.stringify(config);
    // 临时实现：使用JSON格式
    return JSON.stringify(config, null, 2);
  }
}

/**
 * TOML配置解析器
 */
export class TomlConfigParser implements ConfigParser {
  extension = '.toml';

  parse(content: string): ConfigSection {
    try {
      // 这里需要安装toml库
      // import * as toml from '@iarna/toml';
      // return toml.parse(content);
      // 临时实现：尝试使用JSON格式
      return JSON.parse(content);
    } catch (error) {
      throw new ConfigError(
        ConfigErrorType.PARSE_ERROR,
        'TOML解析失败',
        undefined,
        error as Error
      );
    }
  }

  stringify(config: ConfigSection): string {
    // 这里需要安装toml库
    // import * as toml from '@iarna/toml';
    // return toml.stringify(config);
    // 临时实现：使用JSON格式
    return JSON.stringify(config, null, 2);
  }
}

/**
 * INI配置解析器
 */
export class IniConfigParser implements ConfigParser {
  extension = '.ini';

  parse(content: string): ConfigSection {
    try {
      const config: ConfigSection = {};
      const lines = content.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 跳过空行和注释
        if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
          continue;
        }

        // 处理节
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
          currentSection = trimmedLine.slice(1, -1).trim();
          if (!config[currentSection]) {
            config[currentSection] = {};
          }
          continue;
        }

        // 处理键值对
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          const trimmedKey = key.trim();

          if (currentSection) {
            (config[currentSection] as ConfigSection)[trimmedKey] = this.parseValue(value);
          } else {
            config[trimmedKey] = this.parseValue(value);
          }
        }
      }

      return config;
    } catch (error) {
      throw new ConfigError(
        ConfigErrorType.PARSE_ERROR,
        'INI解析失败',
        undefined,
        error as Error
      );
    }
  }

  stringify(config: ConfigSection): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 处理节
        lines.push(`[${key}]`);
        for (const [subKey, subValue] of Object.entries(value as ConfigSection)) {
          lines.push(`${subKey}=${this.stringifyValue(subValue)}`);
        }
        lines.push('');
      } else {
        // 处理顶级键值对
        lines.push(`${key}=${this.stringifyValue(value)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 解析INI值
   * @param value 值字符串
   * @returns 解析后的值
   */
  private parseValue(value: string): ConfigValue {
    // 尝试解析为数字
    if (/^-?\d+\.?\d*$/.test(value)) {
      return parseFloat(value);
    }

    // 尝试解析为布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // 尝试解析为字符串（去除引号）
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    return value;
  }

  /**
   * 序列化INI值
   * @param value 值
   * @returns 序列化后的字符串
   */
  private stringifyValue(value: ConfigValue): string {
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  }
}

/**
 * 配置加载器接口
 */
export interface ConfigLoader {
  /** 从文件加载配置 */
  loadFromFile(filePath: string, format?: ConfigFormat): Promise<ConfigLoadResult>;
  /** 从环境变量加载配置 */
  loadFromEnv(prefix?: string): ConfigLoadResult;
  /** 从命令行参数加载配置 */
  loadFromCli(): ConfigLoadResult;
  /** 从远程URL加载配置 */
  loadFromRemote(url: string, auth?: { username?: string; password?: string; token?: string }): Promise<ConfigLoadResult>;
  /** 从多个来源加载配置 */
  loadFromSources(options: ConfigLoadOptions): Promise<ConfigLoadResult>;
  /** 清除缓存 */
  clearCache(): void;
}

/**
 * 默认配置加载器实现
 */
export class DefaultConfigLoader implements ConfigLoader {
  /** 解析器注册表 */
  private parsers: Map<ConfigFormat, ConfigParser> = new Map();
  /** 配置缓存 */
  private cache: Map<string, { data: ConfigLoadResult; expireTime: number }> = new Map();
  /** 默认缓存过期时间（5分钟） */
  private readonly DEFAULT_CACHE_EXPIRE = 5 * 60 * 1000;

  constructor() {
    // 注册默认解析器
    this.registerParser(ConfigFormat.JSON, new JsonConfigParser());
    this.registerParser(ConfigFormat.YAML, new YamlConfigParser());
    this.registerParser(ConfigFormat.TOML, new TomlConfigParser());
    this.registerParser(ConfigFormat.INI, new IniConfigParser());
  }

  /**
   * 注册解析器
   * @param format 配置格式
   * @param parser 解析器
   */
  registerParser(format: ConfigFormat, parser: ConfigParser): void {
    this.parsers.set(format, parser);
  }

  /**
   * 从文件加载配置
   * @param filePath 文件路径
   * @param format 配置格式
   * @returns 加载结果
   */
  async loadFromFile(filePath: string, format?: ConfigFormat): Promise<ConfigLoadResult> {
    // 检查缓存
    const cacheKey = `file:${filePath}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new ConfigError(
        ConfigErrorType.FILE_NOT_FOUND,
        `配置文件不存在: ${filePath}`
      );
    }

    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf-8');

    // 自动检测格式
    const detectedFormat = format || this.detectFormat(filePath);

    // 获取解析器
    const parser = this.parsers.get(detectedFormat);
    if (!parser) {
      throw new ConfigError(
        ConfigErrorType.PARSE_ERROR,
        `不支持的配置格式: ${detectedFormat}`
      );
    }

    // 解析配置
    const config = parser.parse(content);

    const result: ConfigLoadResult = {
      config,
      source: ConfigSource.FILE,
      timestamp: new Date(),
      cached: false
    };

    // 缓存结果
    this.setToCache(cacheKey, result);

    return result;
  }

  /**
   * 从环境变量加载配置
   * @param prefix 环境变量前缀
   * @returns 加载结果
   */
  loadFromEnv(prefix: string = ''): ConfigLoadResult {
    const config: ConfigSection = {};
    const envVars = process.env;

    for (const [key, value] of Object.entries(envVars)) {
      // 过滤前缀
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }

      // 转换环境变量名为配置键
      const configKey = this.envToConfigKey(key, prefix);
      
      // 解析值
      const parsedValue = this.parseEnvValue(value);
      
      // 设置嵌套配置
      this.setNestedValue(config, configKey, parsedValue);
    }

    return {
      config,
      source: ConfigSource.ENV,
      timestamp: new Date(),
      cached: false
    };
  }

  /**
   * 从命令行参数加载配置
   * @returns 加载结果
   */
  loadFromCli(): ConfigLoadResult {
    const config: ConfigSection = {};
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // 处理 --key=value 格式
      if (arg.startsWith('--') && arg.includes('=')) {
        const [key, value] = arg.slice(2).split('=');
        this.setNestedValue(config, key, this.parseEnvValue(value));
      }
      // 处理 --key value 格式
      else if (arg.startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
        const key = arg.slice(2);
        const value = args[i + 1];
        this.setNestedValue(config, key, this.parseEnvValue(value));
        i++;
      }
    }

    return {
      config,
      source: ConfigSource.CLI,
      timestamp: new Date(),
      cached: false
    };
  }

  /**
   * 从远程URL加载配置
   * @param url 远程URL
   * @param auth 认证信息
   * @returns 加载结果
   */
  async loadFromRemote(
    url: string,
    auth?: { username?: string; password?: string; token?: string }
  ): Promise<ConfigLoadResult> {
    // 检查缓存
    const cacheKey = `remote:${url}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 构建请求头
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      // 添加认证信息
      if (auth?.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      } else if (auth?.username && auth?.password) {
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      // 发送请求
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new ConfigError(
          ConfigErrorType.LOAD_ERROR,
          `远程配置加载失败: ${response.status} ${response.statusText}`
        );
      }

      // 解析响应
      const contentType = response.headers.get('content-type') || '';
      let config: ConfigSection;

      if (contentType.includes('application/json')) {
        config = await response.json();
      } else {
        const text = await response.text();
        config = JSON.parse(text);
      }

      const result: ConfigLoadResult = {
        config,
        source: ConfigSource.REMOTE,
        timestamp: new Date(),
        cached: false
      };

      // 缓存结果
      this.setToCache(cacheKey, result);

      return result;
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      throw new ConfigError(
        ConfigErrorType.LOAD_ERROR,
        `远程配置加载失败: ${error}`,
        undefined,
        error as Error
      );
    }
  }

  /**
   * 从多个来源加载配置
   * @param options 加载选项
   * @returns 加载结果
   */
  async loadFromSources(options: ConfigLoadOptions): Promise<ConfigLoadResult> {
    const configs: ConfigLoadResult[] = [];

    // 从文件加载
    if (options.filePath) {
      try {
        const fileConfig = await this.loadFromFile(options.filePath, options.format);
        configs.push(fileConfig);
      } catch (error) {
        if (error instanceof ConfigError && error.type === ConfigErrorType.FILE_NOT_FOUND) {
          // 文件不存在，跳过
          console.warn(`配置文件不存在: ${options.filePath}`);
        } else {
          throw error;
        }
      }
    }

    // 从环境变量加载
    if (options.loadFromEnv) {
      const envConfig = this.loadFromEnv(options.envPrefix);
      configs.push(envConfig);
    }

    //从命令行参数加载
    if (options.loadFromCli) {
      const cliConfig = this.loadFromCli();
      configs.push(cliConfig);
    }

    // 从远程加载
    if (options.remoteUrl) {
      const remoteConfig = await this.loadFromRemote(options.remoteUrl, options.remoteAuth);
      configs.push(remoteConfig);
    }

    // 合并配置（后面的覆盖前面的）
    const mergedConfig: ConfigSection = {};
    for (const configResult of configs) {
      this.deepMerge(mergedConfig, configResult.config);
    }

    return {
      config: mergedConfig,
      source: ConfigSource.FILE,
      timestamp: new Date(),
      cached: false
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 检测配置文件格式
   * @param filePath 文件路径
   * @returns 配置格式
   */
  private detectFormat(filePath: string): ConfigFormat {
    const ext = path.extname(filePath).toLowerCase();

    const formatMap: Record<string, ConfigFormat> = {
      '.json': ConfigFormat.JSON,
      '.yaml': ConfigFormat.YAML,
      '.yml': ConfigFormat.YAML,
      '.toml': ConfigFormat.TOML,
      '.ini': ConfigFormat.INI
    };

    return formatMap[ext] || ConfigFormat.JSON;
  }

  /**
   * 将环境变量名转换为配置键
   * @param envKey 环境变量名
   * @param prefix 前缀
   * @returns 配置键
   */
  private envToConfigKey(envKey: string, prefix: string = ''): string {
    // 移除前缀
    let key = envKey;
    if (prefix && key.startsWith(prefix)) {
      key = key.slice(prefix.length);
    }

    // 转换为小写并替换下划线为点号
    return key.toLowerCase().replace(/_/g, '.');
  }

  /**
   * 解析环境变量值
   * @param value 环境变量值
   * @returns 解析后的值
   */
  private parseEnvValue(value: string | undefined): ConfigValue {
    if (value === undefined || value === '') {
      return '';
    }

    // 尝试解析为JSON
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        // 不是有效的JSON，继续尝试其他解析方式
      }
    }

    // 尝试解析为数字
    if (/^-?\d+\.?\d*$/.test(value)) {
      return parseFloat(value);
    }

    // 尝试解析为布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    return value;
  }

  /**
   * 设置嵌套配置值
   * @param config 配置对象
   * @param key 配置键（支持点号分隔）
   * @param value 配置值
   */
  private setNestedValue(config: ConfigSection, key: string, value: ConfigValue): void {
    const parts = key.split('.');
    let current: any = config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * 深度合并对象
   * @param target 目标对象
   * @param source 源对象
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * 从缓存获取数据
   * @param key 缓存键
   * @returns 缓存的数据或undefined
   */
  private getFromCache(key: string): ConfigLoadResult | undefined {
    const cached = this.cache.get(key);
    if (!cached) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > cached.expireTime) {
      this.cache.delete(key);
      return undefined;
    }

    return { ...cached.data, cached: true };
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 数据
   * @param expireTime 过期时间（毫秒）
   */
  private setToCache(key: string, data: ConfigLoadResult, expireTime?: number): void {
    const expire = expireTime || this.DEFAULT_CACHE_EXPIRE;
    this.cache.set(key, {
      data,
      expireTime: Date.now() + expire
    });
  }
}
