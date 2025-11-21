/**
 * 调试日志工具
 *
 * 在生产环境自动关闭所有调试日志，底层统一使用 logger
 */

import logger from './logger'

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
      const message = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ')
      logger.debug(message)
    }
  },

  /**
   * 警告日志
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      const message = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ')
      logger.warn(message)
    }
  },

  /**
   * 错误日志（生产环境也输出）
   */
  error: (...args: unknown[]) => {
    const message = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ')
    logger.error(message)
  },

  /**
   * 信息日志
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      const message = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ')
      logger.info(message)
    }
  },

  /**
   * 表格日志
   */
  table: (...args: unknown[]) => {
    if (isDev) {
      // 使用 logger 自身的 table 能力（如果需要更复杂的数据结构可以在此扩展）
      if (args.length === 1) {
        logger.table(args[0])
      } else {
        logger.table(args)
      }
    }
  },

  /**
   * 分组日志
   */
  group: (label: string) => {
    if (isDev) {
      logger.group(label, () => {
        // 仅负责开始分组，具体内容由后续日志输出
      })
    }
  },

  /**
   * 结束分组
   */
  groupEnd: () => {
    if (isDev) {
      // 使用一个空分组结束标记（logger.group 内部已经处理 group 边界，这里保持向后兼容）
      logger.debug('[debugLog] groupEnd')
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
