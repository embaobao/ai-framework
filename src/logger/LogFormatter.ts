/**
 * 日志格式化器文件
 * 提供多种日志格式化方式
 */

import { LogEntry, LogLevel, LogLevelNames, LogLevelColors, COLOR_RESET } from './Logger';

/**
 * 时间戳格式枚举
 */
export enum TimestampFormat {
  /** ISO 8601 格式 */
  ISO = 'iso',
  /** Unix 时间戳（秒） */
  UNIX = 'unix',
  /** Unix 时间戳（毫秒） */
  UNIX_MS = 'unix-ms',
  /** 本地时间字符串 */
  LOCAL = 'local',
  /** UTC 时间字符串 */
  UTC = 'utc',
  /** 自定义格式 */
  CUSTOM = 'custom'
}

/**
 * 格式化器选项接口
 */
export interface FormatterOptions {
  /** 时间戳格式 */
  timestampFormat?: TimestampFormat;
  /** 自定义时间戳格式（当 timestampFormat 为 CUSTOM 时使用） */
  customTimestampFormat?: string;
  /** 是否包含日志级别 */
  includeLevel?: boolean;
  /** 是否包含时间戳 */
  includeTimestamp?: boolean;
  /** 是否包含来源 */
  includeSource?: boolean;
  /**/** 是否包含标签 */
  includeTags?: boolean;
  /** 是否包含数据 */
  includeData?: boolean;
  /** 是否包含错误信息 */
  includeError?: boolean;
  /** 是否包含堆栈 */
  includeStack?: boolean;
  /** 是否包含日志ID */
  includeId?: boolean;
  /** 是否包含请求ID */
  includeRequestId?: boolean;
  /** 是否包含用户ID */
  includeUserId?: boolean;
  /** 是否包含会话ID */
  includeSessionId?: boolean;
  /** 是否使用颜色 */
  useColors?: boolean;
  /** 缩进空格数 */
  indent?: number;
}

/**
 * 日志格式化器接口
 */
export interface LogFormatter {
  /**
   * 格式化日志条目
   * @param entry 日志条目
   * @returns 格式化后的字符串
   */
  format(entry: LogEntry): string;

  /**
   * 批量格式化日志条目
   * @param entries 日志条目数组
   * @returns 格式化后的字符串数组
   */
  formatBatch(entries: LogEntry[]): string[];
}

/**
 * JSON 格式化器
 * 将日志格式化为 JSON 字符串
 */
export class JsonFormatter implements LogFormatter {
  /** 格式化器选项 */
  private readonly options: Required<FormatterOptions>;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      timestampFormat: options.timestampFormat ?? TimestampFormat.ISO,
      customTimestampFormat: options.customTimestampFormat ?? '',
      includeLevel: options.includeLevel ?? true,
      includeTimestamp: options.includeTimestamp ?? true,
      includeSource: options.includeSource ?? true,
      includeTags: options.includeTags ?? true,
      includeData: options.includeData ?? true,
      includeError: options.includeError ?? true,
      includeStack: options.includeStack ?? true,
      includeId: options.includeId ?? false,
      includeRequestId: options.includeRequestId ?? false,
      includeUserId: options.includeUserId ?? false,
      includeSessionId: options.includeSessionId ?? false,
      useColors: options.useColors ?? false,
      indent: options.indent ?? 2
    };
  }

  format(entry: LogEntry): string {
    const obj: Record<string, unknown> = {};

    if (this.options.includeTimestamp) {
      obj.timestamp = this.formatTimestamp(entry.timestamp);
    }

    if (this.options.includeLevel) {
      obj.level = LogLevelNames[entry.level];
    }

    obj.message = entry.message;

    if (this.options.includeSource && entry.source) {
      obj.source = entry.source;
    }

    if (this.options.includeTags && entry.tags && entry.tags.length > 0) {
      obj.tags = entry.tags;
    }

    if (this.options.includeData && entry.data) {
      obj.data = entry.data;
    }

    if (this.options.includeError && entry.error) {
      obj.error = {
        name: entry.error.name,
        message: entry.error.message
      };
    }

    if (this.options.includeStack && entry.stack) {
      obj.stack = entry.stack;
    }

    if (this.options.includeId && entry.id) {
      obj.id = entry.id;
    }

    if (this.options.includeRequestId && entry.requestId) {
      obj.requestId = entry.requestId;
    }

    if (this.options.includeUserId && entry.userId) {
      obj.userId = entry.userId;
    }

    if (this.options.includeSessionId && entry.sessionId) {
      obj.sessionId = entry.sessionId;
    }

    return JSON.stringify(obj, null, this.options.indent);
  }

  formatBatch(entries: LogEntry[]): string[] {
    return entries.map(entry => this.format(entry));
  }

  private formatTimestamp(date: Date): string {
    switch (this.options.timestampFormat) {
      case TimestampFormat.ISO:
        return date.toISOString();
      case TimestampFormat.UNIX:
        return Math.floor(date.getTime() / 1000).toString();
      case TimestampFormat.UNIX_MS:
        return date.getTime().toString();
      case TimestampFormat.LOCAL:
        return date.toLocaleString();
      case TimestampFormat.UTC:
        return date.toUTCString();
      case TimestampFormat.CUSTOM:
        return this.formatCustomTimestamp(date, this.options.customTimestampFormat);
      default:
        return date.toISOString();
    }
  }

  private formatCustomTimestamp(date: Date, format: string): string {
    return format
      .replace('YYYY', date.getFullYear().toString())
      .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
      .replace('DD', date.getDate().toString().padStart(2, '0'))
      .replace('HH', date.getHours().toString().padStart(2, '0'))
      .replace('mm', date.getMinutes().toString().padStart(2, '0'))
      .replace('ss', date.getSeconds().toString().padStart(2, '0'))
      .replace('SSS', date.getMilliseconds().toString().padStart(3, '0'));
  }
}

