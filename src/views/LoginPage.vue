<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card glass-card">
        <!-- Logo -->
        <div class="login-header">
          <div class="brand-logo">HMR</div>
          <h1>{{ $t('app.name') }}</h1>
          <p>{{ $t('app.description') }}</p>
        </div>

        <!-- Login Form -->
        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label>{{ $t('auth.username') }}</label>
            <GlassInput
              v-model="formData.username"
              type="text"
              :placeholder="$t('auth.username')"
              :icon="User"
              :disabled="loading"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label>{{ $t('auth.password') }}</label>
            <GlassInput
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="$t('auth.password')"
              :icon="Lock"
              :disabled="loading"
              autocomplete="current-password"
              name="password"
            >
              <template #suffix>
                <button
                  type="button"
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                  :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')"
                >
                  <Eye v-if="!showPassword" :size="18" />
                  <EyeOff v-else :size="18" />
                </button>
              </template>
            </GlassInput>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="error-message">
            <AlertCircle :size="16" />
            <span>{{ error }}</span>
          </div>

          <!-- Success Message -->
          <div v-if="success" class="success-message">
            <CheckCircle :size="16" />
            <span>{{ success }}</span>
          </div>

          <!-- Submit Button -->
          <GlassButton type="submit" size="lg" :loading="loading" class="login-button">
            {{ $t('auth.login') }}
          </GlassButton>

          <!-- Register Link -->
          <div class="register-link">
            {{ $t('auth.noAccount') }}
            <RouterLink to="/register">{{ $t('auth.registerNow') }}</RouterLink>
          </div>

          <!-- Back to Home -->
          <RouterLink to="/" class="back-link">
            <ArrowLeft :size="16" />
            {{ $t('common.back') }}
          </RouterLink>
        </form>
      </div>

      <!-- Decorative Elements -->
      <div class="decoration decoration-1"></div>
      <div class="decoration decoration-2"></div>
      <div class="decoration decoration-3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { User, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-vue-next'

import GlassInput from '@/components/ui/GlassInput.vue'
import GlassButton from '@/components/ui/GlassButton.vue'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()

const formData = ref({
  username: '',
  password: '',
})

const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

// 移除底部导航栏的padding
onMounted(() => {
  document.body.classList.add('no-bottom-padding')
})

onUnmounted(() => {
  document.body.classList.remove('no-bottom-padding')
})

const handleLogin = async () => {
  if (!formData.value.username || !formData.value.password) {
    error.value = t('auth.fillAllFields')
    success.value = ''
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    await authStore.login(formData.value)
    success.value = t('auth.loginSuccess', 'Login successful! Redirecting...')
    
    // 等待一小段时间让用户看到成功提示
    setTimeout(async () => {
      // 登录成功后跳转到redirect参数指定的页面，或首页
      const redirect = (route.query.redirect as string) || '/'
      await router.replace(redirect)
    }, 1000)
  } catch (err: unknown) {
    const axiosError = err as { response?: { status: number; data?: { detail?: string; message?: string } }; request?: any; message?: string }
    // 清除成功消息
    success.value = ''
    
    // 详细的错误处理
    if (axiosError.response) {
      const status = axiosError.response.status
      const detail = axiosError.response.data?.detail || axiosError.response.data?.message
      
      switch (status) {
        case 401:
          // 认证失败 - 用户名或密码错误
          error.value = t('auth.invalidCredentials', '用户名或密码错误')
          break
          
        case 400:
          // 请求参数错误
          error.value = detail || t('auth.invalidInput', '输入信息有误')
          break
          
        case 404:
          // 用户不存在
          error.value = t('auth.userNotFound', '用户不存在')
          break
          
        case 429:
          // 请求过于频繁
          error.value = t('auth.tooManyAttempts', '登录尝试过于频繁，请稍后再试')
          break
          
        case 500:
        case 502:
        case 503:
          // 服务器错误
          error.value = t('auth.serverError', '服务器暂时无法处理请求，请稍后再试')
          break
          
        default:
          error.value = detail || t('auth.loginFailedMessage', '登录失败，请重试')
      }
    } else if (axiosError.request) {
      // 网络错误
      error.value = t('auth.networkError', '网络连接失败，请检查您的网络')
    } else {
      // 其他错误
      error.value = axiosError.message || t('auth.loginFailedMessage', '登录失败，请重试')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding-bottom: 0 !important; /* 覆盖底部导航栏的padding */
  justify-content: center;
  padding: var(--spacing-lg);
  position: relative;
  overflow: hidden;
}

.login-container {
  width: 100%;
  max-width: 450px;
  position: relative;
  z-index: 1;
}

.login-card {
  padding: var(--spacing-3xl);
  animation: slideUp var(--transition-slow);
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.brand-logo {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  background: var(--gradient-primary);
  border-radius: var(--radius-2xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-bold);
  font-size: var(--text-2xl);
  box-shadow: var(--glass-glow);
}

.login-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.login-header p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.password-toggle {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color var(--transition-fast);
}

.password-toggle:hover {
  color: var(--color-text-primary);
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-lg);
  color: var(--color-error);
  font-size: var(--text-sm);
  animation: slideIn var(--transition-base);
}

.success-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--radius-lg);
  color: #22c55e;
  font-size: var(--text-sm);
  animation: slideIn var(--transition-base);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-button {
  width: 100%;
  margin-top: var(--spacing-md);
}

.register-link {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-md);
}

.register-link a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
  transition: color var(--transition-base);
}

.register-link a:hover {
  color: var(--color-secondary);
  text-decoration: underline;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--text-sm);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-primary);
}

/* Decorative Elements */
.decoration {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
  animation: float 6s ease-in-out infinite;
  pointer-events: none;
}

.decoration-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
  top: -150px;
  right: -150px;
  animation-delay: 0s;
}

.decoration-2 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%);
  bottom: -100px;
  left: -100px;
  animation-delay: 2s;
}

.decoration-3 {
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.3) 0%, transparent 70%);
  top: 50%;
  left: -75px;
  animation-delay: 4s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.1);
  }
}

@media (max-width: 768px) {
  .login-card {
    padding: var(--spacing-xl);
  }

  .brand-logo {
    width: 60px;
    height: 60px;
    font-size: var(--text-xl);
  }
}
</style>
