/**
 * 命令系统模块导出
 * 提供完整的命令系统功能
 */

// 导出核心类型和接口
export type {
  Command,
  CommandResult,
  CommandContext,
  CommandOption,
  CommandArgument,
  CommandLifecycleEvent,
  CommandLifecycleListener,
  CommandMetadata,
} from './Command';

// 导出命令系统主类
export { CommandSystem, CommandSystemConfig } from './CommandSystem';

// 导出命令注册表
export { CommandRegistry } from './CommandRegistry';

// 导出命令解析器
export { CommandParser, ParseResult } from './CommandParser';
