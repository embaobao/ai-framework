import { Command, CommandContext, CommandResult, CommandLifecycleEvent, CommandLifecycleListener } from './Command';
import { CommandRegistry } from './CommandRegistry';
import { CommandParser } from './CommandParser';

/**
 * 命令系统配置接口
 */
export interface CommandSystemConfig {
  /** 是否启用引号解析 */
  enableQuotes?: boolean;
  /** 是否启用转义字符解析 */
  enableEscaping?: boolean;
  /** 默认会话信息 */
  defaultSession?: {
    userId?: string;
    sessionId?: string;
    permissions?: string[];
  };
}

/**
 * 命令系统主类
 * 负责管理命令的注册、解析、执行和帮助系统
 */
export class CommandSystem {
  /** 命令注册表 */
  private registry: CommandRegistry;
  
  /** 命令解析器 */
  private parser: CommandParser;
  
  /** 默认会话信息 */
  private defaultSession: CommandSystemConfig['defaultSession'];
  
  /** 全局生命周期监听器列表 */
  private globalListeners: CommandLifecycleListener[] = [];

  /**
   * 构造函数
   * @param config 命令系统配置
   */
  constructor(config: CommandSystemConfig = {}) {
    this.registry = new CommandRegistry();
    this.parser = new CommandParser(
      config.enableQuotes ?? true,
      config.enableEscaping ?? true
    );
    this.defaultSession = config.defaultSession;
  }

  /**
   * 注册一个命令
   * @param command 要注册的命令对象
   * @throws 如果命令名已存在或抛冲突，则抛出错误
   */
  register(command: Command): void {
    this.registry.register(command);
  }

  /**
   * 批量注册命令
   * @param commands 要注册的命令数组
   */
  registerAll(commands: Command[]): void {
    this.registry.registerAll(commands);
  }

  /**
   * 注销一个命令
   * @param commandName 要注销的命令名或别名
   * @returns 是否成功成功
   */
  unregister(commandName: string): boolean {
    return this.registry.unregister(commandName);
  }

  /**
   * 查找命令
   * @param commandName 命令名或别名
   * @returns 命令对象，如果不存在则返回 undefined
   */
  find(commandName: string): Command | undefined {
    return this.registry.find(commandName);
  }

  /**
   * 检查命令是否存在
   * @param commandName 命令名或别名
   * @returns 是否存在
   */
  has(commandName: string): boolean {
    return this.registry.has(commandName);
  }

  /**
   * 获取所有已注册的命令
   * @returns 命令数组
   */
  getAll(): Command[] {
    return this.registry.getAll();
  }

  /**
   * 获取所有命令名称
   * @returns 命令名称数组
   */
  getNames(): string[] {
    return this.registry.getNames();
  }

  /**
   * 获取指定分组的命令
   * @param groupName 分组名称
   * @returns 该分组的命令数组
   */
  getByGroup(groupName: string): Command[] {
    return this.registry.getByGroup(groupName);
  }

  /**
   * 获取所有分组名称
   * @returns 分组名称数组
   */
  getGroups(): string[] {
    return this.registry.getGroups();
  }

  /**
   * 执行命令
   * @param input 命令行字符串
   * @param session 会话信息（可选）
   * @returns 命令执行结果
   * @throws 如果命令不存在或执行失败，抛出错误
   */
  async execute(input: string, session?: CommandSystemConfig['defaultSession']): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // 解析命令行
      const parseResult = this.parser.parse(input);
      const { commandName } = parseResult;

      // 如果命令名为空，返回错误
      if (!commandName) {
        return {
          success: false,
          message: '命令名不能为空',
          duration: Date.now() - startTime,
        };
      }

      // 查找命令
      const command = this.find(commandName);
      if (!command) {
        return {
          success: false,
          message: `命令 "${commandName}" 不存在`,
          duration: Date.now() - startTime,
        };
      }

      // 检查命令是否已启用
      if (!this.registry.isEnabled(commandName)) {
        return {
          success: false,
          message: `命令 "${commandName}" 已被禁用`,
          duration: Date.now() - startTime,
        };
      }

      // 创建命令上下文
      const context: CommandContext = {
        commandName,
        rawInput: input,
        args: parseResult.args,
        options: parseResult.options,
        session: session || this.defaultSession,
      };

      // 触发执行前事件
      this.emit('beforeExecute', command, context);

      // 执行命令的 beforeExecute 钩子
      if (command.beforeExecute) {
        await command.beforeExecute(context);
      }

      // 验证命令
      if (command.validate) {
        const isValid = await command.validate(context);
        if (!isValid) {
          return {
            success: false,
            message: '命令验证失败',
            duration: Date.now() - startTime,
          };
        }
      }

      // 执行命令
      let result: CommandResult;
      if (command.execute.constructor.name === 'AsyncFunction') {
        result = await command.execute(context);
      } else {
        result = command.execute(context);
      }

      // 添加执行耗时
      result.duration = Date.now() - startTime;

