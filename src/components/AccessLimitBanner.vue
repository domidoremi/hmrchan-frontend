<template>
  <div v-if="shouldShow" class="access-limit-banner glass-card">
    <div class="banner-content">
      <!-- Icon -->
      <div class="banner-icon">
        <Info v-if="!isNearLimit" :size="24" />
        <AlertCircle v-else :size="24" class="warning" />
      </div>

      <!-- Message -->
      <div class="banner-message">
        <h4>{{ title }}</h4>
        <p>{{ message }}</p>
      </div>

      <!-- Action -->
      <div v-if="!isAuthenticated" class="banner-action">
        <GlassButton @click="goToLogin" size="sm">
          <LogIn :size="18" />
          {{ $t('nav.login') }}
        </GlassButton>
        <GlassButton @click="goToRegister" variant="primary" size="sm">
          <UserPlus :size="18" />
          {{ $t('nav.register') }}
        </GlassButton>
      </div>

      <!-- 升级会员功能暂未实现，暂时隐藏 -->
      <!-- <div v-else-if="!isAdmin" class="banner-action">
        <GlassButton @click="goToUpgrade" variant="primary" size="sm">
          <Crown :size="18" />
          {{ $t('user.upgrade') }}
        </GlassButton>
      </div> -->
    </div>

    <!-- Progress Bar -->
    <div v-if="showProgress" class="progress-bar">
      <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Info, AlertCircle, LogIn, UserPlus } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import GlassButton from './ui/GlassButton.vue'

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

const shouldShow = computed(() => {
  // 未登录用户：总是显示
  if (!isAuthenticated.value) return true

  // 已登录非管理员：接近限制时显示
  if (!isAdmin.value) return isNearLimit.value

  // 管理员：不显示
  return false
})

const title = computed(() => {
  if (!isAuthenticated.value) {
    return '访客模式'
  }

  if (isNearLimit.value) {
    return '接近访问限制'
  }

  return '内容访问'
})

const message = computed(() => {
  const remaining = props.totalLimit - props.currentCount

  if (!isAuthenticated.value) {
    return `您正在查看最新 ${props.totalLimit} 条内容，登录后可查看更多精彩内容`
  }

  if (isNearLimit.value) {
    return `还可以查看 ${remaining} 条内容，升级会员解锁全部内容`
  }

  return `已加载 ${props.currentCount}/${props.totalLimit} 条内容`
})

const goToLogin = () => {
  router.push('/login')
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.access-limit-banner {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.banner-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.2);
  color: var(--color-primary);
}

.banner-icon .warning {
  color: var(--color-warning);
}

.banner-message {
  flex: 1;
}

.banner-message h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.banner-message p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.banner-action {
  display: flex;
  gap: 0.75rem;
}

.progress-bar {
  margin-top: 1rem;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  transition: width 0.3s ease;
}

@media (max-width: 768px) {
  .banner-content {
    flex-direction: column;
    text-align: center;
  }

  .banner-action {
    width: 100%;
    flex-direction: column;
  }

  .banner-action button {
    width: 100%;
  }
}
</style>
