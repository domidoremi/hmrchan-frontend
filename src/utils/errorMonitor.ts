/**
 * 错误监控系统
 * Error Monitoring System
 */

export interface ErrorLog {
  id: string
  timestamp: number
  type: 'error' | 'warning' | 'info'
  context: string
  message: string
  code?: string
  status?: number
  userAgent: string
  url: string
  stack?: string
  details?: unknown
}

export interface ErrorStats {
  total: number
  byType: Record<string, number>
  byContext: Record<string, number>
  recent: ErrorLog[]
}

class ErrorMonitor {
  private logs: ErrorLog[] = []
  private maxLogs = 100 // 最多保存100条日志
  private listeners: Set<(log: ErrorLog) => void> = new Set()

  /**
   * 记录错误
   */
  log(
    type: 'error' | 'warning' | 'info',
    context: string,
    message: string,
    options?: {
      code?: string
      status?: number
      stack?: string
      details?: unknown
    },
  ): ErrorLog {
    const log: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      context,
      message,
      code: options?.code,
      status: options?.status,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: options?.stack,
      details: options?.details,
    }

    this.logs.push(log)

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 通知监听器
    this.listeners.forEach((listener) => listener(log))

    // 发送到远程监控（可选）
    this.sendToRemote(log)

    return log
  }

  /**
   * 记录错误
   */
  logError(context: string, message: string, options?: Parameters<typeof this.log>[3]) {
    return this.log('error', context, message, options)
  }

  /**
   * 记录警告
   */
  logWarning(context: string, message: string, options?: Parameters<typeof this.log>[3]) {
    return this.log('warning', context, message, options)
  }

  /**
   * 记录信息
   */
  logInfo(context: string, message: string, options?: Parameters<typeof this.log>[3]) {
    return this.log('info', context, message, options)
  }

  /**
   * 获取所有日志
   */
  getLogs(): ErrorLog[] {
    return [...this.logs]
  }

  /**
   * 获取统计信息
   */
  getStats(): ErrorStats {
    const byType: Record<string, number> = {}
    const byContext: Record<string, number> = {}

    this.logs.forEach((log) => {
      byType[log.type] = (byType[log.type] || 0) + 1
      byContext[log.context] = (byContext[log.context] || 0) + 1
    })

    return {
      total: this.logs.length,
      byType,
      byContext,
      recent: this.logs.slice(-10).reverse(),
    }
  }

  /**
   * 清除所有日志
   */
  clear() {
    this.logs = []
  }

  /**
   * 添加监听器
   */
  addListener(listener: (log: ErrorLog) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 导出日志为JSON
   */
  export(): string {
    return JSON.stringify(
      {
        exportTime: new Date().toISOString(),
        stats: this.getStats(),
        logs: this.logs,
      },
      null,
      2,
    )
  }

  /**
   * 发送到远程监控服务
   * TODO: 集成Sentry或其他监控服务
   */
  private sendToRemote(log: ErrorLog) {
    // 仅在生产环境发送
    if (import.meta.env.PROD) {
      // TODO: 实现远程发送逻辑
      // 示例：发送到Sentry
      // if (window.Sentry) {
      //   window.Sentry.captureException(new Error(log.message), {
      //     level: log.type,
      //     tags: {
      //       context: log.context,
      //       code: log.code,
      //     },
      //     extra: log.details,
      //   })
      // }

      console.debug('[ErrorMonitor] Would send to remote:', log)
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 初始化全局错误监听
   */
  initGlobalHandlers() {
    // 捕获未处理的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('UnhandledRejection', event.reason?.message || String(event.reason), {
        stack: event.reason?.stack,
        details: event.reason,
      })
    })

    // 捕获全局JavaScript错误
    window.addEventListener('error', (event) => {
      this.logError('GlobalError', event.message, {
        stack: event.error?.stack,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })

    console.log('[ErrorMonitor] Global error handlers initialized')
  }
}

// 单例实例
export const errorMonitor = new ErrorMonitor()

// 自动初始化全局错误处理
if (typeof window !== 'undefined') {
  errorMonitor.initGlobalHandlers()
}
