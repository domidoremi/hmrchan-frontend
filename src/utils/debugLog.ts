/**
 * 调试日志工具
 *
 * 在生产环境自动关闭所有调试日志
 */

const isDev = import.meta.env.DEV
const isProduction = import.meta.env.PROD

/**
 * 调试日志函数
 * 仅在开发环境输出
 */
export const debugLog = {
  /**
   * 普通日志
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * 警告日志
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * 错误日志（生产环境也输出）
   */
  error: (...args: unknown[]) => {
    console.error(...args)
  },

  /**
   * 信息日志
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args)
    }
  },

  /**
   * 表格日志
   */
  table: (...args: unknown[]) => {
    if (isDev) {
      console.table(...args)
    }
  },

  /**
   * 分组日志
   */
  group: (label: string) => {
    if (isDev) {
      console.group(label)
    }
  },

  /**
   * 结束分组
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd()
    }
  },
}

/**
 * 判断是否应该输出日志
 */
export const shouldLog = isDev

/**
 * 判断是否为生产环境
 */
export const isProductionMode = isProduction
