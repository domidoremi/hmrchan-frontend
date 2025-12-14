<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧品牌展示区域（仅桌面端显示） -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="brand-logo-large">
            <div class="logo-inner">HMR</div>
          </div>
          <h2 class="brand-title">{{ $t('app.name') }}</h2>
          <p class="brand-description">{{ $t('app.description') }}</p>
          <div class="brand-features">
            <div class="feature-item">
              <div class="feature-icon">✨</div>
              <div class="feature-text">{{ $t('auth.features.crossPlatform') }}</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🎯</div>
              <div class="feature-text">{{ $t('auth.features.smartRecommendation') }}</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🔒</div>
              <div class="feature-text">{{ $t('auth.features.secureReliable') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区域 -->
      <div class="form-section">
        <div class="login-card glass-card">
          <!-- 移动端Logo -->
          <div class="mobile-header">
            <div class="brand-logo">HMR</div>
            <h1>{{ $t('auth.login') }}</h1>
          </div>

          <!-- Login Form -->
          <form class="login-form" @submit.prevent="handleLogin">
            <GlassInput
              v-model="formData.username"
              type="text"
              :label="$t('auth.username')"
              :placeholder="$t('auth.username')"
              :icon="User"
              :disabled="loading"
              :error="error && !formData.username ? $t('auth.fillAllFields') : ''"
              clearable
              autocomplete="username"
              required
            />

            <GlassInput
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              :label="$t('auth.password')"
              :placeholder="$t('auth.password')"
              :icon="Lock"
              :disabled="loading"
              :error="error && !formData.password ? $t('auth.fillAllFields') : ''"
              :hint="$t('auth.passwordHint', 'Enter your password')"
              autocomplete="current-password"
              name="password"
              required
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

            <!-- Error Message -->
            <div v-if="error && formData.username && formData.password" class="error-message">
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
      </div>
    </div>

    <!-- Decorative Elements -->
    <div class="decoration decoration-1"></div>
    <div class="decoration decoration-2"></div>
    <div class="decoration decoration-3"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { User, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-vue-next'

import GlassInput from '@/components/ui/Input.vue'
import GlassButton from '@/components/ui/Button.vue'

import { useAuthStore, useToastStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()
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
    success.value = t('auth.loginSuccess')
    toastStore.success(t('auth.loginSuccess'))

    // 等待一小段时间让用户看到成功提示
    setTimeout(async () => {
      // 登录成功后跳转到redirect参数指定的页面，或首页
      const redirectParam = route.query['redirect']
      const redirect =
        typeof redirectParam === 'string' && redirectParam.startsWith('/') ? redirectParam : '/'
      await router.replace(redirect)
    }, 1000)
  } catch (err: unknown) {
    // 清除成功消息
    success.value = ''

    const userMessageKey = (err as { userMessageKey?: unknown }).userMessageKey
    if (typeof userMessageKey === 'string') {
      error.value = t(userMessageKey)
      toastStore.error(error.value)
      return
    }

    const httpError = err as {
      response?: { status?: number }
      responseData?: { error_code?: string; message?: string; details?: unknown }
      message?: string
    }

    const status = httpError.response?.status
    const data = httpError.responseData || {}
    const errorCode = (data as { error_code?: string }).error_code

    if (!status) {
      error.value = t('errors.networkError')
    } else if (status === 401 || errorCode === 'AUTH_1001') {
      // 未认证 / 用户名或密码错误
      error.value = t('auth.invalidCredentials')
    } else if (status === 403 && (errorCode === 'AUTH_1005' || errorCode === 'ACCOUNT_LOCKED')) {
      // 账号被锁定或不可用
      error.value = t('auth.accountLocked')
    } else if (status === 429 || errorCode === 'SECURITY_1604') {
      // 触发速率限制
      error.value = t('auth.tooManyAttempts')
    } else if (status === 400) {
      // 请求参数错误
      error.value = t('auth.invalidInput')
    } else if (status >= 500) {
      // 服务器错误
      error.value = t('auth.serverError')
    } else {
      error.value = t('auth.loginFailedMessage')
    }

    // 显示错误 Toast 通知
    toastStore.error(error.value)
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
  justify-content: center;
  padding-bottom: 0 !important;
  position: relative;
  overflow: hidden;
}

.login-container {
  width: 100%;
  max-width: 1200px;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-2xl);
  padding: var(--spacing-lg);
  position: relative;
  z-index: 1;
}

/* 双列布局 - 桌面端 */
@media (min-width: 1024px) {
  .login-container {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-3xl);
    padding: var(--spacing-2xl);
  }
}

/* 左侧品牌展示区域 */
.brand-section {
  display: none;
}

@media (min-width: 1024px) {
  .brand-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-3xl);
  }

  .brand-content {
    max-width: 480px;
    text-align: center;
  }

  .brand-logo-large {
    width: 120px;
    height: 120px;
    margin: 0 auto var(--spacing-xl);
    background: var(--gradient-primary);
    border-radius: var(--radius-2xl);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
    animation: float 6s ease-in-out infinite;
  }

  .logo-inner {
    color: white;
    font-weight: var(--font-bold);
    font-size: var(--text-4xl);
  }

  .brand-title {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-md);
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .brand-description {
    font-size: var(--text-lg);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-2xl);
    line-height: 1.6;
  }

  .brand-features {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    text-align: left;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--glass-bg-light);
    border-radius: var(--radius-xl);
    border: 1px solid var(--glass-border);
    transition: all var(--transition-fast);
  }

  .feature-item:hover {
    transform: translateX(8px);
    box-shadow: var(--glass-shadow);
  }

  .feature-icon {
    font-size: var(--text-3xl);
    flex-shrink: 0;
  }

  .feature-text {
    font-size: var(--text-base);
    color: var(--color-text-primary);
    font-weight: var(--font-medium);
  }
}

/* 右侧表单区域 */
.form-section {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 100%;
  max-width: 480px;
  padding: var(--spacing-2xl);
  animation: slideUp var(--transition-slow);
}

@media (min-width: 768px) {
  .login-card {
    padding: var(--spacing-3xl);
  }
}

/* 移动端Header */
.mobile-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

@media (min-width: 1024px) {
  .mobile-header {
    display: none;
  }
}

.mobile-header .brand-logo {
  width: 70px;
  height: 70px;
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

.mobile-header h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
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
  .mobile-header .brand-logo {
    width: 60px;
    height: 60px;
    font-size: var(--text-xl);
  }

  .mobile-header h1 {
    font-size: var(--text-xl);
  }
}
</style>
