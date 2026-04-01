import { AgentMessage, AgentEvent, AgentEventType } from './Agent';

/**
 * 消息传递策略枚举
 * 定义消息传递的不同策略
 */
export enum MessageDeliveryStrategy {
  /** 直接传递（点对点） */
  DIRECT = 'direct',
  /** 广播（发送给所有 Agent） */
  BROADCAST = 'broadcast',
  /** 多播（发送给指定的一组 Agent） */
  MULTICAST = 'multicast',
  /** 发布/订阅模式 */
  PUBSUB = 'pubsub'
}

/**
 * 消息优先级枚举
 */
export enum MessagePriority {
  /** 低优先级 */
  LOW = 0,
  /** 中优先级 */
  MEDIUM = 1,
  /** 高优先级 */
  HIGH = 2,
  /** 紧急优先级 */
  URGENT = 3
}

/**
 * 扩展的消息接口
 * 添加更多消息管理功能
 */
export interface ExtendedAgentMessage extends AgentMessage {
  /** 消息优先级 */
  priority: MessagePriority;
  /** 消息传递策略 */
  deliveryStrategy: MessageDeliveryStrategy;
  /** 消息是否已投递 */
  delivered: boolean;
  /** 消息投递时间 */
  deliveredAt?: number;
  /** 消息是否已确认 */
  acknowledged: boolean;
  /** 消息确认时间 */
  acknowledgedAt?: number;
  /** 消息重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 消息过期时间 */
  expiresAt?: number;
  /** 消息标签 */
  tags?: string[];
}

/**
 * 消息处理器接口
 * 定义消息处理器的功能
 */
export interface IMessageHandler {
  /** 处理器 ID */
  id: string;
  /** 处理器名称 */
  name: string;
  /** 处理器支持的消息类型 */
  supportedMessageTypes: string[];
  /** 处理消息 */
  handleMessage(message: ExtendedAgentMessage): Promise<void>;
}

/**
 * 消息过滤器接口
 * 定义消息过滤器的功能
 */
export interface IMessageFilter {
  /** 过滤器 ID */
  id: string;
  /** 过滤器名称 */
  name: string;
  /** 过滤消息 */
  filter(message: ExtendedAgentMessage): boolean;
}

/**
 * 消息订阅接口
 */
export interface IMessageSubscription {
  /** 订阅 ID */
  id: string;
  /** 订阅者 Agent ID */
  subscriberId: string;
  /** 订阅的消息类型 */
  messageType: string;
  /** 订阅的消息过滤器 */
  filter?: IMessageFilter;
  /** 订阅创建时间 */
  createdAt: number;
}

/**
 * 通信配置接口
 */
export interface CommunicationConfig {
  /** 消息队列最大容量 */
  maxMessageQueueSize?: number;
  /** 默认消息优先级 */
  defaultPriority?: MessagePriority;
  /** 默认消息传递策略 */
  defaultDeliveryStrategy?: MessageDeliveryStrategy;
  /** 默认最大重试次数 */
  defaultMaxRetries?: number;
  /** 是否启用消息持久化 */
  enablePersistence?: boolean;
  /** 是否启用消息加密 */
  enableEncryption?: boolean;
  /** 消息过期时间（毫秒） */
  messageExpirationTime?: number;
}

/**
 * Agent 通信管理器类
 * 提供 Agent 之间的消息传递、事件广播、状态同步等功能
 */
export class AgentCommunicationManager {
  private messageQueue: ExtendedAgentMessage[] = [];
  private messageHandlers: Map<string, IMessageHandler> = new Map();
  private messageFilters: Map<string, IMessageFilter> = new Map();
  private subscriptions: Map<string, IMessageSubscription> = new Map();
  private messageHistory: Map<string, ExtendedAgentMessage> = new Map();
  private pendingResponses: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private messageCounter: number = 0;
  private config: Required<CommunicationConfig>;

  constructor(config: CommunicationConfig = {}) {
    this.config = {
      maxMessageQueueSize: config.maxMessageQueueSize ?? 1000,
      defaultPriority: config.defaultPriority ?? MessagePriority.MEDIUM,
      defaultDeliveryStrategy: config.defaultDeliveryStrategy ?? MessageDeliveryStrategy.DIRECT,
      defaultMaxRetries: config.defaultMaxRetries ?? 3,
      enablePersistence: config.enablePersistence ?? false,
      enableEncryption: config.enableEncryption ?? false,
      messageExpirationTime: config.messageExpirationTime ?? 300000
    };
  }