/**
 * 文本格式化器
 * 将日志格式化为可读的文本字符串
 */
export class TextFormatter implements LogFormatter {
  /** 格式化器选项 */
  private readonly options: Required<FormatterOptions>;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      timestampFormat: options.timestampFormat ?? TimestampFormat.ISO,
      customTimestampFormat: options.customTimestampFormat ?? '',
      includeLevel: options.includeLevel ?? true,
      includeTimestamp: options.includeTimestamp ?? true,
      includeSource: options.includeSource ?? true,
      includeTags: options.includeTags ?? true,
      includeData: options.includeData ?? true,
      includeError: options.includeError ?? true,
      includeStack: options.includeStack ?? true,
      includeId: options.includeId ?? false,
      includeRequestId: options.includeRequestId ?? false,
      includeUserId: options.includeUserId ?? false,
      includeSessionId: options.includeSessionId ?? false,
      useColors: options.useColors ?? false,
      indent: options.indent ?? 2
    };
  }

  format(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.options.includeTimestamp) {
      parts.push(`[${this.formatTimestamp(entry.timestamp)}]`);
    }

    if (this.options.includeLevel) {
      const levelName = LogLevelNames[entry.level];
      if (this.options.useColors) {
        parts.push(`${LogLevelColors[entry.level]}${levelName}${COLOR_RESET}`);
      } else {
        parts.push(levelName);
      }
    }

    if (this.options.includeSource && entry.source) {
      parts.push(`[${entry.source}]`);
    }

    if (this.options.includeId && entry.id) {
      parts.push(`[${entry.id}]`);
    }

    if (this.options.includeRequestId && entry.requestId) {
      parts.push(`[req:${entry.requestId}]`);
    }

    if (this.options.includeUserId && entry.userId) {
      parts.push(`[user:${entry.userId}]`);
    }

    if (this.options.includeSessionId && entry.sessionId) {
      parts.push(`[session:${entry.sessionId}]`);
    }

    parts.push(entry.message);

    if (this.options.includeTags && entry.tags && entry.tags.length > 0) {
      parts.push(`[tags:${entry.tags.join(',')}]`);
    }

    let result = parts.join(' ');

    if (this.options.includeData && entry.data) {
      result += `\n${' '.repeat(this.options.indent)}Data: ${JSON.stringify(entry.data, null, this.options.indent)}`;
    }

    if (this.options.includeError && entry.error) {
      result += `\n${' '.repeat(this.options.indent)}Error: ${entry.error.name}: ${entry.error.message}`;
    }

    if (this.options.includeStack && entry.stack) {
      result += `\n${' '.repeat(this.options.indent)}Stack:\n${this.formatStack(entry.stack)}`;
    }

    return result;
  }

  formatBatch(entries: LogEntry[]): string[] {
    return entries.map(entry => this.format(entry));
  }

  private formatTimestamp(date: Date): string {
    switch (this.options.timestampFormat) {
      case TimestampFormat.ISO:
        return date.toISOString();
      case TimestampFormat.UNIX:
        return Math.floor(date.getTime() / 1000).toString();
      case TimestampFormat.UNIX_MS:
        return date.getTime().toString();
      case TimestampFormat.LOCAL:
        return date.toLocaleString();
      case TimestampFormat.UTC:
        return date.toUTCString();
      case TimestampFormat.CUSTOM:
        return this.formatCustomTimestamp(date, this.options.customTimestampFormat);
      default:
        return date.toISOString();
    }
  }

  private formatCustomTimestamp(date: Date, format: string): string {
    return format
      .replace('YYYY', date.getFullYear().toString())
      .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
      .replace('DD', date.getDate().toString().padStart(2, '0'))
      .replace('HH', date.getHours().toString().padStart(2, '0'))
      .replace('mm', date.getMinutes().toString().padStart(2, '0'))
      .replace('ss', date.getSeconds().toString().padStart(2, '0'))
      .replace('SSS', date.getMilliseconds().toString().padStart(3, '0'));
  }

  private formatStack(stack: string): string {
    return stack
      .split('\n')
      .map(line => `${' '.repeat(this.options.indent * 2)}${line}`)
      .join('\n');
  }
}

