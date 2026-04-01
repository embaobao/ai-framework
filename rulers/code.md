# 代码开发经验沉淀

## 日志系统架构设计 (2026-04-01)

日志系统采用分层架构设计，包含以下核心组件：

### 核心组件
- **Logger.ts**: 定义日志记录器接口、日志级别、日志条目等核心类型
- **LogFormatter.ts**: 提供多种日志格式化方式（JSON、文本、彩色、简洁、开发环境）
- **LogTransport.ts**: 实现多种日志传输方式（控制台、文件、远程、缓冲）
- **MetricsCollector.ts**: 提供性能指标收集和报告功能
- **LoggerManager.ts**: 日志管理器主类，负责日志器的创建、配置和生命周期管理

### 设计模式应用
1. **单例模式**: LoggerManager 使用单例模式确保全局只有一个日志管理器实例
2. **工厂模式**: FormatterFactory、TransportFactory、MetricsCollectorFactory、LoggerManagerFactory 用于创建不同类型的实例
3. **策略模式**: LogFormatter 和 LogTransport 接口允许运行时切换不同的格式化和传输策略
4. **观察者模式**: LogListener 接口允许监听日志事件
5. **装饰器模式**: withTags、withData、withSource 等方法支持链式调用，动态添加日志上下文

### 最佳实践
1. **类型安全**: 所有接口和类都使用 TypeScript 定义，确保类型安全
2. **详细注释**: 所有公共接口和方法都包含详细的中文注释
3. **默认值处理**: 使用解构赋值和默认值防止参数缺失导致的错误
4. **异步处理**: 传输器支持异步操作，避免阻塞主线程
5. **错误处理**: 所有可能失败的操作都包含错误处理逻辑
6. **资源管理**: 提供 connect/disconnect 方法管理传输器连接
7. **性能优化**: 缓冲传输器支持批量传输，减少 I/O 操作

### 使用示例

#### 基本使用
```typescript
import { LoggerManagerFactory } from './logger';

// 创建开发环境日志管理器
const manager = LoggerManagerFactory.createDevelopment();

// 获取默认日志器
const logger = manager.getDefaultLogger();

// 记录日志
logger.info('应用启动');
logger.error('发生错误', error, { userId: '123' });
```

#### 高级使用
```typescript
// 创建生产环境日志管理器
const manager = LoggerManagerFactory.createProduction();

// 添加文件传输器
const fileTransport = TransportFactory.createFileTransport({
  filePath: './logs/app.log',
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 5
}, FormatterFactory.createJsonFormatter());
manager.addTransport(fileTransport);

// 添加缓冲传输器
const bufferedTransport = TransportFactory.createBufferedTransport(
  fileTransport,
  100,
  1000
);
manager.addTransport(bufferedTransport);

// 创建带上下文的日志器
const logger = manager.getLogger('app')
  .withTags('api', 'request')
  .withRequestId('req-123')
  .withUserId('user-456');

// 使用计时器
const timer = logger.startTimer('API 请求处理');
// ... 执行操作
timer.log();
```

#### 指标收集
```typescript
// 获取指标收集器
const metrics = manager.getMetricsCollector();

// 记录指标
metrics.increment('api_requests_total', 1, { method: 'GET', path: '/api/users' });
metrics.gauge('active_connections', 42);
metrics.histogram('request_duration_ms', 123);

// 使用计时器
const timer = metrics.startTimer('database_query');
// ... 执行查询
timer.record();

// 导出指标
const prometheusMetrics = metrics.export('prometheus');
```

### 配置建议

#### 开发环境
- 日志级别: DEBUG
- 格式化器: DevFormatter（彩色、详细）
- 传输器: ConsoleTransport
- 包含堆栈: true

#### 生产环境
- 日志级别: INFO
- 格式化器: JsonFormatter（结构化）
- 传输器: FileTransport + BufferedTransport
- 包含堆栈: false
- 启用指标收集: true
- 启用性能监控: true

### 扩展点
1. **自定义格式化器**: 实现 LogFormatter 接口
2. **自定义传输器**: 实现 LogTransport 接口
3. **自定义过滤器**: 实现 LogFilter 接口
4.   **自定义监听器**: 实现 LogListener 接口

### 注意事项
1. 日志管理器使用单例模式，确保全局唯一
2. 传输器需要手动调用 connect/disconnect 管理连接
3. 缓冲传输器会定时刷新，应用退出前应调用 flush
4. 指标收集器支持 Prometheus 和 JSON 格式导出
5. 性能监控仅在 Node.js 环境下可用
