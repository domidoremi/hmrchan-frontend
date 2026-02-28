<template>
  <Teleport to="body">
    <Transition name="next-fab">
      <button
        v-if="isVisible"
        type="button"
        class="next-post-fab"
        :aria-label="$t('explore.nextPost')"
        @click="scrollToNextPost"
      >
        <span class="next-post-fab__icon">
          <ChevronsDown :size="22" />
        </span>
        <span class="next-post-fab__pulse" />
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineOptions({ name: 'NextPostFab' })

import { ref, onMounted, onUnmounted } from 'vue'
import { ChevronsDown } from 'lucide-vue-next'
import { throttleRAF } from '@/utils/performance'

const props = withDefaults(
  defineProps<{
    containerSelector?: string
    cardSelector?: string
  }>(),
  {
    containerSelector: '.posts-masonry-js',
    cardSelector: '.masonry-column > *',
  }
)

const isVisible = ref(false)
let initVisibilityRaf: number | null = null

function updateVisibility() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  isVisible.value = scrollTop > 100
}

const handleScroll = throttleRAF(updateVisibility)

function scrollToNextPost() {
  const cards = document.querySelectorAll(props.cardSelector)
  if (!cards.length) return

  const container = document.querySelector(props.containerSelector) as HTMLElement | null
  if (!container) return

  const containerTop = container.offsetTop
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const viewHeight = window.innerHeight
  const viewCenter = viewHeight / 2
  const viewportCenterDocY = scrollTop + viewCenter

  // 收集所有卡片的文档流位置并按 top 排序
  const cardEntries = Array.from(cards)
    .map((card) => {
      const el = card as HTMLElement
      const top = containerTop + el.offsetTop
      const height = el.offsetHeight
      return {
        el,
        top,
        height,
      }
    })
    .sort((a, b) => a.top - b.top)

  // 找到第一个位于当前视窗中心下方的卡片
  const next = cardEntries.find((c) => c.top > viewportCenterDocY + 10)

  if (next) {
    // 滚动到卡片中心对齐视口中心
    const cardCenterDocY = next.top + next.height / 2
    const targetScrollTop = Math.max(0, cardCenterDocY - viewCenter)
    window.scrollBy({
      top: targetScrollTop - scrollTop,
      behavior: 'smooth',
    })
  } else {
    // No next card found, scroll down
    window.scrollBy({
      top: viewHeight * 0.75,
      behavior: 'smooth',
    })
  }
}

onMounted(() => {
  initVisibilityRaf = requestAnimationFrame(() => {
    initVisibilityRaf = requestAnimationFrame(() => {
      initVisibilityRaf = null
      updateVisibility()
    })
  })
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  if (initVisibilityRaf !== null) {
    cancelAnimationFrame(initVisibilityRaf)
    initVisibilityRaf = null
  }
  window.removeEventListener('scroll', handleScroll)
  handleScroll.cancel?.()
})
</script>

<style scoped>
.next-post-fab {
  --btn-size: clamp(2.75rem, 5vw, 3.5rem);
  --edge: clamp(1.125rem, 3.4vw, 2.25rem);
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
  .next-post-fab {
    display: flex;
  }
}

.next-post-fab::after {
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

.next-post-fab:hover {
  transform: translate3d(0, -3px, 0);
  border-color: var(--color-primary);
  box-shadow:
    var(--glass-shadow-lg),
    0 0 16px rgba(var(--color-primary-rgb), 0.2);
}

.next-post-fab:active {
  transform: translate3d(0, -1px, 0) scale(0.95);
  transition-duration: 100ms;
}

.next-post-fab:focus-visible {
  outline: none;
  transform: translate3d(0, 0, 0);
  box-shadow:
    var(--glass-shadow),
    0 0 0 3px rgba(var(--color-primary-rgb), 0.3);
}

.next-post-fab:hover:focus-visible {
  transform: translate3d(0, -3px, 0);
  box-shadow:
    var(--glass-shadow-lg),
    0 0 16px rgba(var(--color-primary-rgb), 0.2),
    0 0 0 3px rgba(var(--color-primary-rgb), 0.3);
}

.next-post-fab__icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: next-bounce 2s ease-in-out infinite;
}

.next-post-fab__pulse {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--color-primary);
  opacity: 0;
  pointer-events: none;
}

.next-post-fab:active .next-post-fab__pulse {
  animation: next-pulse-out 400ms var(--ease-out);
}

@keyframes next-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(3px);
  }
}

@keyframes next-pulse-out {
  0% {
    opacity: 0.3;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

.next-fab-enter-active,
.next-fab-leave-active {
  transition:
    opacity 250ms var(--ease-out),
    transform 250ms var(--ease-spring);
}

.next-fab-enter-from {
  opacity: 0;
  transform: translate3d(0, 24px, 0) scale(0.8);
}

.next-fab-leave-to {
  opacity: 0;
  transform: translate3d(0, 16px, 0) scale(0.85);
}

@media (prefers-reduced-motion: reduce) {
  .next-post-fab,
  .next-post-fab__icon {
    transition: none;
    animation: none;
  }
}
</style>
