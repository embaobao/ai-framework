/**
 * 指标收集器文件
 * 提供性能指标收集和报告功能
 */

/**
 * 指标类型枚举
 */
export enum MetricType {
  /** 计数器 - 只增不减的值 */
  COUNTER = 'counter',
  /** 仪表盘 - 可增可减的值 */
  GAUGE = 'gauge',
  /** 直方图 - 统计分布情况 */
  HISTOGRAM = 'histogram',
  /** 摘要 - 统计分位数 */
  SUMMARY = 'summary',
  /** 计时器 - 测量操作耗时 */
  TIMER = 'timer'
}

/**
 * 指标接口
 */
export interface Metric {
  /** 指标名称 */
  name: string;
  /** 指标类型 */
  type: MetricType;
  /** 指标描述 */
  description?: string;
  /** 指标标签 */
  labels?: Record<string, string>;
  /** 指标值 */
  value: number;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 直方图桶接口
 */
export interface HistogramBucket {
  /** 上界 */
  upperBound: number;
  /** 计数 */
  count: number;
}

/**
 * 直方图数据接口
 */
export interface HistogramData {
  /** 样本数 */
  sampleCount: number;
  /** 样本总和 */
  sampleSum: number;
  /** 桶 */
  buckets: HistogramBucket[];
}

/**
 * 摘要数据接口
 */
export interface SummaryData {
  /** 样本数 */
  sampleCount: number;
  /** 样本总和 */
  sampleSum: number;
  /** 分位数 */
  quantiles: Record<number, number>;
}

/**
 * 指标收集器接口
 */
export interface MetricsCollector {
  /**
   * 增加计数器
   * @param name 指标名称
   * @param value 增加的值
   * @param labels 标签
   */
  increment(name: string, value?: number, labels?: Record<string, string>): void;

  /**
   * 减少计数器
   * @param name 指标名称
   * @param value 减少的值
   * @param labels 标签
   */
  decrement(name: string, value?: number, labels?: Record<string, string>): void;

  /**
   * 设置仪表盘值
   * @param name 指标名称
   * @param value 值
   * @param labels 标签
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * 记录直方图值
   * @param name 指标名称
   * @param value 值
   * @param labels 标签
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * 记录摘要值
   * @param name 指标名称
   * @param value 值
   * @param labels 标签
   */
  summary(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * 开始计时
   * @param name 指标名称
   * @param labels 标签
   * @returns 计时器
   */
  startTimer(name: string, labels?: Record<string, string>): Timer;

  /**
   * 获取指标
   * @param name 指标名称
   * @param labels 标签
   * @returns 指标
   */
  getMetric(name: string, labels?: Record<string, string>): Metric | undefined;

  /**
   * 获取所有指标
   * @returns 指标数组
   */
  getAllMetrics(): Metric[];

  /**
   * 获取直方图数据
   * @param name 指标名称
   * @param labels 标签
   * @returns 直方图数据
   */
  getHistogramData(name: string, labels?: Record<string, string>): HistogramData | undefined;

  /**
   * 获取摘要数据
   * @param name 指标名称
   * @param labels 标签
   * @returns 摘要数据
   */
  getSummaryData(name: string, labels?: Record<string, string>): SummaryData | undefined;

  /**
   * 重置指标
   * @param name 指标名称
   * @param labels 标签
   */
  reset(name: string, labels?: Record<string, string>): void;

  /**
   * 重置所有指标
   */
  resetAll(): void;

  /**
   * 导出指标
   * @param format 导出格式
   * @returns 导出的字符串
   */
  export(format?: 'prometheus' | 'json'): string;
}

/**
 * 计时器接口
 */
export interface Timer {
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
   */
  record(): void;
}

/**
 * 指标收集器实现
 */
export class DefaultMetricsCollector implements MetricsCollector {
  /** 指标存储 */
  private metrics: Map<string, Metric> = new Map();
  
  /** 直方图数据存储 */
  private histogramData: Map<string, HistogramData> = new Map();
  
  /** 摘要数据存储 */
  private summaryData: Map<string, SummaryData> = new Map();
  
  /** 直方图默认桶 */
  private readonly defaultHistogramBuckets: number[] = [
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
    ];
  
  /** 摘要默认分位数 */
  private readonly defaultSummaryQuantiles: number[] = [0.5, 0.9, 0.95, 0.99];

  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const metric = this.metrics.get(key);
    
    if (metric) {
      metric.value += value;
      metric.timestamp = new Date();
    } else {
      this.metrics.set(key, {
        name,
        type: MetricType.COUNTER,
        value,
        labels,
        timestamp: new Date()
      });
    }
  }

