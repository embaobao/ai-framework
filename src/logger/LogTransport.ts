/**
 * 日志传输器文件
 * 提供多种日志传输方式
 */

import { LogEntry, LogLevel } from './Logger';
import { LogFormatter } from './LogFormatter';

/**
 * 传输器状态枚举
 */
export enum TransportState {
  /** 已连接 */
  CONNECTED = 'connected',
  /** 已断开 */
  DISCONNECTED = 'disconnected',
  /** 连接中 */
  CONNECTING = 'connecting',
  /** 错误状态 */
  ERROR = 'error'
}

/**
 * 传输器选项接口
 */
export interface TransportOptions {
  /** 是否异步传输 */
  async?: boolean;
  /** 缓冲区大小 */
  bufferSize?: number;
  /** 刷新间隔（毫秒） */
  flushInterval?: number;
  /** 是否启用重试 */
  retry?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 传输超时（毫秒） */
  timeout?: number;
}

/**
 * 传输器统计信息接口
 */
export interface TransportStats {
  /** 已传输的日志数 */
  transmitted: number;
  /** 传输失败的日志数 */
  failed: number;
  /** 缓冲区中的日志数 */
  buffered: number;
  /** 最后传输时间 */
  lastTransmitTime?: Date;
  /** 最后错误 */
  lastError?: Error;
}

/**
 * 日志传输器接口
 */
export interface LogTransport {
  /** 传输器名称 */
  readonly name: string;
  
  /** 传输器状态 */
  readonly state: TransportState;

  /** 传输器统计信息 */
  readonly stats: TransportStats;

  /**
   * 传输日志条目
   * @param entry 日志条目
   * @returns Promise<void>
   */
  transport(entry: LogEntry): Promise<void>;

  /**
   * 批量传输日志条目
   * @param entries 日志条目数组
   * @returns Promise<void>
   */
  transportBatch(entries: LogEntry[]): Promise<void>;

  /**
   * 连接传输器
   * @returns Promise<void>
   */
  connect(): Promise<void>;

  /**
   * 断开传输器
   * @returns Promise<void>
   */
  disconnect(): Promise<void>;

  /**
   * 刷新缓冲区
   * @returns Promise<void>
   */
  flush(): Promise<void>;

  /**
   * 设置格式化器
   * @param formatter 格式化器
   */
  setFormatter(formatter: LogFormatter): void;

  /**
   * 获取格式化器
   * @returns 格式化器
   */
  getFormatter(): LogFormatter | undefined;

  /**
   * 重置统计信息
   */
  resetStats(): void;
}

/**
 * 控制台传输器
 * 将日志输出到控制台
 */
export class ConsoleTransport implements LogTransport {
  /** 传输器名称 */
  public readonly name = 'console';
  
  /** 传输器状态 */
  private _state: TransportState = TransportState.CONNECTED;
  
  /** 格式化器 */
  private formatter?: LogFormatter;
  
  /** 统计信息 */
  private _stats: TransportStats = {
    transmitted: 0,
    failed: 0,
    buffered: 0
  };

  constructor(formatter?: LogFormatter) {
    this.formatter = formatter;
  }

  get state(): TransportState {
    return this._state;
  }

  get stats(): TransportStats {
    return { ...this._stats };
  }

  async transport(entry: LogEntry): Promise<void> {
    try {
      const message = this.formatter ? this.formatter.format(entry) : entry.message;
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(message);
          break;
        case LogLevel.INFO:
          console.info(message);
          break;
        case LogLevel.WARN:
          console.warn(message);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(message);
          break;
      }
      
      this._stats.transmitted++;
      this._stats.lastTransmitTime = new Date();
    } catch (error) {
      this._stats.failed++;
      this._stats.lastError = error as Error;
      throw error;
    }
  }

  async transportBatch(entries: LogEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.transport(entry);
    }
  }

  async connect(): Promise<void> {
    this._state = TransportState.CONNECTED;
  }

  async disconnect(): Promise<void> {
    this._state = TransportState.DISCONNECTED;
  }

  async flush(): Promise<void> {
    // 控制台传输器不需要刷新
  }

  setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  getFormatter(): LogFormatter | undefined {
    return this.formatter;
  }

  resetStats(): void {
    this._stats = {
      transmitted: 0,
      failed: 0,
      buffered: 0
    };
  }
}

/**
 * 文件传输器选项
 */
