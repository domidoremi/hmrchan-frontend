/**
 * 缓存统计模块
 * 用于监控缓存命中率和性能指标
 */

interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
}

interface CacheMetrics {
  hitRate: number
  totalRequests: number
  avgResponseTime: number
}

class CacheStatsCollector {
  private stats: Map<string, CacheStats> = new Map()
  private responseTimes: Map<string, number[]> = new Map()
  private enabled = import.meta.env['VITE_ENABLE_DEBUG'] === 'true'

  /**
   * 记录缓存命中
   */
  recordHit(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.hits++
  }

  /**
   * 记录缓存未命中
   */
  recordMiss(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.misses++
  }

  /**
   * 记录缓存写入
   */
  recordSet(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.sets++
  }

  /**
   * 记录缓存删除
   */
  recordDelete(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.deletes++
  }

  /**
   * 记录缓存错误
   */
  recordError(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.errors++
  }

  /**
   * 记录响应时间
   */
  recordResponseTime(cacheType: string, timeMs: number): void {
    if (!this.enabled) return
    if (!this.responseTimes.has(cacheType)) {
      this.responseTimes.set(cacheType, [])
    }
    const times = this.responseTimes.get(cacheType)!
    times.push(timeMs)
    // 只保留最近 100 条记录
    if (times.length > 100) {
      times.shift()
    }
  }

  /**
   * 获取缓存指标
   */
  getMetrics(cacheType: string): CacheMetrics | null {
    if (!this.enabled) return null
    const stats = this.stats.get(cacheType)
    if (!stats) return null

    const totalRequests = stats.hits + stats.misses
    const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0

    const times = this.responseTimes.get(cacheType) || []
    const avgResponseTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    }
  }

  /**
   * 获取所有缓存统计
   */
  getAllStats(): Record<string, CacheStats & CacheMetrics> {
    if (!this.enabled) return {}

    const result: Record<string, CacheStats & CacheMetrics> = {}
    for (const [cacheType, stats] of this.stats.entries()) {
      const metrics = this.getMetrics(cacheType)!
      result[cacheType] = { ...stats, ...metrics }
    }
    return result
  }

  /**
   * 打印统计报告
   */
  printReport(): void {
    if (!this.enabled) {
      console.log('[Cache Stats] Disabled (enable with VITE_ENABLE_DEBUG=true)')
      return
    }

    console.group('📊 Cache Statistics Report')
    const allStats = this.getAllStats()

    if (Object.keys(allStats).length === 0) {
      console.log('No cache activity recorded yet')
      console.groupEnd()
      return
    }

    for (const [cacheType, stats] of Object.entries(allStats)) {
      console.group(`${cacheType}`)
      console.log(`Hit Rate: ${stats.hitRate}%`)
      console.log(
        `Total Requests: ${stats.totalRequests} (${stats.hits} hits, ${stats.misses} misses)`
      )
      console.log(`Sets: ${stats.sets}, Deletes: ${stats.deletes}, Errors: ${stats.errors}`)
      console.log(`Avg Response Time: ${stats.avgResponseTime}ms`)
      console.groupEnd()
    }

    console.groupEnd()
  }

  /**
   * 重置统计
   */
  reset(): void {
    this.stats.clear()
    this.responseTimes.clear()
  }

  /**
   * 确保统计对象存在
   */
  private ensureStats(cacheType: string): void {
    if (!this.stats.has(cacheType)) {
      this.stats.set(cacheType, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
      })
    }
  }
}

// 单例实例
export const cacheStats = new CacheStatsCollector()

// 在开发环境下，每 30 秒打印一次报告
if (import.meta.env.DEV && import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
  const reportInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
    cacheStats.printReport()
  }, 30000)

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (reportInterval) {
        clearInterval(reportInterval)
      }
    })
  }
}

// 仅在调试模式下暴露到全局，避免生产环境占用
if (typeof window !== 'undefined' && import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
  interface WindowWithCacheStats extends Window {
    __cacheStats?: CacheStatsCollector
  }
  ;(window as WindowWithCacheStats).__cacheStats = cacheStats
}
