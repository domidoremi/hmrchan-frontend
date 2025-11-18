<template>
  <div v-if="isVisible" class="performance-dashboard">
    <div class="dashboard-header">
      <h3>⚡ Performance Dashboard</h3>
      <button @click="toggleVisibility" class="close-btn" aria-label="Close dashboard">×</button>
    </div>

    <div class="dashboard-content">
      <!-- Core Web Vitals -->
      <section class="metrics-section">
        <h4>📊 Core Web Vitals</h4>
        <div class="metrics-grid">
          <div class="metric-card" :class="getMetricStatus(fcp, 1500)">
            <div class="metric-label">FCP</div>
            <div class="metric-value">{{ formatMetric(fcp) }}</div>
            <div class="metric-target">Target: &lt;1.5s</div>
          </div>

          <div class="metric-card" :class="getMetricStatus(lcp, 2500)">
            <div class="metric-label">LCP</div>
            <div class="metric-value">{{ formatMetric(lcp) }}</div>
            <div class="metric-target">Target: &lt;2.5s</div>
          </div>

          <div class="metric-card" :class="getMetricStatus(fid, 100)">
            <div class="metric-label">FID</div>
            <div class="metric-value">{{ formatMetric(fid) }}</div>
            <div class="metric-target">Target: &lt;100ms</div>
          </div>

          <div class="metric-card" :class="getMetricStatus(cls, 0.1)">
            <div class="metric-label">CLS</div>
            <div class="metric-value">{{ formatCLS(cls) }}</div>
            <div class="metric-target">Target: &lt;0.1</div>
          </div>
        </div>
      </section>

      <!-- Route Transitions -->
      <section v-if="routeTransitions.length > 0" class="metrics-section">
        <h4>🔄 Route Transitions</h4>
        <div class="metric-card" :class="getMetricStatus(averageRouteTime, 500)">
          <div class="metric-label">Average Time</div>
          <div class="metric-value">{{ formatMetric(averageRouteTime) }}</div>
          <div class="metric-target">Target: &lt;500ms</div>
        </div>
        <div class="transitions-list">
          <div
            v-for="(transition, index) in recentTransitions"
            :key="index"
            class="transition-item"
          >
            <span class="transition-route">{{ transition.from }} → {{ transition.to }}</span>
            <span class="transition-time">{{ transition.duration.toFixed(0) }}ms</span>
          </div>
        </div>
      </section>

      <!-- Scroll Performance -->
      <section v-if="scrollMetrics" class="metrics-section">
        <h4>📜 Scroll Performance</h4>
        <div class="metrics-grid">
          <div class="metric-card" :class="getMetricStatus(scrollMetrics.averageFPS, 55, true)">
            <div class="metric-label">Avg FPS</div>
            <div class="metric-value">{{ scrollMetrics.averageFPS.toFixed(1) }}</div>
            <div class="metric-target">Target: ≥55fps</div>
          </div>

          <div class="metric-card">
            <div class="metric-label">Dropped Frames</div>
            <div class="metric-value">
              {{ scrollMetrics.droppedFrames }}/{{ scrollMetrics.totalFrames }}
            </div>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="dashboard-actions">
        <button @click="startScrollTest" class="action-btn" :disabled="isScrollTesting">
          {{ isScrollTesting ? 'Testing...' : 'Test Scroll' }}
        </button>
        <button @click="logReport" class="action-btn">Log Report</button>
        <button @click="updateMetrics" class="action-btn">Refresh</button>
      </div>
    </div>
  </div>

  <!-- Toggle Button (when hidden) -->
  <button v-else @click="toggleVisibility" class="dashboard-toggle" aria-label="Show dashboard">
    ⚡
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePerformanceMonitoring } from '@/composables'

const {
  fcp,
  lcp,
  fid,
  cls,
  updateMetrics,
  startScrollMonitoring,
  stopScrollMonitoring,
  logReport,
  getRouteTransitions,
  getScrollMetrics,
  getAverageRouteTime,
  startRouteMonitoring,
} = usePerformanceMonitoring()

const isVisible = ref(false)
const isScrollTesting = ref(false)
const routeTransitions = ref(getRouteTransitions())
const scrollMetrics = ref(getScrollMetrics())
const averageRouteTime = ref(getAverageRouteTime())

const recentTransitions = computed(() => {
  return routeTransitions.value.slice(-5).reverse()
})

const toggleVisibility = () => {
  isVisible.value = !isVisible.value
}

const formatMetric = (value: number | undefined): string => {
  if (value === undefined) return 'N/A'
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value.toFixed(0)}ms`
}

const formatCLS = (value: number | undefined): string => {
  if (value === undefined) return 'N/A'
  return value.toFixed(3)
}

const getMetricStatus = (
  value: number | undefined,
  target: number,
  higherIsBetter = false,
): string => {
  if (value === undefined) return 'unknown'
  if (higherIsBetter) {
    return value >= target ? 'good' : 'poor'
  }
  return value <= target ? 'good' : 'poor'
}

const startScrollTest = () => {
  if (isScrollTesting.value) return

  isScrollTesting.value = true
  startScrollMonitoring()

  // Stop after 5 seconds
  setTimeout(() => {
    stopScrollMonitoring()
    scrollMetrics.value = getScrollMetrics()
    isScrollTesting.value = false
  }, 5000)
}

onMounted(() => {
  // Start route monitoring
  startRouteMonitoring()

  // Update metrics periodically
  const interval = setInterval(() => {
    updateMetrics()
    routeTransitions.value = getRouteTransitions()
    averageRouteTime.value = getAverageRouteTime()
  }, 2000)

  // Cleanup
  return () => {
    clearInterval(interval)
  }
})
</script>

<style scoped>
.performance-dashboard {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  z-index: 9999;
  overflow: hidden;
  font-size: 14px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-primary);
  color: white;
}

.dashboard-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.dashboard-content {
  padding: 16px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.metrics-section {
  margin-bottom: 20px;
}

.metrics-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.metric-card {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.metric-card.good {
  border-color: var(--color-success);
  background: rgba(16, 185, 129, 0.1);
}

.metric-card.poor {
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
}

.metric-card.unknown {
  border-color: var(--color-gray-300);
}

.metric-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 500;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.metric-target {
  font-size: 11px;
  color: var(--text-tertiary);
}

.transitions-list {
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.transition-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
  font-size: 12px;
}

.transition-route {
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transition-time {
  color: var(--text-primary);
  font-weight: 600;
  margin-left: 8px;
}

.dashboard-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dashboard-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  z-index: 9999;
  transition: all 0.2s;
}

.dashboard-toggle:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-xl);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .performance-dashboard {
    width: calc(100vw - 40px);
    max-width: 400px;
  }
}
</style>