export interface FileTransportOptions extends TransportOptions {
  /** 文件路径 */
  filePath: string;
  /** 最大文件大小（字节） */
  maxFileSize?: number;
  /** 最大文件数 */
  maxFiles?: number;
  /** 是否追加模式 */
  append?: boolean;
}

/**
 * 文件传输器
 * 将日志写入文件
 */
export class FileTransport implements LogTransport {
  /** 传输器名称 */
  public readonly name = 'file';
  
  /** 传输器状态 */
  private _state: TransportState = TransportState.DISCONNECTED;
  
  /** 格式化器 */
  private formatter?: LogFormatter;
  
  /** 统计信息 */
  private _stats: TransportStats = {
    transmitted: 0,
    failed: 0,
    buffered: 0
  };
  
  /** 传输器选项 */
  private readonly options: Required<FileTransportOptions>;
  
  /** 文件句柄 */
  private fileHandle?: any;
  
  /** 当前文件大小 */
  private currentFileSize = 0;
  
  /** 当前文件索引 */
  private currentFileIndex = 0;

  constructor(options: FileTransportOptions, formatter?: LogFormatter) {
    this.options = {
      filePath: options.filePath,
      maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024, // 默认 10MB
      maxFiles: options.maxFiles ?? 5,
      append: options.append ?? true,
      async: options.async ?? false,
      bufferSize: options.bufferSize ?? 100,
      flushInterval: options.flushInterval ?? 1000,
      retry: options.retry ?? true,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      timeout: options.timeout ?? 5000
    };
    this.formatter = formatter;
  }

  get state(): TransportState {
    return this._state;
  }

  get stats(): TransportStats {
    return { ...this._stats };
  }

  async transport(entry: LogEntry): Promise<void> {
    if (this._state !== TransportState.CONNECTED) {
      await this.connect();
    }

    try {
      const message = this.formatter ? this.formatter.format(entry) : entry.message;
      const data = message + '\n';
      
      // 检查文件大小
      if (this.currentFileSize + data.length > this.options.maxFileSize) {
        await this.rotateFile();
      }
      
      // 写入文件
      await this.writeToFile(data);
      
      this._stats.transmitted++;
      this._stats.lastTransmitTime = new Date();
      this.currentFileSize += data.length;
    } catch (error) {
      this._stats.failed++;
      this._stats.lastError = error as Error;
      
      if (this.options.retry) {
        await this.retryTransport(entry);
      } else {
        throw error;
      }
    }
  }

  async transportBatch(entries: LogEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.transport(entry);
    }
  }

  async connect(): Promise<void> {
    this._state = TransportState.CONNECTING;
    
    try {
      // 在 Node.js 环境中打开文件
      if (typeof require !== 'undefined') {
        const fs = require('fs').promises;
        const path = require('path');
        
        // 确保目录存在
        const dir = path.dirname(this.options.filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // 打开文件
        const fsSync = require('fs');
        const flags = this.options.append ? 'a' : 'w';
        this.fileHandle = fsSync.openSync(this.options.filePath, flags);
        
        // 获取当前文件大小
        const stats = await fs.stat(this.options.filePath);
        this.currentFileSize = stats.size;
      }
      
      this._state = TransportState.CONNECTED;
    } catch (error) {
      this._state = TransportState.ERROR;
      this._stats.lastError = error as Error;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.fileHandle) {
      const fsSync = require('fs');
      fsSync.closeSync(this.fileHandle);
      this.fileHandle = undefined;
    }
    
    this._state = TransportState.DISCONNECTED;
  }

  async flush(): Promise<void> {
    // 文件传输器会立即写入，不需要刷新
  }

  setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  getFormatter(): LogFormatter | undefined {
    return this.formatter;
  }

  resetStats(): void {
    this._stats = {
      transmitted: 0,
      failed: 0,
      buffered: 0
    };
  }

  private async writeToFile(data: string): Promise<void> {
    if (this.fileHandle) {
      const fs = require('fs').promises;
      await fs.write(this.fileHandle, data);
    }
  }

  private async rotateFile(): Promise<void> {
    await this.disconnect();
    
    // 删除最旧的文件
    if (this.currentFileIndex >= this.options.maxFiles - 1) {
      const oldestFile = this.getFilePath(this.options.maxFiles - 1);
      const fs = require('fs').promises;
      try {
        await fs.unlink(oldestFile);
      } catch (error) {
        // 文件不存在，忽略错误
      }
    }
    
    // 重命名现有文件
    for (let i = this.currentFileIndex; i > 0; i--) {
      const oldPath = this.getFilePath(i - 1);
      const newPath = this.getFilePath(i);
      const fs = require('fs').promises;
      try {
        await fs.rename(oldPath, newPath);
      } catch (error) {
        // 文件不存在，忽略错误
      }
    }
    
    this.currentFileIndex++;
    this.currentFileSize = 0;
    
    await this.connect();
  }

  private getFilePath(index: number): string {
    const path = require('path');
    const ext = path.extname(this.options.filePath);
    const basename = path.basename(this.options.filePath, ext);
    const dirname = path.dirname(this.options.filePath);
    
    if (index === 0) {
      return this.options.filePath;
    }
    
    return path.join(dirname, `${basename}.${index}${ext}`);
  }

  private async retryTransport(entry: LogEntry): Promise<void> {
    let retries = 0;
    
    while (retries < this.options.maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        await this.transport(entry);
        return;
      } catch (error) {
        retries++;
        if (retries >= this.options.maxRetries) {
          throw error;
        }
      }
    }
  }
}

