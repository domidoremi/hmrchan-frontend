<template>
  <div
    :class="progressClass"
    role="progressbar"
    :aria-valuenow="value"
    aria-valuemin="0"
    :aria-valuemax="max"
  >
    <div class="ui-progress__indicator" :style="indicatorStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'UiProgress' })

interface Props {
  value?: number
  max?: number
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  indeterminate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  max: 100,
  size: 'default',
  variant: 'default',
  indeterminate: false,
})

const progressClass = computed(() => [
  'ui-progress',
  `ui-progress--${props.size}`,
  `ui-progress--${props.variant}`,
  {
    'ui-progress--indeterminate': props.indeterminate,
  },
])

const indicatorStyle = computed(() => {
  if (props.indeterminate) return {}
  const percentage = Math.min(100, Math.max(0, (props.value / props.max) * 100))
  return {
    width: `${percentage}%`,
  }
})
</script>

<style scoped>
.ui-progress {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--glass-bg-light);
}

/* Sizes */
.ui-progress--sm {
  height: 0.375rem;
}

.ui-progress--default {
  height: 0.5rem;
}

.ui-progress--lg {
  height: 0.75rem;
}

/* Indicator */
.ui-progress__indicator {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 300ms var(--ease-out);
}

/* Variants */
.ui-progress--default .ui-progress__indicator {
  background: var(--color-primary);
}

.ui-progress--success .ui-progress__indicator {
  background: var(--color-success);
}

.ui-progress--warning .ui-progress__indicator {
  background: var(--color-warning);
}

.ui-progress--error .ui-progress__indicator {
  background: var(--color-error);
}

/* Indeterminate animation */
.ui-progress--indeterminate .ui-progress__indicator {
  width: 50%;
  animation: progress-indeterminate 1.5s ease-in-out infinite;
}

@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-progress--indeterminate .ui-progress__indicator {
    animation: none;
    width: 100%;
  }
}
</style>
