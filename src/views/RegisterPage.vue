<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <div class="auth-header">
        <button
          type="button"
          class="back-btn glass-button"
          :aria-label="$t('common.back')"
          @click="handleBack"
        >
          <ArrowLeft :size="18" />
        </button>
      </div>

      <h1 class="auth-title">{{ $t('auth.registerTitle') }}</h1>
      <p class="auth-subtitle">{{ $t('auth.registerSubtitle') }}</p>

      <!-- Step indicator -->
      <div
        class="step-indicator"
        role="progressbar"
        :aria-valuenow="step === 'email' ? 1 : 2"
        aria-valuemin="1"
        aria-valuemax="2"
      >
        <div class="step" :class="{ active: true, done: step === 'register' }">
          <span class="step-num">1</span>
          <span class="step-label">{{ $t('auth.stepEmail') }}</span>
        </div>
        <div class="step-line" :class="{ active: step === 'register' }" />
        <div class="step" :class="{ active: step === 'register' }">
          <span class="step-num">2</span>
          <span class="step-label">{{ $t('auth.stepRegister') }}</span>
        </div>
      </div>

      <!-- Step 1: Email + Turnstile → Send code -->
      <Transition name="step-fade" mode="out-in">
        <form
          v-if="step === 'email'"
          key="step-email"
          class="auth-form"
          @submit.prevent="handleSendCode"
        >
          <p class="auth-helper">{{ $t('auth.registerEmailHint') }}</p>

          <div class="form-group">
            <label for="reg-email">{{ $t('auth.email') }}</label>
            <Input
              id="reg-email"
              v-model="email"
              type="email"
              :placeholder="$t('auth.emailPlaceholder')"
              autocomplete="email"
              :error="!!emailError"
              required
            />
            <p v-if="emailError" class="field-error">{{ emailError }}</p>
          </div>

          <div v-if="turnstileEnabled && forceTurnstileForSend" class="turnstile-block">
            <div class="turnstile-header">
              <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
              <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
            </div>
            <TurnstileWidget
              ref="turnstileRef"
              :site-key="turnstileSiteKey"
              action="register"
              @verify="handleTurnstileVerify"
              @expire="handleTurnstileExpire"
              @error="handleTurnstileError"
            />
          </div>

          <Button
            type="submit"
            :loading="isSendingCode"
            :disabled="
              !email || (turnstileEnabled && forceTurnstileForSend && !isTurnstileTokenFresh())
            "
            full-width
          >
            {{ $t('auth.sendCodeButton') }}
          </Button>
        </form>

        <!-- Step 2: Username + Password + Code → Register -->
        <form v-else key="step-register" class="auth-form" @submit.prevent="handleRegister">
          <div class="code-sent-banner">
            <Mail :size="16" />
            <span>{{ $t('auth.codeSentBanner', { email: maskedEmail }) }}</span>
          </div>

          <div class="form-group">
            <label for="reg-username">{{ $t('auth.username') }}</label>
            <Input
              id="reg-username"
              v-model="username"
              type="text"
              :placeholder="$t('auth.usernamePlaceholder')"
              autocomplete="username"
              required
            />
            <p class="field-hint">{{ $t('auth.usernameHint') }}</p>
          </div>

          <div class="form-group">
            <label for="reg-password">{{ $t('auth.password') }}</label>
            <div class="password-field">
              <Input
                id="reg-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="$t('auth.passwordPlaceholder')"
                class="password-input"
                autocomplete="new-password"
                required
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
                @click="showPassword = !showPassword"
              >
                <component :is="showPassword ? EyeOff : Eye" :size="16" />
              </button>
            </div>
            <p class="field-hint">{{ $t('auth.passwordRequirement') }}</p>
            <!-- Password Strength Indicator -->
            <div v-if="password" class="password-strength">
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
            <ul
              v-if="password && passwordStrengthResult.suggestions.length > 0"
              class="password-suggestions"
            >
              <li v-for="suggestion in passwordStrengthResult.suggestions" :key="suggestion">
                {{ suggestion }}
              </li>
            </ul>
          </div>

          <div class="form-group">
            <label for="reg-confirm-password">{{ $t('auth.confirmPassword') }}</label>
            <div class="password-field">
              <Input
                id="reg-confirm-password"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                :placeholder="$t('auth.confirmPasswordPlaceholder')"
                class="password-input"
                autocomplete="new-password"
                :error="!!confirmPassword && password !== confirmPassword"
                required
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showConfirmPassword ? $t('common.hide') : $t('common.show')"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <component :is="showConfirmPassword ? EyeOff : Eye" :size="16" />
              </button>
            </div>
            <p v-if="confirmPassword && password !== confirmPassword" class="field-error">
              {{ $t('auth.passwordMismatch') }}
            </p>
          </div>

          <div class="form-group">
            <label>{{ $t('auth.verificationCode') }}</label>
            <EmailCodeInput
              ref="codeInputRef"
              :disabled="isLoading"
              :error="codeError"
              @complete="handleCodeComplete"
            />
            <div class="resend-row">
              <button
                type="button"
                class="resend-btn"
                :disabled="resendCooldown > 0 || isSendingCode"
                @click="handleResendCode"
              >
                <span v-if="isSendingCode" class="spinner spinner-xs" />
                {{
                  resendCooldown > 0
                    ? $t('emailCode.resendCooldown', { seconds: resendCooldown })
                    : $t('emailCode.resend')
                }}
              </button>
              <button type="button" class="change-email-btn" @click="goBackToEmail">
                {{ $t('auth.changeEmail') }}
              </button>
            </div>
          </div>

          <div v-if="turnstileEnabled && !hasValidRegisterToken()" class="turnstile-block">
            <div class="turnstile-header">
              <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
              <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
            </div>
            <TurnstileWidget
              ref="turnstileRef"
              :site-key="turnstileSiteKey"
              action="register"
              @verify="handleTurnstileVerify"
              @expire="handleTurnstileExpire"
              @error="handleTurnstileError"
            />
          </div>

          <Button
            type="submit"
            :loading="isLoading"
            :disabled="
              verificationCode.length !== 6 ||
              (!!confirmPassword && password !== confirmPassword) ||
              (turnstileEnabled && !hasValidRegisterToken() && !isTurnstileTokenFresh())
            "
            full-width
          >
            {{ $t('auth.registerButton') }}
          </Button>
        </form>
      </Transition>

      <p class="auth-footer">
        {{ $t('auth.hasAccount') }}
        <RouterLink to="/login">{{ $t('nav.login') }}</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RegisterPage' })

