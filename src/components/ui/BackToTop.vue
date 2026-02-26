<template>
  <Teleport to="body">
    <Transition name="back-to-top">
      <button
        v-if="isVisible"
        type="button"
        class="back-to-top"
        :class="{ 'back-to-top--progress': showProgress }"
        :aria-label="$t('common.backToTop')"
        @click="scrollToTop"
      >
        <svg v-if="showProgress" class="back-to-top__ring" viewBox="0 0 36 36">
          <circle
            class="back-to-top__ring-bg"
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke-width="2"
          />
          <circle
            class="back-to-top__ring-indicator"
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke-width="2.5"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 18 18)"
          />
        </svg>
        <span class="back-to-top__icon">
          <AnimatedIcon name="home" :fallback-icon="ArrowUp" :size="iconSizeToken" />
        </span>
        <span class="back-to-top__pulse" />
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowUp } from 'lucide-vue-next'
import { throttleRAF } from '@/utils/performance'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

defineOptions({ name: 'UiBackToTop' })

interface Props {
  threshold?: number
  showProgress?: boolean
  size?: number
  iconSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 200,
  showProgress: true,
  size: 48,
  iconSize: 20,
})

const isVisible = ref(false)
const scrollProgress = ref(0)

const radius = 16
const circumference = 2 * Math.PI * radius

const dashOffset = computed(() => {
  return circumference * (1 - scrollProgress.value)
})

const iconSizeToken = computed(() => {
  if (props.iconSize <= 16) return 'sm'
  if (props.iconSize <= 20) return 'md'
  if (props.iconSize <= 24) return 'lg'
  return 'xl'
})

function updateScrollState() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight

  isVisible.value = scrollTop > props.threshold

  if (props.showProgress && docHeight > 0) {
    scrollProgress.value = Math.min(scrollTop / docHeight, 1)
  }
}

const handleScroll = throttleRAF(updateScrollState)

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

onMounted(() => {
  updateScrollState()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  handleScroll.cancel?.()
})
</script>

<style scoped>
.back-to-top {
  --btn-size: clamp(2.75rem, 5vw, 3.875rem);
  --edge: clamp(1.125rem, 3.4vw, 2.25rem);
  position: fixed;
  right: var(--edge);
  bottom: calc(var(--edge) + env(safe-area-inset-bottom, 0));
  z-index: var(--z-fixed);
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--btn-size);
  height: var(--btn-size);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--color-foreground);
  box-shadow: var(--glass-shadow);
  cursor: pointer;
  transition-property: transform, background-color, box-shadow, border-color;
  transition-duration: 220ms;
  transition-timing-function: var(--ease-spring);
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.back-to-top::before {
  content: '';
  position: absolute;
  inset: -0.0625rem;
  border-radius: inherit;
  background: var(--gradient-primary);
  opacity: 0;
  z-index: -1;
  transition: opacity 200ms var(--ease-out);
}

.back-to-top::after {
  content: '';
  position: absolute;
  inset: -0.625rem;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.35) 0%, transparent 70%);
  opacity: 0.18;
  filter: blur(12px);
  z-index: -2;
  pointer-events: none;
  animation: back-to-top-glow 6s ease-in-out infinite;
}

.back-to-top:hover {
  transform: translate3d(0, -4px, 0);
  border-color: var(--color-primary);
  box-shadow:
    var(--glass-shadow-lg),
    0 0 20px rgba(var(--color-primary-rgb), 0.2);
}

.back-to-top:hover::before {
  opacity: 0.1;
}

.back-to-top:active {
  transform: translate3d(0, -2px, 0) scale(0.95);
  transition-duration: 100ms;
}

.back-to-top:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.3);
}

.back-to-top__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.back-to-top__ring-bg {
  stroke: var(--glass-border);
  opacity: 0.5;
}

.back-to-top__ring-indicator {
  stroke: var(--color-primary);
  stroke-linecap: round;
  transition: stroke-dashoffset 80ms linear;
  filter: drop-shadow(0 0 4px rgba(var(--color-primary-rgb), 0.4));
}

.back-to-top__icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 200ms var(--ease-spring);
}

.back-to-top:hover .back-to-top__icon {
  transform: translateY(-2px);
}

.back-to-top__pulse {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--color-primary);
  opacity: 0;
  pointer-events: none;
}

.back-to-top:active .back-to-top__pulse {
  animation: pulse-out 400ms var(--ease-out);
}

@keyframes pulse-out {
  0% {
    opacity: 0.3;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes back-to-top-glow {
  0%,
  100% {
    opacity: 0.16;
  }
  50% {
    opacity: 0.28;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .back-to-top {
    bottom: calc(var(--edge) + 4.5rem + env(safe-area-inset-bottom, 0));
  }
}

/* Transition */
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition:
    opacity 250ms var(--ease-out),
    transform 250ms var(--ease-spring);
}

.back-to-top-enter-from {
  opacity: 0;
  transform: translate3d(0, 24px, 0) scale(0.8);
}

.back-to-top-leave-to {
  opacity: 0;
  transform: translate3d(0, 16px, 0) scale(0.85);
}

@media (prefers-reduced-motion: reduce) {
  .back-to-top,
  .back-to-top__icon,
  .back-to-top__ring-indicator {
    transition: none;
  }

  .back-to-top:active .back-to-top__pulse {
    animation: none;
  }

  .back-to-top::after {
    animation: none;
  }
}
</style>
