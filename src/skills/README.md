# 技能系统 (Skill System)

技能系统是 AI 框架的核心组件之一，为 Agent 提供可执行的能力单元。

## 架构概述

技能系统由以下核心组件组成：

### 1. Skill.ts - 技能接口定义
定义了技能的核心接口和抽象基类，包括：
- `Skill` 接口：定义技能必须实现的方法
- `AbstractSkill` 抽象类：提供默认实现，简化技能开发
- 技能参数定义、执行结果、进度报告等类型

### 2. SkillSystem.ts - 技能系统主类
负责管理技能的注册、查找、执行和依赖管理：
- 技能注册和注销
- 技能查找和获取
- 技能执行和路由
- 技能依赖管理
- 系统状态管理

### 3. SkillLoader.ts - 技能加载器
负责从文件系统加载技能：
- 技能文件加载（支持 .js、.ts、.json）
- 技能验证
- 技能缓存
- 技能热重载

### 4. SkillExecutor.ts - 技能执行器
负责技能的执行逻辑：
- 技能执行逻辑
- 技能参数处理
- 技能错误处理
- 技能超时控制
- 执行重试机制

### 5. SkillRegistry.ts - 技能注册表
负责技能的注册、查找、分组和冲突检测：
- 技能注册表
- 技能查找（按名称、分类、标签）
- 技能分组
- 技能冲突检测
- 依赖关系管理

## 核心特性

### 1. 技能生命周期
技能具有完整的生命周期管理：
- **初始化** (initialize)：技能加载时的初始化
- **执行** (execute)：技能的主要执行逻辑
- **暂停** (pause)：暂停正在执行的技能
- **恢复** (resume)：恢复暂停的技能
- **取消** (cancel)：取消技能执行
- **清理** (cleanup)：释放技能资源

### 2. 参数验证
技能支持严格的参数验证：
- 类型检查（string、number、boolean、object、array）
- 必需参数检查
- 默认值应用
- 枚举值验证
- 长度限制
- 正则表达式验证

### 3. 依赖管理
技能可以声明对其他技能的依赖：
- 自动检查依赖是否满足
- 依赖冲突检测
- 依赖关系查询

### 4. 权限控制
技能可以声明所需的权限：
- 权限检查
- 权限冲突检测

### 5. 执行控制
- 超时控制
- 重试机制
- 进度报告
- 执行统计

### 6. 热重载
支持技能的热重载，无需重启系统：
- 文件监视
- 自动重新加载
- 缓存管理

## 使用示例

### 创建自定义技能

```typescript
import { AbstractSkill, SkillConfig, SkillParameter, SkillResult } from './skills'

class MySkill extends AbstractSkill {
  constructor() {
    const config: SkillConfig = {
      name: 'my-skill',
      description: '我的自定义技能',
      version: '1.0.0',
      category: 'custom',
      tags: ['demo', 'example'],
    }

    const parameters: Record<string, SkillParameter> = {
      input: {
        name: 'input',
        type: 'string',
        description: '输入参数',
        required: true,
      },
      count: {
        name: 'count',
        type: 'number',
        description: '计数',
        required: false,
        default: 1,
      },
    }

    super(config, parameters, false, [], true, false, false)
  }

  protected async onExecute(
    parameters: Record<string, unknown>,
    options?: SkillExecuteOptions,
  ): Promise<SkillResult> {
    const { input, count } = parameters as { input: string; count: number }

    // 执行技能逻辑
    const result = `${input} repeated ${count} times`

    return {
      success: true,
      data: result,
      duration: 0,
    }
  }
}
```

### 使用技能系统

```typescript
import { SkillSystem, SkillRegistry, SkillLoader, SkillExecutor } from './skills'

// 创建组件
const logger = createLogger()
const registry = new SkillRegistry(logger)
const loader = new SkillLoader(logger, { enableHotReload: true })
const executor = new SkillExecutor(logger, { maxRetries: 3 })
const skillSystem = new SkillSystem(registry, loader, executor, logger, {
  enableCache: true,
  defaultTimeout: 30000,
})

// 初始化系统
await skillSystem.initialize()

// 注册技能
const skill = new MySkill()
await skillSystem.registerSkill(skill)

// 执行技能
const result = await skillSystem.executeSkill('my-skill', {
  input: 'Hello',
  count: 3,
})

console.log(result)
```

## 最佳实践

1. **技能设计**
   - 保持技能单一职责
   - 提供清晰的参数定义
   - 编写详细的帮助文档
   - 提供使用示例

2. **错误处理**
   - 捕获并记录所有错误
   - 提供有意义的错误消息
   - 实现适当的重试逻辑

3. **性能优化**
   - 使用缓存减少重复计算
   - 实现进度报告提高用户体验
   - 设置合理的超时时间

4. **安全性**
   - 验证所有输入参数
   - 声明所需的权限
   - 避免执行危险操作

## 扩展性

技能系统设计为高度可扩展：

1. **自定义加载器**：继承 `SkillLoader` 实现自定义加载逻辑
2. **自定义执行器**：继承 `SkillExecutor` 实现自定义执行策略
3. **自定义注册表**：继承 `SkillRegistry` 实现自定义注册逻辑
4. **技能组合**：技能可以调用其他技能，实现复杂功能

## 与其他系统的集成

技能系统与 AI 框架的其他组件紧密集成：

- **Agent 系统**：Agent 可以调用技能执行任务
- **工具系统**：技能可以使用工具系统提供的工具
- **命令系统**：技能可以响应命令
- **上下文管理**：技能可以访问和修改执行上下文

## 文件结构

```
src/skills/
├── Skill.ts           # 技能接口定义
├── SkillSystem.ts     # 技能系统主类
├── SkillLoader.ts     # 技能加载器
├── SkillExecutor.ts   # 技能执行器
├── SkillRegistry.ts   # 技能注册表
├── index.ts          # 模块导出
└── README.md         # 本文档
```

## 类型定义

所有类型定义都包含详细的 JSDoc 注释，支持 TypeScript 的类型提示和自动补全。

## 许可证

MIT License