import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore, useToastStore } from '@/stores'
import { authService, ApiError } from '@/api'
import { useI18n } from 'vue-i18n'
import { Mail, ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'
import { checkPasswordStrength } from '@/utils/crypto'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import EmailCodeInput from '@/components/ui/EmailCodeInput.vue'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isLoading, isAuthenticated } = storeToRefs(authStore)

type Step = 'email' | 'register'
const step = ref<Step>('email')

const email = ref('')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const verificationCode = ref('')
const codeError = ref(false)
const isSendingCode = ref(false)
const registerToken = ref<string | null>(null)
const registerTokenExpiresAt = ref<number | null>(null)
const forceTurnstileForSend = ref(false)

const codeInputRef = ref<InstanceType<typeof EmailCodeInput> | null>(null)
const emailError = ref('')

// Clear email error when user types
watch(email, () => {
  emailError.value = ''
})

// Password strength
const passwordStrengthResult = computed(() => checkPasswordStrength(password.value))
const passwordStrengthText = computed(() => {
  const textMap: Record<string, string> = {
    weak: t('auth.passwordWeak'),
    fair: t('auth.passwordFair'),
    good: t('auth.passwordGood'),
    strong: t('auth.passwordStrong'),
  }
  return textMap[passwordStrengthResult.value.level]
})

// Turnstile
const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
const turnstileEnabled = turnstileSiteKey.length > 0
const turnstileToken = ref<string | null>(null)
const turnstileIssuedAt = ref<number | null>(null)
const turnstileRef = ref<{ reset: () => void; getResponse: () => string | undefined } | null>(null)

// Resend cooldown
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const maskedEmail = computed(() => {
  if (!email.value) return ''
  const parts = email.value.split('@')
  const local = parts[0] ?? ''
  const domain = parts[1]
  if (!domain) return email.value
  const visible = local.length <= 2 ? local : local.slice(0, 2)
  return `${visible}***@${domain}`
})

// Email format regex (basic check)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 如果已登录，重定向到首页
if (isAuthenticated.value) {
  router.replace('/')
}

function handleBack() {
  if (step.value === 'register') {
    goBackToEmail()
    return
  }
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
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

// Cleanup cooldown timer on unmount
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})

/** Step 1: Send registration code */
function setRegisterToken(token?: string, expiresIn?: number) {
  if (!token) {
    registerToken.value = null
    registerTokenExpiresAt.value = null
    return
  }
  registerToken.value = token
  registerTokenExpiresAt.value = Date.now() + (expiresIn ?? 600) * 1000
}

function hasValidRegisterToken() {
  if (!registerToken.value || !registerTokenExpiresAt.value) return false
  return Date.now() < registerTokenExpiresAt.value
}

function isTurnstileRequiredError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  const code = error.code?.toString().toLowerCase() || ''
  const message = error.message?.toLowerCase() || ''
  return code.includes('turnstile') || message.includes('turnstile')
}

