/**
 * 配置管理系统入口文件
 * 导出所有配置管理相关的类和接口
 */

// 导出核心接口和类型
export {
  Config,
  ConfigValue,
  ConfigSection,
  ConfigMetadata,
  ConfigSource,
  ConfigFormat,
  ConfigError,
  ConfigErrorType,
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigOptions
} from './Config';

// 导出配置模式相关
export {
  Schema,
  SchemaType,
  SchemaRegistry,
  DefaultSchemaRegistry,
  SchemaDocumentationGenerator,
  DefaultDocumentationGenerator,
  CommonSchemas
} from './ConfigSchema';

// 导出配置验证器相关
export {
  ConfigValidator,
  DefaultConfigValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationOptions,
  ValidationErrorReporter
} from './ConfigValidator';

// 导出配置加载器相关
export {
  ConfigLoader,
  DefaultConfigLoader,
  ConfigLoadOptions,
  ConfigLoadResult,
  ConfigParser,
  JsonConfigParser,
  YamlConfigParser,
  TomlConfigParser,
  IniConfigParser
} from './ConfigLoader';

// 导出配置管理器
export {
  ConfigManager,
  ConfigManagerFactory
} from './ConfigManager';