  decrement(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const metric = this.metrics.get(key);
    
    if (metric) {
      metric.value -= value;
      metric.timestamp = new Date();
    } else {
      this.metrics.set(key, {
        name,
        type: MetricType.COUNTER,
        value: -value,
        labels,
        timestamp: new Date()
      });
    }
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    
    this.metrics.set(key, {
      name,
      type: MetricType.GAUGE,
      value,
      labels,
      timestamp: new Date()
    });
  }

  histogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    let data = this.histogramData.get(key);
    
    if (!data) {
      data = {
        sampleCount: 0,
        sampleSum: 0,
        buckets: this.defaultHistogramBuckets.map(upperBound => ({
          upperBound,
          count: 0
        }))
      };
      this.histogramData.set(key, data);
    }
    
    // 更新样本统计
    data.sampleCount++;
    data.sampleSum += value;
    
    // 更新桶计数
    for (const bucket of data.buckets) {
      if (value <= bucket.upperBound) {
        bucket.count++;
      }
    }
    
    // 更新指标值
    this.metrics.set(key, {
      name,
      type: MetricType.HISTOGRAM,
      value: data.sampleSum,
      labels,
      timestamp: new Date()
    });
  }

  summary(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    let data = this.summaryData.get(key);
    
    if (!data) {
      data = {
        sampleCount: 0,
        sampleSum: 0,
        quantiles: {}
      };
      this.summaryData.set(key, data);
    }
    
    // 更新样本统计
    data.sampleCount++;
    data.sampleSum += value;
    
    // 计算分位数（简化版本，实际应该使用更精确的算法）
    for (const quantile of this.defaultSummaryQuantiles) {
      data.quantiles[quantile] = value * quantile;
    }
    
    // 更新指标值
    this.metrics.set(key, {
      name,
      type: MetricType.SUMMARY,
      value: data.sampleSum,
      labels,
      timestamp: new Date()
    });
  }

  startTimer(name: string, labels?: Record<string, string>): Timer {
    return new DefaultTimer(this, name, labels);
  }

  getMetric(name: string, labels?: Record<string, string>): Metric | undefined {
    const key = this.getMetricKey(name, labels);
    return this.metrics.get(key);
  }

  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  getHistogramData(name: string, labels?: Record<string, string>): HistogramData | undefined {
    const key = this.getMetricKey(name, labels);
    return this.histogramData.get(key);
  }

  getSummaryData(name: string, labels?: Record<string, string>): SummaryData | undefined {
    const key = this.getMetricKey(name, labels);
    return this.summaryData.get(key);
  }

  reset(name: string, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    this.metrics.delete(key);
    this.histogramData.delete(key);
    this.summaryData.delete(key);
  }

  resetAll(): void {
    this.metrics.clear();
    this.histogramData.clear();
    this.summaryData.clear();
  }

