<template>
  <transition name="fade">
    <button v-if="visible" class="back-to-top" :style="{ bottom: dynamicBottom }" @click="scrollToTop"
      :title="$t('common.backToTop')" :aria-label="$t('common.backToTop')">
      <ArrowUp :size="24" />
    </button>
  </transition>
</template>

<script setup lang="ts">
/**
 * BackToTop 返回顶部按钮组件
 *
 * 功能描述：
 * - 页面滚动超过阈值时显示返回顶部按钮
 * - 点击按钮平滑滚动到页面顶部
 * - 根据设备类型和安全区域动态调整按钮位置
 * - 支持响应式设计，在不同设备上显示不同尺寸
 *
 * @example
 * <BackToTop />
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowUp } from 'lucide-vue-next'
import { useResponsive } from '@/composables'

/** 按钮是否可见 */
const visible = ref(false)

/** 显示按钮的滚动阈值（像素） */
const scrollThreshold = 300

const { safeAreaBottom, isMobile } = useResponsive()

/**
 * 动态计算按钮的 bottom 位置
 * 考虑底部导航栏高度和设备类型
 */
const dynamicBottom = computed(() => {
  return `${safeAreaBottom.value + (isMobile.value ? 12 : 32)}px`
})

/**
 * 处理页面滚动事件
 * 根据滚动位置控制按钮显示/隐藏
 */
const handleScroll = () => {
  visible.value = window.pageYOffset > scrollThreshold
}

/**
 * 平滑滚动到页面顶部
 */
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  /* bottom 由动态计算提供 */
  right: clamp(16px, 4vw, 40px);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), var(--glass-glow);
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  transition: all 0.3s ease;
}

.back-to-top:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: var(--shadow-xl), var(--glass-glow);
  background: var(--glass-bg-hover);
}

.back-to-top:active {
  transform: translateY(-2px) scale(1);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

/* 平板端优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .back-to-top {
    width: 52px;
    height: 52px;
    right: clamp(24px, 5vw, 36px);
  }

  .back-to-top svg {
    width: 22px;
    height: 22px;
  }
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .back-to-top {
    /* bottom 由动态计算提供 */
    width: 48px;
    height: 48px;
  }

  .back-to-top svg {
    width: 20px;
    height: 20px;
  }
}

@media (max-width: 480px) {
  .back-to-top {
    /* bottom 由动态计算提供 */
    width: 44px;
    height: 44px;
  }

  .back-to-top svg {
    width: 18px;
    height: 18px;
  }
}
</style>
