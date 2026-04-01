import { Command, CommandMetadata, CommandLifecycleEvent, CommandLifecycleListener } from './Command';

/**
 * 命令注册表类
 * 负责管理所有已注册的命令，提供命令的注册、注销、查找等功能
 */
export class CommandRegistry {
  /** 命令存储映射表（命令名 -> 命令对象） */
  private commands: Map<string, Command> = new Map();
  
  /** 命令别名映射表（别名 -> 命令名） */
  private aliases: Map<string, string> = new Map();
  
  /** 命令元数据映射表（命令名 -> 元数据） */
  private metadata: Map<string, CommandMetadata> = new Map();
  
  /** 命令分组映射表（分组名 -> 命令名列表） */
  private groups: Map<string, string[]> = new Map();
  
  /** 生命周期监听器列表 */
  private listeners: CommandLifecycleListener[] = [];

  /**
   * 注册一个命令
   * @param command 要注册的命令对象
   * @throws 如果命令名已存在或抛冲突，则抛出错误
   */
  register(command: Command): void {
    const { name, aliases: commandAliases = [], group } = command;

    // 触发注册前事件
    this.emit('beforeRegister', command);

    // 检查命令名是否已存在
    if (this.commands.has(name)) {
      throw new Error(`命令 "${name}" 已存在`);
    }

    // 检查别名是否冲突
    for (const alias of commandAliases) {
      if (this.commands.has(alias) || this.aliases.has(alias)) {
        throw new Error(`别名 "${alias}" 已被使用`);
      }
    }

    // 注册命令
    this.commands.set(name, command);

    // 注册别名
    for (const alias of commandAliases) {
      this.aliases.set(alias, name);
    }

    // 初始化命令元数据
    this.metadata.set(name, {
      createdAt: new Date(),
      updatedAt: new Date(),
      enabled: true,
      executionCount: 0,
    });

    // 添加到分组
    if (group) {
      if (!this.groups.has(group)) {
        this.groups.set(group, []);
      }
      this.groups.get(group)!.push(name);
    }

    // 触发注册后事件
    this.emit('afterRegister', command);
  }