  /**
   * 发送消息
   * @param message - 要发送的消息
   * @param options - 消息选项
   * @returns Promise<void>
   */
  async sendMessage(
    message: AgentMessage,
    options: Partial<ExtendedAgentMessage> = {}
  ): Promise<void> {
    const extendedMessage: ExtendedAgentMessage = {
      ...message,
      priority: options.priority ?? this.config.defaultPriority,
      deliveryStrategy: options.deliveryStrategy ?? this.config.defaultDeliveryStrategy,
      delivered: false,
      acknowledged: false,
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
      expiresAt: options.expiresAt ?? Date.now() + this.config.messageExpirationTime,
      tags: options.tags ?? []
    };

    if (this.messageQueue.length >= this.config.maxMessageQueueSize) {
      throw new Error('Message queue is full');
    }

    this.messageQueue.push(extendedMessage);
    this.messageHistory.set(extendedMessage.id, extendedMessage);

    await this.processMessage(extendedMessage);
  }

  /**
   * 发送消息并等待响应
   * @param message - 要发送的消息
   * @param timeout - 超时时间（毫秒）
   * @returns Promise<any> - 响应数据
   */
  async sendMessageAndWaitForResponse(
    message: AgentMessage,
    timeout: number = 30000
  ): Promise<any> {
    const extendedMessage: ExtendedAgentMessage = {
      ...message,
      priority: this.config.defaultPriority,
      deliveryStrategy: MessageDeliveryStrategy.DIRECT,
      delivered: false,
      acknowledged: false,
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
      expiresAt: Date.now() + this.config.messageExpirationTime,
      requiresResponse: true
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingResponses.delete(extendedMessage.id);
        reject(new Error(`Message response timeout after ${timeout}ms`));
      }, timeout);

      this.pendingResponses.set(extendedMessage.id, {
        resolve,
        reject,
        timeout: timeoutId
      });

