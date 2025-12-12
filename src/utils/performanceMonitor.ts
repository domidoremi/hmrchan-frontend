/**
 * Performance Monitoring Utilities
 * 性能监控工具
 *
 * Provides utilities for measuring and reporting performance metrics
 * including FCP, LCP, TTI, CLS, and custom metrics.
 */

import { logger } from './logger'

export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
  tti?: number // Time to Interactive

  // Custom Metrics
  domContentLoaded?: number
  loadComplete?: number
  firstPaint?: number

  // Navigation Timing
  navigationStart?: number
  responseEnd?: number
  domInteractive?: number
}

export interface RouteTransitionMetrics {
  from: string
  to: string
  duration: number
  timestamp: number
}

export interface ScrollPerformanceMetrics {
  averageFPS: number
  minFPS: number
  maxFPS: number
  droppedFrames: number
  totalFrames: number
  duration: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private routeTransitions: RouteTransitionMetrics[] = []
  private scrollMetrics: ScrollPerformanceMetrics | null = null
  private observers: Map<string, PerformanceObserver> = new Map()

  constructor() {
    this.initializeObservers()
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    try {
      // Observe paint timing (FCP, FP)
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime
            logger.info(`[Performance] FCP: ${entry.startTime.toFixed(2)}ms`)
          } else if (entry.name === 'first-paint') {
            this.metrics.firstPaint = entry.startTime
          }
        }
      })
      paintObserver.observe({ entryTypes: ['paint'] })
      this.observers.set('paint', paintObserver)

      // Observe largest contentful paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          renderTime: number
          loadTime: number
        }
        this.metrics['lcp'] = lastEntry.renderTime || lastEntry.loadTime
        logger.info(`[Performance] LCP: ${this.metrics.lcp.toFixed(2)}ms`)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', lcpObserver)

      // Observe layout shifts (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value
            this.metrics['cls'] = clsValue
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('cls', clsObserver)

      // Observe first input delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const firstInput = entry as PerformanceEntry & { processingStart: number }
          this.metrics['fid'] = firstInput.processingStart - entry.startTime
          logger.info(`[Performance] FID: ${this.metrics.fid.toFixed(2)}ms`)
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.set('fid', fidObserver)
    } catch (error) {
      logger.error('[Performance] Failed to initialize observers:', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Collect navigation timing metrics
   */
  collectNavigationMetrics(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    if (navigation) {
      this.metrics['ttfb'] = navigation.responseStart - navigation.requestStart
      this.metrics['domContentLoaded'] = navigation.domContentLoadedEventEnd - navigation.fetchStart
      this.metrics['loadComplete'] = navigation.loadEventEnd - navigation.fetchStart
      this.metrics['domInteractive'] = navigation.domInteractive - navigation.fetchStart
      this.metrics['navigationStart'] = navigation.fetchStart
      this.metrics['responseEnd'] = navigation.responseEnd

      logger.info('[Performance] Navigation Metrics:', {
        TTFB: `${this.metrics.ttfb.toFixed(2)}ms`,
        DOMContentLoaded: `${this.metrics.domContentLoaded.toFixed(2)}ms`,
        LoadComplete: `${this.metrics.loadComplete.toFixed(2)}ms`,
      })
    }
  }

  /**
   * Measure route transition time
   */
  measureRouteTransition(from: string, to: string, startTime: number): void {
    const duration = performance.now() - startTime
    const metric: RouteTransitionMetrics = {
      from,
      to,
      duration,
      timestamp: Date.now(),
    }

    this.routeTransitions.push(metric)

    // Keep only last 50 transitions
    if (this.routeTransitions.length > 50) {
      this.routeTransitions.shift()
    }

    logger.info(`[Performance] Route transition ${from} → ${to}: ${duration.toFixed(2)}ms`)
  }

  /**
   * Start measuring scroll performance
   */
  startScrollPerformanceMeasurement(): () => void {
    let frameCount = 0
    let droppedFrames = 0
    let lastFrameTime = performance.now()
    let minFPS = Infinity
    let maxFPS = 0
    const startTime = performance.now()
    let animationId: number

    const measureFrame = () => {
      const currentTime = performance.now()
      const frameDuration = currentTime - lastFrameTime
      const fps = 1000 / frameDuration

      frameCount++

      // Count dropped frames (below 60fps threshold)
      if (fps < 55) {
        droppedFrames++
      }

      minFPS = Math.min(minFPS, fps)
      maxFPS = Math.max(maxFPS, fps)

      lastFrameTime = currentTime
      animationId = requestAnimationFrame(measureFrame)
    }

    animationId = requestAnimationFrame(measureFrame)

    // Return stop function
    return () => {
      cancelAnimationFrame(animationId)
      const duration = performance.now() - startTime
      const averageFPS = (frameCount / duration) * 1000

      this.scrollMetrics = {
        averageFPS,
        minFPS: minFPS === Infinity ? 0 : minFPS,
        maxFPS,
        droppedFrames,
        totalFrames: frameCount,
        duration,
      }

      logger.info('[Performance] Scroll Performance:', {
        averageFPS: averageFPS.toFixed(2),
        minFPS: this.scrollMetrics.minFPS.toFixed(2),
        maxFPS: this.scrollMetrics.maxFPS.toFixed(2),
        droppedFrames,
        totalFrames: frameCount,
      })
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get route transition metrics
   */
  getRouteTransitions(): RouteTransitionMetrics[] {
    return [...this.routeTransitions]
  }

  /**
   * Get scroll performance metrics
   */
  getScrollMetrics(): ScrollPerformanceMetrics | null {
    return this.scrollMetrics ? { ...this.scrollMetrics } : null
  }

  /**
   * Get average route transition time
   */
  getAverageRouteTransitionTime(): number {
    if (this.routeTransitions.length === 0) return 0

    const sum = this.routeTransitions.reduce((acc, metric) => acc + metric.duration, 0)
    return sum / this.routeTransitions.length
  }

  /**
   * Check if metrics meet performance targets
   */
  checkPerformanceTargets(): {
    passed: boolean
    results: Record<string, { value: number; target: number; passed: boolean }>
  } {
    const targets = {
      fcp: 1500, // < 1.5s
      lcp: 2500, // < 2.5s
      fid: 100, // < 100ms
      cls: 0.1, // < 0.1
      ttfb: 600, // < 600ms
    }

    const results: Record<string, { value: number; target: number; passed: boolean }> = {}
    let allPassed = true

    for (const [metric, target] of Object.entries(targets)) {
      const value = this.metrics[metric as keyof PerformanceMetrics] ?? 0
      const passed = value <= target
      results[metric] = { value, target, passed }

      if (!passed) {
        allPassed = false
      }
    }

    return { passed: allPassed, results }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics()
    const routeAvg = this.getAverageRouteTransitionTime()
    const scrollMetrics = this.getScrollMetrics()
    const targets = this.checkPerformanceTargets()

    let report = '=== Performance Report ===\n\n'

    report += '📊 Core Web Vitals:\n'
    report += `  FCP: ${metrics['fcp']?.toFixed(2) ?? 'N/A'}ms ${targets.results.fcp?.passed ? '✅' : '❌'} (target: <1500ms)\n`
    report += `  LCP: ${metrics['lcp']?.toFixed(2) ?? 'N/A'}ms ${targets.results.lcp?.passed ? '✅' : '❌'} (target: <2500ms)\n`
    report += `  FID: ${metrics['fid']?.toFixed(2) ?? 'N/A'}ms ${targets.results.fid?.passed ? '✅' : '❌'} (target: <100ms)\n`
    report += `  CLS: ${metrics['cls']?.toFixed(3) ?? 'N/A'} ${targets.results.cls?.passed ? '✅' : '❌'} (target: <0.1)\n`
    report += `  TTFB: ${metrics['ttfb']?.toFixed(2) ?? 'N/A'}ms ${targets.results.ttfb?.passed ? '✅' : '❌'} (target: <600ms)\n\n`

    report += '⏱️  Navigation Timing:\n'
    report += `  DOM Content Loaded: ${metrics.domContentLoaded?.toFixed(2) ?? 'N/A'}ms\n`
    report += `  Load Complete: ${metrics.loadComplete?.toFixed(2) ?? 'N/A'}ms\n`
    report += `  DOM Interactive: ${metrics.domInteractive?.toFixed(2) ?? 'N/A'}ms\n\n`

    if (this.routeTransitions.length > 0) {
      report += '🔄 Route Transitions:\n'
      report += `  Average: ${routeAvg.toFixed(2)}ms ${routeAvg < 500 ? '✅' : '❌'} (target: <500ms)\n`
      report += `  Total Measured: ${this.routeTransitions.length}\n\n`
    }

    if (scrollMetrics) {
      report += '📜 Scroll Performance:\n'
      report += `  Average FPS: ${scrollMetrics.averageFPS.toFixed(2)} ${scrollMetrics.averageFPS >= 55 ? '✅' : '❌'} (target: ≥55fps)\n`
      report += `  Min FPS: ${scrollMetrics.minFPS.toFixed(2)}\n`
      report += `  Max FPS: ${scrollMetrics.maxFPS.toFixed(2)}\n`
      report += `  Dropped Frames: ${scrollMetrics.droppedFrames}/${scrollMetrics.totalFrames}\n\n`
    }

    report += `Overall: ${targets.passed ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT'}\n`

    return report
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Collect navigation metrics when page loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    performanceMonitor.collectNavigationMetrics()
  })
}
