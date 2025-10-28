/**
 * 条件日志工具
 * 只在开发环境输出日志
 */

const isDev = import.meta.env.DEV

export const logger = {
  log(...args: any[]) {
    if (isDev) {
      console.log(...args)
    }
  },

  error(...args: any[]) {
    if (isDev) {
      console.error(...args)
    }
  },

  warn(...args: any[]) {
    if (isDev) {
      console.warn(...args)
    }
  },

  info(...args: any[]) {
    if (isDev) {
      console.info(...args)
    }
  },

  debug(...args: any[]) {
    if (isDev) {
      console.debug(...args)
    }
  },

  // 生产环境也输出的错误日志（用于关键错误）
  criticalError(...args: any[]) {
    console.error(...args)
  },

  // 带分组的日志
  group(label: string, callback: () => void) {
    if (isDev) {
      console.group(label)
      callback()
      console.groupEnd()
    }
  },

  // 表格日志
  table(data: any) {
    if (isDev) {
      console.table(data)
    }
  },
}

export default logger
