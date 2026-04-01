/**
 * 日志管理器主类文件
 * 提供日志系统的核心管理功能
 */

import {
  Logger,
  LogLevel,
  LogEntry,
  LoggerOptions,
  LogFilter,
  LogListener,
  LogStats,
  LogTimer,
  LogContext
} from './Logger';
import { LogFormatter, FormatterFactory } from './LogFormatter';
import {
  LogTransport,
  TransportFactory,
  ConsoleTransport,
  FileTransport,
  RemoteTransport,
  BufferedTransport
} from './LogTransport';
import {
  MetricsCollector,
  MetricsCollectorFactory,
  PerformanceMetricsCollector
} from './MetricsCollector';

/**
 * 日志管理器配置接口
 */
export interface LoggerManagerConfig {
  /** 默认日志级别 */
  defaultLevel?: LogLevel;
  /** 默认日志器名称 */
  defaultName?: string;
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
  /** 是否启用指标收集 */
  enableMetrics?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
}

/**
 * 日志管理器类
 * 负责管理日志记录器的创建、配置和生命周期
 */
export class LoggerManager {
  /** 单例实例 */
  private static instance: LoggerManager;
  
  /** 日志器存储 */
  private loggers: Map<string, DefaultLogger> = new Map();
  
  /** 传输器存储 */
  private transports: LogTransport[] = [];
  
  /** 格式化器 */
  private formatter?: LogFormatter;
  
  /** 指标收集器 */
  private metricsCollector?: MetricsCollector;
  
  /** 性能指标收集器 */
  private performanceCollector?: PerformanceMetricsCollector;
  
  /** 全局过滤器 */
  private filters: LogFilter[] = [];
  
  /** 全局监听器 */
  private listeners: LogListener[] = [];
  
  /** 全局上下文 */
  private globalContext: LogContext = {};
  
  /** 配置 */
  private config: Required<LoggerManagerConfig>;
  
  /** 是否已初始化 */
  private initialized = false;

  private constructor(config: LoggerManagerConfig = {}) {
    this.config = {
      defaultLevel: config.defaultLevel ?? LogLevel.INFO,
      defaultName: config.defaultName ?? 'default',
      timestamp: config.timestamp ?? true,
      includeStack: config.includeStack ?? false,
      includeErrorDetails: config.includeErrorDetails ?? true,
      tags: config.tags ?? [],
      data: config.data ?? {},
      enableMetrics: config.enableMetrics ?? false,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? false
    };
    
    // 初始化指标收集器
    if (this.config.enableMetrics) {
      this.metricsCollector = MetricsCollectorFactory.createDefault();
      
      if (this.config.enablePerformanceMonitoring) {
        this.performanceCollector = MetricsCollectorFactory.create(
          this.metricsCollector
        );
      }
    }
  }

  /**
   * 获取日志管理器单例
   * @param config 配置
   * @returns 日志管理器实例
   */
  static getInstance(config?: LoggerManagerConfig): LoggerManager {
    if (!LoggerManager.instance) {
      LoggerManager.instance = new LoggerManager(config);
    }
    return LoggerManager.instance;
  }

  /**
   * 初始化日志管理器
   * @param config 配置
   */
  static initialize(config?: LoggerManagerConfig): LoggerManager {
    if (!LoggerManager.instance) {
      LoggerManager.instance = new LoggerManager(config);
    }
    LoggerManager.instance.initialized = true;
    return LoggerManager.instance;
  }

  /**
   * 创建日志器
   * @param name 日志器名称
   * @param options 日志器选项
   * @returns 日志器实例
   */
  createLogger(name: string, options?: LoggerOptions): Logger {
    const loggerOptions: LoggerOptions = {
      name,
      level: options?.level ?? this.config.defaultLevel,
      timestamp: options?.timestamp ?? this.config.timestamp,
      includeStack: options?.includeStack ?? this.config.includeStack,
      includeErrorDetails: options?.includeErrorDetails ?? this.config.includeErrorDetails,
      tags: [...this.config.tags, ...(options?.tags ?? [])],
      data: { ...this.config.data, ...options?.data }
    };
    
    const logger = new DefaultLogger(this, loggerOptions);
    this.loggers.set(name, logger);
    
    return logger;
  }