async function handleSendCode() {
  emailError.value = ''
  const trimmedEmail = email.value.trim()
  if (!trimmedEmail) {
    emailError.value = t('auth.emailRequired')
    return
  }
  if (!emailRegex.test(trimmedEmail)) {
    emailError.value = t('auth.error.invalidEmail')
    return
  }
  if (turnstileEnabled && forceTurnstileForSend.value && !isTurnstileTokenFresh()) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    return
  }

  isSendingCode.value = true
  try {
    const response = await authService.sendRegistrationCode({
      email: trimmedEmail,
      ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
    })
    setRegisterToken(response.register_token, response.expires_in)
    toastStore.success(t('emailCode.codeSent'))
    step.value = 'register'
    startCooldown()
    forceTurnstileForSend.value = false
    if (turnstileEnabled) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }
  } catch (err) {
    turnstileToken.value = null
    turnstileIssuedAt.value = null
    turnstileRef.value?.reset()
    if (err instanceof ApiError) {
      if (isTurnstileRequiredError(err)) {
        forceTurnstileForSend.value = true
        toastStore.warning(t('auth.error.turnstileRequired'))
        return
      }
      if (err.status === 429) {
        toastStore.error(t('emailCode.tooManyRequests'))
      } else if (err.code === 'EMAIL_EXISTS' || err.status === 409) {
        emailError.value = t('auth.error.emailExists')
      } else if (err.status === 400) {
        emailError.value = err.message || t('error.badRequest')
      } else {
        toastStore.error(err.message)
      }
    } else {
      toastStore.error(t('emailCode.sendFailed'))
    }
  } finally {
    isSendingCode.value = false
  }
}

/** Resend code from step 2 */
async function handleResendCode() {
  // 如果启用了 Turnstile，需要重新验证
  const trimmedEmail = email.value.trim()
  if (!trimmedEmail) {
    toastStore.warning(t('auth.emailRequired'))
    return
  }
  if (!emailRegex.test(trimmedEmail)) {
    toastStore.warning(t('auth.error.invalidEmail'))
    return
  }
  if (turnstileEnabled && forceTurnstileForSend.value && !isTurnstileTokenFresh()) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    return
  }

  isSendingCode.value = true
  try {
    const response = await authService.sendRegistrationCode({
      email: trimmedEmail,
      ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
    })
    setRegisterToken(response.register_token, response.expires_in)
    toastStore.success(t('emailCode.codeSent'))
    startCooldown()
    codeError.value = false
    codeInputRef.value?.reset()
    forceTurnstileForSend.value = false
    // 重置 Turnstile token，要求用户重新验证
    if (turnstileEnabled) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }
  } catch (err) {
    // 重置 Turnstile token
    if (turnstileEnabled) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }
    if (err instanceof ApiError) {
      if (isTurnstileRequiredError(err)) {
        forceTurnstileForSend.value = true
        toastStore.warning(t('auth.error.turnstileRequired'))
        return
      }
      if (err.status === 429) {
        toastStore.error(t('emailCode.tooManyRequests'))
      } else {
        toastStore.error(err.message)
      }
    } else {
      toastStore.error(t('emailCode.sendFailed'))
    }
  } finally {
    isSendingCode.value = false
  }
}

function handleCodeComplete(code: string) {
  verificationCode.value = code
}

function goBackToEmail() {
  step.value = 'email'
  verificationCode.value = ''
  codeError.value = false
  registerToken.value = null
  registerTokenExpiresAt.value = null
  if (turnstileEnabled) {
    turnstileToken.value = null
    turnstileIssuedAt.value = null
    turnstileRef.value?.reset()
  }
  forceTurnstileForSend.value = false
}

/** Step 2: Register with code */
async function handleRegister() {
  const trimmedUsername = username.value.trim()
  const trimmedEmail = email.value.trim()

  if (!trimmedUsername || !password.value || !confirmPassword.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    return
  }
  if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
    toastStore.warning(t('auth.error.usernameInvalid'))
    return
  }
  if (password.value !== confirmPassword.value) {
    toastStore.warning(t('auth.passwordMismatch'))
    return
  }
  if (verificationCode.value.length !== 6) {
    toastStore.warning(t('auth.error.codeRequired'))
    return
  }
  if (password.value.length < 8) {
    toastStore.warning(t('auth.error.passwordTooShort'))
    return
  }
  if (passwordStrengthResult.value.level === 'weak') {
    toastStore.warning(t('auth.error.passwordTooWeak'))
    return
  }
  const needsTurnstile = !hasValidRegisterToken()
  if (turnstileEnabled && needsTurnstile && !isTurnstileTokenFresh()) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    return
  }

  const result = await authStore.register(
    trimmedUsername,
    trimmedEmail,
    password.value,
    verificationCode.value,
    undefined,
    needsTurnstile ? turnstileToken.value || undefined : undefined,
    hasValidRegisterToken() ? registerToken.value || undefined : undefined
  )

  if (result.success) {
    toastStore.success(t('auth.registerSuccess'))
    router.replace('/')
  } else {
    codeError.value = true
    codeInputRef.value?.reset()
    if (result.error) {
      const message =
        result.error.startsWith('auth.') || result.error.startsWith('error.')
          ? t(result.error)
          : result.error
      toastStore.error(message)
    } else {
      toastStore.error(t('auth.error.registerFailed'))
    }
  }
}

