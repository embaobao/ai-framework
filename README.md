# AI 框架

一个功能强大、模块化的 AI 应用开发框架，提供完整的工具系统、命令系统、Agent 系统、技能系统、上下文管理、配置管理和日志系统。

## 目录

- [框架简介](#框架简介)
- [核心特性](#核心特性)
- [快速开始](#快速开始)
- [安装指南](#安装指南)
- [基本使用](#基本使用)
- [高级特性](#高级特性)
- [配置说明](#配置说明)
- [常见问题](#常见问题)

## 框架简介

AI 框架是一个专为构建智能应用而设计的 TypeScript 框架。它提供了一套完整的工具链，帮助开发者快速构建可扩展、可维护的 AI 应用程序。

框架采用模块化设计，各个子系统可以独立使用，也可以组合使用，为开发者提供最大的灵活性。

## 核心特性

### 1. 工具系统

- 提供强大的工具抽象和执行机制
- 支持工具权限管理
- 支持异步执行和进度报告
- 内置参数验证和错误处理
- 提供工具统计信息

### 2. 命令系统

- 灵活的命令解析和执行
- 支持命令别名和分组
- 提供命令生命周期钩子
- 支持命令验证和取消
- 内置帮助系统

### 3. Agent 系统

- 多 Agent 协调和通信
- 支持任务调度和执行
- 提供 Agent 能力管理
- 支持 Agent 生命周期管理
- 内置健康检查机制

### 4. 技能系统

- 模块化的技能定义和执行
- 支持技能依赖管理
- 提供技能权限控制
- 支持技能进度报告
- 内置技能统计

### 5. 上下文管理

- 灵活的上下文存储和检索
- 支持上下文作用域和继承
- 提供上下文中间件机制
- 支持上下文持久化
- 内置上下文过期管理

### 6. 配置管理

- 多源配置加载（文件、环境变量、命令行、远程）
- 支持配置热重载
- 提供配置验证和类型检查
- 支持配置变更监听
- 内置配置缓存

### 7. 日志系统

- 多级别日志记录
- 支持多种日志格式
- 提供多种日志传输方式
- 支持日志过滤和监听
- 内置性能指标收集

## 快速开始

### 最小示例

```typescript
import { Engine } from './src/core/Engine'
import { ConfigManagerFactory } from './src/config'
import { LoggerManagerFactory } from './src/logger'
import { ContextManagerFactory } from './src/context'
import { ToolSystemFactory } from './src/tools'
import { CommandSystemFactory } from './src/commands'
import { AgentCoordinatorFactory } from './src/agents'
import { SkillSystemFactory } from './src/skills'

// 创建引擎
const engine = new Engine({
  configManager: ConfigManagerFactory.create(),
  logger: LoggerManagerFactory.createDevelopment().getDefaultLogger(),
  contextManager: ContextManagerFactory.create(),
  toolSystem: ToolSystemFactory.create(),
  commandSystem: CommandSystemFactory.create(),
  agentCoordinator: AgentCoordinatorFactory.create(),
  skillSystem: SkillSystemFactory.create(),
})

// 初始化并启动引擎
await engine.initialize()
await engine.start()

console.log('AI 框架已启动！')
```

## 安装指南

### 环境要求

- Node.js >= 16.0.0
- TypeScript >= 4.5.0
- npm >= 7.0.0 或 yarn >= 1.22.0

### 安装步骤

1. 克隆仓库

```bash
git clone https://github.com/your-org/ai-framework.git
cd ai-framework
```

1. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

1. 构建项目

```bash
npm run build
# 或
yarn build
```

1. 运行测试

```bash
npm test
# 或
yarn test
```

## 基本使用

### 创建使用工具

```typescript
import { AbstractTool, ToolParameter, ToolMetadata } from './src/tools'

class CalculatorTool extends AbstractTool {
  constructor() {
    super(
      {
        name: 'calculator',
        description: '执行基本数学运算',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        operation: {
          name: 'operation',
          type: 'string',
          description: '运算类型：add, subtract, multiply, divide',
          required: true,
          enum: ['add', 'subtract', 'multiply', 'divide'],
        },
        a: {
          name: 'a',
          type: 'number',
          description: '第一个操作数',
          required: true,
        },
        b: {
          name: 'b',
          type: 'number',
          description: '第二个操作数',
          required: true,
        },
      }
    )
  }

  protected async onExecute(
    parameters: Record<string, unknown>,
    options?: ToolExecuteOptions
  ): Promise<ToolResult> {
    const { operation, a, b } = parameters as any

    let result: number
    switch (operation) {
      case 'add':
        result = a + b
        break
      case 'subtract':
        result = a - b
        break
      case 'multiply':
        result = a * b
        break
      case 'divide':
        if (b === 0) {
          return {
            success: false,
            error: '除数不能为零',
            duration: 0,
          }
        }
        result = a / b
        break
      default:
        return {
          success: false,
          error: '不支持的运算类型',
          duration: 0,
        }
    }

    return {
      success: true,
      data: { result },
      duration: 0,
    }
  }
}

// 注册工具
const calculator = new CalculatorTool()
await calculator.initialize()
engine.register.registerTool(calculator)
```

### 创建自定义命令

```typescript
import { Command } from './src/commands'

const greetCommand: Command = {
  name: 'greet',
  description: '向用户打招呼',
  arguments: [
    {
      name: 'name',
      description: '用户名称',
      required: true,
      type: 'string',
    },
  ],
  options: [
    {
      short: 't',
      long: 'time',
      description: '问候时间',
      requiresValue: true,
      defaultValue: 'day',
      choices: ['morning', 'afternoon', 'evening', 'day'],
    },
  ],
  examples: [
    'greet Alice',
    'greet Bob --time morning',
  ],
  async execute(context) {
    const { name } = context.args
    const { time } = context.options

    const greetings: Record<string, string> = {
      morning: '早上好',
      afternoon: '下午好',
      evening: '晚上好',
      day: '你好',
    }

    return {
      success: true,
      message: `${greetings[time as string] || '你好'}，${name}！`,
    }
  },
}

// 注册命令
engine.registerCommand(greetCommand)
```

### 创建自定义 Agent

```typescript
import { AbstractAgent, AgentConfig, AgentTask } from './src/agents'

class DataProcessorAgent extends AbstractAgent {
  constructor() {
    super({
      id: 'data-processor-1',
      name: 'DataProcessor',
      description: '数据处理 Agent',
      capabilities: ['process', 'analyze', 'transform'],
      version: '1.0.0',
      maxConcurrentTasks: 5,
      taskTimeout: 30000,
    })
  }

  protected async onInitialize(): Promise<void> {
    console.log('DataProcessor Agent 初始化中...')
  }

  protected async onStart(): Promise<void> {
    console.log('DataProcessor Agent 已启动')
  }

  protected async onStop(): Promise<void> {
    console.log('DataProcessor Agent 已停止')
  }

  protected async onPause(): Promise<void> {
    console.log('DataProcessor Agent 已暂停')
  }

  protected async onResume(): Promise<void> {
    console.log('DataProcessor Agent 已恢复')
  }

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    console.log(`执行任务: ${task.id}`)
    // 处理任务逻辑
    return { success: true }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    console.log(`发送消息: ${message.id}`)
  }

  protected async onReceiveMessage(message: AgentMessage): Promise<void> {
    console.log(`接收消息: ${message.id}`)
  }

  protected async onHealthCheck(): Promise<boolean> {
    return true
  }
}

// 创建并注册 Agent
const agent = new DataProcessorAgent()
await agent.initialize()
engine.registerAgent(agent)
```

### 创建自定义技能

```typescript
import { AbstractSkill, SkillConfig, SkillParameter } from './src/skills'

class TextAnalysisSkill extends AbstractSkill {
  constructor() {
    super(
      {
        name: 'text-analysis',
        description: '文本分析技能',
        version: '1.0.0',
        category: 'nlp',
        tags: ['text', 'analysis', 'nlp'],
      },
      {
        text: {
          name: 'text',
          type: 'string',
          description: '要分析的文本',
          required: true,
        },
        analysisType: {
          name: 'analysisType',
          type: 'string',
          description: '分析类型',
          required: true,
          enum: ['sentiment', 'keywords', 'summary'],
        },
      }
    )
  }

  protected async onExecute(
    parameters: Record<string, unknown>,
    options?: SkillExecuteOptions
  ): Promise<SkillResult> {
    const { text, analysisType } = parameters as any

    switch (analysisType) {
      case 'sentiment':
        return {
          success: true,
          data: { sentiment: 'positive', confidence: 0.85 },
          duration: 0,
        }
      case 'keywords':
        return {
          success: true,
          data: { keywords: ['AI', '框架', '开发'] },
          duration: 0,
        }
      case 'summary':
        return {
          success: true,
          data: { summary: text.substring(0, 100) + '...' },
          duration: 0,
        }
      default:
        return {
          success: false,
          error: '不支持的分析类型',
          duration: 0,
        }
    }
  }
}

// 创建并注册技能
const skill = new TextAnalysisSkill()
await skill.initialize()
engine.registerSkill(skill)
```

## 高级特性

### 上下文管理

```typescript
import { ContextManagerFactory } from './src/context'

const contextManager = ContextManagerFactory.create()

// 创建上下文
const context = contextManager.createContext({
  name: 'user-session',
  description: '用户会话上下文',
  data: {
    userId: 'user-123',
    userName: 'Alice',
    preferences: {
      theme: 'dark',
      language: 'zh-CN',
    },
  },
  scope: 'session',
  persistent: true,
  ttl: 3600000, // 1小时过期
})

// 使用上下文
context.set('lastLogin', Date.now())
const userId = context.get<string>('userId')

// 查询上下文
const contexts = contextManager.queryContexts({
  scope: 'session',
  persistent: true,
})
```

### 配置管理

```typescript
import { ConfigManagerFactory } from './src/config'

const configManager = ConfigManagerFactory.create({
  filePath: './config/app.json',
  format: ConfigFormat.JSON,
  hotReload: true,
  loadFromEnv: true,
  envPrefix: 'APP_',
})

// 获取配置
const port = configManager.get<number>('server.port', 3000)
const dbUrl = configManager.get<string>('database.url')

// 设置配置
configManager.set('server.port', 8080)

// 监听配置变更
configManager.onChange((event) => {
  console.log(`配置变更: ${event.key}`, event.newValue)
})
```

### 日志系统

```typescript
import { LoggerManagerFactory } from './src/logger'

const loggerManager = LoggerManagerFactory.createProduction()
const logger = loggerManager.getLogger('app')

// 记录日志
logger.info('应用启动')
logger.debug('调试信息', { userId: '123' })
logger.warn('警告信息')
logger.error('错误信息', error, { requestId: 'req-456' })

// 使用上下文
logger
  .withTags('api', 'request')
  .withRequestId('req-789')
  .withUserId('user-123')
  .info('处理请求')

// 使用计时器
const timer = logger.startTimer('数据库查询')
// ... 执行查询
timer.log()
```

### Agent 通信

```typescript
// Agent 之间发送消息
const message: AgentMessage = {
  id: 'msg-123',
  from: 'agent-1',
  to: 'agent-2',
  type: 'data-request',
  payload: { query: 'SELECT * FROM users' },
  timestamp: Date.now(),
  requiresResponse: true,
}

await agent1.sendMessage(message)

// 接收消息
agent2.on(AgentEventType.MESSAGE_RECEIVED, (event) => {
  console.log('收到消息:', event.data.message)
})
```

## 配置说明

### 引擎配置

```typescript
interface EngineOptions {
  configManager: ConfigManager
  logger: Logger
  contextManager: ContextManager
  toolSystem: ToolSystem
  commandSystem: CommandSystem
  agentCoordinator: AgentCoordinator
  skillSystem: SkillSystem
  debug?: boolean
}
```

### 日志配置

```typescript
interface LoggerOptions {
  name?: string
  level?: LogLevel
  timestamp?: boolean
  includeStack?: boolean
  includeErrorDetails?: boolean
  tags?: string[]
  data?: Record<string, unknown>
}
```

### 配置文件示例

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "url": "mongodb://localhost:27017/ai-framework",
    "options": {
      "maxPoolSize": 10
    }
  },
  "logging": {
    "level": "info",
    "format": "json",
    "transports": ["console", "file"]
  },
  "agents": {
    "maxConcurrent": 10,
    "taskTimeout": 30000
  }
}
```

## 常见问题

### Q: 如何添加自定义工具？

A: 继承 `AbstractTool` 类并实现 `onExecute` 方法，然后通过 `engine.registerTool()` 注册。

### Q: Agent 之间如何通信？

A: 使用 `sendMessage()` 和 `receiveMessage()` 方法，通过 `AgentMessage` 接口定义消息格式。

### Q: 如何实现技能依赖？

A: 在技能配置中定义 `dependencies` 数组，框架会自动处理依赖关系。

### Q: 上下文如何持久化？

A: 创建上下文时设置 `persistent: true`，框架会自动处理持久化逻辑。

### Q: 如何监听配置变更？

A: 使用 `configManager.onChange()` 方法注册变更监听器。

### Q: 日志如何输出到文件？

A: 创建 `FileTransport` 并添加到日志管理器。

### Q: 如何实现工具权限控制？

A: 在工具元数据中设置 `requiresPermission: true` 和 `requiredPermissions` 数组。

### Q: Agent 任务如何超时处理？

A: 在 Agent 配置中设置 `taskTimeout` 参数，框架会自动处理超时。

## 更多文档

-详细架构说明，请参阅 [ARCHITECTURE.md](ARCHITECTURE.md)

- API 文档，请参阅 [API.md](API.md)
- 示例代码，请参阅 [EXAMPLES.md](EXAMPLES.md)
- 贡献指南，请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)

## 许可证

MIT License

## 联系方式

- 邮箱: <chxdbb@gmail.com>

