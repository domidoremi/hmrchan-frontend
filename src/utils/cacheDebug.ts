/**
 * 缓存调试工具
 * 用于追踪和显示四层缓存的命中情况
 */

export interface CacheHitInfo {
  layer: 'memory' | 'indexeddb' | 'service-worker' | 'network'
  timestamp: number
  url: string
  size?: number
  ttl?: number
}

class CacheDebugger {
  private hits: CacheHitInfo[] = []
  private enabled = import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true'

  /**
   * 记录缓存命中
   */
  logHit(info: CacheHitInfo) {
    if (!this.enabled) return

    this.hits.push(info)

    // 控制台输出带颜色的日志
    const colors = {
      memory: '#4CAF50', // 绿色
      indexeddb: '#2196F3', // 蓝色
      'service-worker': '#FF9800', // 橙色
      network: '#F44336', // 红色
    }

    const emoji = {
      memory: '⚡',
      indexeddb: '💾',
      'service-worker': '🔧',
      network: '🌐',
    }

    console.log(
      `%c${emoji[info.layer]} Cache Hit: ${info.layer.toUpperCase()}`,
      `color: ${colors[info.layer]}; font-weight: bold;`,
      {
        url: info.url,
        size: info.size ? `${(info.size / 1024).toFixed(2)} KB` : 'unknown',
        ttl: info.ttl ? `${info.ttl}ms` : 'N/A',
        timestamp: new Date(info.timestamp).toLocaleTimeString(),
      }
    )
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const stats = {
      memory: 0,
      indexeddb: 0,
      'service-worker': 0,
      network: 0,
      total: this.hits.length,
    }

    this.hits.forEach((hit) => {
      stats[hit.layer]++
    })

    return {
      ...stats,
      hitRate: {
        memory: ((stats.memory / stats.total) * 100).toFixed(2) + '%',
        indexeddb: ((stats.indexeddb / stats.total) * 100).toFixed(2) + '%',
        'service-worker': ((stats['service-worker'] / stats.total) * 100).toFixed(2) + '%',
        network: ((stats.network / stats.total) * 100).toFixed(2) + '%',
      },
    }
  }

  /**
   * 在控制台打印缓存统计
   */
  printStats() {
    if (!this.enabled) return

    const stats = this.getStats()

    console.group('📊 Cache Statistics')
    console.table({
      'Memory Cache': { hits: stats.memory, rate: stats.hitRate.memory },
      'IndexedDB Cache': { hits: stats.indexeddb, rate: stats.hitRate.indexeddb },
      'Service Worker Cache': {
        hits: stats['service-worker'],
        rate: stats.hitRate['service-worker'],
      },
      'Network Requests': { hits: stats.network, rate: stats.hitRate.network },
    })
    console.log(`Total Requests: ${stats.total}`)
    console.groupEnd()
  }

  /**
   * 清除统计数据
   */
  clear() {
    this.hits = []
    console.log('🧹 Cache statistics cleared')
  }

  /**
   * 启用/禁用调试
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }
}

export const cacheDebugger = new CacheDebugger()

// 在开发环境下暴露到 window 对象
interface CacheDebugAPI {
  stats: () => void
  clear: () => void
  enable: () => void
  disable: () => void
}

declare global {
  interface Window {
    __cacheDebug?: CacheDebugAPI
  }
}

if (import.meta.env.DEV) {
  window.__cacheDebug = {
    stats: () => cacheDebugger.printStats(),
    clear: () => cacheDebugger.clear(),
    enable: () => cacheDebugger.setEnabled(true),
    disable: () => cacheDebugger.setEnabled(false),
  }

  console.log(
    '%c💡 Cache Debug Tools Available',
    'color: #2196F3; font-size: 14px; font-weight: bold;'
  )
  console.log('Use window.__cacheDebug.stats() to view cache statistics')
  console.log('Use window.__cacheDebug.clear() to clear statistics')
}