      this.sendMessage(extendedMessage).catch(reject);
    });
  }

  /**
   * 广播消息给所有订阅者
   * @param message - 要广播的消息
   * @param messageType - 消息类型
   * @returns Promise<number> - 接收消息的 Agent 数量
   */
  async broadcastMessage(
    message: AgentMessage,
    messageType: string
  ): Promise<number> {
    const subscribers = this.getSubscribersForMessageType(messageType);
    let deliveredCount = 0;

    for (const subscription of subscribers) {
      try {
        const extendedMessage: ExtendedAgentMessage = {
          ...message,
          to: subscription.subscriberId,
          priority: this.config.defaultPriority,
          deliveryStrategy: MessageDeliveryStrategy.BROADCAST,
          delivered: false,
          acknowledged: false,
          retryCount: 0,
          maxRetries: this.config.defaultMaxRetries,
          expiresAt: Date.now() + this.config.messageExpirationTime
        };

        await this.sendMessage(extendedMessage);
        deliveredCount++;
      } catch (error) {
        console.error(`Failed to deliver message to ${subscription.subscriberId}:`, error);
      }
    }

    return deliveredCount;
  }

  /**
   * 多播消息给指定的 Agent 列表
   * @param message - 要多播的消息
   * @param recipients - 接收者 Agent ID 列表
   * @returns Promise<number> - 成功投递的消息数量
   */
  async multicastMessage(
    message: AgentMessage,
    recipients: string[]
  ): Promise<number> {
    let deliveredCount = 0;

    for (const recipientId of recipients) {
      try {
        const extendedMessage: ExtendedAgentMessage = {
          ...message,
          to: recipientId,
          priority: this.config.defaultPriority,
          deliveryStrategy: MessageDeliveryStrategy.MULTICAST,
          delivered: false,
          acknowledged: false,
          retryCount: 0,
          maxRetries: this.config.defaultMaxRetries,
          expiresAt: Date.now() + this.config.messageExpirationTime
        };

        await this.sendMessage(extendedMessage);
        deliveredCount++;
      } catch (error) {
        console.error(`Failed to deliver message to ${recipientId}:`, error);
      }
    }

    return deliveredCount;
  }

  /**
   * 处理消息
   * @param message - 要处理的消息
   * @returns Promise<void>
   */
  private async processMessage(message: ExtendedAgentMessage): Promise<void> {
    try {
      const handlers = this.getHandlersForMessageType(message.type);

      for (const handler of handlers) {
        await handler.handleMessage(message);
      }

      message.delivered = true;
      message.deliveredAt = Date.now();

      if (message.requiresResponse) {
        await this.acknowledgeMessage(message.id);
      }
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);

      if (message.retryCount < message.maxRetries) {
        message.retryCount++;
        await this.retryMessage(message);
      } else {
        throw error;
      }
    }
  }

  /**
   * 重试消息
   * @param message - 要重试的消息
   * @returns Promise<void>
   */
  private async retryMessage(message: ExtendedAgentMessage): Promise<void> {
    setTimeout(async () => {
      try {
        await this.processMessage(message);
      } catch (error) {
        console.error(`Failed to retry message ${message.id}:`, error);
      }
    }, 1000 * message.retryCount);
  }

  /**
   * 确认消息
   * @param messageId - 消息 ID
   * @returns Promise<void>
   */
  async acknowledgeMessage(messageId: string): Promise<void> {
    const message = this.messageHistory.get(messageId);
    if (message) {
      message.acknowledged = true;
      message.acknowledgedAt = Date.now();

      const pendingResponse = this.pendingResponses.get(messageId);
      if (pendingResponse) {
        clearTimeout(pendingResponse.timeout);
        this.pendingResponses.delete(messageId);
      }
    }
  }

  /**
   * 发送消息响应
   * @param originalMessageId - 原始消息 ID
   * @param response - 响应数据
   * @returns Promise<void>
   */
  async sendResponse(originalMessageId: string, response: any): Promise<void> {
    const pendingResponse = this.pendingResponses.get(originalMessageId);
    if (pendingResponse) {
      clearTimeout(pendingResponse.timeout);
      this.pendingResponses.delete(originalMessageId);
      pendingResponse.resolve(response);
    }
  }

  /**
   * 注册消息处理器
   * @param handler - 消息处理器
   * @returns void
   */
  registerMessageHandler(handler: IMessageHandler): void {
    this.messageHandlers.set(handler.id, handler);
  }

  /**
   * 注销消息处理器
   * @param handlerId - 处理器 ID
   * @returns boolean
   */
  unregisterMessageHandler(handlerId: string): boolean {
    return this.messageHandlers.delete(handlerId);
  }

  /**
   * 注册消息过滤器
   * @param filter - 消息过滤器
   * @returns void
   */
  registerMessageFilter(filter: IMessageFilter): void {
    this.messageFilters.set(filter.id, filter);
  }

  /**
   * 注销消息过滤器
   * @param filterId - 过滤器 ID
   * @returns boolean
   */
  unregisterMessageFilter(filterId: string): boolean {
    return this.messageFilters.delete(filterId);
  }

  /**
   * 订阅消息
   * @param subscriberId - 订阅者 Agent ID
   * @param messageType - 消息类型
   * @param filter - 可选的消息过滤器
   * @returns string - 订阅 ID
   */
  subscribeToMessages(
    subscriberId: string,
    messageType: string,
    filter?: IMessageFilter
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    const subscription: IMessageSubscription = {
      id: subscriptionId,
      subscriberId,
      messageType,
      filter,
      createdAt: Date.now()
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  /**
   * 取消订阅
   * @param subscriptionId - 订阅 ID
   * @returns boolean
   */
  unsubscribeFromMessages(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * 获取指定消息类型的订阅者
   * @param messageType - 消息类型
   * @returns IMessageSubscription[]
   */
  private getSubscribersForMessageType(messageType: string): IMessageSubscription[] {
    const subscribers: IMessageSubscription[] = [];

    for (const subscription of this.subscriptions.values()) {
      if (subscription.messageType === messageType) {
        subscribers.push(subscription);
      }
    }

    return subscribers;
  }

  /**
   * 获取指定消息类型的处理器
   * @param messageType - 消息类型
   * @returns IMessageHandler[]
   */
  private getHandlersForMessageType(messageType: string): IMessageHandler[] {
    const handlers: IMessageHandler[] = [];

    for (const handler of this.messageHandlers.values()) {
      if (handler.supportedMessageTypes.includes(messageType)) {
        handlers.push(handler);
      }
    }

    return handlers;
  }

  /**
   * 同步 Agent 状态
   * @param agentId - Agent ID
   * @param state - 状态数据
   * @returns Promise<void>
   */
  async syncAgentState(agentId: string, state: any): Promise<void> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from: 'coordinator',
      to: agentId,
      type: 'state_sync',
      payload: { state },
      timestamp: Date.now()
    };

    await this.sendMessage(message);
  }

  /**
   * 广播 Agent 状态
   * @param agentId - Agent ID
   * @param state - 状态数据
   * @returns Promise<number>
   */
  async broadcastAgentState(agentId: string, state: any): Promise<number> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from: agentId,
      to: 'broadcast',
      type: 'state_broadcast',
      payload: { agentId, state },
      timestamp: Date.now()
    };

    return await this.broadcastMessage(message, 'state_broadcast');
  }

  /**
   * 共享数据给其他 Agent
   * @param fromAgentId - 发送者 Agent ID
   * @param toAgentId - 接收者 Agent ID
   * @param data - 要共享的数据
   * @param dataType - 数据类型
   * @returns Promise<void>
   */
  async shareData(
    fromAgentId: string,
    toAgentId: string,
    data: any,
    dataType: string
  ): Promise<void> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from: fromAgentId,
      to: toAgentId,
      type: 'data_share',
      payload: { data, dataType },
      timestamp: Date.now()
    };

    await this.sendMessage(message);
  }

  /**
   * 广播数据给所有 Agent
   * @param fromAgentId - 发送者 Agent ID
   * @param data - 要广播的数据
   * @param dataType - 数据类型
   * @returns Promise<number>
   */
  async broadcastData(
    fromAgentId: string,
    data: any,
    dataType: string
  ): Promise<number> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from: fromAgentId,
      to: 'broadcast',
      type: 'data_broadcast',
      payload: { data, dataType },
      timestamp: Date.now()
    };

    return await this.broadcastMessage(message, 'data_broadcast');
  }

  /**
   * 获取消息队列中的消息数量
   * @returns number
   */
  getQueueSize(): number {
    return this.messageQueue.length;
  }

  /**
   * 获取消息历史
   * @param limit - 限制数量
   * @returns ExtendedAgentMessage[]
   */
  getMessageHistory(limit: number = 100): ExtendedAgentMessage[] {
    const messages = Array.from(this.messageHistory.values());
    return messages.slice(-limit);
  }

  /**
   * 获取指定 Agent 的消息历史
   * @param agentId - Agent ID
   * @param limit - 限制数量
   * @returns ExtendedAgentMessage[]
   */
  getAgentMessageHistory(agentId: string, limit: number = 100): ExtendedAgentMessage[] {
    const messages = Array.from(this.messageHistory.values())
      .filter(msg => msg.from === agentId || msg.to === agentId);
    return messages.slice(-limit);
  }

  /**
   * 清空消息队列
   * @returns void
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  /**
   * 清空消息历史
   * @returns void
   */
  clearMessageHistory(): void {
    this.messageHistory.clear();
  }

  /**
   * 清空所有消息数据
   * @returns void
   */
  clearAll(): void {
    this.clearMessageQueue();
    this.clearMessageHistory();
    this.subscriptions.clear();
    this.pendingResponses.forEach(pending => clearTimeout(pending.timeout));
    this.pendingResponses.clear();
  }

  /**
   * 生成消息 ID
   * @returns string
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageCounter}`;
  }

  /**
   * 生成订阅 ID
   * @returns string
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${++this.messageCounter}`;
  }
}

/**
 * 默认消息处理器实现
 * 提供基本的消息处理功能
 */