  /**
   * 获取日志器
   * @param name 日志器名称
   * @returns 日志器实例
   */
  getLogger(name: string): Logger {
    let logger = this.loggers.get(name);
    
    if (!logger) {
      logger = this.createLogger(name);
    }
    
    return logger;
  }

  /**
   * 获取默认日志器
   * @returns 默认日志器实例
   */
  getDefaultLogger(): Logger {
    return this.getLogger(this.config.defaultName);
  }

  /**
   * 移除日志器
   * @param name 日志器名称
   */
  removeLogger(name: string): void {
    this.loggers.delete(name);
  }

  /**
   * 获取所有日志器名称
   * @returns 日志器名称数组
   */
  getLoggerNames(): string[] {
    return Array.from(this.loggers.keys());
  }

  /**
   * 添加传输器
   * @param transport 传输器
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * 移除传输器
   * @param transport 传输器
   */
  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index > -1) {
      this.transports.splice(index, 1);
    }
  }

  /**
   * 获取所有传输器
   * @returns 传输器数组
   */
  getTransports(): LogTransport[] {
    return [...this.transports];
  }

  /**
   * 设置格式化器
   * @param formatter 格式化器
   */
  setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
    
    // 更新所有传输器的格式化器
    for (const transport of this.transports) {
      transport.setFormatter(formatter);
    }
  }

  /**
   * 获取格式化器
   * @returns 格式化器
   */
  getFormatter(): LogFormatter | undefined {
    return this.formatter;
  }

  /**
   * 添加全局过滤器
   * @param filter 过滤器
   */
  addFilter(filter: LogFilter): void {
    this.filters.push(filter);
  }

  /**
   * 移除全局过滤器
   * @param filter 过滤器
   */
  removeFilter(filter: LogFilter): void {
    const index = this.filters.indexOf(filter);
    if (index > -1) {
      this.filters.splice(index, 1);
    }
  }

  /**
   * 添加全局监听器
   * @param listener 监听器
   */
  addListener(listener: LogListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除全局监听器
   * @param listener 监听器
   */
  removeListener(listener: LogListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 设置全局上下文
   * @param context 上下文
   */
  setGlobalContext(context: LogContext): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * 获取全局上下文
   * @returns 全局上下文
   */
  getGlobalContext(): LogContext {
    return { ...this.globalContext };
  }

  /**
   * 清除全局上下文
   */
  clearGlobalContext(): void {
    this.globalContext = {};
  }

  /**
   * 获取指标收集器
   * @returns 指标收集器
   */
  getMetricsCollector(): MetricsCollector | undefined {
    return this.metricsCollector;
  }

  /**
   * 获取性能指标收集器
   * @returns 性能指标收集器
   */
  getPerformanceCollector(): PerformanceMetricsCollector | undefined {
    return this.performanceCollector;
  }

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.defaultLevel = level;
    
    // 更新所有日志器的日志级别
    for (const logger of this.loggers.values()) {
      logger.level = level;
    }
  }

  /**
   * 获取日志级别
   * @returns 日志级别
   */
  getLevel(): LogLevel {
    return this.config.defaultLevel;
  }

  /**
   * 启动所有传输器
   */
  async startTransports(): Promise<void> {
    const promises = this.transports.map(transport => transport.connect());
    await Promise.all(promises);
  }

  /**
   * 停止所有传输器
   */
  async stopTransports(): Promise<void> {
    const promises = this.transports.map(transport => transport.disconnect());
    await Promise.all(promises);
  }

  /**
   * 刷新所有传输器
   */
  async flushTransports(): Promise<void> {
    const promises = this.transports.map(transport => transport.flush());
    await Promise.all(promises);
  }

  /**
   * 重置日志管理器
   */
  reset(): void {
    this.loggers.clear();
    this.transports = [];
    this.filters = [];
    this.listeners = [];
    this.globalContext = {};
    this.initialized = false;
  }

  /**
   * 销毁日志管理器
   */
  async destroy(): Promise<void> {
    await this.stopTransports();
    this.reset();
    LoggerManager.instance = this as any;
  }

  /**
   * 检查是否已初始化
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 内部方法：传输日志条目
   * @param entry 日志条目
   */
  async transportEntry(entry: LogEntry): Promise<void> {
    // 应用全局过滤器
    for (const filter of this.filters) {
      if (!filter.test(entry)) {
        return;
      }
    }
    
    // 通知全局监听器
    for (const listener of this.listeners) {
      listener.onLog(entry);
    }
    
    // 传输到所有传输器
    const promises = this.transports.map(transport => transport.transport(entry));
    await Promise.all(promises);
  }
}

