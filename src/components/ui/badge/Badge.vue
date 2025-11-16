<template>
  <span :class="badgeClass">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'UiBadge',
})

interface Props {
  /** 变体 */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  /** 大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否为点状badge */
  dot?: boolean
  /** 是否为轮廓样式 */
  outlined?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  dot: false,
  outlined: false,
})

const badgeClass = computed(() => {
  return [
    'badge',
    `badge-${props.variant}`,
    `badge-${props.size}`,
    {
      'badge-dot': props.dot,
      'badge-outlined': props.outlined,
    },
  ]
})
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition: all var(--transition-fast);
  gap: var(--spacing-1);
}

/* Sizes */
.badge-sm {
  padding: var(--spacing-0\.5) var(--spacing-2);
  font-size: var(--text-xs);
  line-height: var(--line-none);
}

.badge-md {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--text-sm);
  line-height: var(--line-tight);
}

.badge-lg {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-base);
  line-height: var(--line-tight);
}

/* Variants */
.badge-default {
  background: var(--glass-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--glass-border);
}

.badge-primary {
  background: var(--color-primary);
  color: white;
  border: 1px solid transparent;
}

.badge-secondary {
  background: var(--color-secondary);
  color: white;
  border: 1px solid transparent;
}

.badge-success {
  background: var(--color-success);
  color: white;
  border: 1px solid transparent;
}

.badge-warning {
  background: var(--color-warning);
  color: white;
  border: 1px solid transparent;
}

.badge-error {
  background: var(--color-error);
  color: white;
  border: 1px solid transparent;
}

/* Outlined variants */
.badge-outlined.badge-default {
  background: transparent;
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.badge-outlined.badge-primary {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.badge-outlined.badge-secondary {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
  border-color: var(--color-secondary);
}

.badge-outlined.badge-success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
  border-color: var(--color-success);
}

.badge-outlined.badge-warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
  border-color: var(--color-warning);
}

.badge-outlined.badge-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-color: var(--color-error);
}

/* Dot badge */
.badge-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  min-width: 8px;
  border-radius: var(--radius-full);
}

.badge-dot.badge-sm {
  width: 6px;
  height: 6px;
  min-width: 6px;
}

.badge-dot.badge-lg {
  width: 10px;
  height: 10px;
  min-width: 10px;
}
</style>
