/**
 * 配置验证器文件
 * 提供配置验证、约束检查、默认值填充和错误报告功能
 */

import { ConfigValue, ConfigSection, ConfigError, ConfigErrorType } from './Config';
import { Schema, SchemaRegistry } from './ConfigSchema';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误信息列表 */
  errors: ValidationError[];
  /** 警告信息列表 */
  warnings: ValidationWarning[];
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  /** 错误路径 */
  path: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  type: ConfigErrorType;
  /** 期望的值 */
  expected?: any;
  /** 实际的值 */
  actual?: any;
  /** 约束信息 */
  constraint?: string;
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
  /** 警告路径 */
  path: string;
  /** 警告消息 */
  message: string;
  /** 警告类型 */
  type: string;
}

/**
 * 验证选项接口
 */
export interface ValidationOptions {
  /** 是否启用严格模式 */
  strict?: boolean;
  /** 是否填充默认值 */
  fillDefaults?: boolean;
  /** 是否移除额外属性 */
  removeAdditional?: boolean;
  /** 是否停止在第一个错误 */
  stopOnFirstError?: boolean;
  /** 自定义验证器 */
  customValidators?: Map<string, (value: ConfigValue) => boolean | string>;
}

/**
 * 配置验证器接口
 */
export interface ConfigValidator {
  /** 验证配置 */
  validate(config: ConfigSection, schema: Schema, options?: ValidationOptions): ValidationResult;
  /** 验证单个值 */
  validateValue(value: ConfigValue, schema: Schema, path?: string): ValidationResult;
  /** 填充默认值 */
  fillDefaults(config: ConfigSection, schema: Schema): ConfigSection;
  /** 检查约束 */
  checkConstraints(value: ConfigValue, schema: Schema): ValidationError[];
}

/**
 * 默认配置验证器实现
 */
export class DefaultConfigValidator implements ConfigValidator {
  /** 模式注册表 */
  private schemaRegistry: SchemaRegistry;
  /** 验证选项 */
  private defaultOptions: ValidationOptions;

  constructor(
    schemaRegistry: SchemaRegistry,
    options?: ValidationOptions
  ) {
    this.schemaRegistry = schemaRegistry;
    this.defaultOptions = {
      strict: false,
      fillDefaults: true,
      removeAdditional: false,
      stopOnFirstError: false,
      customValidators: new Map(),
      ...options
    };
  }

  /**
   * 验证配置
   * @param config 配置对象
   * @param schema 模式定义
   * @param options 验证选项
   * @returns 验证结果
   */
  validate(
    config: ConfigSection,
    schema: Schema,
    options?: ValidationOptions
  ): ValidationResult {
    const opts = { ...this.defaultOptions, ...options };
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 验证类型
    const typeValidation = this.validateType(config, schema, '');
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
      return { valid: false, errors, warnings };
    }

    // 验证对象属性
    if (schema.type === 'object' && schema.properties) {
      const propertyValidation = this.validateObjectProperties(
        config,
        schema,
        '',
        opts
      );
      errors.push(...propertyValidation.errors);
      warnings.push(...propertyValidation.warnings);

      if (opts.stopOnFirstError && errors.length > 0) {
        return { valid: false, errors, warnings };
      }
    }

    // 验证数组元素
    if (schema.type === 'array' && schema.items && Array.isArray(config)) {
      const arrayValidation = this.validateArrayElements(
        config,
        schema.items,
        '',
        opts
      );
      errors.push(...arrayValidation.errors);
      warnings.push(...arrayValidation.warnings);

      if (opts.stopOnFirstError && errors.length > 0) {
        return { valid: false, errors, warnings };
      }
    }