/**
 * 默认日志器实现
 */
class DefaultLogger implements Logger {
  /** 日志器名称 */
  public readonly name: string;
  
  /** 日志级别 */
  public level: LogLevel;
  
  /** 日志管理器 */
  private readonly manager: LoggerManager;
  
  /** 选项 */
  private readonly options: Required<LoggerOptions>;
  
  /** 过滤器 */
  private filters: LogFilter[] = [];
  
  /** 监听器 */
  private listeners: LogListener[] = [];
  
  /** 上下文 */
  private context: LogContext = {};
  
  /** 是否静默 */
  private silent = false;
  
  /** 统计信息 */
  private stats: LogStats = {
    total: 0,
    byLevel: {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0
    },
    errorCount: 0,
    warnCount: 0
  };

  constructor(manager: LoggerManager, options: LoggerOptions) {
    this.manager = manager;
    this.name = options.name ?? 'default';
    this.level = options.level ?? LogLevel.INFO;
    this.options = {
      name: this.name,
      level: this.level,
      timestamp: options.timestamp ?? true,
      includeStack: options.includeStack ?? false,
      includeErrorDetails: options.includeErrorDetails ?? true,
      tags: options.tags ?? [],
      data: options.data ?? {}
    };
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, { ...data, error });
  }

  fatal(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, { ...data, error });
  }

  log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (this.silent || level < this.level) {
      return;
    }
    
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      source: this.name,
      tags: [...this.options.tags],
      data: { ...this.options.data, ...data },
      id: this.generateId(),
      ...this.context,
      ...this.manager.getGlobalContext()
    };
    
    // 添加堆栈信息
    if (this.options.includeStack) {
      entry.stack = new Error().stack;
    }
    
    // 更新统计信息
    this.updateStats(entry);
    
    // 传输日志条目
    this.manager.transportEntry(entry).catch(error => {
      console.error('Failed to transport log entry:', error);
    });
  }

  withTags(...tags: string[]): Logger {
    const logger = this.createChild();
    logger.options.tags = [...this.options.tags, ...tags];
    return logger;
  }

  withData(data: Record<string, unknown>): Logger {
    const logger = this.createChild();
    logger.options.data = { ...this.options.data, ...data };
    return logger;
  }

  withSource(source: string): Logger {
    const logger = this.createChild();
    logger.name = source;
    return logger;
  }

  withRequestId(requestId: string): Logger {
    const logger = this.createChild();
    logger.context.requestId = requestId;
    return logger;
  }

  withUserId(userId: string): Logger {
    const logger = this.createChild();
    logger.context.userId = userId;
    return logger;
  }

  withSessionId(sessionId: string): Logger {
    const logger = this.createChild();
    logger.context.sessionId = sessionId;
    return logger;
  }

  addFilter(filter: LogFilter): void {
    this.filters.push(filter);
  }

  removeFilter(filter: LogFilter): void {
    const index = this.filters.indexOf(filter);
    if (index > -1) {
      this.filters.splice(index, 1);
    }
  }

  addListener(listener: LogListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: LogListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  child(name: string): Logger {
    const logger = this.createChild();
    logger.name = `${this.name}.${name}`;
    return logger;
  }

  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  isSilent(): boolean {
    return this.silent;
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): LogStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      byLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.FATAL]: 0
      },
      errorCount: 0,
      warnCount: 0
    };
  }

  /**
   * 创建计时器
   * @param message 日志消息
   * @param level 日志级别
   * @returns 计时器
   */
  startTimer(message: string, level: LogLevel = LogLevel.INFO): LogTimer {
    return new DefaultLogTimer(this, message, level);
  }

    private createChild(): DefaultLogger {
    const child = new DefaultLogger(this.manager, this.options);
    child.level = this.level;
    child.context = { ...this.context };
    child.filters = [...this.filters];
    child.listeners = [...this.listeners];
    return child;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStats(entry: LogEntry): void {
    this.stats.total++;
    this.stats.byLevel[entry.level]++;
    this.stats.lastLogTime = entry.timestamp;
    
    if (entry.level >= LogLevel.ERROR) {
      this.stats.errorCount++;
    } else if (entry.level === LogLevel.WARN) {
      this.stats.warnCount++;
    }
  }
}

