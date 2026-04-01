/**
 * 配置模式定义文件
 * 定义了配置验证的模式、类型、约束和文档生成
 */

import { ConfigValue, ConfigMetadata } from './Config';

/**
 * 配置模式类型
 */
export type SchemaType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'object' 
  | 'array' 
  | 'null';

/**
 * 配置模式接口
 * 定义了配置项的验证规则和约束
 */
export interface Schema {
  /** 模式类型 */
  type: SchemaType | SchemaType[];
  /** 描述信息 */
  description?: string;
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  default?: ConfigValue;
  /** 可选值枚举 */
  enum?: ConfigValue[];
  /** 最小值（数字）或最小长度（字符串/数组） */
  min?: number;
  /** 最大值（数字）或最大长度（字符串/数组） */
  max?: number;
  /** 最小长度（字符串/数组） */
  minLength?: number;
  /** 最大长度（字符串/数组） */
  maxLength?: number;
  /** 正则表达式验证（字符串） */
  pattern?: string | RegExp;
  /** 自定义验证函数 */
  validator?: (value: ConfigValue) => boolean | string;
  /** 对象属性定义（当type为object时） */
  properties?: { [key: string]: Schema };
  /** 对象必需属性列表（当type为object时） */
  requiredProperties?: string[];
  /** 数组元素模式（当type为array时） */
  items?: Schema;
  /** 数组唯一性约束 */
  uniqueItems?: boolean;
  /** 数字精度（小数位数） */
  precision?: number;
  /** 是否允许额外属性（当type为object时） */
  additionalProperties?: boolean | Schema;
  /** 示例值 */
  example?: ConfigValue;
  /** 分组信息 */
  group?: string;
  /** 显示顺序 */
  order?: number;
  /** 是否敏感信息 */
  sensitive?: boolean;
  /** 配置项的UI提示 */
  ui?: {
    /** 输入框类型 */
    inputType?: 'text' | 'password' | 'number' | 'email' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio';
    /** 占位符 */
    placeholder?: string;
    /** 帮助文本 */
    helpText?: string;
    /** 选项列表（用于select/radio） */
    options?: Array<{ label: string; value: ConfigValue }>;
  };
}

/**
 * 配置模式注册表接口
 */
export interface SchemaRegistry {
  /** 注册模式 */
  register(name: string, schema: Schema): void;
  /** 获取模式 */
  get(name: string): Schema | undefined;
  /** 检查模式是否存在 */
  has(name: string): boolean;
  /** 注销模式 */
  unregister(name: string): void;
  /** 获取所有模式名称 */
  list(): string[];
}

/**
 * 配置模式注册表实现
 */
export class DefaultSchemaRegistry implements SchemaRegistry {
  /** 模式存储 */
  private schemas: Map<string, Schema> = new Map();

  /**
   * 注册模式
   * @param name 模式名称
   * @param schema 模式定义
   */
  register(name: string, schema: Schema): void {
    this.schemas.set(name, schema);
  }

  /**
   * 获取模式
   * @param name 模式名称
   * @returns 模式定义
   */
  get(name: string): Schema | undefined {
    return this.schemas.get(name);
  }

  /**
   * 检查模式是否存在
   * @param name 模式名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * 注销模式
   * @param name 模式名称
   */
  unregister(name: string): void {
    this.schemas.delete(name);
  }

  /**
   * 获取所有模式名称
   * @returns 模式名称数组
   */
  list(): string[] {
    return Array.from(this.schemas.keys());
  }
}

/**
 * 配置文档生成器接口
 */
export interface SchemaDocumentationGenerator {
  /** 生成Markdown文档 */
  generateMarkdown(schema: Schema, name?: string): string;
  /** 生成JSON Schema文档 */
  generateJsonSchema(schema: Schema): object;
  /** 生成TypeScript类型定义 */
  generateTypeScript(schema: Schema, name?: string): string;
  /** 生成HTML文档 */
  generateHtml(schema: Schema, name?: string): string;
}

/**
 * 默认文档生成器实现
 */
