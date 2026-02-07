<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <!-- Success state: email sent -->
      <template v-if="emailSent">
        <div class="status-icon status-icon--success">
          <Mail :size="40" />
        </div>
        <h1 class="auth-title">{{ $t('email.resetEmailSent') }}</h1>
        <p class="auth-subtitle">{{ $t('email.resetEmailSentHint', { email: maskedEmail }) }}</p>
        <div class="action-group">
          <Button variant="ghost" full-width :disabled="resendCooldown > 0" @click="handleSubmit">
            {{
              resendCooldown > 0
                ? $t('email.resendCooldown', { seconds: resendCooldown })
                : $t('email.resend')
            }}
          </Button>
          <RouterLink to="/login" class="auth-link">
            {{ $t('email.backToLogin') }}
          </RouterLink>
        </div>
      </template>

      <!-- Form state -->
      <template v-else>
        <div class="auth-header">
          <button type="button" class="back-btn glass-button" @click="$router.back()">
            <ArrowLeft :size="18" />
          </button>
        </div>

        <h1 class="auth-title">{{ $t('email.forgotPasswordTitle') }}</h1>
        <p class="auth-subtitle">{{ $t('email.forgotPasswordHint') }}</p>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="email">{{ $t('auth.email') }}</label>
            <Input
              id="email"
              v-model="email"
              type="email"
              :placeholder="$t('email.emailPlaceholder')"
              autocomplete="email"
              required
            />
          </div>

          <div v-if="turnstileEnabled" class="turnstile-block">
            <div class="turnstile-header">
              <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
              <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
            </div>
            <TurnstileWidget
              ref="turnstileRef"
              :site-key="turnstileSiteKey"
              action="forgot-password"
              @verify="handleTurnstileVerify"
              @expire="handleTurnstileExpire"
              @error="handleTurnstileError"
            />
          </div>

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="turnstileEnabled && !turnstileToken"
            full-width
          >
            {{ $t('email.sendResetLink') }}
          </Button>
        </form>

        <p class="auth-footer">
          {{ $t('email.rememberPassword') }}
          <RouterLink to="/login">{{ $t('nav.login') }}</RouterLink>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Mail } from 'lucide-vue-next'
import { authService, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'

const { t } = useI18n()
const toastStore = useToastStore()

const email = ref('')
const isLoading = ref(false)
const emailSent = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
const turnstileEnabled = turnstileSiteKey.length > 0
const turnstileToken = ref<string | null>(null)
const turnstileRef = ref<{ reset: () => void; getResponse: () => string | undefined } | null>(null)

const maskedEmail = ref('')

function maskEmail(raw: string): string {
  const parts = raw.split('@')
  const local = parts[0] ?? ''
  const domain = parts[1]
  if (!domain) return raw
  const visible = local.length <= 2 ? local : local.slice(0, 2)
  return `${visible}***@${domain}`
}

function startCooldown() {
  resendCooldown.value = 60
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

async function handleSubmit() {
  if (!email.value) {
    toastStore.warning(t('auth.emailRequired'))
    return
  }

  if (turnstileEnabled && !turnstileToken.value) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    return
  }

  isLoading.value = true

  try {
    await authService.requestPasswordReset({
      email: email.value,
      ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
    })
    maskedEmail.value = maskEmail(email.value)
    emailSent.value = true
    startCooldown()
  } catch (err) {
    if (err instanceof ApiError) {
      // For security, still show success to avoid email enumeration
      if (err.status === 404 || err.status === 422) {
        maskedEmail.value = maskEmail(email.value)
        emailSent.value = true
        startCooldown()
      } else {
        toastStore.error(err.message)
      }
    } else {
      toastStore.error(t('auth.error.unknown'))
    }
    turnstileToken.value = null
    turnstileRef.value?.reset()
  } finally {
    isLoading.value = false
  }
}

function handleTurnstileVerify(token: string) {
  turnstileToken.value = token
}

function handleTurnstileExpire() {
  turnstileToken.value = null
}

function handleTurnstileError() {
  turnstileToken.value = null
  toastStore.error(t('auth.error.turnstileFailed'))
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3);
}

.auth-card {
  width: 100%;
  max-width: 380px;
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

.auth-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.back-btn {
  padding: var(--spacing-2);
  border-radius: var(--radius-full);
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

.turnstile-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  background: rgba(var(--color-surface-rgb), 0.6);
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
}

.turnstile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.turnstile-title {
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.turnstile-hint {
  font-variant-numeric: tabular-nums;
}

.auth-footer {
  text-align: center;
  margin-top: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.auth-footer a {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.auth-footer a:hover {
  text-decoration: underline;
}

.action-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.auth-link {
  font-size: var(--text-sm);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.auth-link:hover {
  text-decoration: underline;
}
</style>
