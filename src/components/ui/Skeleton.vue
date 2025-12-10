<template>
  <div :class="skeletonClass" :style="skeletonStyle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'UiSkeleton',
})

interface Props {
  /** 变体 */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  /** 宽度 */
  width?: string
  /** 高度 */
  height?: string
  /** 动画效果 */
  animation?: 'pulse' | 'wave' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  animation: 'pulse',
})

const skeletonClass = computed(() => {
  return [
    'skeleton',
    `skeleton-${props.variant}`,
    {
      [`skeleton-animation-${props.animation}`]: props.animation !== 'none',
    },
  ]
})

const skeletonStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.width) {
    style.width = props.width
  }

  if (props.height) {
    style.height = props.height
  }

  return style
})
</script>

<style scoped>
.skeleton {
  background: var(--color-skeleton);
  display: block;
  position: relative;
  overflow: hidden;
}

/* Variants */
.skeleton-text {
  height: 1em;
  margin-bottom: 0.5em;
  border-radius: var(--radius-sm);
  transform: scale(1, 0.6);
}

.skeleton-circular {
  border-radius: var(--radius-full);
  width: 40px;
  height: 40px;
}

.skeleton-rectangular {
  border-radius: 0;
}

.skeleton-rounded {
  border-radius: var(--radius-lg);
}

/* Animations */
.skeleton-animation-pulse {
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

.skeleton-animation-wave::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, transparent, var(--color-skeleton-highlight), transparent);
  animation: skeletonWave 1.5s infinite;
}

@keyframes skeletonPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes skeletonWave {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .skeleton-animation-pulse,
  .skeleton-animation-wave::before {
    animation: none;
  }
}
</style>