export class DefaultMessageHandler implements IMessageHandler {
  id: string;
  name: string;
  supportedMessageTypes: string[];
  private handleMessageCallback?: (message: ExtendedAgentMessage) => Promise<void>;

  constructor(
    id: string,
    name: string,
    supportedMessageTypes: string[],
    handleMessageCallback?: (message: ExtendedAgentMessage) => Promise<void>
  ) {
    this.id = id;
    this.name = name;
    this.supportedMessageTypes = supportedMessageTypes;
    this.handleMessageCallback = handleMessageCallback;
  }

  async handleMessage(message: ExtendedAgentMessage): Promise<void> {
    if (this.handleMessageCallback) {
      await this.handleMessageCallback(message);
    }
  }
}

/**
 * 默认消息过滤器实现
 * 提供基本的消息过滤功能
 */
export class DefaultMessageFilter implements IMessageFilter {
  id: string;
  name: string;
  private filterCallback: (message: ExtendedAgentMessage) => boolean;

  constructor(
    id: string,
    name: string,
    filterCallback: (message: ExtendedAgentMessage) => boolean
  ) {
    this.id = id;
    this.name = name;
    this.filterCallback = filterCallback;
  }

  filter(message: ExtendedAgentMessage): boolean {
    return this.filterCallback(message);
  }
}
