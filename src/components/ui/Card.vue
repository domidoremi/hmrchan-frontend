<template>
  <component
    :is="as"
    ref="cardRef"
    :class="cardClass"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousemove="handleMouseMove"
  >
    <!-- 光泽扫过效果 -->
    <span v-if="shine" ref="shineRef" class="ui-card__shine" />

    <!-- 顶部光泽线 -->
    <span class="ui-card__highlight" />

    <div v-if="$slots['header']" class="ui-card__header">
      <slot name="header" />
    </div>
    <div v-if="$slots['default']" class="ui-card__content">
      <slot />
    </div>
    <div v-if="$slots['footer']" class="ui-card__footer">
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({ name: 'UiCard' })

interface Props {
  as?: string
  variant?: 'default' | 'outline' | 'subtle' | 'elevated'
  interactive?: boolean
  /** Kept for API compat — hover effects now use CSS */
  hover3d?: boolean
  /** Kept for API compat */
  shine?: boolean
  /** Kept for API compat */
  animate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  variant: 'default',
  interactive: false,
  hover3d: false,
  shine: false,
  animate: false,
})

const cardRef = ref<HTMLElement | null>(null)
const shineRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)

const cardClass = computed(() => [
  'ui-card',
  `ui-card--${props.variant}`,
  {
    'ui-card--interactive': props.interactive,
    'ui-card--hover3d': props.hover3d,
    'ui-card--shine': props.shine,
    'ui-card--hovered': isHovered.value,
  },
])

function handleMouseMove() {
  // CSS-only hover; no JS needed
}

function handleMouseEnter() {
  isHovered.value = true
}

function handleMouseLeave() {
  isHovered.value = false
}
</script>

<style scoped>
.ui-card {
  position: relative;
  border-radius: var(--radius-xl);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
  transition:
    box-shadow 200ms var(--ease-out),
    border-color 200ms var(--ease-out);
  transform-style: preserve-3d;
  will-change: transform;
}

/* 顶部光泽线 */
.ui-card__highlight {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
  opacity: 0.6;
  pointer-events: none;
  z-index: 2;
}

/* 光泽扫过效果 */
.ui-card__shine {
  position: absolute;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  z-index: 1;
  transform: translate(-50%, -50%);
}

/* Elevated 变体 */
.ui-card--elevated {
  box-shadow: var(--glass-shadow-lg);
}

.ui-card--outline {
  background: transparent;
  box-shadow: none;
}

.ui-card--subtle {
  background: var(--glass-bg-light);
  box-shadow: var(--shadow-sm);
}

.ui-card--interactive {
  cursor: pointer;
}

/* 悬停状态 */
.ui-card--hovered {
  border-color: var(--glass-border-strong);
  box-shadow:
    var(--glass-shadow-lg),
    0 16px 40px -12px rgba(var(--color-primary-rgb), 0.15);
}

/* 3D 悬停卡片 */
.ui-card--hover3d {
  transform-style: preserve-3d;
}

/* 内容区域 */
.ui-card__header,
.ui-card__content,
.ui-card__footer {
  position: relative;
  z-index: 3;
}

.ui-card__header {
  padding: var(--spacing-4) var(--spacing-5) 0;
}

.ui-card__content {
  padding: var(--spacing-5);
}

.ui-card__footer {
  padding: 0 var(--spacing-5) var(--spacing-5);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .ui-card {
    transition: none;
  }

  .ui-card--hover3d {
    transform: none !important;
  }
}
</style>
