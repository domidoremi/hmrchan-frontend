/**
 * 增强的日志工具
 * 支持日志级别、格式化、时间戳和上下文信息
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogContext {
  category?: string
  userId?: string
  sessionId?: string
  [key: string]: unknown
}

export interface LoggerConfig {
  level: LogLevel
  enableTimestamp: boolean
  enableContext: boolean
  enableColors: boolean
}

const isDev = import.meta.env.DEV

class Logger {
  private config: LoggerConfig = {
    level: isDev ? LogLevel.DEBUG : LogLevel.WARN,
    enableTimestamp: true,
    enableContext: true,
    enableColors: true,
  }

  private context: LogContext = {}

  // 颜色配置
  private colors = {
    DEBUG: '#6B7280', // gray-500
    INFO: '#3B82F6', // blue-500
    WARN: '#F59E0B', // amber-500
    ERROR: '#EF4444', // red-500
    CRITICAL: '#DC2626', // red-600
  }

  /**
   * 设置日志配置
   */
  setConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * 设置全局上下文
   */
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  /**
   * 清除全局上下文
   */
  clearContext() {
    this.context = {}
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const parts: string[] = []

    // 时间戳
    if (this.config.enableTimestamp) {
      const timestamp = new Date().toISOString()
      parts.push(`[${timestamp}]`)
    }

    // 日志级别
    const levelName = LogLevel[level]
    parts.push(`[${levelName}]`)

    // 分类
    const category = context?.category || this.context.category
    if (category && this.config.enableContext) {
      parts.push(`[${category}]`)
    }

    // 消息
    parts.push(message)

    // 上下文信息
    if (this.config.enableContext && (context || Object.keys(this.context).length > 0)) {
      const mergedContext = { ...this.context, ...context }
      // 解构移除 category（已在前缀中使用），保留其他上下文数据
      const { category: _category, ...contextData } = mergedContext
      void _category // 显式标记为已使用
      if (Object.keys(contextData).length > 0) {
        parts.push(`| Context: ${JSON.stringify(contextData)}`)
      }
    }

    return parts.join(' ')
  }

  /**
   * 输出日志
   */
  private log(level: LogLevel, message: string, context?: LogContext, ...args: unknown[]) {
    // 检查日志级别
    if (level < this.config.level) {
      return
    }

    // 格式化消息
    const formattedMessage = this.formatMessage(level, message, context)

    // 选择控制台方法
    const consoleMethod = this.getConsoleMethod(level)

    // 输出日志
    if (this.config.enableColors && isDev) {
      const color = this.colors[LogLevel[level] as keyof typeof this.colors]
      consoleMethod(`%c${formattedMessage}`, `color: ${color}`, ...args)
    } else {
      consoleMethod(formattedMessage, ...args)
    }
  }

  /**
   * 获取控制台方法
   */
  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug
      case LogLevel.INFO:
        return console.info
      case LogLevel.WARN:
        return console.warn
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return console.error
      default:
        return console.log
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.DEBUG, message, context, ...args)
  }

  /**
   * INFO 级别日志
   */
  info(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.INFO, message, context, ...args)
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.WARN, message, context, ...args)
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.ERROR, message, context, ...args)
  }

  /**
   * CRITICAL 级别日志（生产环境也会输出）
   */
  critical(message: string, context?: LogContext, ...args: unknown[]) {
    this.log(LogLevel.CRITICAL, message, context, ...args)
  }

  /**
   * 带分组的日志
   */
  group(label: string, callback: () => void, context?: LogContext) {
    if (isDev) {
      const formattedLabel = this.formatMessage(LogLevel.INFO, label, context)
      console.group(formattedLabel)
      callback()
      console.groupEnd()
    }
  }

  /**
   * 表格日志
   */
  table(data: unknown, context?: LogContext) {
    if (isDev) {
      if (context) {
        this.info('Table data', context)
      }
      console.table(data)
    }
  }

  /**
   * 性能测量
   */
  time(label: string, context?: LogContext) {
    if (isDev) {
      const formattedLabel = this.formatMessage(LogLevel.DEBUG, label, context)
      console.time(formattedLabel)
    }
  }

  /**
   * 结束性能测量
   */
  timeEnd(label: string, context?: LogContext) {
    if (isDev) {
      const formattedLabel = this.formatMessage(LogLevel.DEBUG, label, context)
      console.timeEnd(formattedLabel)
    }
  }
}

// 导出单例
export const logger = new Logger()

// 向后兼容的默认导出
export default logger
