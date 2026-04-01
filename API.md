# AI 框架 API 文档

本文档详细描述了 AI 框架的所有 API 接口，包括核心 API、工具系统 API、命令系统 API、Agent 系统 API、技能系统 API、上下文管理 API、配置管理 API 和日志系统 API。

## 目录

- [核心 API](#核心-api)
- [工具系统 API](#工具系统-api)
- [命令系统 API](#命令系统-api)
- [Agent 系统 API](#agent-系统-api)
- [技能系统 API](#技能系统-api)
- [上下文管理 API](#上下文管理-api)
- [配置管理 API](#配置管理-api)
- [日志系统 API](#日志系统-api)

## 核心 API

### Engine 类

核心引擎类，负责协调所有子系统的工作。

#### 构造函数

```typescript
constructor(options: EngineOptions)
```

**参数：**
- `options`: 引擎配置选项

**示例：**
```typescript
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
```

#### 生命周期方法

##### initialize()

初始化引擎。

```typescript
async initialize(): Promise<void>
```

**示例：**
```typescript
await engine.initialize()
```

##### start()

启动引擎。

```typescript
async start(): Promise<void>
```

**示例：**
```typescript
await engine.start()
```

##### stop()

停止引擎。

```typescript
async stop(): Promise<void>
```

**示例：**
```typescript
await engine.stop()
```

##### pause()

暂停引擎。

```typescript
async pause(): Promise<void>
```

**示例：**
```typescript
await engine.pause()
```

##### resume()

恢复引擎。

```typescript
async resume(): Promise<void>
```

**示例：**
```typescript
await engine.resume()
```

#### 注册方法

##### registerTool()

注册工具。

```typescript
registerTool(tool: Tool): void
```

**参数：**
- `tool`: 工具实例

**示例：**
```typescript
const tool = new CalculatorTool()
await tool.initialize()
engine.registerTool(tool)
```

##### unregisterTool()

注销工具。

```typescript
unregisterTool(toolName: string): void
```

**参数：**
- `toolName`: 工具名称

**示例：**
```typescript
engine.unregisterTool('calculator')
```

##### registerCommand()

注册命令。

```typescript
registerCommand(command: Command): void
```

**参数：**
- `command`: 命令实例

**示例：**
```typescript
const command: Command = {
  name: 'greet',
  description: '打招呼命令',
  async execute(context) {
    return { success: true, message: '你好！' }
  },
}
engine.registerCommand(command)
```

##### unregisterCommand()

注销命令。

```typescript
unregisterCommand(commandName: string): void
```

**参数：**
- `commandName`: 命令名称

**示例：**
```typescript
engine.unregisterCommand('greet')
```

##### registerAgent()

注册 Agent。

```typescript
registerAgent(agent: Agent): void
```

**参数：**
- `agent`: Agent 实例

**示例：**
```typescript
const agent = new DataProcessorAgent()
await agent.initialize()
engine.registerAgent(agent)
```

##### unregisterAgent()

注销 Agent。

```typescript
unregisterAgent(agentName: string): void
```

**参数：**
- `agentName`: Agent 名称

**示例：**
```typescript
engine.unregisterAgent('data-processor')
```

##### registerSkill()

注册技能。

```typescript
registerSkill(skill: Skill): void
```

**参数：**
- `skill`: 技能实例

**示例：**
```typescript
const skill = new TextAnalysisSkill()
await skill.initialize()
engine.registerSkill(skill)
```

##### unregisterSkill()

注销技能。

```typescript
unregisterSkill(skillName: string): void
```

**参数：**
- `skillName`: 技能名称

**示例：**
```typescript
engine.unregisterSkill('text-analysis')
```

#### 状态方法

##### getState()

获取引擎状态。

```typescript
getState(): EngineState
```

**返回值：**
- `EngineState`: 引擎状态枚举

**示例：**
```typescript
const state = engine.getState()
console.log('引擎状态:', state)
```

##### getConfig()

获取引擎配置。

```typescript
getConfig(): Config
```

**返回值：**
- `Config`: 配置对象

**示例：**
```typescript
const config = engine.getConfig()
const port = config.get<number>('server.port')
```

##### getUptime()

获取运行时间（毫秒）。

```typescript
getUptime(): number
```

**返回值：**
- `number`: 运行时间（毫秒）

**示例：**
```typescript
const uptime = engine.getUptime()
console.log('运行时间:', uptime, '毫秒')
```

##### getLastError()

获取最后的错误。

```typescript
getLastError(): Error | null
```

**返回值：**
- `Error | null`: 错误对象或 null

**示例：**
```typescript
const error = engine.getLastError()
if (error) {
  console.error('最后错误:', error.message)
}
```

#### 清理方法

##### cleanup()

清理资源。

```typescript
async cleanup(): Promise<void>
```

**示例：**
```typescript
await engine.cleanup()
```

## 工具系统 API

### Tool 接口

工具接口，定义了工具的核心功能。

#### 属性

##### metadata

工具元数据。

```typescript
readonly metadata: ToolMetadata
```

##### parameters

工具参数定义。

```typescript
readonly parameters: Record<string, ToolParameter>
```

##### state

工具当前状态。

```typescript
readonly state: ToolState
```

##### requiresPermission

工具是否需要权限。

```typescript
readonly requiresPermission: boolean
```

##### requiredPermissions

工具所需权限列表。

```typescript
readonly requiredPermissions: string[]
```

##### supportsAsync

工具是否支持异步执行。

```typescript
readonly supportsAsync: boolean
```

##### supportsProgress

工具是否支持进度报告。

```typescript
readonly supportsProgress: boolean
```

##### supportsCancellation

工具是否支持取消。

```typescript
readonly supportsCancellation: boolean
```

#### 方法

##### initialize()

初始化工具。

```typescript
initialize(): Promise<void>
```

##### execute()

执行工具。

```typescript
execute(
  parameters: Record<string, unknown>,
  options?: ToolExecuteOptions
): Promise<ToolResult>
```

**参数：**
- `parameters`: 工具参数
- `options`: 执行选项（可选）

**返回值：**
- `Promise<ToolResult>`: 执行结果

**示例：**
```typescript
const result = await tool.execute({
  operation: 'add',
  a: 10,
  b: 20,
})

if (result.success) {
  console.log('结果:', result.data)
} else {
  console.error('错误:', result.error)
}
```

##### validateParameters()

验证参数。

```typescript
validateParameters(
  parameters: Record<string, unknown>
): { valid: boolean; errors: string[] }
```

**参数：**
- `parameters`: 待验证的参数

**返回值：**
- `{ valid: boolean; errors: string[] }`: 验证结果

**示例：**
```typescript
const validation = tool.validateParameters({
  operation: 'add',
  a: 10,
  b: 20,
})

if (!validation.valid) {
  console.error('参数错误:', validation.errors)
}
```

##### getHelp()

获取工具帮助信息。

```typescript
getHelp(): string
```

**返回值：**
- `string`: 帮助信息字符串

**示例：**
```typescript
const help = tool.getHelp()
console.log(help)
```

##### getExamples()

获取工具使用示例。

```typescript
getExamples(): ToolExample[]
```

**返回值：**
- `ToolExample[]`: 示例数组

**示例：**
```typescript
const examples = tool.getExamples()
examples.forEach(example => {
  console.log('示例:', example.description)
  console.log('参数:', example.parameters)
})
```

##### pause()

暂停工具执行。

```typescript
pause(): Promise<void>
```

##### resume()

恢复工具执行。

```typescript
resume(): Promise<void>
```

##### cancel()

取消工具执行。

```typescript
cancel(): Promise<void>
```

##### cleanup()

清理工具资源。

```typescript
cleanup(): Promise<void>
```

`##### getStats()

获取工具统计信息。

```typescript
getStats(): ToolStats
```

**返回值：**
- `ToolStats`: 统计信息对象

**示例：**
```typescript
const stats = tool.getStats()
console.log('总执行次数:', stats.totalExecutions)
console.log('成功次数:', stats.successfulExecutions)
console.log('平均执行时间:', stats.averageExecutionTime)
```

### AbstractTool 类

抽象工具基类，提供工具接口的默认实现。

#### 构造函数

```typescript
constructor(
  metadata: ToolMetadata,
  parameters: Record<string, ToolParameter>,
  requiresPermission?: boolean,
  requiredPermissions?: string[],
  supportsAsync?: boolean,
  supportsProgress?: boolean,
  supportsCancellation?: boolean
)
```

#### 需要实现的方法

##### onExecute()

子类必须实现的执行逻辑。

```typescript
protected abstract onExecute(
  parameters: Record<string, unknown>,
  options: ToolExecuteOptions
): Promise<ToolResult>
```

#### 可选重写的方法

##### onInitialize()

初始化钩子。

```typescript
protected async onInitialize(): Promise<void>
```

##### onPause()

暂停钩子。

```typescript
protected async onPause(): Promise<void>
```

##### onResume()

恢复钩子。

```typescript
protected async onResume(): Promise<void>
```

##### onCancel()

取消钩子。

```typescript
protected async onCancel(): Promise<void>
```

##### onCleanup()

清理钩子。

```typescript
protected async onCleanup(): Promise<void>
```

#### 辅助方法

##### isCancelled()

检查是否已取消。

```typescript
protected isCancelled(): boolean
```

##### isPaused()

检查是否已暂停。

```typescript
protected isPaused(): boolean
```

##### reportProgress()

报告进度。

```typescript
protected reportProgress(
  progress: number,
  status: string,
  completed: number,
  total: number,
  options?: ToolExecuteOptions
): void
```

## 命令系统 API

### Command 接口

命令接口，定义了命令的核心功能。

#### 属性

##### name

命令名称（唯一标识）。

```typescript
name: string
```

##### aliases

命令别名列表。

```typescript
aliases?: string[]
```

##### description

命令描述。

```typescript
description: string
```

##### help

命令详细帮助信息。

```typescript
help?: string
```

##### group

命令分组。

```typescript
group?: string
```

##### options

命令支持的选项。

```typescript
options?: CommandOption[]
```

##### arguments

命令支持的参数。

```typescript
arguments?: CommandArgument[]
```

##### examples

命令示例。

```typescript
examples?: string[]
```

#### 方法

##### execute()

命令执行方法。

```typescript
execute(context: CommandContext): Promise<CommandResult> | CommandResult
```

**参数：**
- `context`: 命令上下文

**返回值：**
- `Promise<CommandResult> | CommandResult`: 执行结果

#### 钩子方法

##### beforeExecute()

命令执行前的钩子函数。

```typescript
beforeExecute?: (context: CommandContext) => Promise<void> | void
```

##### afterExecute()

命令执行后的钩子函数。

```typescript
afterExecute?: (
  context: CommandContext,
  result: CommandResult
) => Promise<void> | void
```

##### validate()

命令验证方法。

```typescript
validate?: (context: CommandContext) => Promise<boolean> | boolean
```

##### cancel()

命令取消方法。

```typescript
cancel?: () => Promise<void> | void
```

### CommandSystem 类

命令系统管理器。

#### 方法

##### registerCommand()

注册命令。

```typescript
registerCommand(command: Command): void
```

##### unregisterCommand()

注销命令。

```typescript
unregisterCommand(commandName: string): void
```

##### getCommand()

获取命令。

```typescript
getCommand(commandName: string): Command | undefined
```

##### hasCommand()

检查命令是否存在。

```typescript
hasCommand(commandName: string): boolean
```

##### listCommands()

列出所有命令。

```typescript
listCommands(): Command[]
```

##### executeCommand()

执行命令。

```typescript
executeCommand(
  commandName: string,
  args: string[],
  options?: Record<string, string | boolean>
): Promise<CommandResult>
```

## Agent 系统 API

### Agent 接口

Agent 接口，定义了 Agent 的核心功能。

#### 方法

##### getConfig()

获取 Agent 配置。

```typescript
getConfig(): AgentConfig
```

##### getState()

获取 Agent 当前状态。

```typescript
getState(): AgentState
```

##### getId()

获取 Agent ID。

```typescript
getId(): string
```

##### getName()

获取 Agent 名称。

```typescript
getName(): string
```

##### getCapabilities()

获取 Agent 能力列表。

```typescript
getCapabilities(): AgentCapability[]
```

##### hasCapability()

检查 Agent 是否具备指定能力。

```typescript
hasCapability(capability: AgentCapability): boolean
```

##### initialize()

初始化 Agent。

```typescript
initialize(): Promise<void>
```

##### start()

启动 Agent。

```typescript
start(): Promise<void>
```

##### stop()

停止 Agent。

```typescript
stop(): Promise<void>
```

##### pause()

暂停 Agent。

```typescript
pause(): Promise<void>
```

##### resume()

恢复 Agent。

```typescript
resume(): Promise<void>
```

##### executeTask()

执行任务。

```typescript
executeTask(task: AgentTask): Promise<any>
```

##### sendMessage()

发送消息给其他 Agent。

```typescript
sendMessage(message: AgentMessage): Promise<void>
```

##### receiveMessage()

接收来自其他 Agent 的消息。

```typescript
receiveMessage(message: AgentMessage): Promise<void>
```

##### on()

注册事件监听器。

```typescript
on(eventType: AgentEventType, listener: AgentEventListener): void
```

##### off()

移除事件监听器。

```typescript
off(eventType: AgentEventType, listener: AgentEventListener): void
```

##### emit()

触发事件。

```typescript
emit(event: AgentEvent): void
```

##### healthCheck()

获取 Agent 的健康状态。

```。

typescript
healthCheck(): Promise<boolean>
```

### AbstractAgent 类

抽象 Agent 基类，提供 Agent 接口的基本实现。

#### 构造函数

```typescript
constructor(config: AgentConfig)
```

#### 需要实现的方法

##### onInitialize()

初始化逻辑。

```typescript
protected abstract onInitialize(): Promise<void>
```

##### onStart()

启动逻辑。

```typescript
protected abstract onStart(): Promise<void>
```

##### onStop()

停止逻辑。

```typescript
protected abstract onStop(): Promise<void>
```

##### onPause()

暂停逻辑。

```typescript
protected abstract onPause():(): Promise<void>
```

##### onResume()

恢复逻辑。

```typescript
protected abstract onResume(): Promise<void>
```

##### onExecuteTask()

执行任务逻辑。

```typescript
protected abstract onExecuteTask(task: AgentTask): Promise<any>
```

##### onSendMessage()

发送消息逻辑。

```typescript
protected abstract onSendMessage(message: AgentMessage): Promise<void>
```

##### onReceiveMessage()

接收消息逻辑。

```typescript
protected abstract onReceiveMessage(message: AgentMessage): Promise<void>
```

##### onHealthCheck()

健康检查逻辑。

```typescript
protected abstract onHealthCheck(): Promise<boolean>
```

## 技能系统 API

### Skill 接口

技能接口，定义了技能的核心功能。

#### 属性

##### name

技能名称。

```typescript
readonly name: string
```

##### config

技能配置。

```typescript
readonly config: SkillConfig
```

##### parameters

技能参数定义。

```typescript
readonly parameters: Record<string, SkillParameter>
```

##### state

技能当前状态。

```typescript
readonly state: SkillState
```

##### requiresPermission

技能是否需要权限。

```typescript
readonly requiresPermission: boolean
```

##### requiredPermissions

技能所需权限列表。

```typescript
readonly requiredPermissions: string[]
```

##### supportsAsync

技能是否支持异步执行。

```typescript
readonly supportsAsync: boolean
```

##### supportsProgress

技能是否支持进度报告。

```typescript
readonly supportsProgress: boolean
```

##### supportsCancellation

技能是否支持取消。

```typescript
readonly supportsCancellation: boolean
```

#### 方法

##### initialize()

初始化技能。

```typescript
initialize(): Promise<void>
```

##### execute()

执行技能。

```typescript
execute(
  parameters: Record<string, unknown>,
  options?: SkillExecuteOptions
): Promise<SkillResult>
```

##### validateParameters()

验证参数。

```typescript
validateParameters(
  parameters: Record<string, unknown>
): { valid: boolean; errors: string[] }
```

##### getHelp()

获取技能帮助信息。

```typescript
getHelp(): string
```

##### getExamples()

获取技能使用示例。

```typescript
getExamples(): SkillExample[]
```

##### pause()

暂停技能执行。

```typescript
pause(): Promise<void>
```

##### resume()

恢复技能执行。

```typescript
resume(): Promise<void>
```

##### cancel()

取消技能执行。

```typescript
cancel(): Promise<void>
```

##### cleanup()

清理技能资源。

```typescript
cleanup(): Promise<void>
```

##### getStats()

获取技能统计信息。

```typescript
getStats(): SkillStats
```

##### getDependencies()

获取技能依赖。

```typescript
getDependencies(): string[]
```

### AbstractSkill 类

抽象技能基类，提供技能接口的默认实现。

#### 构造函数

```typescript
constructor(
  config: SkillConfig,
  parameters: Record<string, SkillParameter>,
  requiresPermission?: boolean,
  requiredPermissions?: string[],
  supportsAsync?: boolean,
  supportsProgress?: boolean,
  supportsCancellation?: boolean
)
```

#### 需要实现的方法

##### onExecute()

子类必须实现的执行逻辑。

```typescript
protected abstract onExecute(
  parameters: Record<string, unknown>,
  options?: SkillExecuteOptions
): Promise<SkillResult>
```

#### 可选重写的方法

##### onInitialize()

初始化钩子。

```typescript
protected async onInitialize(): Promise<void>
```

##### onPause()

暂停钩子。

```typescript
protected async onPause(): Promise<void>
```

##### onResume()

恢复钩子。

```typescript
protected async onResume(): Promise<void>
```

##### onCancel()

取消钩子。

```typescript
protected async onCancel(): Promise<void>
```

##### onCleanup()

清理钩子。

```typescript
protected async onCleanup(): Promise<void>
```

## 上下文管理 API

### Context 接口

上下文接口，定义了上下文的核心功能。

#### 方法

##### getId()

获取上下文的唯一标识符。

```typescript
getId(): string
```

##### getName()

获取上下文的名称。

```typescript
getName(): string
```

##### getDescription()

获取上下文的描述。

```typescript
getDescription(): string | undefined
```

##### getMetadata()

获取上下文的元数据。

```typescript
getMetadata(): ContextMetadata
```

##### getState()

获取上下文的状态。

```typescript
getState(): ContextState
```

##### getData()

获取上下文的数据。

```typescript
getData(): ContextData
```

##### get()

获取上下文中的指定键的值。

```typescript
get<T = any>(key: string): T | undefined
```

##### set()

设置上下文中的指定键的值。

```typescript
set<T = any>(key: string, value: T): void
```

##### delete()

删除上下文中的指定键。

```typescript
delete(key: string): void
```

##### has()

检查上下文中是否存在指定键。

```typescript
has(key: string): boolean
```

##### keys()

获取上下文的所有键。

```typescript
keys(): string[]
```

##### values()

获取上下文的所有值。

```typescript
values(): any[]
```

##### entries()

获取上下文的所有键值对。

```typescript
entries(): [string, any][]
```

##### update()

更新上下文的数据。

```typescript
update(data: Partial<ContextData>): void
```

##### merge()

合并其他上下文的数据。

```typescript
merge(other: Context): void
```

##### clear()

清空上下文的数据。

```typescript
clear(): void
```

##### getParentId()

获取上下文的父上下文 ID。

```typescript
getParentId(): string | undefined
```

##### getScope()

获取上下文的作用域。

```typescript
getScope(): string | undefined
```

##### isPersistent()

检查上下文是否持久化。

```typescript
isPersistent(): boolean
```

##### isExpired()

检查上下文是否已过期。

```typescript
isExpired(): boolean
```

##### getExpiryTime()

获取上下文的过期时间。

```typescript
getExpiryTime(): number | undefined
```

##### setExpiryTime()

设置上下文的过期时间。

```typescript
setExpiryTime(ttl: number): void
```

##### activate()

激活上下文。

```typescript
activate(): void
```

##### pause()

暂停上下文。

```typescript
pause(): void
```

##### destroy()

销毁上下文。

```typescript
destroy(): void
```

##### clone()

克隆上下文。

```typescript
clone(): Context
```

##### serialize()

序列化上下文。

```typescript
serialize(): string
```

### ContextManager 类

上下文管理器。

#### 方法

##### createContext()

创建上下文。

```typescript
createContext(options: ContextOptions): Context
```

##### getContext()

获取上下文。

```typescript
getContext(contextId: string): Context | undefined
```

##### updateContext()

更新上下文。

```typescript
updateContext(context: Context): void
```

##### deleteContext()

删除上下文。

```typescript
deleteContext(contextId: string): void
```

##### queryContexts()

查询上下文。

```typescript
queryContexts(query: ContextQuery): Context[]
```

##### getStats()

获取统计信息。

```typescript
getStats(): ContextStats
```

## 配置管理 API

### Config 接口

配置接口，定义了配置的核心功能。

#### 方法

##### get()

获取配置值。

```typescript
get<T = ConfigValue>(key: string, defaultValue?: T): T
```

##### set()

设置配置值。

```typescript
set(key: string, value: ConfigValue): void
```

##### has()

检查配置键是否存在。

```typescript
has(key: string): boolean
```

##### delete()

删除配置项。

```typescript
delete(key: string): void
```

##### keys()

获取所有配置键。

```typescript
keys(prefix?: string): string[]
```

##### getSection()

获取配置节。

```typescript
getSection(prefix: string): ConfigSection
```

##### merge()

合并配置。

```typescript
merge(config: ConfigSection, override?: boolean): void
```

##### clear()

清空所有配置。

```typescript
clear(): void
```

##### getMetadata()

获取配置元数据。

```typescript
getMetadata(key: string): ConfigMetadata | undefined
```

##### setMetadata()

设置配置元数据。

```typescript
setMetadata(key: string, metadata: ConfigMetadata): void
```

##### toObject()

获取配置的原始数据。

```typescript
toObject(): ConfigSection
```

##### fromObject()

从对象加载配置。

```typescript
fromObject(obj: ConfigSection): void
```

##### clone()

克隆配置。

```typescript
clone(): Config
```

### ConfigManager 类

配置管理器。

#### 方法

##### initialize()

初始化配置管理器。

```typescript
async initialize(): Promise<void>
```

##### getConfig()

获取配置对象。

```typescript
getConfig(): Config
```

##### load()

加载配置。

```typescript
async load(): Promise<void>
```

##### save()

保存配置。

```typescript
async save(): Promise<void>
```

##### reload()

重新加载配置。

```typescript
async reload(): Promise<void>
```

##### onChange()

监听配置变更。

```typescript
onChange(listener: ConfigChangeListener): void
```

## 日志系统 API

### Logger 接口

日志记录器接口，定义了日志记录器的核心功能。

#### 属性

##### name

日志器名称。

```typescript
readonly name: string
```

##### level

当前日志级别。

```typescript
level: LogLevel
```

#### 方法

##### debug()

记录调试级别日志。

```typescript
debug(message: string, data?: Record<string, unknown>): void
```

##### info()

记录信息级别日志。

```typescript
info(message: string, data?: Record<string, unknown>): void
```

##### warn()

记录警告级别日志。

```typescript
warn(message: string, data?: Record<string, unknown>): void
```

##### error()

记录错误级别日志。

```typescript
error(
  message: string,
  error?: Error,
  data?: Record<string, unknown>
): void
```

##### fatal()

记录致命错误级别日志。

```typescript
fatal(
  message: string,
  error?: Error,
  data?: Record<string, unknown>
): void
```

##### log()

记录指定级别的日志。

```typescript
log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void
```

##### withTags()

添加日志标签。

```typescript
withTags(...tags: string[]): Logger
```

##### withData()

添加日志数据。

```typescript
withData(data: Record<string, unknown>): Logger
```

##### withSource()

添加日志来源。

```typescript
withSource(source: string): Logger
```

##### withRequestId()

添加请求 ID。

```typescript
withRequestId(requestId: string): Logger
```

##### withUserId()

添加用户 ID。

```typescript
withUserId(userId: string): Logger
```

##### withSessionId()

添加会话 ID。

```typescript
withSessionId(sessionId: string): Logger
```

##### addFilter()

添加日志过滤器。

```typescript
addFilter(filter: LogFilter): void
```

##### removeFilter()

移除日志过滤器。

```typescript
removeFilter(filter: LogFilter): void
```

##### addListener()

添加日志监听器。

```typescript
addListener(listener: LogListener): void
```

##### removeListener()

移除日志监听器。

```typescript
removeListener(listener: LogListener): void
```

##### child()

创建子日志器。

```typescript
child(name: string): Logger
```

##### setSilent()

设置日志记录器为静默模式。

```typescript
setSilent(silent: boolean): void
```

##### isSilent()

检查是否静默。

```typescript
isSilent(): boolean
```

### LoggerManager 类

日志管理器。

#### 方法

##### getLogger getDefaultLogger()

获取默认日志器。

```typescript
getDefaultLogger(): Logger
```

##### getLogger()

获取指定名称的日志器。

```typescript
getLogger(name: string): Logger
```

##### addTransport()

添加日志传输器。

```typescript
addTransport(transport: LogTransport): void
```

##### removeTransport()

移除日志传输器。

```typescript
removeTransport(transport: LogTransport): void
```

##### getMetricsCollector()

获取指标收集器。

```typescript
getMetricsCollector(): MetricsCollector
```

##### setLevel()

设置全局日志级别。

```typescript
setLevel(level: LogLevel): void
```

## 类型定义

### EngineState

引擎状态枚举。

```typescript
enum EngineState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}
```

### ToolState

工具状态枚举。

```typescript
enum ToolState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}
```

### AgentState

Agent 状态枚举。

```typescript
enum AgentState {
  CREATED = 'created',
  INITIALIZING = 'initializing',
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}
```

### SkillState

技能状态枚举。

```typescript
enum SkillState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
}
```

### ContextState

上下文状态枚举。

```typescript
enum ContextState {
  CREATED = 'created',
  ACTIVE = 'active',
  PAUSED = 'paused',
  DESTROYED = 'destroyed',
  EXPIRED = 'expired',
}
```

### LogLevel

日志级别枚举。

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}
```

## 总结

AI 框架提供了完整的 API 接口，涵盖了所有核心功能：

1. **核心 API**: 引擎生命周期管理和组件注册
2. **工具系统 API**: 工具的创建、执行和管理
3. **命令系统 API**: 命令的注册、解析和执行
4. **Agent 系统 API**: Agent 的生命周期、任务执行和通信
5. **技能系统 API**: 技能的创建、执行和依赖管理
6. **上下文管理 API**: 上下文的创建、访问和查询
7. **配置管理 API**: 配置的加载、访问和变更监听
8. **日志系统 API**: 日志的记录、格式化和传输

所有 API 都采用 TypeScript 编写，提供完整的类型定义和详细的文档注释，确保类型安全和开发体验。