function handleTurnstileVerify(token: string) {
  turnstileToken.value = token
  turnstileIssuedAt.value = Date.now()
}

function handleTurnstileExpire() {
  turnstileToken.value = null
  turnstileIssuedAt.value = null
}

function handleTurnstileError() {
  turnstileToken.value = null
  turnstileIssuedAt.value = null
  toastStore.error(t('auth.error.turnstileFailed'))
}

function isTurnstileTokenFresh() {
  if (!turnstileEnabled) return true
  if (!turnstileToken.value || !turnstileIssuedAt.value) return false
  return Date.now() - turnstileIssuedAt.value < 4 * 60 * 1000
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3);
  background:
    radial-gradient(circle at top, rgba(var(--mm-green-rgb), 0.12), transparent 55%),
    linear-gradient(180deg, rgba(var(--mm-teal-rgb), 0.04) 0%, transparent 70%);
}

@media (max-width: 768px) {
  .auth-page {
    min-height: calc(100svh - var(--navbar-height) - var(--mobile-nav-height));
    min-height: calc(100dvh - var(--navbar-height) - var(--mobile-nav-height));
  }
}

.auth-card {
  width: 100%;
  max-width: min(92vw, 26rem);
  padding: var(--spacing-6);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--glass-border);
  background: var(--color-surface);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow:
    0 1.25rem 3rem -2rem rgba(15, 23, 42, 0.35),
    0 0.75rem 1.5rem -1.25rem rgba(15, 23, 42, 0.2);
}

.auth-card::before {
  display: none;
}

@media (min-width: 640px) {
  .auth-card {
    padding: var(--spacing-6);
  }
}

.auth-title {
  font-size: var(--text-2xl);
  text-align: center;
  margin-bottom: var(--spacing-1);
  letter-spacing: 0.02em;
}

@media (min-width: 640px) {
  .auth-title {
    font-size: var(--text-2xl);
  }
}

.auth-subtitle {
  text-align: center;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-5);
  font-size: var(--text-sm);
}

.auth-helper {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: calc(var(--spacing-4) * -1 + var(--spacing-2));
  margin-bottom: var(--spacing-4);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
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
  background: rgba(var(--color-surface-rgb), 0.9);
  border: 1px solid var(--glass-border);
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

/* Back button */
.auth-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: var(--spacing-3);
}

.back-btn {
  padding: var(--spacing-2);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-tertiary);
}

/* Password field with toggle */
.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 2.75rem;
}

.password-toggle {
  position: absolute;
  right: var(--spacing-3);
  height: 2rem;
  width: 2rem;
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

/* Field hint & error */
.field-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.field-error {
  font-size: var(--text-xs);
  color: var(--color-error);
}

/* Step transition */
.step-fade-enter-active,
.step-fade-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.step-fade-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

/* Password Strength */
.password-strength {
  margin-top: var(--spacing-2);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.strength-bar {
  flex: 1;
  height: 0.25rem;
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

.password-suggestions {
  margin-top: var(--spacing-1);
  padding-left: var(--spacing-4);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.password-suggestions li {
  margin-bottom: var(--spacing-1);
}

/* Step indicator */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
}

.step {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  transition: color 200ms ease;
}

.step.active {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.step.done {
  color: var(--color-success);
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--radius-full);
  border: 1.5px solid currentColor;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.step.active .step-num,
.step.done .step-num {
  background: currentColor;
  color: var(--color-bg);
}

.step-line {
  width: 2rem;
  height: 0.0938rem;
  background: var(--color-border);
  transition: background 200ms ease;
}

.step-line.active {
  background: var(--color-primary);
}

/* Code sent banner */
.code-sent-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  background: rgba(var(--color-success-rgb, 34, 197, 94), 0.08);
  color: var(--color-success);
  font-size: var(--text-xs);
  border: 1px solid rgba(var(--color-success-rgb, 34, 197, 94), 0.2);
}

/* Resend row */
.resend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-1);
}

.resend-btn,
.change-email-btn {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  padding: var(--spacing-1) 0;
  transition: color 150ms ease;
}

.resend-btn:not(:disabled):hover,
.change-email-btn:hover {
  color: var(--color-primary);
}

.resend-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