    // 检查约束
    const constraintErrors = this.checkConstraints(config, schema);
    errors.push(...constraintErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证单个值
   * @param value 配置值
   * @param schema 模式定义
   * @param path 配置路径
   * @returns 验证结果
   */
  validateValue(
    value: ConfigValue,
    schema: Schema,
    path: string = ''
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 验证类型
    const typeValidation = this.validateType(value, schema, path);
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
      return { valid: false, errors, warnings };
    }

    // 检查约束
    const constraintErrors = this.checkConstraints(value, schema);
    errors.push(...constraintErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 填充默认值
   * @param config 配置对象
   * @param schema 模式定义
   * @returns 填充默认值后的配置对象
   */
  fillDefaults(config: ConfigSection, schema: Schema): ConfigSection {
    const result = { ...config };

    // 如果配置为空且有默认值，使用默认值
    if (Object.keys(result).length === 0 && schema.default !== undefined) {
      return schema.default as ConfigSection;
    }

    // 填充对象属性的默认值
    if (schema.type === 'object' && schema.properties) {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        if (!(key in result) && propSchema.default !== undefined) {
          result[key] = propSchema.default;
        } else if (key in result && propSchema.type === 'object' && propSchema.properties) {
          // 递归填充嵌套对象的默认值
          result[key] = this.fillDefaults(
            result[key] as ConfigSection,
            propSchema
          );
        }
      });
    }

    return result;
  }

  /**
   * 检查约束
   * @param value 配置值
   * @param schema 模式定义
   * @returns 约束错误列表
   */
  checkConstraints(value: ConfigValue, schema: Schema): ValidationError[] {
    const errors: ValidationError[] = [];

    // 检查枚举约束
    if (schema.enum && schema.enum.length > 0) {
      if (!schema.enum.includes(value)) {
        errors.push({
          path: '',
          message: `值必须是以下之一: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`,
          type: ConfigErrorType.VALIDATION_ERROR,
          expected: schema.enum,
          actual: value,
          constraint: 'enum'
        });
      }
    }

    // 检查最小值约束
    if (schema.min !== undefined && typeof value === 'number') {
      if (value < schema.min) {
        errors.push({
          path: '',
          message: `值必须大于或等于 ${schema.min}`,
          type: ConfigErrorType.RANGE_ERROR,
          expected: `>= ${schema.min}`,
          actual: value,
          constraint: 'min'
        });
      }
    }

    // 检查最大值约束
    if (schema.max !== undefined && typeof value === 'number') {
      if (value > schema.max) {
        errors.push({
          path: '',
          message: `值必须小于或等于 ${schema.max}`,
          type: ConfigErrorType.RANGE_ERROR,
          expected: `<= ${schema.max}`,
          actual: value,
          constraint: 'max'
        });
      }
    }

    // 检查最小长度约束
    if (schema.minLength !== undefined) {
      const length = this.getValueLength(value);
      if (length < schema.minLength) {
        errors.push({
          path: '',
          message: `长度必须大于或等于 ${schema.minLength}`,
          type: ConfigErrorType.RANGE_ERROR,
          expected: `length >= ${schema.minLength}`,
          actual: `length = ${length}`,
          constraint: 'minLength'
        });
      }
    }

    // 检查最大长度约束
    if (schema.maxLength !== undefined) {
      const length = this.getValueLength(value);
      if (length > schema.maxLength) {
        errors.push({
          path: '',
          message: `长度必须小于或等于 ${schema.maxLength}`,
          type: ConfigErrorType.RANGE_ERROR,
          expected: `length <= ${schema.maxLength}`,
          actual: `length = ${length}`,
          constraint: 'maxLength'
        });
      }
    }

    // 检查正则表达式约束
    if (schema.pattern && typeof value === 'string') {
      const pattern = schema.pattern instanceof RegExp 
        ? schema.pattern 
        : new RegExp(schema.pattern);
      if (!pattern.test(value)) {
        errors.push({
          path: '',
          message: `值必须匹配正则表达式: ${schema.pattern.toString()}`,
          type: ConfigErrorType.VALIDATION_ERROR,
          expected: schema.pattern.toString(),
          actual: value,
          constraint: 'pattern'
        });
      }
    }

    // 检查数组唯一性约束
    if (schema.uniqueItems && Array.isArray(value)) {
      const uniqueSet = new Set(value.map(v => JSON.stringify(v)));
      if (uniqueSet.size !== value.length) {
        errors.push({
          path: '',
          message: '数组元素必须唯一',
          type: ConfigErrorType.VALIDATION_ERROR,
          constraint: 'uniqueItems'
        });
      }
    }

    // 检查数字精度约束
    if (schema.precision !== undefined && typeof value === 'number') {
      const decimalPlaces = this.getDecimalPlaces(value);
      if (decimalPlaces > schema.precision) {
        errors.push({
          path: '',
          message: `数字精度不能超过 ${schema.precision} 位小数`,
          type: ConfigErrorType.VALIDATION_ERROR,
          expected: `precision <= ${schema.precision}`,
          actual: `precision = ${decimalPlaces}`,
          constraint: 'precision'
        });
      }
    }

    // 执行自定义验证器
    if (schema.validator) {
      const result = schema.validator(value);
      if (result !== true) {
        errors.push({
          path: '',
          message: typeof result === 'string' ? result : '自定义验证失败',
          type: ConfigErrorType.VALIDATION_ERROR,
          constraint: 'validator'
        });
      }
    }

    return errors;
  }

