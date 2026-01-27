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
import { computed, ref, onMounted } from 'vue'

defineOptions({ name: 'UiCard' })

// 懒加载 GSAP
let gsap: typeof import('gsap').default | null = null
const loadGsap = async () => {
  if (!gsap) {
    const module = await import('gsap')
    gsap = module.default
  }
  return gsap
}

// 检测是否偏好减少动画
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface Props {
  as?: string
  variant?: 'default' | 'outline' | 'subtle' | 'elevated'
  interactive?: boolean
  /** 是否启用 3D 悬停效果 */
  hover3d?: boolean
  /** 是否启用光泽扫过效果 */
  shine?: boolean
  /** 是否启用入场动画 */
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

// 3D 悬停效果
async function handleMouseMove(event: MouseEvent) {
  if (!props.hover3d || prefersReducedMotion() || !cardRef.value) return

  const gsapLib = await loadGsap()
  if (!gsapLib) return

  const card = cardRef.value
  const rect = card.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const rotateX = ((y - centerY) / centerY) * -8
  const rotateY = ((x - centerX) / centerX) * 8

  gsapLib.to(card, {
    rotateX,
    rotateY,
    duration: 0.3,
    ease: 'power2.out',
    transformPerspective: 1000,
  })

  // 光泽跟随鼠标
  if (props.shine && shineRef.value) {
    gsapLib.to(shineRef.value, {
      x: x - rect.width / 2,
      y: y - rect.height / 2,
      duration: 0.3,
      ease: 'power2.out',
    })
  }
}

async function handleMouseEnter() {
  isHovered.value = true

  if (prefersReducedMotion() || !cardRef.value) return

  const gsapLib = await loadGsap()
  if (!gsapLib) return

  // 轻微抬起效果
  gsapLib.to(cardRef.value, {
    y: -4,
    scale: 1.02,
    duration: 0.3,
    ease: 'power2.out',
  })

  // 显示光泽
  if (props.shine && shineRef.value) {
    gsapLib.to(shineRef.value, {
      opacity: 1,
      duration: 0.3,
    })
  }
}

async function handleMouseLeave() {
  isHovered.value = false

  if (prefersReducedMotion() || !cardRef.value) return

  const gsapLib = await loadGsap()
  if (!gsapLib) return

  // 重置变换
  gsapLib.to(cardRef.value, {
    rotateX: 0,
    rotateY: 0,
    y: 0,
    scale: 1,
    duration: 0.5,
    ease: 'elastic.out(1, 0.5)',
  })

  // 隐藏光泽
  if (props.shine && shineRef.value) {
    gsapLib.to(shineRef.value, {
      opacity: 0,
      duration: 0.3,
    })
  }
}

// 入场动画
async function animateEntrance() {
  if (!props.animate || prefersReducedMotion() || !cardRef.value) return

  const gsapLib = await loadGsap()
  if (!gsapLib) return

  gsapLib.fromTo(
    cardRef.value,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
  )
}

onMounted(() => {
  animateEntrance()
})
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
