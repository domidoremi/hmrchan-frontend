interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
  stale: number
  fallbacks: number
  layers: Record<string, number>
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

  recordHit(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.hits++
  }

  recordMiss(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.misses++
  }

  recordSet(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.sets++
  }

  recordDelete(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.deletes++
  }

  recordError(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.errors++
  }

  recordStale(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.stale++
  }

  recordFallback(cacheType: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    this.stats.get(cacheType)!.fallbacks++
  }

  recordLayerHit(cacheType: string, layer: string): void {
    if (!this.enabled) return
    this.ensureStats(cacheType)
    const stats = this.stats.get(cacheType)!
    stats.layers[layer] = (stats.layers[layer] ?? 0) + 1
  }

  recordResponseTime(cacheType: string, timeMs: number): void {
    if (!this.enabled) return
    if (!this.responseTimes.has(cacheType)) {
      this.responseTimes.set(cacheType, [])
    }
    const times = this.responseTimes.get(cacheType)!
    times.push(timeMs)

    if (times.length > 100) {
      times.shift()
    }
  }

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

  getAllStats(): Record<string, CacheStats & CacheMetrics> {
    if (!this.enabled) return {}

    const result: Record<string, CacheStats & CacheMetrics> = {}
    for (const [cacheType, stats] of this.stats.entries()) {
      const metrics = this.getMetrics(cacheType)!
      result[cacheType] = { ...stats, ...metrics }
    }
    return result
  }

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
      console.log(`Stale Uses: ${stats.stale}, Fallbacks: ${stats.fallbacks}`)
      if (Object.keys(stats.layers).length > 0) {
        console.log('Layers:', stats.layers)
      }
      console.log(`Avg Response Time: ${stats.avgResponseTime}ms`)
      console.groupEnd()
    }

    console.groupEnd()
  }

  reset(): void {
    this.stats.clear()
    this.responseTimes.clear()
  }

  private ensureStats(cacheType: string): void {
    if (!this.stats.has(cacheType)) {
      this.stats.set(cacheType, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        stale: 0,
        fallbacks: 0,
        layers: {},
      })
    }
  }
}

export const cacheStats = new CacheStatsCollector()

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

if (typeof window !== 'undefined' && import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
  interface WindowWithCacheStats extends Window {
    __cacheStats?: CacheStatsCollector
  }
  ;(window as WindowWithCacheStats).__cacheStats = cacheStats
}
