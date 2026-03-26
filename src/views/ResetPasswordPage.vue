<template>
  <div class="auth-page auth-page--reset">
    <div class="auth-card auth-card--stack">
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
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
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
              <button
                type="button"
                class="password-toggle"
                :aria-label="showConfirm ? $t('common.hide') : $t('common.show')"
                :aria-pressed="showConfirm"
                @click="showConfirm = !showConfirm"
              >
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
.auth-card {
  justify-items: stretch;
}

.auth-badge {
  justify-self: start;
}

.status-icon,
.auth-title,
.auth-subtitle {
  justify-self: center;
  text-align: center;
}

.auth-subtitle {
  margin: 0;
}

.field-error {
  margin: 0;
}
</style>
