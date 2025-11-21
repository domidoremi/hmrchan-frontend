<template>
  <div
    class="stat-card glass-card"
    :class="[`stat-card--${variant}`, { 'stat-card--loading': loading }]"
  >
    <!-- Loading State (Skeleton) -->
    <template v-if="loading">
      <div class="stat-icon skeleton-box"></div>
      <div class="stat-content">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-value"></div>
        <div class="skeleton-line skeleton-label"></div>
      </div>
    </template>

    <!-- Loaded State -->
    <template v-else>
      <!-- Icon -->
      <div v-if="icon || iconColor" class="stat-icon" :style="iconStyle">
        <component v-if="icon" :is="icon" :size="iconSize" />
      </div>

      <!-- Content -->
      <div class="stat-content">
        <h3 class="stat-title">{{ title }}</h3>
        <p class="stat-value">{{ formattedValue }}</p>
        <p v-if="label" class="stat-label">{{ label }}</p>

        <!-- Trend Indicator -->
        <div v-if="trend" class="stat-trend" :class="`stat-trend--${trend.direction}`">
          <component :is="trendIcon" :size="14" />
          <span>{{ Math.abs(trend.value) }}%</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'
import { formatNumber } from '@/utils/format'

export interface StatCardProps {
  icon?: Component
  iconColor?: string
  title: string
  value: string | number
  label?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  loading?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

const props = withDefaults(defineProps<StatCardProps>(), {
  loading: false,
  variant: 'default',
})

// Icon styling
const iconStyle = computed(() => {
  if (props.iconColor) {
    return {
      background: props.iconColor,
    }
  }
  return {}
})

// Icon size based on variant
const iconSize = computed(() => {
  switch (props.variant) {
    case 'compact':
      return 20
    case 'detailed':
      return 32
    default:
      return 24
  }
})

// Format value
const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return formatNumber(props.value)
  }
  return props.value
})

// Trend icon
const trendIcon = computed(() => {
  return props.trend?.direction === 'up' ? TrendingUp : TrendingDown
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--glass-shadow), var(--glass-glow);
}

/* Variants */
.stat-card--compact {
  padding: var(--spacing-md);
  gap: var(--spacing-sm);
}

.stat-card--detailed {
  padding: var(--spacing-2xl);
  gap: var(--spacing-lg);
}

/* Icon */
.stat-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: var(--color-primary);
}

.stat-card--compact .stat-icon {
  width: 40px;
  height: 40px;
}

.stat-card--detailed .stat-icon {
  width: 64px;
  height: 64px;
}

/* Content */
.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.stat-title {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  margin: 0;
}

.stat-card--compact .stat-title {
  font-size: var(--text-sm);
}

.stat-card--detailed .stat-title {
  font-size: var(--text-lg);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.stat-card--compact .stat-value {
  font-size: var(--text-xl);
}

.stat-card--detailed .stat-value {
  font-size: var(--text-3xl);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

.stat-card--compact .stat-label {
  font-size: var(--text-xs);
}

/* Trend Indicator */
.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  width: fit-content;
}

.stat-trend--up {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-trend--down {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Loading State (Skeleton) */
.stat-card--loading {
  pointer-events: none;
}

.stat-card--loading .stat-icon {
  background: var(--color-surface-secondary);
  box-shadow: none;
}

.skeleton-box {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-secondary);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-line {
  height: 16px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-secondary);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-title {
  width: 60%;
  height: 14px;
}

.skeleton-value {
  width: 40%;
  height: 24px;
  margin: var(--spacing-xs) 0;
}

.skeleton-label {
  width: 50%;
  height: 12px;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .stat-card {
    padding: var(--spacing-lg);
    gap: var(--spacing-sm);
    /* 移动端使用更清爽的阴影 */
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.05),
      0 1px 2px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--glass-border);
  }

  .stat-card:hover {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.08),
      0 2px 4px rgba(0, 0, 0, 0.06);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    /* 移动端图标阴影更柔和 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .stat-value {
    font-size: var(--text-xl);
  }

  .stat-title {
    font-size: var(--text-sm);
  }
}

@media (max-width: 480px) {
  .stat-card {
    padding: var(--spacing-md);
    /* 小屏幕使用最轻量的阴影 */
    box-shadow:
      0 1px 4px rgba(0, 0, 0, 0.04),
      0 1px 2px rgba(0, 0, 0, 0.03);
  }

  .stat-card:hover {
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.06),
      0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  .stat-value {
    font-size: var(--text-lg);
  }
}
</style>
