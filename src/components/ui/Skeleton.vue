<template>
  <div
    class="skeleton"
    :class="[`skeleton--${variant}`, `skeleton--${animation}`, { 'skeleton--rounded': rounded }]"
    :style="computedStyle"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'text' | 'title' | 'avatar' | 'image' | 'button' | 'card' | 'circle'
  animation?: 'shimmer' | 'wave' | 'pulse'
  width?: string | number
  height?: string | number
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  animation: 'shimmer',
  rounded: false,
})

const computedStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }

  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }

  return style
})
</script>

<style scoped>
.skeleton {
  background: linear-gradient(
    90deg,
    var(--glass-bg-light) 0%,
    var(--glass-bg) 50%,
    var(--glass-bg-light) 100%
  );
  background-size: 200% 100%;
  border-radius: var(--radius-md);
}

/* ========== Variants ========== */
.skeleton--text {
  height: 1em;
  border-radius: var(--radius-sm);
}

.skeleton--title {
  height: 1.5em;
  border-radius: var(--radius-sm);
}

.skeleton--avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-full);
}

.skeleton--circle {
  border-radius: var(--radius-full);
}

.skeleton--image {
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg);
}

.skeleton--button {
  height: 2.5rem;
  border-radius: var(--radius-lg);
}

.skeleton--card {
  min-height: 200px;
  border-radius: var(--radius-xl);
}

.skeleton--rounded {
  border-radius: var(--radius-full);
}

/* ========== Animations ========== */
.skeleton--shimmer {
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton--wave {
  position: relative;
  overflow: hidden;
  background: var(--glass-bg-light);
}

.skeleton--wave::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: skeleton-wave 1.5s ease-in-out infinite;
}

[data-theme='dark'] .skeleton--wave::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 100%
  );
}

.skeleton--pulse {
  background: var(--glass-bg-light);
  animation: skeleton-pulse 2s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes skeleton-wave {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
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

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  .skeleton--shimmer,
  .skeleton--wave::after,
  .skeleton--pulse {
    animation: none;
  }
}
</style>
