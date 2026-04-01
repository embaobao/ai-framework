/**
 * 技能系统模块导出
 * 
 * 提供技能系统的所有公共接口和类
 */

// 导出 Skill.ts
export type {
  Skill,
  SkillParameter,
  SkillResult,
  SkillProgress,
  SkillExecuteOptions,
  SkillContext,
  SkillConfig,
  SkillExample,
  SkillMetadata,
  SkillStats,
}
export { SkillState, AbstractSkill } from './Skill'

// 导出 SkillSystem.ts
export type { SkillSystemConfig, SkillSystemEventData }
export { SkillSystem, SkillSystemEventType, SkillSystemState } from './SkillSystem'

// 导出 SkillLoader.ts
export type { SkillLoaderConfig, SkillLoadResult, SkillValidationResult }
export { SkillLoader } from './SkillLoader'

// 导出 SkillExecutor.ts
export type { SkillExecutorConfig, ExecutionContext, ExecutionStats }
export { SkillExecutor } from './SkillExecutor'

// 导出 SkillRegistry.ts
export type { SkillRegistryConfig, SkillConflict, SkillGroup }
export { SkillRegistry, SkillConflictType } from './SkillRegistry'
