/**
 * 日志记录器接口定义文件
 * 定义了日志系统的核心类型和接口
 */

/**
 * 日志级别枚举
 * 定义了不同级别的日志消息
 */
export enum LogLevel {
  /** 调试级别 - 最详细的日志信息 */
  DEBUG = 0,
  /** 信息级别 - 一般信息 */
  INFO = 1,
  /** 警告级别 - 警告信息 */
  WARN = 2,
  /** 错误级别 - 错误信息 */
  ERROR = 3,
  /** 致命错误级别 - 严重错误，可能导致程序终止 */
  FATAL = 4
}

/**
 * 日志级别名称映射
 * 用于将日志级别转换为字符串
 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL'
};

/**
 * 日志级别颜色映射（用于控制台输出）
 */
export const LogLevelColors: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m',    // 青色
  [LogLevel.INFO]: '\x1b[32m',     // 绿色
  [LogLevel.WARN]: '\x1b[33m',     // 黄色
  [LogLevel.ERROR]: '\x1b[31m',   // 红色
  [LogLevel.FATAL]: '\x1b[35m'    // 紫色
};

/**
 * 日志颜色重置代码
 */
export const COLOR_RESET = '\x1b[0m';

/**
 * 日志条目接口
 * 表示一条完整的日志记录
 */
export interface LogEntry {
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 时间戳 */
  timestamp: Date;
  /** 日志来源（如模块名、类名等） */
  source?: string;
  /** 日志标签，用于分类和过滤 */
  tags?: string[];
  /** 附加数据 */
  data?: Record<string, unknown>;
  /** 错误对象（如果有） */
  error?: Error;
  /** 堆栈信息 */
  stack?: string;
  /** 日志ID，用于追踪 */
  id?: string;
  /** 关联的请求ID */
  requestId?: string;
  /** 关联的用户ID */
  userId?: string;
  /** 关联的会话ID */
  sessionId?: string;
}

/**
 * 日志选项接口
 * 用于配置日志记录器的行为
 */
export interface LoggerOptions {
  /** 日志器名称 */
  name?: string;
  /** 最小日志级别 */
  level?: LogLevel;
  /** 是否启用时间戳 */
  timestamp?: boolean;
  /** 是否包含堆栈信息 */
  includeStack?: boolean;
  /** 是否包含错误详情 */
  includeErrorDetails?: boolean;
  /** 默认标签 */
  tags?: string[];
  /** 默认数据 */
  data?: Record<string, unknown>;
}

/**
 * 日志过滤器接口
 * 用于过滤日志条目
 */
export interface LogFilter {
  /**
   * 测试日志条目是否应该被记录
   * @param entry 日志条目
   * @returns 是否应该记录
   */
  test(entry: LogEntry): boolean;
}

/**
 * 日志监听器接口
 * 用于监听日志事件
 */
export interface LogListener {
  /**
   * 处理日志条目
   * @param entry 日志条目
   */
  onLog(entry: LogEntry): void;
}

/**
 * 日志记录器接口
 * 定义了日志记录器的核心功能
 */
export interface Logger {
  /** 日志器名称 */
  readonly name: string;
  
  /** 当前日志级别 */
  level: LogLevel;

  /**
   * 记录调试级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  debug(message: string, data?: Record<string, unknown>): void;

  /**
   * 记录信息级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  info(message: string, data?: Record<string, unknown>): void;

  /**
   * 记录警告级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  warn(message: string, data?: Record<string, unknown>): void;

  /**
   * 记录错误级别日志
   * @param message 日志消息
   * @param error 错误对象
   * @param data 附加数据
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void;

  /**
   * 记录致命错误级别日志
   * @param message 日志消息
   * @param error 错误对象
   * @param data 附加数据
   */
  fatal(message: string, error?: Error, data?: Record<string, unknown>): void;

  /**
   * 记录指定级别的日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  log(level: LogLevel, message: string, data?: Record<string, unknown>): void;

  /**
   * 添加日志标签
   * @param tags 标签数组
   * @returns 日志记录器实例（支持链式调用）
   */
  withTags(...tags: string[]): Logger;

  /**
   * 添加日志数据
   * @param data 数据对象
   * @returns 日志记录器实例（支持链式调用）
   */
  withData(data: Record<string, unknown>): Logger;

  /**
   * 添加日志来源
   * @param source 来源信息
   * @returns 日志记录器实例（支持链式调用）
   */
  withSource(source: string): Logger;

  /**
   * 添加请求ID
   * @param requestId 请求ID
   * @returns 日志记录器实例（支持链式调用）
   */
  withRequestId(requestId: string): Logger;

  /**
   * 添加用户ID
   * @param userId 用户ID
   * @returns 日志记录器实例（支持链式调用）
   */
  withUserId(userId: string): Logger;

  /**
   * 添加会话ID
   * @param sessionId 会话ID
   * @returns 日志记录器实例（支持链式调用）
   */
  withSessionId(sessionId: string): Logger;

  /**
   * 添加日志过滤器
   * @param filter 日志过滤器
   */
  addFilter(filter: LogFilter): void;

  /**
   * 移除日志过滤器
   * @param filter 日志过滤器
   */
  removeFilter(filter: LogFilter): void;

  /**
   * 添加日志监听器
   * @param listener 日志监听器
   */
  addListener(listener: LogListener): void;

  /**
   * 移除日志监听器
   * @param listener 日志监听器
   */
  removeListener(listener: LogListener): void;

  /**
   * 创建子日志器
   * @param name 子日志器名称
   * @returns 子日志器实例
   */
  child(name: string): Logger;

  /**
   * 设置日志记录器为静默模式
   * @param silent 是否静默
   */
  setSilent(silent: boolean): void;

  /**
   * 检查是否静默
   * @returns 是否静默
   */
  isSilent(): boolean;
}

/**
 * 日志上下文接口
 * 用于在日志中传递上下文信息
 */
export interface LogContext {
  /** 请求ID */
  requestId?: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 追踪ID */
  traceId?: string;
  /** 跨度ID */
  spanId?: string;
  /** 其他上下文数据 */
  data?: Record<string, unknown>;
}

/**
 * 日志性能计时器接口
 * 用于测量操作执行时间
 */
export interface LogTimer {
  /** 开始时间 */
  readonly startTime: Date;
  
  /** 结束时间 */
  readonly endTime?: Date;

  /** 持续时间（毫秒） */
  readonly duration?: number;

  /**
   * 停止计时器
   * @returns 持续时间（毫秒）
   */
  stop(): number;

  /**
   * 记录计时结果
   * @param message 日志消息
   * @param level 日志级别
   */
  log(message: string, level?: LogLevel): void;
}

/**
 * 日志统计信息接口
 */
export interface LogStats {
  /** 总日志数 */
  total: number;
  /** 各级别日志数 */
  byLevel: Record<LogLevel, number>;
  /** 最后日志时间 */
  lastLogTime?: Date;
  /** 错误日志数 */
  errorCount: number;
  /** 警告日志数 */
  warnCount: number;
}
