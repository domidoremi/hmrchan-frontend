<template>
  <transition name="fade">
    <button
      v-if="visible"
      class="back-to-top"
      @click="scrollToTop"
      :title="$t('common.backToTop')"
      :aria-label="$t('common.backToTop')"
    >
      <ArrowUp :size="24" />
    </button>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ArrowUp } from 'lucide-vue-next'

const visible = ref(false)
const scrollThreshold = 300

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
  handleScroll() // 初始检查
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  bottom: 40px;
  right: 40px;
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

/* Samsung Galaxy S20 Ultra 和类似设备 */
@media (max-width: 768px) {
  .back-to-top {
    bottom: 100px; /* 增加到100px，避免被底部导航遮挡 */
    right: 20px;
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
    bottom: 90px; /* 小屏幕也增加 */
    right: 16px;
    width: 44px;
    height: 44px;
  }

  .back-to-top svg {
    width: 18px;
    height: 18px;
  }
}
</style>
