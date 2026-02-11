<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <!-- Success -->
      <template v-if="resetSuccess">
        <div class="status-icon status-icon--success">
          <CheckCircle :size="40" />
        </div>
        <h1 class="auth-title">{{ $t('email.resetSuccess') }}</h1>
        <p class="auth-subtitle">{{ $t('email.resetSuccessHint') }}</p>
        <Button full-width @click="$router.push('/login')">
          {{ $t('auth.loginButton') }}
        </Button>
      </template>

      <!-- Invalid token -->
      <template v-else-if="!token">
        <div class="status-icon status-icon--error">
          <AlertTriangle :size="40" />
        </div>
        <h1 class="auth-title">{{ $t('email.invalidLink') }}</h1>
        <p class="auth-subtitle">{{ $t('email.invalidResetLinkHint') }}</p>
        <Button full-width @click="$router.push('/forgot-password')">
          {{ $t('email.requestNewLink') }}
        </Button>
      </template>

      <!-- Reset form -->
      <template v-else>
        <div class="auth-badge">
          <span class="auth-badge-dot" />
          <span>{{ $t('auth.secureBadge') }}</span>
        </div>

        <h1 class="auth-title">{{ $t('email.resetPasswordTitle') }}</h1>
        <p class="auth-subtitle">{{ $t('email.resetPasswordHint') }}</p>

        <form class="auth-form" @submit.prevent="handleReset">
          <div class="form-group">
            <label for="new_password">{{ $t('email.newPassword') }}</label>
            <div class="password-field">
              <Input
                id="new_password"
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                class="password-input"
                autocomplete="new-password"
                required
              />
              <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                <EyeOff v-if="showPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
            <!-- Password Strength -->
            <div v-if="newPassword" class="password-strength">
              <div class="strength-bar">
                <div
                  class="strength-fill"
                  :class="`strength-${passwordStrengthResult.level}`"
                  :style="{ width: `${passwordStrengthResult.percentage}%` }"
                />
              </div>
              <span class="strength-text" :class="`strength-${passwordStrengthResult.level}`">
                {{ passwordStrengthText }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirm_password">{{ $t('auth.confirmPassword') }}</label>
            <div class="password-field">
              <Input
                id="confirm_password"
                v-model="confirmPassword"
                :type="showConfirm ? 'text' : 'password'"
                class="password-input"
                autocomplete="new-password"
                required
              />
              <button type="button" class="password-toggle" @click="showConfirm = !showConfirm">
                <EyeOff v-if="showConfirm" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
            <p v-if="confirmPassword && !passwordsMatch" class="field-error">
              {{ $t('auth.passwordMismatch') }}
            </p>
          </div>

          <Button type="submit" :loading="isLoading" :disabled="!canSubmit" full-width>
            {{ $t('email.resetPasswordButton') }}
          </Button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ResetPasswordPage' })

import { ref, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-vue-next'
import { authService, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import { checkPasswordStrength } from '@/utils/crypto'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

const token = computed(() => {
  const t = route.query['token']
  return typeof t === 'string' && t ? t : ''
})

const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const isLoading = ref(false)
const resetSuccess = ref(false)
let redirectTimer: ReturnType<typeof setTimeout> | null = null

const passwordStrengthResult = computed(() => checkPasswordStrength(newPassword.value))
const passwordStrengthText = computed(() => {
  const textMap: Record<string, string> = {
    weak: t('auth.passwordWeak'),
    fair: t('auth.passwordFair'),
    good: t('auth.passwordGood'),
    strong: t('auth.passwordStrong'),
  }
  return textMap[passwordStrengthResult.value.level]
})

const passwordsMatch = computed(() => newPassword.value === confirmPassword.value)

const canSubmit = computed(() => {
  return (
    newPassword.value.length >= 8 &&
    passwordsMatch.value &&
    passwordStrengthResult.value.level !== 'weak'
  )
})

async function handleReset() {
  if (!canSubmit.value) return

  if (newPassword.value.length < 8) {
    toastStore.warning(t('auth.error.passwordTooShort'))
    return
  }

  isLoading.value = true

  try {
    await authService.resetPassword({
      token: token.value,
      new_password: newPassword.value,
    })
    resetSuccess.value = true
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
      // If token expired/invalid, offer to request a new link
      if (err.status === 400 || err.status === 404) {
        if (redirectTimer) {
          clearTimeout(redirectTimer)
        }
        redirectTimer = setTimeout(() => router.push('/forgot-password'), 2000)
      }
    } else {
      toastStore.error(t('auth.error.unknown'))
    }
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  if (redirectTimer) {
    clearTimeout(redirectTimer)
    redirectTimer = null
  }
})
</script>

<style scoped>
.auth-page {
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3);
}

.auth-card {
  width: 100%;
  max-width: min(90vw, 23.75rem);
  padding: var(--spacing-5);
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
  box-shadow:
    0 16px 40px -24px rgba(15, 23, 42, 0.4),
    0 6px 20px -12px rgba(15, 23, 42, 0.35);
}

@media (min-width: 640px) {
  .auth-card {
    padding: var(--spacing-6);
  }
}

.auth-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-text-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  width: fit-content;
  margin-bottom: var(--spacing-3);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.auth-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.6);
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  margin: 0 auto var(--spacing-4);
}

.status-icon--success {
  background: rgba(var(--color-success-rgb, 34, 197, 94), 0.1);
  color: var(--color-success);
}

.status-icon--error {
  background: rgba(var(--color-error-rgb, 239, 68, 68), 0.1);
  color: var(--color-error);
}

.auth-title {
  font-size: var(--text-xl);
  text-align: center;
  margin-bottom: var(--spacing-1);
}

@media (min-width: 640px) {
  .auth-title {
    font-size: var(--text-2xl);
  }
}

.auth-subtitle {
  text-align: center;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-4);
  font-size: var(--text-sm);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 44px;
}

.password-toggle {
  position: absolute;
  right: var(--spacing-3);
  height: 32px;
  width: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
}

.password-toggle:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
}

.field-error {
  font-size: var(--text-sm);
  color: var(--color-error);
  margin: 0;
}

/* Password Strength */
.password-strength {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition:
    width 0.3s ease,
    background 0.3s ease;
}

.strength-fill.strength-weak {
  background: var(--color-error);
}
.strength-fill.strength-fair {
  background: var(--color-warning, #f59e0b);
}
.strength-fill.strength-good {
  background: var(--color-info, #3b82f6);
}
.strength-fill.strength-strong {
  background: var(--color-success);
}

.strength-text {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  min-width: 2.5rem;
}

.strength-text.strength-weak {
  color: var(--color-error);
}
.strength-text.strength-fair {
  color: var(--color-warning, #f59e0b);
}
.strength-text.strength-good {
  color: var(--color-info, #3b82f6);
}
.strength-text.strength-strong {
  color: var(--color-success);
}
</style>