      // 执行命令的 afterExecute 钩子
      if (command.afterExecute) {
        await command.afterExecute(context, result);
      }

      // 触发执行后事件
      this.emit('afterExecute', command, context, result);

      // 增加执行计数
      this.registry.incrementExecutionCount(commandName);

      return result;
    } catch (error) {
      // 触发错误事件
      const command = this.find(input.split(' ')[0]);
      if (command) {
        this.emit('onError', command, undefined, {
          success: false,
          message: '命令执行出错',
          error: error instanceof Error ? error : new Error(String(error)),
          duration: Date.now() - startTime,
        });
      }

      return {
        success: false,
        message: '命令执行出错',
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取命令帮助信息
   * @param commandName 命令名或别名
   * @returns 帮助信息字符串，如果命令不存在则返回 undefined
   */
  getHelp(commandName: string): string | undefined {
    const command = this.find(commandName);
    if (!command) {
      return undefined;
    }
    return this.parser.formatHelp(command);
  }

  /**
   * 获取所有命令的帮助信息
   * @returns 所有命令的帮助信息
   */
  getAllHelp(): string {
    const lines: string[] = [];
    const commands = this.getAll();

    // 按分组组织命令
    const groupedCommands = new Map<string, Command[]>();
    const ungroupedCommands: Command[] = [];

    for (const command of commands) {
      if (command.group) {
        if (!groupedCommands.has(command.group)) {
          groupedCommands.set(command.group, []);
        }
        groupedCommands.get(command.group)!.push(command);
      } else {
        ungroupedCommands.push(command);
      }
    }

    // 添加未分组的命令
    if (ungroupedCommands.length > 0) {
      lines.push('未分组命令:');
      for (const command of ungroupedCommands) {
        lines.push(`  ${command.name} - ${command.description}`);
      }
      lines.push('');
    }

    // 添加分组的命令
    for (const [groupName, groupCommands] of groupedCommands.entries()) {
      lines.push(`${groupName}:`);
      for (const command of groupCommands) {
        lines.push(`  ${command.name} - ${command.description}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 搜索命令
   * @param query 搜索关键词
   * @returns 匹配的命令数组
   */
  search(query: string): Command[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(command => {
      return (
        command.name.toLowerCase().includes(lowerQuery) ||
        command.description.toLowerCase().includes(lowerQuery) ||
        command.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery)) ||
        command.group?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 启用命令
   * @param commandName 命令名或别名
   */
  enable(commandName: string): void {
    this.registry.enable(commandName);
  }

  /**
   * 禁用命令
   * @param commandName 命令名或别名
   */
  disable(commandName: string): void {
    this.registry.disable(commandName);
  }

  /**
   * 检查命令是否已启用
   * @param commandName 命令名或别名
   * @returns 是否已启用
   */
  isEnabled(commandName: string): boolean {
    return this.registry.isEnabled(commandName);
  }

  /**
   * 获取命令元数据
   * @param commandName 命令名或别名
   * @returns 命令元数据，如果不存在则返回 undefined
   */
  getMetadata(commandName: string) {
    return this.registry.getMetadata(commandName);
  }

  /**
   * 检测命令冲突
   * @param command 要检查的命令
   * @returns 冲突信息数组，如果没有冲突则返回空数组
   */
  detectConflicts(command: Command): string[] {
    return this.registry.detectConflicts(command);
  }

  /**
   * 清空所有命令
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * 获取注册的命令数量
   * @returns 命令数量
   */
  size(): number {
    return this.registry.size();
  }

  /**
   * 添加全局生命周期监听器
   * @param listener 监听器函数
   */
  addListener(listener: CommandLifecycleListener): void {
    this.globalListeners.push(listener);
    this.registry.addListener(listener);
  }

  /**
   * 移除全局生命周期监听器
   * @param listener 监听器函数
   */
  removeListener(listener: CommandLifecycleListener): void {
    const index = this.globalListeners.indexOf(listener);
    if (index !== -1) {
      this.globalListeners.splice(index, 1);
    }
    this.registry.removeListener(listener);
  }

  /**
   * 触发全局生命周期事件
   * @param event 事件类型
   * @param command 命令对象
   * @param context 命令上下文（可选）
   * @param result 命令结果（可选）
   */
  private emit(
    event: CommandLifecycleEvent,
    command: Command,
    context?: CommandContext,
    result?: CommandResult
  ): void {
    for (const listener of this.globalListeners) {
      try {
        listener(event, command, context, result);
      } catch (error) {
        console.error(`全局命令生命周期监听器执行错误:`, error);
      }
    }
  }

  /**
   * 设置默认会话信息
   * @param session 会话信息
   */
  setDefaultSession(session: CommandSystemConfig['defaultSession']): void {
    this.defaultSession = session;
  }

  /**
   * 获取默认会话信息
   * @returns 默认会话信息
   */
  getDefaultSession(): CommandSystemConfig['defaultSession'] {
    return this.defaultSession;
  }
}