/**
 * 远程传输器选项
 */
export interface RemoteTransportOptions {
  /** 远程服务URL */
  url: string;
  /** HTTP方法 */
  method?: 'GET' | 'POST' | 'PUT';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 认证信息 */
  auth?: {
    username?: string;
    password?: string;
    token?: string;
  };
  /** 请求超时（毫秒） */
  timeout?: number;
}

/**
 * 远程传输器
 * 将日志发送到远程服务
 */
export class RemoteTransport implements LogTransport {
  /** 传输器名称 */
  public readonly name = 'remote';
  
  /** 传输器状态 */
  private _state: TransportState = TransportState.DISCONNECTED;
  
  /** 格式化器 */
  private formatter?: LogFormatter;
  
  /** 统计信息 */
  private _stats: TransportStats = {
    transmitted: 0,
    failed: 0,
    buffered: 0
  };
  
  /** 传输器选项 */
  private readonly options: Required<RemoteTransportOptions>;

  constructor(options: RemoteTransportOptions, formatter?: LogFormatter) {
    this.options = {
      url: options.url,
      method: options.method ?? 'POST',
      headers: options.headers ?? {
        'Content-Type': 'application/json'
      },
      auth: options.auth ?? {},
      timeout: options.timeout ?? 5000
    };
    this.formatter = formatter;
  }

  get state(): TransportState {
    return this._state;
  }

  get stats(): TransportStats {
    return { ...this._stats };
  }

  async transport(entry: LogEntry): Promise<void> {
    if (this._state !== TransportState.CONNECTED) {
      await this.connect();
    }

    try {
      const data = this.formatter ? this.formatter.format(entry) : JSON.stringify(entry);
      
      await this.sendRequest(data);
      
      this._stats.transmitted++;
      this._stats.lastTransmitTime = new Date();
    } catch (error) {
      this._stats.failed++;
      this._stats.lastError = error as Error;
      throw error;
    }
  }

  async transportBatch(entries: LogEntry[]): Promise<void> {
    const batchData = entries.map(entry => 
      this.formatter ? this.formatter.format(entry) : JSON.stringify(entry)
    );
    
    await this.sendRequest(JSON.stringify(batchData));
    
    this._stats.transmitted += entries.length;
    this._stats.lastTransmitTime = new Date();
  }

