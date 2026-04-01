/**
 * 命令执行结果类型
 * 用于表示命令执行后的返回结果
 */
export interface CommandResult {
  /** 执行是否成功 */
  success: boolean;
  /** 执行结果消息 */
  message: string;
  /** 返回的数据对象 */
  data?: unknown;
  /** 错误信息（如果执行失败） */
  error?: Error;
  /** 执行耗时（毫秒） */
  duration?: number;
}

/**
 * 命令上下文类型
 * 提供命令执行时的运行时环境和数据
 */
export interface CommandContext {
  /** 命令名称 */
  commandName: string;
  /** 原始命令行输入 */
  rawInput: string;
  /** 解析后的参数 */
  args: string[];
  /** 解析后的选项（键值对） */
  options: Record<string, string | boolean>;
  /** 用户会话信息 */
  session?: {
    /** 用户ID */
    userId?: string;
    /** 会话ID */
    sessionId?: string;
    /** 用户权限 */
    permissions?: string[];
  };
  /** 自定义数据存储 */
  metadata?: Record<string, unknown>;
}

/**
 * 命令选项定义
 * 用于描述命令支持的选项参数
 */
export interface CommandOption {
  /** 选项名称（短格式，如 'v'） */
  short?: string;
  /** 选项名称（长格式，如 'verbose'） */
  long: string;
  /** 选项描述 */
  description: string;
  /** 是否需要参数值 */
  requiresValue?: boolean;
  /** 默认值 */
  defaultValue?: string | boolean;
  /** 是否必需 */
  required?: boolean;
  /** 可选值列表（枚举） */
  choices?: string[];
}

/**
 * 命令参数定义
 * 用于描述命令支持的位置参数
 */
export interface CommandArgument {
  /** 参数名称 */
  name: string;
  /** 参数描述 */
  description: string;
  /** 是否必需 */
  required: boolean;
  /** 默认值 */
  defaultValue?: string;
  /** 参数类型 */
  type?: 'string' | 'number' | 'boolean';
}

/**
 * 命令接口定义
 * 所有命令必须实现此接口
 */
export interface Command {
  /** 命令名称（唯一标识） */
  name: string;
  /** 命令别名列表 */
  aliases?: string[];
  /** 命令描述 */
  description: string;
  /** 命令详细帮助信息 */
  help?: string;
  /** 命令分组 */
  group?: string;
  /** 命令支持的选项 */
  options?: CommandOption[];
  /** 命令支持的参数 */
  arguments?: CommandArgument[];
  /** 命令示例 */
  examples?: string[];
  /** 命令执行前的钩子函数 */
  beforeExecute?: (context: CommandContext) => Promise<void> | void;
  /** 命令执行后的钩子函数 */
  afterExecute?: (context: CommandContext, result: CommandResult) => Promise<void> | void;
  /** 命令执行方法 */
  execute(context: CommandContext): Promise<CommandResult> | CommandResult;
  /** 命令验证方法（可选） */
  validate?: (context: CommandContext) => Promise<boolean> | boolean;
  /** 命令取消方法（可选） */
  cancel?: () => Promise<void> | void;
}

/**
 * 命令生命周期事件类型
 */
export type CommandLifecycleEvent = 
  | 'beforeRegister'    // 注册前
  | 'afterRegister'     // 注册后
  | 'beforeUnregister'  // 注销前
  | 'afterUnregister'   // 注销后
  | 'beforeExecute'     // 执行前
  | 'afterExecute'      // 执行后
  | 'onError';          // 错误时

/**
 * 命令生命周期监听器类型
 */
export type CommandLifecycleListener = (
  event: CommandLifecycleEvent,
  command: Command,
  context?: CommandContext,
  result?: CommandResult
) => void;

/**
 * 命令元数据接口
 * 用于存储命令的额外信息
 */
export interface CommandMetadata {
  /** 命令创建时间 */
  createdAt: Date;
  /** 命令最后更新时间 */
  updatedAt: Date;
  /** 命令版本 */
  version?: string;
  /** 命令作者 */
  author?: string;
  /** 命令标签 */
  tags?: string[];
  /** 命令是否已启用 */
  enabled: boolean;
  /** 命令执行次数统计 */
  executionCount: number;
  /** 命令最后执行时间 */
  lastExecutedAt?: Date;
}
