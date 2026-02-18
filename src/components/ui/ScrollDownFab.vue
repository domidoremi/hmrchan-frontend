<script setup lang="ts">
defineOptions({ name: 'ScrollDownFab' })

import { ref, onMounted, onUnmounted } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { throttleRAF } from '@/utils/performance'

const props = withDefaults(
  defineProps<{
    scrollThreshold?: number
  }>(),
  {
    scrollThreshold: 0,
  }
)

const isVisible = ref(false)

function updateVisibility() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const docHeight = document.documentElement.scrollHeight
  const viewHeight = window.innerHeight
  // Use provided threshold, or fallback to half viewport height
  const threshold = props.scrollThreshold || viewHeight * 0.5
  isVisible.value = scrollTop > threshold && scrollTop + viewHeight < docHeight - 200
}

const handleScroll = throttleRAF(updateVisibility)

function scrollDown() {
  window.scrollBy({
    top: window.innerHeight * 0.75,
    behavior: 'smooth',
  })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  handleScroll.cancel?.()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="scroll-fab">
      <button
        v-if="isVisible"
        type="button"
        class="scroll-down-fab"
        :aria-label="$t('common.loadMore')"
        @click="scrollDown"
      >
        <span class="scroll-down-fab__icon">
          <ChevronDown :size="22" />
        </span>
        <span class="scroll-down-fab__pulse" />
      </button>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scroll-down-fab {
  --btn-size: clamp(44px, 5vw, 56px);
  --edge: clamp(18px, 3.4vw, 36px);
  position: fixed;
  right: var(--edge);
  bottom: calc(var(--edge) + 8rem + env(safe-area-inset-bottom, 0));
  z-index: var(--z-fixed);
  display: none;
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

@media (max-width: 768px) {
  .scroll-down-fab {
    display: flex;
  }
}

.scroll-down-fab::after {
  content: '';
  position: absolute;
  inset: -0.625rem;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.3) 0%, transparent 70%);
  opacity: 0.15;
  filter: blur(10px);
  z-index: -1;
  pointer-events: none;
}

.scroll-down-fab:hover {
  transform: translate3d(0, -3px, 0);
  border-color: var(--color-primary);
  box-shadow:
    var(--glass-shadow-lg),
    0 0 16px rgba(var(--color-primary-rgb), 0.2);
}

.scroll-down-fab:active {
  transform: translate3d(0, -1px, 0) scale(0.95);
  transition-duration: 100ms;
}

.scroll-down-fab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.3);
}

.scroll-down-fab__icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: scroll-bounce 2s ease-in-out infinite;
}

.scroll-down-fab__pulse {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--color-primary);
  opacity: 0;
  pointer-events: none;
}

.scroll-down-fab:active .scroll-down-fab__pulse {
  animation: pulse-out 400ms var(--ease-out);
}

@keyframes scroll-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(3px);
  }
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

/* Transition */
.scroll-fab-enter-active,
.scroll-fab-leave-active {
  transition:
    opacity 250ms var(--ease-out),
    transform 250ms var(--ease-spring);
}

.scroll-fab-enter-from {
  opacity: 0;
  transform: translate3d(0, 24px, 0) scale(0.8);
}

.scroll-fab-leave-to {
  opacity: 0;
  transform: translate3d(0, 16px, 0) scale(0.85);
}

@media (prefers-reduced-motion: reduce) {
  .scroll-down-fab,
  .scroll-down-fab__icon {
    transition: none;
    animation: none;
  }
}
</style>
