import {
  Command,
  CommandContext,
  CommandOption,
  CommandArgument
} from './Command'

/**
 * 解析结果接口
 * 表示命令行解析后的结果
 */
export interface ParseResult {
  /** 命令名称 */
  commandName: string
  /** 位置参数数组 */
  args: string[]
  /** 选项键值对 */
  options: Record<string, string | boolean>
  /** 原始输入 */
  rawInput: string
  /** 解析错误（如果有） */
  error?: Error
}

/**
 * 命令解析器类
 * 负责解析命令行输入，提取命令名、参数和选项
 */
export class CommandParser {
  /** 是否启用引号解析 */
  private enableQuotes: boolean

  /** 是否启用转义字符解析 */
  private enableEscaping: boolean

  /**
   * 构造函数
   * @param enableQuotes 是否启用引号解析（默认 true）
   * @param enableEscaping 是否启用转义字符解析（默认 true）
   */
  constructor(enableQuotes = true, enableEscaping = true) {
    this.enableQuotes = enableQuotes
    this.enableEscaping = enableEscaping
  }

  /**
   * 解析命令行输入
   * @param input 命令行字符串
   * @returns 解析结果
   */
  parse(input: string): ParseResult {
    // 去除首尾空白
    const trimmedInput = input.trim()

    // 如果输入为空，返回空结果
    if (!trimmedInput) {
      return {
        commandName: '',
        args: [],
        options: {},
        rawInput: input
      }
    }

    // 分词
    const tokens = this.tokenize(trimmedInput)

    // 提取命令名
    const commandName = tokens[0] || ''

    // 解析参数和选项
    const { args, options } = this.parseArgumentsAndOptions(tokens.slice(1))

    return {
      commandName,
      args,
      options,
      rawInput: input
    }
  }

  /**
   * 解析命令行输入并创建命令上下文
   * @param input 命令行字符串
   * @param command 命令对象（用于验证）
   * @returns 命令上下文
   * @throws 如果解析失败或验证失败，抛出错误
   */
  parseWithContext(input: string, command?: Command): CommandContext {
    const result = this.parse(input)

    // 如果有解析错误，抛出异常
    if (result.error) {
      throw result.error
    }

    // 如果提供了命令对象，进行验证
    if (command) {
      this.validateParseResult(result, command)
    }

    return {
      commandName: result.commandName,
      rawInput: result.rawInput,
      args: result.args,
      options: result.options
    }
  }

  /**
   * 分词：将命令行字符串分割为标记数组
   * @param input 命令行字符串
   * @returns 标记数组
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = []
    let currentToken = ''
    let inSingleQuote = false
    let inDoubleQuote = false
    let escapeNext = false

    for (let i = 0; i < input.length; i++) {
      const char = input[i]

      // 处理转义字符
      if (this.enableEscaping && escapeNext) {
        currentToken += char
        escapeNext = false
        continue
      }

      // 转义字符
      if (this.enableEscaping && char === '\\') {
        escapeNext = true
        continue
      }

      // 单引号
      if (this.enableQuotes && char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote
        continue
      }

      // 双引号
      if (this.enableQuotes && char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote
        continue
      }

      // 空格分隔（不在引号内）
      if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
        if (currentToken) {
          tokens.push(currentToken)
          currentToken = ''
        }
        continue
      }

      // 其他字符
      currentToken += char
    }

    // 添加最后一个标记
    if (currentToken) {
      tokens.push(currentToken)
    }

    return tokens
  }

  /**
   * 解析参数和选项
   * @param tokens 标记数组（不包含命令名）
   * @returns 解析后的参数和选项
   */
  private parseArgumentsAndOptions(tokens: string[]): {
    args: string[]
    options: Record<string, string | boolean>
  } {
    const args: string[] = []
    const options: Record<string, string | boolean> = {}
    let i = 0

    while (i < tokens.length) {
      const token = tokens[i]

      // 长选项（--option）
      if (token.startsWith('--')) {
        const optionName = token.slice(2)

        // 检查是否是布尔选项（--option=value 格式）
        if (optionName.includes('=')) {
          const [name, value] = optionName.split('=', 2)
          options[name] = value
          i++
          continue
        }

        // 检查下一个标记是否是选项值
        if (i + 1 < tokens.length && !this.isOptionToken(tokens[i + 1])) {
          options[optionName] = tokens[i + 1]
          i += 2
        } else {
          options[optionName] = true
          i++
        }
      }
      // 短选项（-o 或 -abc）
      else if (token.startsWith('-') && token.length > 1) {
        const optionChars = token.slice(1)

        // 如果是多个短选项组合（如 -abc）
        if (optionChars.length > 1 && !token.includes('=')) {
          for (const char of optionChars) {
            options[char] = true
          }
          i++
        }
        // 单个短选项
        else {
          const optionName = optionChars[0]

          // 检查是否是带值的短选项（-o=value 格式）
          if (optionChars.includes('=')) {
            const [, value] = optionChars.split('=', 2)
            options[optionName] = value
            i++
            continue
          }

          // 检查下一个标记是否是选项值
          if (i + 1 < tokens.length && !this.isOptionToken(tokens[i + 1])) {
            options[optionName] = tokens[i + 1]
            i += 2
          } else {
            options[optionName] = true
            i++
          }
        }
      }
      // 普通参数
      else {
        args.push(token)
        i++
      }
    }

    return { args, options }
  }

