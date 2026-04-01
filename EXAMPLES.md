# AI 框架示例代码

本文档提供了 AI 框架的详细示例代码，帮助开发者快速上手。

## 目录

- [基础示例](#基础示例)
- [工具开发示例](#工具开发示例)
- [命令开发示例](#命令开发示例)
- [Agent 开发示例](#agent-开发示例)
- [技能开发示例](#技能开发示例)
- [完整应用示例](#完整应用示例)

## 基础示例

### 1. 最小化应用

```typescript
import { Engine } from './src/core/Engine'
import { ConfigManagerFactory } from './src/config'
import { LoggerManagerFactory } from './src/logger'
import { ContextManagerFactory } from './src/context'
import { ToolSystemFactory } from './src/tools'
import { CommandSystemFactory } from './src/commands'
import { AgentCoordinatorFactory } from './src/agents'
import { SkillSystemFactory } from './src/skills'

async function main() {
  // 创建引擎
  const engine = new Engine({
    configManager: ConfigManagerFactory.create(),
    logger: LoggerManagerFactory.createDevelopment().getDefaultLogger(),
    contextManager: ContextManagerFactory.create(),
    toolSystem: ToolSystemFactory.create(),
    commandSystem: CommandSystemFactory.create(),
    agentCoordinator: AgentCoordinatorFactory.create(),
    skillSystem: SkillSystemFactory.create(),
    debug: true,
  })

  // 初始化并启动引擎
  await engine.initialize()
  await engine.start()

  console.log('AI 框架已启动！')

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('正在关闭...')
    await engine.stop()
    await engine.cleanup()
    process.exit(0)
  })
}

main().catch(console.error)
```

### 2. 使用配置文件

```typescript
import { ConfigManagerFactory, ConfigFormat } from './src/config'

async function main() {
  // 创建配置管理器
  const configManager = ConfigManagerFactory.create({
    filePath: './config/app.json',
    format: ConfigFormat.JSON,
    hotReload: true,
    loadFromEnv: true,
    envPrefix: 'APP_',
  })

  // 初始化配置
  await configManager.initialize()

  // 获取配置
  const config = configManager.getConfig()
  const port = config.get<number>('server.port', 3000)
  const dbUrl = config.get<string>('database.url')

  console.log('服务器端口:', port)
  console.log('数据库 URL:', dbUrl)

  // 监听配置变更
  configManager.onChange((event) => {
    console.log(`配置变更: ${event.key}`, event.newValue)
  })
}

main().catch(console.error)
```

### 3. 使用日志系统

```typescript
import { LoggerManagerFactory } from './src/logger'

async function main() {
  // 创建日志管理器
  const loggerManager = LoggerManagerFactory.createDevelopment()
  const logger = loggerManager.getDefaultLogger()

  // 记录不同级别的日志
  logger.debug('调试信息', { userId: '123' })
  logger.info('应用启动')
  logger.warn('警告配置')
  logger.error('发生错误', new Error('测试错误'))

  // 使用上下文
  const requestLogger = logger
    .withTags('api', 'request')
    .withRequestId('req-789')
    .withUserId('user-123')

  requestLogger.info('处理请求')

  // 使用计时器
  const timer = logger.startTimer('数据库查询')
  await new Promise(resolve => setTimeout(resolve, 100))
  timer.log()
}

main().catch(console.error)
```

### 4. 使用上下文管理

```typescript
import { ContextManagerFactory } from './src/context'

async function main() {
  const contextManager = ContextManagerFactory.create()

  // 创建用户会话上下文
  const userContext = contextManager.createContext({
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
  userContext.set('lastLogin', Date.now())
  const userId = userContext.get<string>('userId')
  const theme = userContext.get<string>('preferences.theme')

  console.log('用户 ID:', userId)
  console.log('主题:', theme)

  // 查询上下文
  const contexts = contextManager.queryContexts({
    scope: 'session',
    persistent: true,
  })

  console.log('找到', contexts.length, '个会话上下文')
}

main().catch(console.error)
```

## 工具开发示例

### 1. 简单计算器工具

```typescript
import { AbstractTool, ToolParameter, ToolMetadata, ToolResult } from './src/tools'

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
    parameters: Record<string, unknown>
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

// 使用示例
async function useCalculator() {
  const calculator = new CalculatorTool()
  await calculator.initialize()

  const result = await calculator.execute({
    operation: 'add',
    a: 10,
    b: 20,
  })

  if (result.success) {
    console.log('计算结果:', result.data)
  }
}

useCalculator().catch(console.error)
```

### 2. 文件处理工具（支持进度报告）

```typescript
import { AbstractTool, ToolParameter, ToolMetadata, ToolResult, ToolExecuteOptions } from './src/tools'
import * as fs from 'fs/promises'

class FileProcessorTool extends AbstractTool {
  constructor() {
    super(
      {
        name: 'file-processor',
        description: '处理大文件',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        filePath: {
          name: 'filePath',
          type: 'string',
          description: '文件路径',
          required: true,
        },
        operation: {
          name: 'operation',
          type: 'string',
          description: '操作类型：read, process',
          required: true,
          enum: ['read', 'process'],
        },
      },
      false,
      [],
      true,
      true, // 支持进度报告
      true  // 支持取消
    )
  }

  protected async onExecute(
    parameters: Record<string, unknown>,
    options?: ToolExecuteOptions
  ): Promise<ToolResult> {
    const { filePath, operation } = parameters as any

    if (operation === 'read') {
      // 读取文件
      const content = await fs.readFile(filePath, 'utf-8')
      return {
        success: true,
        data: { content, size: content.length },
        duration: 0,
      }
    } else if (operation === 'process') {
      // 处理文件（带进度报告）
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      const processedLines: string[] = []

      for (let i = 0; i < lines.length; i++) {
        // 检查是否取消
        if (this.isCancelled()) {
          return {
            success: false,
            error: '操作已取消',
            duration: 0,
          }
        }

        // 处理行
        processedLines.push(lines[i].toUpperCase())

        // 报告进度
        this.reportProgress(
          (i + 1) / lines.length * 100,
          `处理中...`,
          i + 1,
          lines.length,
          options
        )

        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      return {
        success: true,
        data: { processedLines: processedLines.length },
        duration: 0,
      }
    }

    return {
      success: false,
      error: '不支持的操作',
      duration: 0,
    }
  }
}

// 使用示例
async function useFileProcessor() {
  const processor = new FileProcessorTool()
  await processor.initialize()

  const result = await processor.execute(
    {
      filePath: './test.txt',
      operation: 'process',
    },
    {
      enableProgress: true,
      onProgress: (progress) => {
        console.log(`进度: ${progress.progress}% - ${progress.status}`)
      },
    }
  )

  if (result.success) {
    console.log('处理完成:', result.data)
  }
}

useFileProcessor().catch(console.error)
```

## 命令开发示例

### 1. 简单问候命令

```typescript
import { Command, CommandContext, CommandResult } from './src/commands'

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
  async execute(context: CommandContext): Promise<CommandResult> {
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

// 使用示例
async function useGreetCommand() {
  const result = await greetCommand.execute({
    commandName: 'greet',
    rawInput: 'greet Alice --time morning',
    args: ['Alice'],
    options: { time: 'morning' },
  })

  console.log(result.message)
}

useGreetCommand().catch(console.error)
```

### 2. 带验证的命令

```typescript
import { Command, CommandContext, CommandResult } from './src/commands'

const createUserCommand: Command = {
  name: 'create-user',
  description: '创建新用户',
  arguments: [
    {
      name: 'username',
      description: '用户名',
      required: true,
      type: 'string',
    },
    {
      name: 'email',
      description: '邮箱地址',
      required: true,
      type: 'string',
    },
  ],
  options: [
    {
      short: 'a',
      long: 'admin',
      description: '创建管理员用户',
      requiresValue: false,
      defaultValue: false,
    },
  ],
  async validate(context: CommandContext): Promise<boolean> {
    const { username, email } = context.args

    // 验证用户名
    if (username.length < 3) {
      console.error('用户名至少需要3个字符')
      return false
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('邮箱格式不正确')
      return false
    }

    return true
  },
  async beforeExecute(context: CommandContext): Promise<void> {
    console.log('准备创建用户:', context.args.username)
  },
  async execute(context: CommandContext): Promise<CommandResult> {
    const { username, email } = context.args
    const { admin } = context.options

    // 模拟创建用户
    const user = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      email,
      role: admin ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    }

    return {
      success: true,
      message: '用户创建成功',
      data: user,
    }
  },
  async afterExecute(context: CommandContext, result: CommandResult): Promise<void> {
    if (result.success) {
      console.log('用户创建完成:', result.data)
    }
  },
}

// 使用示例
async function useCreateUserCommand() {
  const result = await createUserCommand.execute({
    commandName: 'create-user',
    rawInput: 'create-user alice@example.com --admin',
    args: ['alice', 'alice@example.com'],
    options: { admin: true },
  })

  console.log(result.message, result.data)
}

useCreateUserCommand().catch(console.error)
```

## Agent 开发示例

### 1. 简单数据处理 Agent

```typescript
import { AbstractAgent, AgentConfig, AgentTask, AgentMessage } from './src/agents'

class DataProcessorAgent extends AbstractAgent {
  private processedCount = 0

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
    this.processedCount = 0
  }

  protected async onStart(): Promise<void> {
    console.log('DataProcessor Agent 已启动')
  }

  protected async onStop(): Promise<void> {
    console.log('DataProcessor Agent 已停止')
    console.log('总共处理了', this.processedCount, '个任务')
  }

  protected async onPause(): Promise<void> {
    console.log('DataProcessor Agent 已暂停')
  }

  protected async onResume(): Promise<void> {
    console.log('DataProcessor Agent 已恢复')
  }

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    console.log(`执行任务: ${task.id}`)

    // 模拟处理任务
    await new Promise(resolve => setTimeout(resolve, 100))

    this.processedCount++

    return {
      success: true,
      taskId: task.id,
      processedAt: new Date().toISOString(),
    }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    console.log(`发送消息: ${message.id} -> ${message.to}`)
  }

  protected async onReceiveMessage(message: AgentMessage): Promise<void> {
    console.log(`接收消息: ${message.id} <- ${message.from}`)

    // 如果需要回复
    if (message.requiresResponse) {
      const reply: AgentMessage = {
        id: `reply-${message.id}`,
        from: this.getId(),
        to: message.from,
        type: 'reply',
        payload: { status: 'received' },
        timestamp: Date.now(),
        correlationId: message.id,
      }

      await this.sendMessage(reply)
    }
  }

  protected async onHealthCheck(): Promise<boolean> {
    return this.processedCount >= 0
  }
}

// 使用示例
async function useDataProcessorAgent() {
  const agent = new DataProcessorAgent()

  // 初始化
  await agent.initialize()

  // 启动
  await agent.start()

  // 执行任务
  const task: AgentTask = {
    id: 'task-1',
    type: 'process',
    data: { input: 'test data' },
    priority: 1,
    createdAt: Date.now(),
    status: 'pending',
  }

  const result = await agent.executeTask(task)
  console.log('任务结果:', result)

  // 健康检查
  const isHealthy = await agent.healthCheck()
  console.log('Agent 健康状态:', isHealthy)

  // 停止
  await agent.stop()
}

useDataProcessorAgent().catch(console.error)
```

### 2. 多 Agent 协作示例

```typescript
import { AbstractAgent, AgentConfig, AgentTask, AgentMessage, AgentEventType } from './src/agents'

class ProducerAgent extends AbstractAgent {
  constructor() {
    super({
      id: 'producer-1',
      name: 'Producer',
      description: '数据生产者 Agent',
      capabilities: ['produce'],
      version: '1.0.0',
    })
  }

  protected async onInitialize(): Promise<void> {
    console.log('Producer Agent 初始化')
  }

  protected async onStart(): Promise<void> {
    console.log('Producer Agent 已启动')
  }

  protected async onStop(): Promise<void> {
    console.log('Producer Agent 已停止')
  }

  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    // 生产数据
    const data = {
      id: Math.random().toString(36).substr(2, 9),
      content: `数据 ${Date.now()}`,
      timestamp: Date.now(),
    }

    // 发送给消费者
    const message: AgentMessage = {
      id: `msg-${data.id}`,
      from: this.getId(),
      to: 'consumer-1',
      type: 'data',
      payload: data,
      timestamp: Date.now(),
      requiresResponse: true,
    }

    await this.sendMessage(message)

    return { success: true, data }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    console.log('Producer 发送消息:', message.id)
  }

  protected async onReceiveMessage(message: AgentMessage): Promise<void> {
    console.log('Producer 收到回复:', message.id)
  }

  protected async onHealthCheck(): Promise<boolean> {
    return true
  }
}

class ConsumerAgent extends AbstractAgent {
  private receivedData: any[] = []

  constructor() {
    super({
      id: 'consumer-1',
      name: 'Consumer',
      description: '数据消费者 Agent',
      capabilities: ['consume'],
      version: '1.0.0',
    })
  }

  protected async onInitialize(): Promise<void> {
    console.log('Consumer Agent 初始化')
  }

  protected async onStart(): Promise<void> {
    console.log('Consumer Agent 已启动')
  }

  protected async onStop(): Promise<void> {
    console.log('Consumer Agent 已停止')
    console.log('总共接收了', this.receivedData.length, '条数据')
  }

  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    return { success: true }
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    console.log('Consumer 发送回复:', message.id)
  }

  protected async onReceiveMessage(message: AgentMessage): Promise<void> {
    console.log('Consumer 收到数据:', message.payload)
    this.receivedData.push(message.payload)

    // 发送回复
    if (message.requiresResponse) {
      const reply: AgentMessage = {
        id: `reply-${message.id}`,
        from: this.getId(),
        to: message.from,
        type: 'ack',
        payload: { received: true },
        timestamp: Date.now(),
        correlationId: message.id,
      }

      await this.sendMessage(reply)
    }
  }

  protected async onHealthCheck(): Promise<boolean> {
    return true
  }
}

// 使用示例
async function useMultiAgent() {
  const producer = new ProducerAgent()
  const consumer = new ConsumerAgent()

  // 初始化并启动
  await producer.initialize()
  await consumer.initialize()
  await producer.start()
  await consumer.start()

  // 监听事件
  consumer.on(AgentEventType.MESSAGE_RECEIVED, (event) => {
    console.log('Consumer 收到消息事件:', event.data.message)
  })

  // 生产者执行任务
  const task: AgentTask = {
    id: 'task-1',
    type: 'produce',
    data: {},
    priority: 1,
    createdAt: Date.now(),
    status: 'pending',
  }

  await producer.executeTask(task)

  // 等待处理
  await new Promise(resolve => setTimeout(resolve, 500))

  // 停止
  await producer.stop()
  await consumer.stop()
}

useMultiAgent().catch(console.error)
```

## 技能开发示例

### 1. 文本分析技能

```typescript
import { AbstractSkill, SkillConfig, SkillParameter, SkillResult } from './src/skills'

class TextAnalysisSkill extends这里 AbstractSkill {
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
    parameters: Record<string, unknown>
  ): Promise<SkillResult> {
    const { text, analysisType } = parameters as any

    switch (analysisType) {
      case 'sentiment':
        // 情感分析
        const positiveWords = ['好', '优秀', '棒', '喜欢', '爱']
        const negativeWords = ['差', '糟糕', '讨厌', '恨', '不好']

        let score = 0
        positiveWords.forEach(word => {
          if (text.includes(word)) score++
        })
        negativeWords.forEach(word => {
          if (text.includes(word)) score--
        })

        return {
          success: true,
          data: {
            sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
            score,
            confidence: Math.abs(score) / (positiveWords.length + negativeWords.length),
          },
          duration: 0,
        }

      case 'keywords':
        // 关键词提取
        const words = text.split(/\s+/).filter(w => w.length > 1)
        const wordCount = new Map<string, number>()

        words.forEach(word => {
          const lowerWord = word.toLowerCase()
          wordCount.set(lowerWord, (wordCount.get(lowerWord) || 0) + 1)
        })

        const keywords = Array.from(wordCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word, count]) => ({ word, count }))

        return {
          success: true,
          data: { keywords },
          duration: 0,
        }

      case 'summary':
        // 文本摘要
        const sentences = text.split(/[。！？.!?]/).filter(s => s.trim())
        const summary = sentences.slice(0, 3).join('。') + '。'

        return {
          success: true,
          data: {
            summary,
            originalLength: text.length,
            summaryLength: summary.length,
          },
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

// 使用示例
async function useTextAnalysisSkill() {
  const skill = new TextAnalysisSkill()
  await skill.initialize()

  const text = '这个产品非常好，我很喜欢它！但是价格有点贵。'

  // 情感分析
  const sentimentResult = await skill.execute({
    text,
    analysisType: 'sentiment',
  })
  console.log('情感分析:', sentimentResult.data)

  // 关键词提取
  const keywordsResult = await skill.execute({
    text,
    analysisType: 'keywords',
  })
  console.log('关键词:', keywordsResult.data)

  // 文本摘要
  const summaryResult = await skill.execute({
    text,
    analysisType: 'summary',
  })
  console.log('摘要:', summaryResult.data)
}

useTextAnalysisSkill().catch(console.error)
```

## 完整应用示例

### 1. 智能客服系统

```typescript
import { Engine } from './src/core/Engine'
import { ConfigManagerFactory } from './src/config'
import { LoggerManagerFactory } from './src/logger'
import { ContextManagerFactory } from './src/context'
import { ToolSystemFactory } from './src/tools'
import { CommandSystemFactory } from './src/commands'
import { AgentCoordinatorFactory } from './src/agents'
import { SkillSystemFactory } from './src/skills'
import { AbstractAgent, AgentConfig, AgentTask } from './src/agents'
import { AbstractSkill, SkillConfig, SkillParameter } from './src/skills'

// 定义客服技能
class CustomerServiceSkill extends AbstractSkill {
  constructor() {
    super(
      {
        name: 'customer-service',
        description: '客服技能',
        version: '1.0.0',
        category: 'service',
      },
      {
        query: {
          name: 'query',
          type: 'string',
          description: '用户查询',
          required: true,
        },
      }
    )
  }

  protected async onExecute(parameters: Record<string, unknown>): Promise<any> {
    const { query } = parameters as any

    // 简单的问答逻辑
    const responses: Record<string, string> = {
      '价格': '我们的产品价格从99元到999元不等，具体取决于您选择的套餐。',
      '发货': '我们通常在下单后24小时内发货，快递需要2-3天到达。',
      '退款': '我们支持7天无理由退款，请联系客服办理。',
      '客服': '您可以拨打400-123-4567或发送邮件到support@example.com。',
    }

    for (const [keyword, response] of Object.entries(responses)) {
      if (query.includes(keyword)) {
        return {
          success: true,
          data: { answer: response },
          duration: 0,
        }
      }
    }

    return {
      success: true,
      data: { answer: '抱歉，我没有理解您的问题。您可以尝试询问价格、发货、退款或客服相关信息。' },
      duration: 0,
    }
  }
}

// 定义客服 Agent
class CustomerServiceAgent extends AbstractAgent {
  constructor() {
    super({
      id: 'customer-service-1',
      name: 'CustomerService',
      description: '智能客服 Agent',
      capabilities: ['answer', 'support'],
      version: '1.0.0',
    })
  }

  protected async onInitialize(): Promise<void> {
    console.log('客服 Agent 初始化')
  }

  protected async onStart(): Promise<void> {
    console.log('客服 Agent 已启动')
  }

  protected async onStop(): Promise<void> {
    console.log('客服 Agent 已停止')
  }

  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    const { query } = task.data as any

    // 使用客服技能
    const skill = new CustomerServiceSkill()
    await skill.initialize()

    const result = await skill.execute({ query })

    return {
      success: true,
      query,
      answer: result.data?.answer,
    }
  }

  protected async onSendMessage(message: any): Promise<void> {}
  protected async onReceiveMessage(message: any): Promise<void> {}
  protected async onHealthCheck(): Promise<boolean> {
    return true
  }
}

// 主应用
async function main() {
  // 创建引擎
  const engine = new Engine({
    configManager: ConfigManagerFactory.create(),
    logger: LoggerManagerFactory.createDevelopment().getDefaultLogger(),
    contextManager: ContextManagerFactory.create(),
    toolSystem: ToolSystemFactory.create(),
    commandSystem: CommandSystemFactory.create(),
    agentCoordinator: AgentCoordinatorFactory.create(),
    skillSystem: SkillSystemFactory.create(),
    debug: true,
  })

  // 初始化并启动引擎
  await engine.initialize()
  await engine.start()

  // 创建并注册客服 Agent
  const agent = new CustomerServiceAgent()
  await agent.initialize()
  engine.registerAgent(agent)
  await agent.start()

  // 模拟用户查询
  const queries = [
    '你们的产品价格是多少？',
    '多久能发货？',
    '支持退款吗？',
  ]

  for (const query of queries) {
    console.log('\n用户:', query)

    const task: AgentTask = {
      id: `task-${Date.now()}`,
      type: 'query',
      data: { query },
      priority: 1,
      createdAt: Date.now(),
      status: 'pending',
    }

    const result = await agent.executeTask(task)
    console.log('客服:', result.answer)
  }

  // 清理
  await agent.stop()
  await engine.stop()
  await engine.cleanup()
}

main().catch(console.error)
```

## 总结

以上示例涵盖了 AI 框架的主要功能：

1. **基础示例**: 引擎初始化、配置管理、日志系统、上下文管理
2. **工具开发**: 简单工具、支持进度报告的工具
3. **命令开发**: 简单命令、带验证的命令
4. **Agent 开发**: 单 Agent、多 Agent 协作
5. **技能开发**: 文本分析技能
6. **完整应用**: 智能客服系统

通过这些示例，开发者可以快速理解框架的使用方式，并基于这些示例构建自己的应用。