/**
 * 默认日志计时器实现
 */
class DefaultLogTimer implements LogTimer {
  /** 开始时间 */
  public readonly startTime: Date;
  
  /** 结束时间 */
  public endTime?: Date;
  
  /** 持续时间（毫秒） */
  public duration?: number;
  
  /** 日志器 */
  private readonly logger: DefaultLogger;
  
  /** 日志消息 */
  private readonly message: string;
  
  /** 日志级别 */
  private readonly level: LogLevel;
  
  /** 是否已停止 */
  private stopped = false;

  constructor(logger: DefaultLogger, message: string, level: LogLevel) {
    this.logger = logger;
    this.message = message;
    this.level = level;
    this.startTime = new Date();
  }

  stop(): number {
    if (this.stopped) {
      return this.duration ?? 0;
    }
    
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - this.startTime.getTime();
    this.stopped = true;
    
    return this.duration;
  }

  log(message?: string, level?: LogLevel): void {
    const duration = this.stop();
    const logMessage = message ?? this.message;
    const logLevel = level ?? this.level;
    
    this.logger.log(logLevel, `${logMessage} (${duration}ms)`, {
      duration,
      startTime: this.startTime,
      endTime: this.endTime
    });
  }
}

/**
 * 日志管理器工厂
 */
export class LoggerManagerFactory {
  /**
   * 创建日志管理器
   * @param config 配置
   * @returns 日志管理器实例
   */
  static create(config?: LoggerManagerConfig): LoggerManager {
    return LoggerManager.initialize(config);
  }

  /**
   * 创建默认配置的日志管理器
   * @returns 日志管理器实例
   */
  static createDefault(): LoggerManager {
    return LoggerManager.initialize({
      defaultLevel: LogLevel.INFO,
      timestamp: true,
      includeStack: false,
      includeErrorDetails: true
    });
  }

  /**
   * 创建开发环境的日志管理器
   * @returns 日志管理器实例
   */
  static createDevelopment(): LoggerManager {
    const manager = LoggerManager.initialize({
      defaultLevel: LogLevel.DEBUG,
      timestamp: true,
      includeStack: true,
      includeErrorDetails: true
    });
    
    // 添加控制台传输器
    const consoleTransport = TransportFactory.createConsoleTransport(
      FormatterFactory.createDevFormatter()
    );
    manager.addTransport(consoleTransport);
    
    return manager;
  }

  /**
   * 创建生产环境的日志管理器
   * @returns 日志管理器实例
   */
  static createProduction(): LoggerManager {
    const manager = LoggerManager.initialize({
      defaultLevel: LogLevel.INFO,
      timestamp: true,
      includeStack: false,
      includeErrorDetails: true,
      enableMetrics: true,
      enablePerformanceMonitoring: true
    });
    
    // 添加控制台传输器
    const consoleTransport = TransportFactory.createConsoleTransport(
      FormatterFactory.createJsonFormatter()
    );
    manager.addTransport(consoleTransport);
    
    return manager;
  }
}
