# 贡献指南

感谢您对 AI 框架的关注！我们欢迎任何形式的贡献。

## 目录

- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [测试指南](#测试指南)
- [提交流程](#提交流程)
- [版本发布](#版本发布)

## 开发环境设置

### 1. 克隆仓库

```bash
git clone https://github.com/your-org/ai-framework.git
cd ai-framework
```

### 2. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### 3. 开发工具

确保已安装以下工具：

- **Node.js**: >= 16.0.0
- **TypeScript**: >= 4.5.0
- **npm/yarn/pnpm**: 最新版本

### 4. 构建项目

```bash
npm run build
# 或
yarn build
```

### 5. 运行测试

```bash
npm test
# 或
yarn test
```

### 6. 开发模式

```bash
npm run dev
# 或
yarn dev
```

### 7. 代码检查

```bash
# 运行 ESLint
npm run lint
# 或
yarn lint

# 运行 Prettier
npm run format
# 或
yarn format

# 类型检查
npm run typecheck
# 或
yarn typecheck
```

## 代码规范

### 1. TypeScript 规范

#### 类型定义

- 所有函数参数和返回值必须有明确的类型定义
- 使用接口定义复杂对象类型
- 使用类型别名定义简单类型
- 避免使用 `any` 类型，优先使用 `unknown`

```typescript
// 好的示例
interface User {
  id: string
  name: string
  email: string
}

function getUser(id: string): Promise<User> {
  // 实现
}

// 不好的示例
function getUser(id): Promise<any> {
  // 实现
}
```

#### 参数解构和默认值

- 使用解构赋值提取参数
- 为参数提供默认值防止报错

```typescript
// 好的示例
interface Options {
  timeout?: number
  retries?: number
}

async function fetchData(url: string, { timeout = 5000, retries = 3 }: Options = {}) {
  // 实现
}

// 不好的示例
async function fetchData(url: string, options?: any) {
  const timeout = options?.timeout || 5000
  const retries = options?.retries || 3
  // 实现
}
```

#### 注释规范

- 所有公共接口和类必须包含详细的中文注释
- 使用 JSDoc 格式编写注释
- 注释应说明参数、返回值和异常

```typescript
/**
 * 用户管理器类
 * 
 * 负责用户的创建、查询、更新和删除操作
 */
class UserManager {
  /**
   * 创建新用户
   * 
   * @param userData - 用户数据
   * @returns Promise<User> - 创建的用户对象
   * @throws Error - 当用户数据无效时抛出错误
   */
  async createUser(userData: UserData): Promise<User> {
    // 实现
  }
}
```

### 2. 命名规范

#### 文件命名

- 使用 PascalCase 命名类文件：`UserManager.ts`
- 使用 camelCase 命名工具文件：`utils.ts`
- 使用 kebab-case 命名配置文件：`app-config.json`

#### 变量命名

- 使用 camelCase 命名变量和函数：`userName`, `getUser()`
- 使用 PascalCase 命名类和接口：`UserManager`, `User`
- 使用 UPPER_SNAKE_CASE 命名常量：`MAX_RETRY_COUNT`

```typescript
// 常量
const MAX_RETRY_COUNT = 3
const DEFAULT_TIMEOUT = 5000

// 类
class UserManager {}

// 接口
interface User {}

// 函数
function getUser() {}

// 变量
let userName = ''
let isActive = false
```

### 3. 代码组织

#### 文件结构

```
src/
├── core/           # 核心模块
├── tools/          # 工具系统
├── commands/       # 命令系统
├── agents/         # Agent 系统
├── skills/         # 技能系统
├── context/        # 上下文管理
├── config/         # 配置管理
├── logger/         # 日志系统
└── utils/          # 工具函数
```

#### 导入顺序

```typescript
// 1. Node.js 内置模块
import * as fs from 'fs'
import * as path from 'path'

// 2. 第三方库
import express from 'express'
import lodash from 'lodash'

// 3. 项目内部模块
import { Engine } from './core/Engine'
import { Tool } from './tools/Tool'

// 4. 类型导入
import type { User } from './types/User'
```

### 4. 错误处理

#### 错误处理原则

- 使用 try-catch 捕获异步错误
- 提供有意义的错误消息
- 记录错误日志
- 适当地传播错误

```typescript
// 好的示例
async function processFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    // 处理内容
  } catch (error) {
    logger.error('处理文件失败', error as Error, { filePath })
    throw new Error(`处理文件失败: ${filePath}`)
  }
}

// 不好的示例
async function processFile(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8')
  // 处理内容，没有错误处理
}
```

### 5. 异步编程

#### Promise 使用

- 优先使用 async/await 而不是 Promise.then()
- 正确处理 Promise 错误
- 避免在循环中创建不必要的 Promise

```typescript
// 好的示例
async function processItems(items: Item[]): Promise<void> {
  for (const item of items) {
    await processItem(item)
  }
}

// 不好的示例
function processItems(items: Item[]): Promise<void> {
  return Promise.all(items.map(item => processItem(item)))
}
```

## 测试指南

### 1. 测试框架

项目使用以下测试框架：

- **Jest**: 单元测试框架
- **@types/jest**: TypeScript 类型定义

### 2. 测试文件组织

```
src/
├── core/
│   ├── Engine.ts
│   └── Engine.test.ts
├── tools/
│   ├── Tool.ts
│   └── Tool.test.ts
└── ...
```

### 3. 编写测试

#### 单元测试示例

```typescript
import { CalculatorTool } from './CalculatorTool'

describe('CalculatorTool', () => {
  let tool: CalculatorTool

  beforeEach(async () => {
    tool = new CalculatorTool()
    await tool.initialize()
  })

  afterEach(async () => {
    await tool.cleanup()
  })

  describe('execute', () => {
    it('应该正确执行加法运算', async () => {
      const result = await tool.execute({
        operation: 'add',
        a: 10,
        b: 20,
      })

      expect(result.success).toBe(true)
      expect(result.data?.result).toBe(30)
    })

    it('应该正确处理除零错误', async () => {
      const result = await tool.execute({
        operation: 'divide',
        a: 10,
        b: 0,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('除数不能为零')
    })
  })

  describe('validateParameters', () => {
    it('应该验证必需参数', () => {
      const validation = tool.validateParameters({
        operation: 'add',
        a: 10,
      })

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Required parameter \'b\' is missing')
    })
  })
})
```

#### 集成测试示例

```typescript
import { Engine } from './core/Engine'
import { ConfigManagerFactory } from './config'
import { LoggerManagerFactory } from './logger'

describe('Engine Integration Tests', () => {
  let engine: Engine

  beforeEach(async () => {
    engine = new Engine({
      configManager: ConfigManagerFactory.create(),
      logger: LoggerManagerFactory.createDevelopment().getDefaultLogger(),
      contextManager: ContextManagerFactory.create(),
      toolSystem: ToolSystemFactory.create(),
      commandSystem: CommandSystemFactory.create(),
      agentCoordinator: AgentCoordinatorFactory.create(),
      skillSystem: SkillSystemFactory.create(),
    })

    await engine.initialize()
  })

  afterEach(async () => {
    await engine.stop()
    await engine.cleanup()
  })

  it('应该成功初始化和启动引擎', async () => {
    await engine.start()
    expect(engine.getState()).toBe('running')
  })

  it('应该正确注册和执行工具', async () => {
    const tool = new CalculatorTool()
    await tool.initialize()
    engine.registerTool(tool)

    const result = await tool.execute({
      operation: 'add',
      a: 10,
      b: 20,
    })

    expect(result.success).toBe(true)
  })
})
```

### 4. 测试覆盖率

确保测试覆盖率至少达到：

- **语句覆盖率**: 80%
- **分支覆盖率**: 75%
- **函数覆盖率**: 80%
- **行覆盖率**: 80%

运行覆盖率测试：

```bash
npm run test:coverage
# 或
yarn test:coverage
```

### 5. 测试最佳实践

1. **测试独立性**: 每个测试应该独立运行，不依赖其他测试
2. **测试可读性**: 使用清晰的测试名称和描述
3. **测试完整性**: 测试正常路径和异常路径
4. **测试性能**: 避免测试执行时间过长
5. **测试维护性**: 使用辅助函数和共享设置

## 提交流程

### 1. 分支策略

#### 主分支

- `main`: 主分支，包含稳定代码
- `develop`: 开发分支，包含最新开发代码

#### 功能分支

- `feature/xxx`: 新功能开发
- `bugfix/xxx`: Bug 修复
- `hotfix/xxx`: 紧急 Bug 修复
- `refactor/xxx`: 代码重构
- `docs/xxx`: 文档更新

### 2. 提交规范

#### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 提交类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

#### 提交示例

```bash
# 新功能
git commit -m "feat(tools): 添加文件处理工具"

# Bug 修复
git commit -m "fix(agents): 修复 Agent 任务调度死锁问题"

# 文档更新
git commit -m "docs(readme): 更新安装指南"

# 重构
git commit -m "refactor(logger): 优化日志格式化性能"
```

### 3. Pull Request 流程

#### 创建 PR

1. 从 `develop` 分支创建功能分支
2. 进行开发和测试
3. 提交代码并推送到远程仓库
4. 创建 Pull Request 到 `develop` 分支

#### PR 模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化

## 变更描述
简要描述本次变更的内容和目的

## 相关 Issue
关闭 #123

## 测试
- [ ] 已添加单元测试
- [ ] 已添加集成测试
- [ ] 所有测试通过

## 检查
- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 Prettier 格式化
- [ ] 代码通过 TypeScript 类型检查

## 文档
- [ ] 已更新相关文档
- [ ] 已添加代码注释

## 截图或演示
（如果适用，添加截图或演示链接）
```

#### PR 审查

1. 至少需要一位维护者审查
2. 确保所有 CI 检查通过
3. 解决所有审查意见
4. 更新相关文档

### 4. 代码审查清单

- [ ] 代码符合项目规范
- [ ] 代码有适当的注释
- [ ] 代码有相应的测试
- [ ] 测试覆盖率达标
- [ ] 没有引入新的警告
- [ ] 没有引入安全漏洞
- [ ] 文档已更新
- [ ] 变更日志已更新

## 版本发布

### 1. 版本号规范

遵循语义化版本 (Semantic Versioning)：

- **主版本号 (MAJOR)**: 不兼容的 API 修改
- **次版本号 (MINOR)**: 向下兼容的功能性新增
- **修订号 (PATCH)**: 向下兼容的问题修正

版本号格式：`MAJOR.MINOR.PATCH`

示例：
- `1.0.0` → `1.0.1` (Bug 修复)
- `1.0.1` → `1.1.0` (新功能)
- `1.1.0` → `2.0.0` (不兼容的 API 变更)

### 2. 发布流程

#### 准备发布

1. 更新版本号
2. 更新 CHANGELOG.md
3. 运行完整测试
4. 构建生产版本

```bash
# 更新版本号
npm version patch  # 或 minor, major

# 运行测试
npm test

# 构建项目
npm run build
```

#### 创建发布标签

```bash
# 创建标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 推送标签
git push origin v1.0.0
```

#### 发布到 npm

```bash
# 发布到 npm
npm publish

# 或使用 yarn
yarn publish
```

### 3. 变更日志

#### CHANGELOG.md 格式

```markdown
# 更新日志

## [1.0.0] - 2024-01-01

### 新增
- 添加工具系统
- 添加命令系统
- 添加 Agent 系统
- 添加技能系统

### 修复
- 修复配置加载问题
- 修复日志格式化错误

### 变更
- 重构引擎初始化流程
- 优化日志性能

## [0.9.0] - 2023-12-01

### 新增
- 添加上下文管理
- 添加配置管理
- 添加日志系统
```

### 4. 发布检查清单

- [ ] 版本号已更新
- [ ] CHANGELOG.md 已更新
- [ ] 所有测试通过
- [ ] 代码已构建
- [ ] 文档已更新
- [ ] 发布标签已创建
- [ ] 已推送到远程仓库
- [ ] 已发布到 npm

## 问题反馈

### 报告 Bug

如果您发现 Bug，请：

1. 在 GitHub Issues 中创建新 Issue
2. 使用 Bug 模板填写信息
3. 提供复现步骤
4. 附上相关日志和截图

### 功能请求

如果您有功能请求，请：

1. 在 GitHub Issues 中创建新 Issue
2. 使用功能请求模板
3. 详细描述功能需求
4. 说明使用场景

### 文档改进

如果您发现文档问题，请：

1. 在 GitHub Issues 中创建新 Issue
2. 说明文档问题
3. 提供改进建议
4. 欢迎直接提交 PR 改进文档

## 联系方式

- **项目主页**: https://github.com/your-org/ai-framework
- **问题反馈**: https://github.com/your-org/ai-framework/issues
- **讨论区**: https://github.com/your-org/ai-framework/discussions
- **邮箱**: support@example.com

## 许可证

通过贡献代码，您同意您的贡献将根据项目的许可证进行许可。

---

再次感谢您的贡献！
