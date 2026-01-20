/**
 * 性能监控工具
 * 跟踪 Core Web Vitals 和自定义性能指标
 */

interface PerformanceMetrics {
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte
  tti?: number // Time to Interactive
}

const metrics: PerformanceMetrics = {}

/**
 * 监控 LCP (Largest Contentful Paint)
 */
function observeLCP(): void {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number }

      metrics.lcp = lastEntry.renderTime || lastEntry.startTime

      if (import.meta.env.DEV) {
        console.log('LCP:', metrics.lcp, 'ms')
      }
    })

    observer.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch (e) {
    // 某些浏览器可能不支持
  }
}

/**
 * 监控 FID (First Input Delay)
 */
function observeFID(): void {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const firstInput = entries[0] as PerformanceEntry & { processingStart?: number }

      metrics.fid = firstInput.processingStart
        ? firstInput.processingStart - firstInput.startTime
        : 0

      if (import.meta.env.DEV) {
        console.log('FID:', metrics.fid, 'ms')
      }
    })

    observer.observe({ type: 'first-input', buffered: true })
  } catch (e) {
    // 某些浏览器可能不支持
  }
}

/**
 * 监控 CLS (Cumulative Layout Shift)
 */
function observeCLS(): void {
  if (!('PerformanceObserver' in window)) return

  try {
    let clsValue = 0

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value || 0
        }
      }

      metrics.cls = clsValue

      if (import.meta.env.DEV) {
        console.log('CLS:', metrics.cls.toFixed(4))
      }
    })

    observer.observe({ type: 'layout-shift', buffered: true })
  } catch (e) {
    // 某些浏览器可能不支持
  }
}

/**
 * 监控 FCP (First Contentful Paint)
 */
function observeFCP(): void {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const firstEntry = entries[0]

      metrics.fcp = firstEntry.startTime

      if (import.meta.env.DEV) {
        console.log('FCP:', metrics.fcp, 'ms')
      }
    })

    observer.observe({ type: 'paint', buffered: true })
  } catch (e) {
    // 某些浏览器可能不支持
  }
}

/**
 * 获取 TTFB (Time to First Byte)
 */
function measureTTFB(): void {
  if (!('performance' in window) || !performance.timing) return

  const navigationTiming = performance.timing
  metrics.ttfb = navigationTiming.responseStart - navigationTiming.requestStart

  if (import.meta.env.DEV) {
    console.log('TTFB:', metrics.ttfb, 'ms')
  }
}

/**
 * 估算 TTI (Time to Interactive)
 */
function estimateTTI(): void {
  if (!('performance' in window)) return

  // 使用 load 事件作为 TTI 的近似值
  window.addEventListener(
    'load',
    () => {
      setTimeout(() => {
        const navigationTiming = performance.timing
        metrics.tti = navigationTiming.loadEventEnd - navigationTiming.navigationStart

        if (import.meta.env.DEV) {
          console.log('TTI (estimated):', metrics.tti, 'ms')
        }
      }, 0)
    },
    { once: true }
  )
}

/**
 * 监控长任务 (Long Tasks)
 */
function observeLongTasks(): void {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (import.meta.env.DEV) {
          console.warn('Long Task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
          })
        }
      }
    })

    observer.observe({ type: 'longtask', buffered: true })
  } catch (e) {
    // 某些浏览器可能不支持
  }
}

/**
 * 监控资源加载性能
 */
function observeResourceTiming(): void {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming

        // 只在开发环境记录慢速资源
        if (import.meta.env.DEV && resource.duration > 1000) {
          console.warn('Slow resource:', {
            name: resource.name,
            duration: resource.duration,
            size: resource.transferSize,
          })
        }
      }
    })

    observer.observe({ type: 'resource', buffered: true })
  } catch (e) {
    // 某些浏览器可能不支持
  }
}

/**
 * 获取所有性能指标
 */
export function getMetrics(): PerformanceMetrics {
  return { ...metrics }
}

/**
 * 初始化性能监控
 */
export function initPerformanceMonitoring(): void {
  // 只在浏览器环境中运行
  if (typeof window === 'undefined') return

  observeLCP()
  observeFID()
  observeCLS()
  observeFCP()
  measureTTFB()
  estimateTTI()

  // 开发环境额外监控
  if (import.meta.env.DEV) {
    observeLongTasks()
    observeResourceTiming()
  }

  // 页面卸载时上报指标（生产环境可以发送到分析服务）
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const finalMetrics = getMetrics()

      if (import.meta.env.DEV) {
        console.log('Final Performance Metrics:', finalMetrics)
      }

      // 生产环境可以在这里上报到分析服务
      // sendToAnalytics(finalMetrics)
    }
  })
}

/**
 * 性能评分
 */
export function getPerformanceScore(): {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  details: Record<string, { value: number; score: number; threshold: string }>
} {
  const m = getMetrics()

  // 评分标准（基于 Google 的 Core Web Vitals 阈值）
  const scores = {
    lcp: calculateScore(m.lcp || 0, 2500, 4000), // Good: <2.5s, Poor: >4s
    fid: calculateScore(m.fid || 0, 100, 300), // Good: <100ms, Poor: >300ms
    cls: calculateScore(m.cls || 0, 0.1, 0.25), // Good: <0.1, Poor: >0.25
    fcp: calculateScore(m.fcp || 0, 1800, 3000), // Good: <1.8s, Poor: >3s
    ttfb: calculateScore(m.ttfb || 0, 800, 1800), // Good: <800ms, Poor: >1.8s
  }

  const avgScore = Object.values(scores).reduce((sum, s) => sum + s, 0) / Object.keys(scores).length

  const grade =
    avgScore >= 90 ? 'A' : avgScore >= 75 ? 'B' : avgScore >= 60 ? 'C' : avgScore >= 40 ? 'D' : 'F'

  return {
    score: Math.round(avgScore),
    grade,
    details: {
      lcp: { value: m.lcp || 0, score: scores.lcp, threshold: '<2.5s (good), >4s (poor)' },
      fid: { value: m.fid || 0, score: scores.fid, threshold: '<100ms (good), >300ms (poor)' },
      cls: { value: m.cls || 0, score: scores.cls, threshold: '<0.1 (good), >0.25 (poor)' },
      fcp: { value: m.fcp || 0, score: scores.fcp, threshold: '<1.8s (good), >3s (poor)' },
      ttfb: { value: m.ttfb || 0, score: scores.ttfb, threshold: '<800ms (good), >1.8s (poor)' },
    },
  }
}

function calculateScore(value: number, goodThreshold: number, poorThreshold: number): number {
  if (value <= goodThreshold) return 100
  if (value >= poorThreshold) return 0
  return Math.round(100 - ((value - goodThreshold) / (poorThreshold - goodThreshold)) * 100)
}