export class DefaultDocumentationGenerator implements SchemaDocumentationGenerator {
  /**
   * 生成Markdown文档
   * @param schema 模式定义
   * @param name 模式名称
   * @returns Markdown文档字符串
   */
  generateMarkdown(schema: Schema, name?: string): string {
    const lines: string[] = [];

    if (name) {
      lines.push(`## ${name}`);
      lines.push('');
    }

    if (schema.description) {
      lines.push(schema.description);
      lines.push('');
    }

    lines.push('**类型:** ' + this.formatType(schema.type));
    lines.push('');

    if (schema.required) {
      lines.push('**必需:** 是');
      lines.push('');
    }

    if (schema.default !== undefined) {
      lines.push('**默认值:** `' + JSON.stringify(schema.default) + '`');
      lines.push('');
    }

    if (schema.enum && schema.enum.length > 0) {
      lines.push('**可选值:**');
      schema.enum.forEach(value => {
        lines.push(`  - \`${JSON.stringify(value)}\``);
      });
      lines.push('');
    }

    if (schema.min !== undefined || schema.max !== undefined) {
      lines.push('**范围:**');
      if (schema.min !== undefined) {
        lines.push(`  - 最小值: ${schema.min}`);
      }
      if (schema.max !== undefined) {
        lines.push(`  - 最大值: ${schema.max}`);
      }
      lines.push('');
    }

    if (schema.minLength !== undefined || schema.maxLength !== undefined) {
      lines.push('**长度限制:**');
      if (schema.minLength !== undefined) {
        lines.push(`  - 最小长度: ${schema.minLength}`);
      }
      if (schema.maxLength !== undefined) {
        lines.push(`  - 最大长度: ${schema.maxLength}`);
      }
      lines.push('');
    }

    if (schema.pattern) {
      lines.push('**正则表达式:** `' + schema.pattern.toString() + '`');
      lines.push('');
    }

    if (schema.example !== undefined) {
      lines.push('**示例:**');
      lines.push('```json');
      lines.push(JSON.stringify(schema.example, null, 2));
      lines.push('```');
      lines.push('');
    }

    if (schema.properties) {
      lines.push('**属性:**');
      lines.push('');
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        lines.push(`### ${key}`);
        lines.push(this.generateMarkdown(propSchema));
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  /**
   * 生成JSON Schema文档
   * @param schema 模式定义
   * @returns JSON Schema对象
   */
  generateJsonSchema(schema: Schema): object {
    const jsonSchema: any = {
      type: schema.type,
    };

    if (schema.description) {
      jsonSchema.description = schema.description;
    }

    if (schema.required) {
      jsonSchema.required = true;
    }

    if (schema.default !== undefined) {
      jsonSchema.default = schema.default;
    }

    if (schema.enum) {
        jsonSchema.enum = schema.enum;
    }

    if (schema.min !== undefined) {
      jsonSchema.minimum = schema.min;
    }

    if (schema.max !== undefined) {
      jsonSchema.maximum = schema.max;
    }

    if (schema.minLength !== undefined) {
      jsonSchema.minLength = schema.minLength;
    }

    if (schema.maxLength !== undefined) {
      jsonSchema.maxLength = schema.maxLength;
    }

    if (schema.pattern) {
      jsonSchema.pattern = schema.pattern instanceof RegExp 
        ? schema.pattern.source 
        : schema.pattern;
    }

    if (schema.properties) {
      jsonSchema.properties = {};
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        jsonSchema.properties[key] = this.generateJsonSchema(propSchema);
      });

      if (schema.requiredProperties) {
        jsonSchema.required = schema.requiredProperties;
      }
    }

    if (schema.items) {
      jsonSchema.items = this.generateJsonSchema(schema.items);
    }

    if (schema.uniqueItems) {
      jsonSchema.uniqueItems = true;
    }

    return jsonSchema;
  }

  /**
   * 生成TypeScript类型定义
   * @param schema 模式定义
   * @param name 类型名称
   * @returns TypeScript类型定义字符串
   */
  generateTypeScript(schema: Schema, name?: string): string {
    const typeDef = this.generateTypeDefinition(schema);
    
    if (name) {
      return `export type ${name} = ${typeDef};`;
    }
    
    return typeDef;
  }

