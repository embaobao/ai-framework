/**
 * 上下文管理器模块
 * 
 * 导出所有上下文管理相关的类型和类
 */

// 导出 Context.ts 中的类型和接口
export type {
  Context,
  ContextData,
  ContextMetadata,
  ContextOptions,
  ContextState,
  ContextEvent,
  ContextEventListener,
  ContextQuery,
  ContextStats,
} from './Context'

export { ContextEventType } from './Context'

// 导出 ContextStore.ts 中的类型和类
export type {
  ContextStore,
  StoreOptions,
  QueryResult,
  StoreStats,
} from './ContextStore'

export { MemoryContextStore } from './ContextStore'

// 导出 ContextScope.ts 中的类型和类
export type {
  ContextScope,
  ScopeManager,
  ScopeOptions,
  ScopeMetadata,
} from './ContextScope'

export {
  ScopeType,
  DefaultScopeManager,
} from './ContextScope'

// 导出 ContextMiddleware.ts 中的类型和类
export type {
  MiddlewareContext,
  MiddlewareMetadata,
  MiddlewareResult,
  ContextMiddleware,
  MiddlewareChain,
  MiddlewareManager,
} from './ContextMiddleware'

export {
  DefaultMiddlewareChain,
  DefaultMiddlewareManager,
  AbstractMiddleware,
  LoggingMiddleware,
  ValidationMiddleware,
  CachingMiddleware,
  PerformanceMonitoringMiddleware,
} from './ContextMiddleware'

// 导出 ContextManager.ts 中的类型和类
export type {
  ContextManagerInterface,
  ContextManagerOptions,
} from './ContextManager'

export {
  DefaultContextManager,
} from './ContextManager'

// 导出类型别名
export type { ContextManager } from './ContextManager'