  /**
   * 判断标记是否是选项标记
   * @param token 标记
   * @returns 是否是选项标记
   */
  private isOptionToken(token: string): boolean {
    return token.startsWith('-')
  }

  /**
   * 验证解析结果是否符合命令定义
   * @param result 解析结果
   * @param command 命令对象
   * @throws 如果验证失败，抛出错误
   */
  private validateParseResult(result: ParseResult, command: Command): void {
    const { args, options } = result

    // 验证必需参数
    if (command.arguments) {
      const requiredArgs = command.arguments.filter((arg) => arg.required)
      if (args.length < requiredArgs.length) {
        const missingArgs = requiredArgs
          .slice(args.length)
          .map((arg) => arg.name)
        throw new Error(`缺少必需参数: ${missingArgs.join(', ')}`)
      }
    }

    // 验证必需选项
    if (command.options) {
      const requiredOptions = command.options.filter((opt) => opt.required)
      for (const opt of requiredOptions) {
        if (!(opt.long in options) && !(opt.short && opt.short in options)) {
          throw new Error(`缺少必需选项: --${opt.long}`)
        }
      }
    }

    // 验证选项值是否在允许的范围内
    if (command.options) {
      for (const opt of command.options) {
        if (opt.choices && opt.choices.length > 0) {
          const value =
            options[opt.long] || (opt.short ? options[opt.short] : undefined)
          if (
            value &&
            typeof value === 'string' &&
            !opt.choices.includes(value)
          ) {
            throw new Error(
              `选项 --${opt.long} 的值必须是以下之一: ${opt.choices.join(', ')}`
            )
          }
        }
      }
    }
  }

  /**
   * 格式化命令行帮助信息
   * @param command 命令对象
   * @returns 格式化的帮助字符串
   */
  formatHelp(command: Command): string {
    const lines: string[] = []

    // 命令名称和描述
    lines.push(`命令: ${command.name}`)
    lines.push(`描述: ${command.description}`)

    // 别名
    if (command.aliases && command.aliases.length > 0) {
      lines.push(`别名: ${command.aliases.join(', ')}`)
    }

    // 分组
    if (command.group) {
      lines.push(`分组: ${command.group}`)
    }

    lines.push('')

    // 用法
    const usage = this.formatUsage(command)
    lines.push('用法:')
    lines.push(`  ${usage}`)
    lines.push('')

    // 参数
    if (command.arguments && command.arguments.length > 0) {
      lines.push('参数:')
      for (const arg of command.arguments) {
        const required = arg.required ? ' (必需)' : ' (可选)'
        const defaultValue =
          arg.defaultValue !== undefined ? ` [默认: ${arg.defaultValue}]` : ''
        lines.push(`  ${arg.name}${required}${defaultValue}`)
        lines.push(`    ${arg.description}`)
      }
      lines.push('')
    }

    // 选项
    if (command.options && command.options.length > 0) {
      lines.push('选项:')
      for (const opt of command.options) {
        const short = opt.short ? `-${opt.short}, ` : '    '
        const required = opt.required ? ' (必需)' : ''
        const defaultValue =
          opt.defaultValue !== undefined ? ` [默认: ${opt.defaultValue}]` : ''
        lines.push(`  ${short}--${opt.long}${required}${defaultValue}`)
        lines.push(`    ${opt.description}`)
      }
      lines.push('')
    }

    // 示例
    if (command.examples && command.examples.length > 0) {
      lines.push('示例:')
      for (const example of command.examples) {
        lines.push(`  ${example}`)
      }
      lines.push('')
    }

    // 详细帮助
    if (command.help) {
      lines.push('详细说明:')
      lines.push(command.help)
    }

    return lines.join('\n')
  }

  /**
   * 格式化命令用法
   * @param command 命令对象
   * @returns 用法字符串
   */
  private formatUsage(command: Command): string {
    const parts: string[] = [command.name]

    // 添加选项
    if (command.options && command.options.length > 0) {
      const options = command.options.map((opt) => {
        if (opt.requiresValue) {
          return `[--${opt.long}=<值>]`
        }
        return `[--${opt.long}]`
      })
      parts.push(...options)
    }

    // 添加参数
    if (command.arguments && command.arguments.length > 0) {
      const args = command.arguments.map((arg) => {
        if (arg.required) {
          return `<${arg.name}>`
        }
        return `[${arg.name}]`
      })
      parts.push(...args)
    }

    return parts.join(' ')
  }

  /**
   * 解析选项值
   * @param value 选项值字符串
   * @param type 期望的类型
   * @returns 解析后的值
   * @throws 如果解析失败，抛出错误
   */
  parseOptionValue(
    value: string,
    type?: 'string' | 'number' | 'boolean'
  ): string | number | boolean {
    if (!type || type === 'string') {
      return value
    }

    if (type === 'number') {
      const num = Number(value)
      if (isNaN(num)) {
        throw new Error(`无法将 "${value}" 解析为数字`)
      }
      return num
    }

    if (type === 'boolean') {
      const lowerValue = value.toLowerCase()
      if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
        return true
      }
      if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
        return false
      }
      throw new Error(`无法将 "${value}" 解析为布尔值`)
    }

    return value
  }
}
