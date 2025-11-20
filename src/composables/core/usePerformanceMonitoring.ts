/**
 * Performance Monitoring Composable
 * 性能监控组合式函数
 *
 * Provides reactive access to performance metrics and monitoring utilities
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { performanceMonitor, type PerformanceMetrics } from '@/utils/performance/performanceMonitor'
import { useRouter } from 'vue-router'
import logger from '@/utils/logger'

export function usePerformanceMonitoring() {
  const router = useRouter()
  const metrics = ref<PerformanceMetrics>({})
  const isMonitoring = ref(false)
  const scrollStopFn = ref<(() => void) | null>(null)

  // Computed properties for easy access
  const fcp = computed(() => metrics.value.fcp)
  const lcp = computed(() => metrics.value.lcp)
  const fid = computed(() => metrics.value.fid)
  const cls = computed(() => metrics.value.cls)
  const ttfb = computed(() => metrics.value.ttfb)

  /**
   * Update metrics from monitor
   */
  const updateMetrics = () => {
    metrics.value = performanceMonitor.getMetrics()
  }

  /**
   * Start monitoring route transitions
   */
  const startRouteMonitoring = () => {
    let transitionStartTime = 0

    router.beforeEach(() => {
      transitionStartTime = performance.now()
    })

    router.afterEach((to, from) => {
      if (transitionStartTime > 0) {
        performanceMonitor.measureRouteTransition(
          from.path || 'initial',
          to.path,
          transitionStartTime,
        )
        transitionStartTime = 0
      }
    })
  }

  /**
   * Start monitoring scroll performance
   */
  const startScrollMonitoring = () => {
    if (scrollStopFn.value) {
      scrollStopFn.value()
    }
    scrollStopFn.value = performanceMonitor.startScrollPerformanceMeasurement()
  }

  /**
   * Stop monitoring scroll performance
   */
  const stopScrollMonitoring = () => {
    if (scrollStopFn.value) {
      scrollStopFn.value()
      scrollStopFn.value = null
    }
  }

  /**
   * Get performance report
   */
  const getReport = () => {
    return performanceMonitor.generateReport()
  }

  /**
   * Log performance report to console
   */
  const logReport = () => {
    logger.info('Performance report', {
      report: getReport(),
    })
  }

  /**
   * Check if performance targets are met
   */
  const checkTargets = () => {
    return performanceMonitor.checkPerformanceTargets()
  }

  /**
   * Get route transition metrics
   */
  const getRouteTransitions = () => {
    return performanceMonitor.getRouteTransitions()
  }

  /**
   * Get scroll metrics
   */
  const getScrollMetrics = () => {
    return performanceMonitor.getScrollMetrics()
  }

  /**
   * Get average route transition time
   */
  const getAverageRouteTime = () => {
    return performanceMonitor.getAverageRouteTransitionTime()
  }

  onMounted(() => {
    isMonitoring.value = true
    updateMetrics()

    // Update metrics periodically
    const interval = setInterval(updateMetrics, 1000)

    onUnmounted(() => {
      clearInterval(interval)
      stopScrollMonitoring()
      isMonitoring.value = false
    })
  })

  return {
    // State
    metrics,
    isMonitoring,
    fcp,
    lcp,
    fid,
    cls,
    ttfb,

    // Methods
    updateMetrics,
    startRouteMonitoring,
    startScrollMonitoring,
    stopScrollMonitoring,
    getReport,
    logReport,
    checkTargets,
    getRouteTransitions,
    getScrollMetrics,
    getAverageRouteTime,
  }
}