  /**
   * 批量注册命令
   * @param commands 要注册的命令数组
   */
  registerAll(commands: Command[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /**
   * 注销一个命令
   * @param commandName 要注销的命令名或别名
   * @returns 是否成功注销
   */
  unregister(commandName: string): boolean {
    // 解析别名获取真实命令名
    const realName = this.resolveAlias(commandName);
    
    if (!realName) {
      return false;
    }

    const command = this.commands.get(realName);
    if (!command) {
      return false;
    }

    // 触发注销前事件
    this.emit('beforeUnregister', command);

    // 从命令表中删除
    this.commands.delete(realName);

    // 删除元数据
    this.metadata.delete(realName);

    // 删除所有指向该命令的别名
    for (const [alias, target] of this.aliases.entries()) {
      if (target === realName) {
        this.aliases.delete(alias);
      }
    }

    // 从分组中移除
    if (command.group) {
      const groupCommands = this.groups.get(command.group);
      if (groupCommands) {
        const index = groupCommands.indexOf(realName);
        if (index !== -1) {
          groupCommands.splice(index, 1);
        }
      }
    }

    // 触发注销后事件
    this.emit('afterUnregister', command);

    return true;
  }

  /**
   * 查找命令
   * @param commandName 命令名或别名
   * @returns 命令对象，如果不存在则返回 undefined
   */
  find(commandName: string): Command | undefined {
    const realName = this.resolveAlias(commandName);
    return realName ? this.commands.get(realName) : undefined;
  }

  /**
   * 检查命令是否存在
   * @param commandName 命令名或别名
   * @returns 是否存在
   */
  has(commandName: string): boolean {
    return this.find(commandName) !== undefined;
  }

  /**
   * 获取所有已注册的命令
   * @returns 命令数组
   */
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * 获取所有命令名称
   * @returns 命令名称数组
   */
  getNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * 获取指定分组的命令
   * @param groupName 分组名称
   * @returns 该分组的命令数组
   */
  getByGroup(groupName: string): Command[] {
    const commandNames = this.groups.get(groupName) || [];
    return commandNames
      .map(name => this.commands.get(name))
      .filter((command): command is Command => command !== undefined);
  }

  /**
   * 获取所有分组名称
   * @returns 分组名称数组
   */
  getGroups(): string[] {
    return Array.from(this.groups.keys());
  }

  /**
   * 获取命令元数据
   * @param commandName 命令名或别名
   * @returns 命令元数据，如果不存在则返回 undefined
   */
  getMetadata(commandName: string): CommandMetadata | undefined {
    const realName = this.resolveAlias(commandName);
    return realName ? this.metadata.get(realName) : undefined;
  }

  /**
   * 更新命令元数据
   * @param commandName 命令名或别名
   * @param metadata 要更新的元数据
   */
  updateMetadata(commandName: string, metadata: Partial<CommandMetadata>): void {
    const realName = this.resolveAlias(commandName);
    if (!realName) {
      return;
    }

    const existing = this.metadata.get(realName);
    if (existing) {
      this.metadata.set(realName, {
        ...existing,
        ...metadata,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * 启用命令
   * @param commandName 命令名或别名
   */
  enable(commandName: string): void {
    this.updateMetadata(commandName, { enabled: true });
  }

  /**
   * 禁用命令
   * @param commandName 命令名或别名
   */
  disable(commandName: string): void {
    this.updateMetadata(commandName, { enabled: false });
  }

  /**
   * 检查命令是否已启用
   * @param commandName 命令名或别名
   * @returns 是否已启用
   */
  isEnabled(commandName: string): boolean {
    const metadata = this.getMetadata(commandName);
    return metadata?.enabled ?? false;
  }

  /**
   * 增加命令执行计数
   * @param commandName 命令名或别名
   */
  incrementExecutionCount(commandName: string): void {
    const realName = this.resolveAlias(commandName);
    if (!realName) {
      return;
    }

    const existing = this.metadata.get(realName);
    if (existing) {
      this.metadata.set(realName, {
        ...existing,
        executionCount: existing.executionCount + 1,
        lastExecutedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  /**
   * 解析别名获取真实命令名
   * @param commandName 命令名或别名
   * @returns 真实命令名，如果不存在则返回 undefined
   */
  resolveAlias(commandName: string): string | undefined {
    // 如果是别名，返回对应的命令名
    if (this.aliases.has(commandName)) {
      return this.aliases.get(commandName);
    }
    // 如果是命令名，直接返回
    if (this.commands.has(commandName)) {
      return commandName;
    }
    // 不存在
    return undefined;
  }

  /**
   * 检测命令冲突
   * @param command 要检查的命令
   * @returns 冲突信息数组，如果没有冲突则返回空数组
   */
  detectConflicts(command: Command): string[] {
    const conflicts: string[] = [];
    const { name, aliases: commandAliases = [] } = command;

    // 检查命令名冲突
    if (this.commands.has(name)) {
      conflicts.push(`命令名 "${name}" 已存在`);
    }

    // 检查别名冲突
    for (const alias of commandAliases) {
      if (this.commands.has(alias)) {
        conflicts.push(`别名 "${alias}" 与现有命令名冲突`);
      }
      if (this.aliases.has(alias)) {
        conflicts.push(`别名 "${alias}" 已被其他命令使用`);
      }
    }

    return conflicts;
  }

  /**
   * 清空所有命令
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
    this.metadata.clear();
    this.groups.clear();
  }

  /**
   * 获取注册的命令数量
   * @returns 命令数量
   */
  size(): number {
    return this.commands.size;
  }

  /**
   * 添加生命周期监听器
   * @param listener 监听器函数
   */
  addListener(listener: CommandLifecycleListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除生命周期监听器
   * @param listener 监听器函数
   */
  removeListener(listener: CommandLifecycleListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 触发生命周期事件
   * @param event 事件类型
   * @param command 命令对象
   * @param context 命令上下文（可选）
   * @param result 命令结果（可选）
   */
  private emit(
    event: CommandLifecycleEvent,
    command: Command,
    context?: unknown,
    result?: unknown
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(event, command, context, result);
      } catch (error) {
        console.error(`命令生命周期监听器执行错误:`, error);
      }
    }
  }
}
