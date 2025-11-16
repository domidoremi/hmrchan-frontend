<template>
  <transition name="fade">
    <button v-if="visible" class="back-to-top" :style="{ bottom: dynamicBottom }" @click="scrollToTop"
      :title="$t('common.backToTop')" :aria-label="$t('common.backToTop')">
      <ArrowUp :size="24" />
    </button>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowUp } from 'lucide-vue-next'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'

const visible = ref(false)
const scrollThreshold = 300

const { safeAreaBottom, isMobile } = useResponsiveLayout()

// 动态计算bottom值：底部导航栏高度 + 额外间距
const dynamicBottom = computed(() => {
  return `${safeAreaBottom.value + (isMobile.value ? 12 : 32)}px`
})

const handleScroll = () => {
  visible.value = window.pageYOffset > scrollThreshold
}

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
  z-index: 999;
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