  /**
   * 验证类型
   * @param value 配置值
   * @param schema 模式定义
   * @param path 配置路径
   * @returns 验证结果
   */
  private validateType(
    value: ConfigValue,
    schema: Schema,
    path: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (Array.isArray(schema.type)) {
      // 多类型验证
      const validTypes = schema.type.filter(type => this.checkType(value, type));
      if (validTypes.length === 0) {
        errors.push({
          path,
          message: `类型必须是以下之一: ${schema.type.join(', ')}`,
          type: ConfigErrorType.TYPE_ERROR,
          expected: schema.type.join(' | '),
          actual: typeof value
        });
      }
    } else {
      // 单类型验证
      if (!this.checkType(value, schema.type)) {
        errors.push({
          path,
          message: `类型必须是 ${schema.type}`,
          type: ConfigErrorType.TYPE_ERROR,
          expected: schema.type,
          actual: typeof value
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 检查值类型
   * @param value 配置值
   * @param type 期望的类型
   * @returns 是否匹配
   */
  private checkType(value: ConfigValue, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return false;
    }
  }

  /**
   * 验证对象属性
   * @param config 配置对象
   * @param schema 模式定义
   * @param path 配置路径
   * @param options 验证选项
   * @returns 验证结果
   */
  private validateObjectProperties(
    config: ConfigSection,
    schema: Schema,
    path: string,
    options: ValidationOptions
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!schema.properties) {
      return { valid: true, errors, warnings };
    }

    // 检查必需属性
    if (schema.requiredProperties) {
      schema.requiredProperties.forEach(prop => {
        if (!(prop in config)) {
          errors.push({
            path: this.joinPath(path, prop),
            message: `必需属性 '${prop}' 缺失`,
            type: ConfigErrorType.VALIDATION_ERROR
          });

          if (options.stopOnFirstError) {
            return;
          }
        }
      });
    }

    // 验证每个属性
    Object.entries(schema.properties).forEach(([key, propSchema]) => {
      const propPath = this.joinPath(path, key);

      if (key in config) {
        const propValue = config[key];
        const propValidation = this.validateValue(propValue, propSchema, propPath);
        errors.push(...propValidation.errors);
        warnings.push(...propValidation.warnings);

        if (options.stopOnFirstError && errors.length > 0) {
          return;
        }
      } else if (propSchema.required) {
        errors.push({
          path: propPath,
          message: `必需属性 '${key}' 缺失`,
          type: ConfigErrorType.VALIDATION_ERROR
        });

        if (options.stopOnFirstError) {
          return;
        }
      }
    });

    // 检查额外属性
    if (options.strict && schema.additionalProperties === false) {
      Object.keys(config).forEach(key => {
        if (!schema.properties![key]) {
          errors.push({
            path: this.joinPath(path, key),
            message: `不允许的额外属性 '${key}'`,
            type: ConfigErrorType.VALIDATION_ERROR
          });

          if (options.stopOnFirstError) {
            return;
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证数组元素
   * @param array 数组
   * @param itemSchema 元素模式
   * @param path 配置路径
   * @param options 验证选项
   * @returns 验证结果
   */
  private validateArrayElements(
    array: ConfigValue[],
    itemSchema: Schema,
    path: string,
    options: ValidationOptions
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    array.forEach((item, index) => {
      const itemPath = this.joinPath(path, index.toString());
      const itemValidation = this.validateValue(item, itemSchema, itemPath);
      errors.push(...itemValidation.errors);
      warnings.push(...itemValidation.warnings);

      if (options.stopOnFirstError && errors.length > 0) {
        return;
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取值的长度
   * @param value 配置值
   * @returns 长度
   */
  private getValueLength(value: ConfigValue): number {
    if (typeof value === 'string') {
      return value.length;
    }
    if (Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length;
    }
    return 0;
  }

  /**
   * 获取数字的小数位数
   * @param value 数字值
   * @returns 小数位数
   */
  private getDecimalPlaces(value: number): number {
    if (!Number.isFinite(value)) return 0;
    const decimalPart = Math.abs(value) % 1;
    if (decimalPart === 0) return 0;
    return decimalPart.toString().split('.')[1].length;
  }

  /**
   * 连接路径
   * @param parent 父路径
   * @param child 子路径
   * @returns 连接后的路径
   */
  private joinPath(parent: string, child: string): string {
    if (!parent) return child;
    return `${parent}.${child}`;
  }
}

/**
 * 验证错误报告器
 */
export class ValidationErrorReporter {
  /**
   * 格式化验证结果为字符串
   * @param result 验证结果
   * @returns 格式化的字符串
   */
  static format(result: ValidationResult): string {
    const lines: string[] = [];

    if (result.valid) {
      lines.push('✓ 配置验证通过');
    } else {
      lines.push('✗ 配置验证失败');
      lines.push('');
      lines.push('错误:');
      result.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. ${error.path || '(root)'}: ${error.message}`);
        if (error.expected !== undefined) {
          lines.push(`     期望: ${error.expected}`);
        }
        if (error.actual !== undefined) {
          lines.push(`     实际: ${error.actual}`);
        }
      });
    }

    if (result.warnings.length > 0) {
      lines.push('');
      lines.push('警告:');
      result.warnings.forEach((warning, index) => {
        lines.push(`  ${index + 1}. ${warning.path || '(root)'}: ${warning.message}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 格式化验证结果为JSON
   * @param result 验证结果
   * @returns JSON字符串
   */
  static formatJson(result: ValidationResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * 格式化验证结果为HTML
   * @param result 验证结果
   * @returns HTML字符串
   */
  static formatHtml(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('<div class="validation-result">');
    lines.push(`  <div class="validation-status ${result.valid ? 'valid' : 'invalid'}">`);
    lines.push(`    ${result.valid ? '✓ 配置验证通过' : '✗ 配置验证失败'}`);
    lines.push('  </div>');

    if (!result.valid && result.errors.length > 0) {
      lines.push('  <div class="validation-errors">');
      lines.push('    <h3>错误</h3>');
      lines.push('    <ul>');
      result.errors.forEach(error => {
        lines.push(`      <li class="error">`);
        lines.push(`        <span class="error-path">${error.path || '(root)'}</span>: `);
        lines.push(`        <span class="error-message">${error.message}</span>`);
        lines.push('      </li>');
      });
      lines.push('    </ul>');
      lines.push('  </div>');
    }

    if (result.warnings.length > 0) {
      lines.push('  <div class="validation-warnings">');
      lines.push('    <h3>警告</h3>');
      lines.push('    <ul>');
      result.warnings.forEach(warning => {
        lines.push(`      <li class="warning">`);
        lines.push(`        <span class="warning-path">${warning.path || '(root)'}</span>: `);
        lines.push(`        <span class="warning-message">${warning.message}</span>`);
        lines.push('      </li>');
      });
      lines.push('    </ul>');
      lines.push('  </div>');
    }

    lines.push('</div>');

    return lines.join('\n');
  }
}
