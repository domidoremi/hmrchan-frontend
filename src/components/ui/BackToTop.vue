<template>
  <Teleport to="body">
    <Transition name="fade-slide">
      <button
        v-if="isVisible"
        class="back-to-top"
        :class="{ 'with-progress': showProgress }"
        :aria-label="$t('common.backToTop', '回到顶部')"
        @click="scrollToTop"
      >
        <svg
          v-if="showProgress"
          class="progress-ring"
          :width="size"
          :height="size"
          viewBox="0 0 36 36"
        >
          <circle class="progress-ring-bg" cx="18" cy="18" r="16" fill="none" stroke-width="2" />
          <circle
            class="progress-ring-indicator"
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke-width="2"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 18 18)"
          />
        </svg>
        <ArrowUp :size="iconSize" class="arrow-icon" />
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowUp } from 'lucide-vue-next'
import { throttleRAF } from '@/utils/performance'

interface Props {
  threshold?: number
  showProgress?: boolean
  size?: number
  iconSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 300,
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
  // 使用现代 scrollTo API 平滑滚动
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
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  right: var(--spacing-6);
  bottom: var(--spacing-6);
  z-index: var(--z-fixed);
  display: flex;
  align-items: center;
  justify-content: center;
  width: v-bind('size + "px"');
  height: v-bind('size + "px"');
  border-radius: 50%;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  will-change: transform, opacity;
}

.back-to-top:hover {
  transform: translateY(-4px);
  background: var(--glass-bg-light);
  box-shadow: var(--shadow-xl);
}

.back-to-top:active {
  transform: translateY(-2px);
}

.back-to-top.with-progress {
  position: relative;
}

.progress-ring {
  position: absolute;
  inset: 0;
  transform: rotate(0deg);
  pointer-events: none;
}

.progress-ring-bg {
  stroke: var(--glass-border);
  opacity: 0.3;
}

.progress-ring-indicator {
  stroke: var(--color-primary);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
}

.arrow-icon {
  position: relative;
  z-index: 1;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .back-to-top {
    right: var(--spacing-4);
    bottom: calc(var(--spacing-4) + 64px); /* 避开底部导航 */
    width: 44px;
    height: 44px;
  }
}

/* Transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s var(--ease-out-cubic);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}
</style>