  async connect(): Promise<void> {
    this._state = TransportState.CONNECTING;
    
    try {
      // 测试连接
      await this.sendRequest('{"test": true}');
      this._state = TransportState.CONNECTED;
    } catch (error) {
      this._state = TransportState.ERROR;
      this._stats.lastError = error as Error;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._state = TransportState.DISCONNECTED;
  }

  async flush(): Promise<void> {
    // 远程传输器会立即发送，不需要刷新
  }

  setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  getFormatter(): LogFormatter | undefined {
    return this.formatter;
  }

  resetStats(): void {
    this._stats = {
      transmitted: 0,
      failed: 0,
      buffered: 0
    };
  }

  private async sendRequest(data: string): Promise<void> {
    const fetch = typeof window !== 'undefined' ? window.fetch : require('node-fetch');
    
    const headers: Record<string, string> = { ...this.options.headers };
    
    // 添加认证信息
    if (this.options.auth.token) {
      headers['Authorization'] = `Bearer ${this.options.auth.token}`;
    } else if (this.options.auth.username && this.options.auth.password) {
      const credentials = Buffer.from(
        `${this.options.auth.username}:${this.options.auth.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }
    
    const response = await fetch(this.options.url, {
      method: this.options.method,
      headers,
      body: data,
      signal: AbortSignal.timeout(this.options.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
}

/**
 * 缓冲传输器
 * 缓冲日志条目，批量传输
 */
export class BufferedTransport implements LogTransport {
  /** 传输器名称 */
  public readonly name = 'buffered';
  
  /** 传输器状态 */
  private _state: TransportState = TransportState.CONNECTED;
  
  /** 格式化器 */
  private formatter?: LogFormatter;
  
  /** 统计信息 */
  private _stats: TransportStats = {
    transmitted: 0,
    failed: 0,
    buffered: 0
  };
  
  /** 底层传输器 */
  private readonly transport: LogTransport;
  
  /** 缓冲区 */
  private buffer: LogEntry[] = [];
  
  /** 缓冲区大小 */
  private readonly bufferSize: number;
  
  /** 刷新间隔 */
  private readonly flushInterval: number;
  
  /** 刷新定时器 */
  private flushTimer?: NodeJS.Timeout;

  constructor(transport: LogTransport, bufferSize: number = 100, flushInterval: number = 1000) {
    this.transport = transport;
    this.bufferSize = bufferSize;
    this.flushInterval = flushInterval;
    
    // 启动定时刷新
    this.startFlushTimer();
  }

  get state(): TransportState {
    return this._state;
  }

  get stats(): TransportStats {
    return {
      ...this._stats,
      buffered: this.buffer.length
    };
  }

  async transport(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);
    this._stats.buffered = this.buffer.length;
    
    // 如果缓冲区已满，立即刷新
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async transportBatch(entries: LogEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.transport(entry);
    }
  }

  async connect(): Promise<void> {
    await this.transport.connect();
    this._state = TransportState.CONNECTED;
  }

  async disconnect(): Promise<void> {
    await this.flush();
    await this.transport.disconnect();
    this.stopFlushTimer();
    this._state = TransportState.DISCONNECTED;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    
    const entries = [...this.buffer];
    this.buffer = [];
    this._stats.buffered = 0;
    
    try {
      await this.transport.transportBatch(entries);
      this._stats.transmitted += entries.length;
      this._stats.lastTransmitTime = new Date();
    } catch (error) {
      this._stats.failed += entries.length;
      this._stats.lastError = error as Error;
      throw error;
    }
  }

  setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
    this.transport.setFormatter(formatter);
  }

  getFormatter(): LogFormatter | undefined {
    return this.formatter;
  }

  resetStats(): void {
    this._stats = {
      transmitted: 0,
      failed: 0,
      buffered: this.buffer.length
    };
    this.transport.resetStats();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Failed to flush buffer:', error);
      });
    }, this.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }
}

/**
 * 传输器工厂
 * 用于创建不同类型的传输器
 */
export class TransportFactory {
  /**
   * 创建控制台传输器
   * @param formatter 格式化器
   * @returns 控制台传输器实例
   */
  static createConsoleTransport(formatter?: LogFormatter): ConsoleTransport {
    return new ConsoleTransport(formatter);
  }

  /**
   * 创建文件传输器
   * @param options 文件传输器选项
   * @param formatter 格式化器
   * @returns 文件传输器实例
   */
  static createFileTransport(options: FileTransportOptions, formatter?: LogFormatter): FileTransport {
    return new FileTransport(options, formatter);
  }

  /**
   * 创建远程传输器
   * @param options 远程传输器选项
   * @param formatter 格式化器
   * @returns 远程传输器实例
   */
  static createRemoteTransport(options: RemoteTransportOptions, formatter?: LogFormatter): RemoteTransport {
    return new RemoteTransport(options, formatter);
  }

  /**
   * 创建缓冲传输器
   * @param transport 底层传输器
   * @param bufferSize 缓冲区大小
   * @param flushInterval 刷新间隔
   * @returns 缓冲传输器实例
   */
  static createBufferedTransport(
    transport: LogTransport,
    bufferSize?: number,
    flushInterval?: number
  ): BufferedTransport {
    return new BufferedTransport(transport, bufferSize, flushInterval);
  }
}
