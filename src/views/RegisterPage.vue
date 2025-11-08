<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card glass-card">
        <!-- Logo -->
        <div class="register-header">
          <div class="brand-logo">HMR</div>
          <h1>{{ $t('auth.registerTitle') }}</h1>
          <p>{{ $t('auth.registerDescription') }}</p>
        </div>

        <!-- Register Form -->
        <form class="register-form" @submit.prevent="handleRegister">
          <div class="form-group">
            <label>{{ $t('auth.username') }} *</label>
            <GlassInput
              v-model="formData.username"
              type="text"
              :placeholder="$t('auth.usernamePlaceholder')"
              :icon="User"
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <label>{{ $t('auth.email') }} *</label>
            <GlassInput
              v-model="formData.email"
              type="email"
              :placeholder="$t('auth.emailPlaceholder')"
              :icon="Mail"
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <label>{{ $t('auth.fullName') }} ({{ $t('profile.notSet') }})</label>
            <GlassInput
              v-model="formData.full_name"
              type="text"
              :placeholder="$t('auth.fullNamePlaceholder')"
              :icon="UserCircle"
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <label>{{ $t('auth.password') }} *</label>
            <GlassInput
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="$t('auth.passwordPlaceholder')"
              :icon="Lock"
              :disabled="loading"
              autocomplete="new-password"
              name="password"
            >
              <template #suffix>
                <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                  <Eye v-if="!showPassword" :size="18" />
                  <EyeOff v-else :size="18" />
                </button>
              </template>
            </GlassInput>
          </div>

          <div class="form-group">
            <label>{{ $t('auth.confirmPassword') }} *</label>
            <GlassInput
              v-model="formData.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :placeholder="$t('auth.confirmPasswordPlaceholder')"
              :icon="Lock"
              :disabled="loading"
              autocomplete="new-password"
              name="confirm-password"
            >
              <template #suffix>
                <button
                  type="button"
                  class="password-toggle"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <Eye v-if="!showConfirmPassword" :size="18" />
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
          <GlassButton type="submit" size="lg" :loading="loading" class="register-button">
            {{ $t('auth.registerButton') }}
          </GlassButton>

          <!-- Login Link -->
          <div class="login-link">
            {{ $t('auth.hasAccount') }}
            <RouterLink to="/login">{{ $t('auth.loginNow') }}</RouterLink>
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
import {
  User,
  Mail,
  UserCircle,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-vue-next'

import GlassInput from '@/components/ui/GlassInput.vue'
import GlassButton from '@/components/ui/GlassButton.vue'

import { useAuthStore } from '@/stores/auth'
import { useErrorHandler } from '@/utils/errorHandler'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const { handleError } = useErrorHandler('RegisterPage')
const toastStore = useToastStore()

const formData = ref({
  username: '',
  email: '',
  full_name: '',
  password: '',
  confirmPassword: '',
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

async function handleRegister() {
  error.value = ''

  // 验证输入
  if (!formData.value.username || !formData.value.email || !formData.value.password) {
    error.value = t('auth.fillAllFields')
    return
  }

  if (formData.value.username.length < 3 || formData.value.username.length > 50) {
    error.value = t('auth.usernameLength')
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.value.email)) {
    error.value = t('auth.invalidEmail')
    return
  }

  if (formData.value.password.length < 8) {
    error.value = t('auth.passwordLength')
    return
  }

  if (formData.value.password !== formData.value.confirmPassword) {
    error.value = t('auth.passwordMismatch')
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    await authStore.register({
      username: formData.value.username,
      email: formData.value.email,
      password: formData.value.password,
      full_name: formData.value.full_name || undefined,
    })

    success.value = t('auth.registrationSuccess')
    toastStore.success(t('auth.registrationSuccess'))

    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (err) {
    const errorResponse = err as { response?: { data?: { detail?: string } } }
    const errorMsg =
      errorResponse.response?.data?.detail || authStore.error || t('auth.registrationFailed')
    error.value = errorMsg
    handleError(err, { customMessage: errorMsg })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  position: relative;
  overflow: hidden;
}

.register-container {
  width: 100%;
  max-width: 450px;
  position: relative;
  z-index: 1;
}

.register-card {
  padding: var(--spacing-3xl);
  animation: slideUp var(--transition-slow);
}

.register-header {
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

.register-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.register-header p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.register-form {
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
}

.success-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--radius-lg);
  color: #16a34a;
  font-size: var(--text-sm);
}

.register-button {
  width: 100%;
  margin-top: var(--spacing-md);
}

.login-link {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-md);
}

.login-link a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
  transition: color var(--transition-base);
}

.login-link a:hover {
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
  .register-card {
    padding: var(--spacing-xl);
  }

  .brand-logo {
    width: 60px;
    height: 60px;
    font-size: var(--text-xl);
  }
}
</style>
