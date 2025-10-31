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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-vue-next'

import GlassInput from '@/components/ui/GlassInput.vue'
import GlassButton from '@/components/ui/GlassButton.vue'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const formData = ref({
  username: '',
  password: '',
})

const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!formData.value.username || !formData.value.password) {
    error.value = t('auth.fillAllFields')
    return
  }

  loading.value = true
  error.value = ''

  try {
    await authStore.login(formData.value)
    router.push('/')
  } catch (err: any) {
    error.value = err.response?.data?.message || t('auth.loginFailedMessage')
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
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
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