/**
 * 彩色格式化器
 * 将日志格式化为带颜色的文本字符串
 */
export class ColoredFormatter extends TextFormatter {
  constructor(options: FormatterOptions = {}) {
    super({
      ...options,
      useColors: true
    });
  }
}

/**
 * 简洁格式化器
 * 将日志格式化为简洁的文本字符串
 */
export class SimpleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString().split('T')[1].split('.')[0];
    const level = LogLevelNames[entry.level];
    return `${timestamp} [${level}] ${entry.message}`;
  }

  formatBatch(entries: LogEntry[]): string[] {
    return entries.map(entry => this.format(entry));
  }
}

/**
 * 开发环境格式化器
 * 专为开发环境优化的格式化器
 */
export class DevFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString().split('T')[1].split('.')[0];
    const level = LogLevelNames[entry.level];
    const color = LogLevelColors[entry.level];
    
    let message = `${color}[${timestamp}] [${level}]${COLOR_RESET} ${entry.message}`;

    if (entry.source) {
      message += ` ${COLOR_RESET}[${entry.source}]${COLOR_RESET}`;
    }

    if (entry.data) {
      message += `\n${COLOR_RESET}  Data:${COLOR_RESET} ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      message += `\n${COLOR_RESET}  Error:${COLOR_RESET} ${entry.error.name}: ${entry.error.message}`;
    }

    if (entry.stack) {
      message += `\n${COLOR_RESET}  Stack:${COLOR_RESET}\n${this.formatStack(entry.stack)}`;
    }

    return message;
  }

  formatBatch(entries: LogEntry[]): string[] {
    return entries.map(entry => this.format(entry));
  }

  private formatStack(stack: string): string {
    return stack
      .split('\n')
      .map(line => `    ${line}`)
      .join('\n');
  }
}

/**
 * 格式化器工厂
 * 用于创建不同类型的格式化器
 */
export class FormatterFactory {
  /**
   * 创建 JSON 格式化器
   * @param options 格式化器选项
   * @returns JSON 格式化器实例
   */
  static createJsonFormatter(options?: FormatterOptions): JsonFormatter {
    return new JsonFormatter(options);
  }

  /**
   * 创建文本格式化器
   * @param options 格式化器选项
   * @returns 文本格式化器实例
   */
  static createTextFormatter(options?: FormatterOptions): TextFormatter {
    return new TextFormatter(options);
  }

  /**
   * 创建彩色格式化器
   * @param options 格式化器选项
   * @returns 彩色格式化器实例
   */
  static createColoredFormatter(options?: FormatterOptions): ColoredFormatter {
    return new ColoredFormatter(options);
  }

  /**
   * 创建简洁格式化器
   * @returns 简洁格式化器实例
   */
  static createSimpleFormatter(): SimpleFormatter {
    return new SimpleFormatter();
  }

  /**
   * 创建开发环境格式化器
   * @returns 开发环境格式化器实例
   */
  static createDevFormatter(): DevFormatter {
    return new DevFormatter();
  }

  /**
   * 根据环境创建格式化器
   * @param env 环境变量
   * @param options 格式化器选项
   * @returns 格式化器实例
   */
  static createFormatter(env: string = process.env.NODE_ENV || 'development', options?: FormatterOptions): LogFormatter {
    if (env === 'production') {
      return this.createJsonFormatter(options);
    } else if (env === 'test') {
      return this.createSimpleFormatter();
    } else {
      return this.createDevFormatter();
    }
  }
}
