/**
 * 性能监控工具
 */

export class PerformanceMonitor {
  private marks = new Map<string, number>()

  /**
   * 标记开始时间
   */
  mark(name: string) {
    this.marks.set(name, performance.now())
  }

  /**
   * 测量耗时
   */
  measure(name: string, startMark?: string): number {
    const endTime = performance.now()
    const startTime = startMark ? this.marks.get(startMark) : this.marks.get(name)

    if (!startTime) {
      console.warn(`No mark found for: ${startMark || name}`)
      return 0
    }

    const duration = endTime - startTime
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)

    return duration
  }

  /**
   * 清除标记
   */
  clearMarks() {
    this.marks.clear()
  }

  /**
   * 获取页面性能指标
   */
  getMetrics() {
    if (!window.performance || !window.performance.timing) return null

    const perfData = window.performance.timing
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
    const connectTime = perfData.responseEnd - perfData.requestStart
    const renderTime = perfData.domComplete - perfData.domLoading
    const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart

    return {
      pageLoadTime,
      connectTime,
      renderTime,
      dnsTime,

      // 首次内容绘制
      fcp: this.getFCP(),
      // 最大内容绘制
      lcp: this.getLCP(),
    }
  }

  /**
   * 获取 First Contentful Paint
   */
  private getFCP(): number | null {
    const entries = performance.getEntriesByName('first-contentful-paint')
    const firstEntry = entries[0]
    return firstEntry ? firstEntry.startTime : null
  }

  /**
   * 获取 Largest Contentful Paint
   */
  private getLCP(): number | null {
    const entries = performance.getEntriesByType('largest-contentful-paint')
    const lastEntry = entries[entries.length - 1]
    return lastEntry ? lastEntry.startTime : null
  }

  /**
   * 记录 API 调用
   */
  logAPICall(url: string, duration: number, cached: boolean) {
    console.log(`[API] ${url} - ${duration.toFixed(2)}ms ${cached ? '(cached)' : ''}`)
  }

  /**
   * 获取内存使用情况（如果可用）
   */
  getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
        }
      ).memory
      if (memory) {
        return {
          usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
          totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
          jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
        }
      }
    }
    return null
  }

  /**
   * 打印完整性能报告
   */
  printReport() {
    console.group('🚀 Performance Report')
    console.log('📊 Metrics:', this.getMetrics())
    console.log('💾 Memory:', this.getMemoryUsage())
    console.groupEnd()
  }
}

export const perfMonitor = new PerformanceMonitor()

// 开发环境自动记录性能
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      perfMonitor.printReport()
    }, 1000)
  })

  // 暴露到全局方便调试
  if (typeof window !== 'undefined') {
    ;(window as Window & { __perfMonitor?: typeof perfMonitor }).__perfMonitor = perfMonitor
  }
}