  /**
   * 生成HTML文档
   * @param schema 模式定义
   * @param name 模式名称
   * @returns HTML文档字符串
   */
  generateHtml(schema: Schema, name?: string): string {
    const lines: string[] = [];

    lines.push('<div class="schema-doc">');
    
    if (name) {
      lines.push(`  <h2>${this.escapeHtml(name)}</h2>`);
    }

    if (schema.description) {
      lines.push(`  <p class="description">${this.escapeHtml(schema.description)}</p>`);
    }

    lines.push('  <div class="schema-details">');
    lines.push(`    <div class="schema-type"><strong>类型:</strong> ${this.escapeHtml(this.formatType(schema.type))}</div>`);
    
    if (schema.required) {
      lines.push('    <div class="schema-required"><strong>必需:</strong> 是</div>');
    }

    if (schema.default !== undefined) {
      lines.push(`    <div class="schema-default"><strong>默认值:</strong> <code>${this.escapeHtml(JSON.stringify(schema.default))}</code></div>`);
    }

    if (schema.enum && schema.enum.length > 0) {
      lines.push('    <div class="schema-enum"><strong>可选值:</strong>');
      lines.push('      <ul>');
      schema.enum.forEach(value => {
        lines.push(`        <li><code>${this.escapeHtml(JSON.stringify(value))}</code></li>`);
      });
      lines.push('      </ul>');
      lines.push('    </div>');
    }

    lines.push('  </div>');

    if (schema.properties) {
      lines.push('  <div class="schema-properties">');
      lines.push('    <h3>属性</h3>');
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        lines.push(`    <div class="schema-property">`);
        lines.push(`      <h4>${this.escapeHtml(key)}</h4>`);
        lines.push(this.generateHtml(propSchema));
        lines.push('    </div>');
      });
      lines.push('  </div>');
    }

    lines.push('</div>');

    return lines.join('\n');
  }

  /**
   * 格式化类型信息
   * @param type 类型
   * @returns 格式化后的类型字符串
   */
  private formatType(type: SchemaType | SchemaType[]): string {
    if (Array.isArray(type)) {
      return type.join(' | ');
    }
    return type;
  }

  /**
   * 生成类型定义
   * @param schema 模式定义
   * @returns TypeScript类型定义字符串
   */
  private generateTypeDefinition(schema: Schema): string {
    if (Array.isArray(schema.type)) {
      return schema.type.map(t => this.mapTypeToTs(t)).join(' | ');
    }

    const tsType = this.mapTypeToTs(schema.type);

    if (schema.type === 'array' && schema.items) {
      const itemType = this.generateTypeDefinition(schema.items);
      return `${itemType}[]`;
    }

    if (schema.type === 'object' && schema.properties) {
      const props = Object.entries(schema.properties).map(([key, propSchema]) => {
        const propType = this.generateTypeDefinition(propSchema);
        const optional = !schema.requiredProperties?.includes(key) ? '?' : '';
        return `  ${key}${optional}: ${propType};`;
      });
      return `{\n${props.join('\n')}\n}`;
    }

    return tsType;
  }

  /**
   * 映射模式类型到TypeScript类型
   * @param type 模式类型
   * @returns TypeScript类型字符串
   */
  private mapTypeToTs(type: SchemaType): string {
    const typeMap: Record<SchemaType, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      object: 'Record<string, any>',
      array: 'any[]',
      null: 'null'
    };
    return typeMap[type] || 'any';
  }

  /**
   * 转义HTML特殊字符
   * @param text 文本
   * @returns 转义后的文本
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
  }
}

/**
 * 预定义的常用模式
 */
export const CommonSchemas = {
  /** 端口号模式 */
  port: {
    type: 'number',
    description: '端口号',
    min: 1,
    max: 65535,
    default: 3000
  } as Schema,

  /** URL模式 */
  url: {
    type: 'string',
    description: 'URL地址',
    pattern: /^https?:\/\/.+/,
    example: 'https://example.com'
  } as Schema,

  /** 邮箱模式 */
  email: {
    type: 'string',
    description: '邮箱地址',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    example: 'user@example.com'
  } as Schema,

  /** 主机名模式 */
  hostname: {
    type: 'string',
    description: '主机名',
    pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    example: 'localhost'
  } as Schema,

  /** 文件路径模式 */
  filePath: {
    type: 'string',
    description: '文件路径',
    pattern: /^[\w\-./\\]+$/,
    example: '/path/to/file'
  } as Schema,

  /** 日志级别模式 */
  logLevel: {
    type: 'string',
    description: '日志级别',
    enum: ['debug', 'info', 'warn', 'error', 'fatal'],
    default: 'info'
  } as Schema,

  /** 超时时间模式（毫秒） */
  timeout: {
    type: 'number',
    description: '超时时间（毫秒）',
    min: 0,
    default: 5000
  } as Schema,

  /** 布尔开关模式 */
  booleanSwitch: {
    type: 'boolean',
    description: '开关',
    default: false
  } as Schema,

  /** 正整数模式 */
  positiveInteger: {
    type: 'number',
    description: '正整数',
    min: 1,
    validator: (value: ConfigValue) => {
      if (typeof value !== 'number') return '必须是数字';
      if (!Number.isInteger(value)) return '必须是整数';
      if (value <= 0) return '必须大于0';
      return true;
    }
  } as Schema
};