  export(format: 'prometheus' | 'json' = 'prometheus'): string {
    if (format === 'json') {
      return this.exportAsJson();
    } else {
      return this.exportAsPrometheus();
    }
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelString = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}{${labelString}}`;
  }

  private exportAsJson(): string {
    const data = {
      metrics: Array.from(this.metrics.values()),
      histograms: Array.from(this.histogramData.entries()).map(([key, value]) => ({
        key,
        data: value
      })),
      summaries: Array.from(this.summaryData.entries()).map(([key, value]) => ({
        key,
        data: value
      }))
    };
    
    return JSON.stringify(data, null, 2);
  }

  private exportAsPrometheus(): string {
    const lines: string[] = [];
    
    // 导出普通指标
    for (const metric of this.metrics.values()) {
      const labelString = this.formatLabels(metric.labels);
      const line = `${metric.name}${labelString} ${metric.value}`;
      lines.push(line);
    }
    
    // 导出直方图
    for (const [key, data] of this.histogramData.entries()) {
      const labelString = this.formatLabels(this.parseLabelsFromKey(key));
      
      lines.push(`${key}_count${labelString} ${data.sampleCount}`);
      lines.push(`${key}_sum${labelString} ${data.sampleSum}`);
      
      for (const bucket of data.buckets) {
        const bucketLabel = labelString === '' 
          ? `{le="${bucket.upperBound}"}`
          : labelString.slice(0, -1) + `,le="${bucket.upperBound}"}`;
        lines.push(`${key}_bucket${bucketLabel} ${bucket.count}`);
      }
    }
    
    // 导出摘要
    for (const [key, data] of this.summaryData.entries()) {
      const labelString = this.formatLabels(this.parseLabelsFromKey(key));
      
      lines.push(`${key}_count${labelString} ${data.sampleCount}`);
      lines.push(`${key}_sum${labelString} ${data.sampleSum}`);
      
      for (const [quantile, value] of Object.entries(data.quantiles)) {
        const quantileLabel = labelString === ''
          ? `{quantile="${quantile}"}`
          : labelString.slice(0, -1) + `,quantile="${quantile}"}`;
        lines.push(`${key}${quantileLabel} ${value}`);
      }
    }
    
    return lines.join('\n');
  }

  private formatLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    
    const labelString = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `{${labelString}}`;
  }

  private parseLabelsFromKey(key: string): Record<string, string> | undefined {
    const match = key.match(/\{(.+)\}/);
    if (!match) {
      return undefined;
    }
    
    const labels: Record<string, string> = {};
    const labelPairs = match[1].split(',');
    
    for (const pair of labelPairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        labels[key] = value.replace(/"/g, '');
      }
    }
    
    return labels;
  }
}

/**
 * 默认计时器实现
 */
class DefaultTimer implements Timer {
  /** 开始时间 */
  public readonly startTime: Date;
  
  /** 结束时间 */
  public endTime?: Date;
  
  /** 持续时间（毫秒） */
  public duration?: number;
  
  /** 指标收集器 */
  private readonly collector: MetricsCollector;
  
  /** 指标名称 */
  private readonly name: string;
  
  /** 标签 */
  private readonly labels?: Record<string, string>;
  
  /** 是否已停止 */
  private stopped = false;

  constructor(collector: MetricsCollector, name: string, labels?: Record<string, string>) {
    this.collector = collector;
    this.name = name;
    this.labels = labels;
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

  record(): void {
    const duration = this.stop();
    this.collector.histogram(this.name, duration, this.labels);
  }
}

/**
 * 性能指标收集器
 * 专门用于收集性能相关的指标
 */
export class PerformanceMetricsCollector {
  /** 底层指标收集器 */
  private readonly collector: MetricsCollector;
  
  /** 内存使用指标名称 */
  private readonly memoryUsageMetric = 'performance_memory_usage';
  
  /** CPU 使用指标名称 */
  private readonly cpuUsageMetric = 'performance_cpu_usage';
  
  /** 事件循环延迟指标名称 */
  private readonly eventLoopLagMetric = 'performance_event_loop_lag';
  
  /** GC 指标名称 */
  private readonly gcMetric = 'performance_gc';

  constructor(collector: MetricsCollector) {
    this.collector = collector;
  }

  /**
   * 收集内存使用指标
   */
  collectMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      
      this.collector.gauge(`${this.memoryUsageMetric}_rss`, usage.rss, { type: 'rss' });
      this.collector.gauge(`${this.memoryUsageMetric}_heap_total`, usage.heapTotal, { type: 'heap_total' });
      this.collector.gauge(`${this.memoryUsageMetric}_heap_used`, usage.heapUsed, { type: 'heap_used' });
      this.collector.gauge(`${this.memoryUsageMetric}_external`, usage.external, { type: 'external' });
    }
  }

  /**
   * 收集 CPU 使用指标
   */
  collectCpuUsage(): void {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      
      this.collector.gauge(`${this.cpuUsageMetric}_user`, usage.user, { type: 'user' });
      this.collector.gauge(`${this.cpuUsageMetric}_system`, usage.system, { type: 'system' });
    }
  }

  /**
   * 测量事件循环延迟
   */
  measureEventLoopLag(): void {
    const start = process.hrtime.bigint();
    
    setImmediate(() => {
      const end = process.hrtime.bigint();
      const lag = Number(end - start) / 1000000; // 转换为毫秒
      
      this.collector.histogram(this.eventLoopLagMetric, lag);
    });
  }

  /**
   * 监听 GC 事件
   */
  monitorGc(): void {
    if (typeof global !== 'undefined' && (global as any).gc) {
      const gc = (global as any).gc;
      
      const originalGc = gc;
      (global as any).gc = () => {
        const start = Date.now();
        originalGc();
        const duration = Date.now() - start;
        
        this.collector.histogram(this.gcMetric, duration);
      };
    }
  }

  /**
   * 收集所有性能指标
   */
  collectAll(): void {
    this.collectMemoryUsage();
    this.collectCpuUsage();
    this.measureEventLoopLag();
  }
}

/**
 * 指标收集器工厂
 */
export class MetricsCollectorFactory {
  /**
   * 创建默认指标收集器
   * @returns 指标收集器实例
   */
  static createDefault(): MetricsCollector {
    return new DefaultMetricsCollector();
  }

  /**
   * 创建性能指标收集器
   * @param collector 底层指标收集器
   * @returns 性能指标收集器实例
   */
  static createPerformance(collector: MetricsCollector): PerformanceMetricsCollector {
    return new PerformanceMetricsCollector(collector);
  }
}
