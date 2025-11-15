<template>
  <!-- 不再在页面上显示，改用Toast通知 -->
  <div class="access-limit-indicator">
    <!-- 小气泡指示器 -->
    <Transition name="fade">
      <button v-if="shouldShowIndicator" class="access-bubble" :class="{ 'bubble-warning': isNearLimit }"
        @click="showDetails" :aria-label="$t('access.viewDetails')">
        <div class="bubble-icon">
          <Info v-if="!isNearLimit" :size="16" />
          <AlertCircle v-else :size="16" />
        </div>
        <div class="bubble-text">
          <span class="bubble-count">{{ currentCount }}/{{ totalLimit }}</span>
        </div>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Info, AlertCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

interface Props {
  currentCount: number
  totalLimit: number
  showProgress?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showProgress: true,
})

const router = useRouter()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.user?.is_admin ?? false)

const progress = computed(() => {
  if (props.totalLimit === 0 || props.totalLimit === Infinity) return 0
  return Math.min((props.currentCount / props.totalLimit) * 100, 100)
})

const isNearLimit = computed(() => {
  return progress.value >= 80
})

const shouldShowIndicator = computed(() => {
  // 未登录用户：显示气泡
  if (!isAuthenticated.value) return true

  // 已登录非管理员：接近限制时显示
  if (!isAdmin.value) return isNearLimit.value

  // 管理员：不显示
  return false
})

// 点击气泡显示详细信息
const showDetails = () => {
  // 使用Toast显示详细信息
  if (!isAuthenticated.value) {
    router.push('/login')
  }
}

</script>

<style scoped>
.access-limit-indicator {
  position: fixed;
  bottom: var(--spacing-6);
  right: var(--spacing-6);
  z-index: 1000;
}

.access-bubble {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: var(--radius-full);
  box-shadow:
    0 4px 12px rgba(139, 92, 246, 0.2),
    0 2px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all var(--transition-fast);
}

[data-theme='dark'] .access-bubble {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(139, 92, 246, 0.4);
}

.access-bubble:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 16px rgba(139, 92, 246, 0.3),
    0 3px 8px rgba(0, 0, 0, 0.15);
}

.access-bubble.bubble-warning {
  border-color: rgba(245, 158, 11, 0.5);
  box-shadow:
    0 4px 12px rgba(245, 158, 11, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.1);
}

.bubble-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.bubble-warning .bubble-icon {
  color: var(--color-warning);
}

.bubble-text {
  display: flex;
  flex-direction: column;
}

.bubble-count {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.fade-enter-active,
.fade-leave-active {
  transition: all var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .access-limit-indicator {
    bottom: calc(72px + var(--spacing-2));
    right: var(--spacing-4);
  }
}
</style>
