<template>
  <div class="auth-page auth-page--register">
    <div class="auth-book">
      <section class="auth-panel">
        <div class="auth-panel-inner">
          <div class="auth-topline">
            <div class="auth-header">
              <button
                type="button"
                class="back-btn glass-button"
                :aria-label="$t('common.back')"
                @click="handleBackWithMood"
              >
                <ArrowLeft :size="18" />
              </button>
            </div>
            <div class="auth-headings">
              <h1 class="auth-title">{{ $t('auth.registerTitle') }}</h1>
              <p class="auth-subtitle">{{ $t('auth.registerSubtitle') }}</p>
            </div>
          </div>

          <!-- Step indicator -->
          <div
            class="step-indicator"
            role="progressbar"
            :aria-label="$t('auth.registerTitle')"
            :aria-valuenow="step === 'email' ? 1 : 2"
            aria-valuemin="1"
            aria-valuemax="2"
            :aria-valuetext="step === 'email' ? $t('auth.stepEmail') : $t('auth.stepRegister')"
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
                  @focus="handleTypingFocus"
                  @blur="handleFieldBlur"
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
                  @focus="handleTypingFocus"
                  @blur="handleFieldBlur"
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
                    @focus="handlePasswordFocus"
                    @blur="handleFieldBlur"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
                    @click="togglePasswordVisibility('password')"
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
                <ul v-if="serverPasswordErrors.length > 0" class="server-password-errors">
                  <li v-for="err in serverPasswordErrors" :key="err">{{ err }}</li>
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
                    @focus="handlePasswordFocus"
                    @blur="handleFieldBlur"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    :aria-label="showConfirmPassword ? $t('common.hide') : $t('common.show')"
                    @click="togglePasswordVisibility('confirm')"
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
                    @click="handleResendCodeClick"
                  >
                    <span v-if="isSendingCode" class="spinner spinner-xs" />
                    {{
                      resendCooldown > 0
                        ? $t('emailCode.resendCooldown', { seconds: resendCooldown })
                        : $t('emailCode.resend')
                    }}
                  </button>
                  <button type="button" class="change-email-btn" @click="handleChangeEmailClick">
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
            <RouterLink to="/login" @click="handleNavigateToLogin">{{
              $t('nav.login')
            }}</RouterLink>
          </p>
        </div>
      </section>

      <section class="auth-visual" aria-hidden="true">
        <AuthVisualScene
          :title="$t('auth.registerTitle')"
          :subtitle="step === 'email' ? $t('auth.stepEmail') : $t('auth.stepRegister')"
          :mood="visualMood"
          :show-copy="false"
          scene-kind="register"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RegisterPage' })

import { ref, computed, watch, onUnmounted, useTemplateRef } from 'vue'
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
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'

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
type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'
const visualMood = ref<VisualMood>('idle')
let moodTimer: ReturnType<typeof setTimeout> | null = null
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const verificationCode = ref('')
const codeError = ref(false)
const isSendingCode = ref(false)
const registerToken = ref<string | null>(null)
const registerTokenExpiresAt = ref<number | null>(null)
const forceTurnstileForSend = ref(false)

const codeInputRef = useTemplateRef<InstanceType<typeof EmailCodeInput>>('codeInputRef')
const emailError = ref('')
const serverPasswordErrors = ref<string[]>([])

function setVisualMood(next: VisualMood, holdMs = 0) {
  if (moodTimer) {
    clearTimeout(moodTimer)
    moodTimer = null
  }

  visualMood.value = next

  if (holdMs > 0) {
    moodTimer = setTimeout(() => {
      visualMood.value = 'idle'
      moodTimer = null
    }, holdMs)
  }
}

function handleTypingFocus() {
  if (visualMood.value === 'submitting') return
  setVisualMood('typing')
}

function handlePasswordFocus() {
  if (visualMood.value === 'submitting') return
  setVisualMood('dodge')
}

function handleFieldBlur() {
  if (visualMood.value === 'submitting') return
  setVisualMood(step.value === 'register' ? 'typing' : 'idle')
}

// Clear email error when user types
watch(email, () => {
  emailError.value = ''
})

// Clear server password errors when user modifies password
watch(password, () => {
  serverPasswordErrors.value = []
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
const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()
const turnstileToken = ref<string | null>(null)
const turnstileIssuedAt = ref<number | null>(null)
const turnstileRef = useTemplateRef<{ reset: () => void; getResponse: () => string | undefined }>(
  'turnstileRef'
)

// Resend cooldown
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
let registrationCodeController: AbortController | null = null
let registrationCodeRequestToken = 0

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

function handleBackWithMood() {
  setVisualMood('dodge', 460)
  handleBack()
}

function handleNavigateToLogin() {
  setVisualMood('submitting', 580)
}

function togglePasswordVisibility(target: 'password' | 'confirm') {
  if (target === 'password') {
    showPassword.value = !showPassword.value
  } else {
    showConfirmPassword.value = !showConfirmPassword.value
  }
  setVisualMood('dodge', 520)
}

function handleResendCodeClick() {
  void handleResendCode()
}

function handleChangeEmailClick() {
  setVisualMood('dodge', 700)
  goBackToEmail()
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

function abortRegistrationCodeRequest() {
  registrationCodeController?.abort()
  registrationCodeController = null
}

// Cleanup cooldown timer on unmount
onUnmounted(() => {
  abortRegistrationCodeRequest()
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
  if (moodTimer) {
    clearTimeout(moodTimer)
    moodTimer = null
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
  setVisualMood('submitting')
  emailError.value = ''
  const trimmedEmail = email.value.trim()
  if (!trimmedEmail) {
    emailError.value = t('auth.emailRequired')
    setVisualMood('typing', 900)
    return
  }
  if (!emailRegex.test(trimmedEmail)) {
    emailError.value = t('auth.error.invalidEmail')
    setVisualMood('typing', 900)
    return
  }
  if (turnstileEnabled.value && forceTurnstileForSend.value && !isTurnstileTokenFresh()) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    setVisualMood('typing', 900)
    return
  }

  abortRegistrationCodeRequest()
  const controller = new AbortController()
  registrationCodeController = controller
  const requestToken = ++registrationCodeRequestToken

  isSendingCode.value = true
  try {
    const response = await authService.sendRegistrationCode(
      {
        email: trimmedEmail,
        ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
      },
      { signal: controller.signal }
    )
    if (controller.signal.aborted || requestToken !== registrationCodeRequestToken) return
    setRegisterToken(response.register_token, response.expires_in)
    toastStore.success(t('emailCode.codeSent'))
    step.value = 'register'
    setVisualMood('success', 1100)
    startCooldown()
    forceTurnstileForSend.value = false
    if (turnstileEnabled.value) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }
  } catch (err) {
    if (controller.signal.aborted || requestToken !== registrationCodeRequestToken) return
    turnstileToken.value = null
    turnstileIssuedAt.value = null
    turnstileRef.value?.reset()
    if (err instanceof ApiError) {
      if (isTurnstileRequiredError(err)) {
        forceTurnstileForSend.value = true
        toastStore.warning(t('auth.error.turnstileRequired'))
        setVisualMood('typing', 900)
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
    setVisualMood('typing', 1200)
  } finally {
    if (requestToken === registrationCodeRequestToken) {
      isSendingCode.value = false
      if (registrationCodeController === controller) {
        registrationCodeController = null
      }
    }
  }
}

/** Resend code from step 2 */
async function handleResendCode() {
  setVisualMood('submitting')
  // 如果启用了 Turnstile，需要重新验证
  const trimmedEmail = email.value.trim()
  if (!trimmedEmail) {
    toastStore.warning(t('auth.emailRequired'))
    setVisualMood('typing', 900)
    return
  }
  if (!emailRegex.test(trimmedEmail)) {
    toastStore.warning(t('auth.error.invalidEmail'))
    setVisualMood('typing', 900)
    return
  }
  if (turnstileEnabled.value && forceTurnstileForSend.value && !isTurnstileTokenFresh()) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    setVisualMood('typing', 900)
    return
  }

  abortRegistrationCodeRequest()
  const controller = new AbortController()
  registrationCodeController = controller
  const requestToken = ++registrationCodeRequestToken

  isSendingCode.value = true
  try {
    const response = await authService.sendRegistrationCode(
      {
        email: trimmedEmail,
        ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
      },
      { signal: controller.signal }
    )
    if (controller.signal.aborted || requestToken !== registrationCodeRequestToken) return
    setRegisterToken(response.register_token, response.expires_in)
    toastStore.success(t('emailCode.codeSent'))
    setVisualMood('success', 1000)
    startCooldown()
    codeError.value = false
    codeInputRef.value?.reset()
    forceTurnstileForSend.value = false
    // 重置 Turnstile token，要求用户重新验证
    if (turnstileEnabled.value) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }
  } catch (err) {
    if (controller.signal.aborted || requestToken !== registrationCodeRequestToken) return
    // 重置 Turnstile token
    if (turnstileEnabled.value) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }
    if (err instanceof ApiError) {
      if (isTurnstileRequiredError(err)) {
        forceTurnstileForSend.value = true
        toastStore.warning(t('auth.error.turnstileRequired'))
        setVisualMood('typing', 900)
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
    setVisualMood('typing', 1200)
  } finally {
    if (requestToken === registrationCodeRequestToken) {
      isSendingCode.value = false
      if (registrationCodeController === controller) {
        registrationCodeController = null
      }
    }
  }
}

function handleCodeComplete(code: string) {
  verificationCode.value = code
  setVisualMood('typing', 900)
}

function goBackToEmail() {
  abortRegistrationCodeRequest()
  isSendingCode.value = false
  step.value = 'email'
  verificationCode.value = ''
  codeError.value = false
  serverPasswordErrors.value = []
  registerToken.value = null
  registerTokenExpiresAt.value = null
  if (turnstileEnabled.value) {
    turnstileToken.value = null
    turnstileIssuedAt.value = null
    turnstileRef.value?.reset()
  }
  forceTurnstileForSend.value = false
  setVisualMood('idle')
}

/** Step 2: Register with code */
async function handleRegister() {
  setVisualMood('submitting')
  const trimmedUsername = username.value.trim()
  const trimmedEmail = email.value.trim()

  if (!trimmedUsername || !password.value || !confirmPassword.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    setVisualMood('typing', 1000)
    return
  }
  if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
    toastStore.warning(t('auth.error.usernameInvalid'))
    setVisualMood('typing', 1000)
    return
  }
  if (password.value !== confirmPassword.value) {
    toastStore.warning(t('auth.passwordMismatch'))
    setVisualMood('dodge', 1200)
    return
  }
  if (verificationCode.value.length !== 6) {
    toastStore.warning(t('auth.error.codeRequired'))
    setVisualMood('typing', 1000)
    return
  }
  if (password.value.length < 8) {
    toastStore.warning(t('auth.error.passwordTooShort'))
    setVisualMood('dodge', 1200)
    return
  }
  if (passwordStrengthResult.value.level === 'weak') {
    toastStore.warning(t('auth.error.passwordTooWeak'))
    setVisualMood('dodge', 1200)
    return
  }
  const needsTurnstile = !hasValidRegisterToken()
  if (turnstileEnabled.value && needsTurnstile && !isTurnstileTokenFresh()) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    setVisualMood('typing', 1000)
    return
  }

  serverPasswordErrors.value = []

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
    setVisualMood('success', 900)
    toastStore.success(t('auth.registerSuccess'))
    router.replace('/')
  } else {
    codeError.value = true
    codeInputRef.value?.reset()
    // 显示密码验证错误列表（Go 后端返回）
    if (result.passwordErrors && result.passwordErrors.length > 0) {
      serverPasswordErrors.value = result.passwordErrors
    }
    if (result.error) {
      const message =
        result.error.startsWith('auth.') || result.error.startsWith('error.')
          ? t(result.error)
          : result.error
      toastStore.error(message)
    } else {
      toastStore.error(t('auth.error.registerFailed'))
    }
    setVisualMood('dodge', 1300)
  }
}

function handleTurnstileVerify(token: string) {
  turnstileToken.value = token
  turnstileIssuedAt.value = Date.now()
  setVisualMood('typing', 500)
}

function handleTurnstileExpire() {
  turnstileToken.value = null
  turnstileIssuedAt.value = null
  setVisualMood('typing', 500)
}

function handleTurnstileError() {
  turnstileToken.value = null
  turnstileIssuedAt.value = null
  toastStore.error(t('auth.error.turnstileFailed'))
  setVisualMood('dodge', 900)
}

function isTurnstileTokenFresh() {
  if (!turnstileEnabled.value) return true
  if (!turnstileToken.value || !turnstileIssuedAt.value) return false
  return Date.now() - turnstileIssuedAt.value < 4 * 60 * 1000
}
</script>

<style scoped>
.auth-page {
  --auth-stage-top: #19152f;
  --auth-stage-mid: #241c42;
  --auth-stage-bottom: #12162d;
  --auth-card-shell: #f2ede5;
  --auth-card-shell-strong: #ebe4d9;
  --auth-panel-bg: #fffdf9;
  --auth-panel-border: rgba(62, 71, 118, 0.16);
  --auth-panel-shadow: rgba(28, 32, 58, 0.18);
  --auth-form-ring: #5f6bff;
  --auth-form-border: rgba(75, 86, 137, 0.24);
  --auth-form-surface: #f5f0e8;
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(0.8rem, 2.4vw, 1.8rem);
  background:
    radial-gradient(circle at 10% 12%, rgba(133, 122, 255, 0.42), transparent 42%),
    radial-gradient(circle at 88% 84%, rgba(255, 112, 176, 0.24), transparent 46%),
    linear-gradient(
      160deg,
      var(--auth-stage-top),
      var(--auth-stage-mid) 52%,
      var(--auth-stage-bottom)
    );
  perspective: 96rem;
}

.auth-book {
  position: relative;
  width: 100%;
  max-width: min(96vw, 72rem);
  height: min(82dvh, 46rem);
  display: grid;
  grid-template-columns: minmax(24rem, 1.08fr) minmax(22rem, 0.92fr);
  grid-template-areas: 'visual panel';
  border-radius: clamp(1.4rem, 2.7vw, 2.5rem);
  border: 1px solid rgba(255, 255, 255, 0.22);
  overflow: hidden;
  background: linear-gradient(145deg, var(--auth-card-shell), var(--auth-card-shell-strong));
  box-shadow:
    0 2.6rem 4.2rem -2.2rem rgba(11, 15, 34, 0.72),
    0 1.2rem 2.4rem -1.6rem rgba(10, 14, 32, 0.46);
  animation: auth-card-enter-right 580ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.auth-book::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 14% 14%, rgba(255, 255, 255, 0.34), transparent 34%),
    linear-gradient(120deg, rgba(255, 255, 255, 0.08), transparent 45%);
  pointer-events: none;
}

.auth-book > * {
  min-height: 0;
}

.auth-panel {
  grid-area: panel;
  display: grid;
  place-items: center;
  padding: clamp(0.85rem, 2.2vw, 1.5rem);
  background: var(--auth-panel-bg);
  border-inline-start: 1px solid rgba(99, 111, 161, 0.2);
  max-height: 100%;
  overflow-y: auto;
}

.auth-panel::-webkit-scrollbar {
  width: 0.34rem;
}

.auth-panel::-webkit-scrollbar-thumb {
  border-radius: var(--radius-full);
  background: rgba(76, 86, 134, 0.42);
}

.auth-panel-inner {
  width: min(100%, 31rem);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-2);
}

.auth-visual {
  grid-area: visual;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  min-height: 0;
  padding: 0;
  background: #d7d7dc;
  border-inline-end: 1px solid rgba(99, 111, 161, 0.2);
  overflow: hidden;
}

.auth-visual :deep(.auth-scene) {
  width: 100%;
  flex: 1;
  min-height: 0;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
}

.auth-panel :deep(.ui-input) {
  border-radius: 0.95rem;
  border-color: var(--auth-form-border);
  background: var(--auth-form-surface);
  color: #21263f;
}

.auth-panel :deep(.ui-input::placeholder) {
  color: rgba(57, 66, 106, 0.56);
}

.auth-panel :deep(.ui-input:hover:not(:disabled):not(.ui-input--readonly)) {
  border-color: rgba(82, 94, 148, 0.36);
  background: #f8f3ec;
}

.auth-panel :deep(.ui-input:focus) {
  border-color: var(--auth-form-ring);
  box-shadow: 0 0 0 3px rgba(95, 107, 255, 0.14);
  background: #fffcf9;
}

.auth-panel :deep(.btn) {
  border-radius: 1rem;
  font-weight: var(--font-semibold);
}

.auth-panel :deep(.btn-default) {
  background: linear-gradient(132deg, #5f6bff, #7a6cff);
  color: #f7f9ff;
  box-shadow: 0 0.8rem 1.6rem -1rem rgba(80, 88, 210, 0.72);
}

.auth-panel :deep(.btn-default:hover:not(:disabled)) {
  background: linear-gradient(132deg, #5462f4, #6f61f3);
  box-shadow: 0 1rem 1.9rem -1rem rgba(74, 82, 198, 0.72);
}

.auth-panel :deep(.btn-ghost) {
  border: 1px solid rgba(80, 89, 135, 0.22);
  background: #f4efe7;
  color: #2f3657;
}

.auth-panel :deep(.btn-ghost:hover:not(:disabled)) {
  background: #ede6da;
}

.auth-title {
  font-size: clamp(1.45rem, 1.2rem + 1.1vw, 2.1rem);
  text-align: left;
  margin-bottom: var(--spacing-1);
  letter-spacing: 0.012em;
  color: #212840;
}

.auth-subtitle {
  text-align: left;
  color: rgba(50, 58, 90, 0.72);
  margin-bottom: var(--spacing-4);
  font-size: var(--text-xs);
}

.auth-helper {
  text-align: left;
  font-size: var(--text-xs);
  color: rgba(52, 62, 97, 0.72);
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
  font-weight: var(--font-semibold);
  color: #303a5c;
}

.turnstile-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: 0.95rem;
  background: rgba(110, 120, 182, 0.08);
  border: 1px solid rgba(82, 95, 150, 0.2);
}

.turnstile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: rgba(52, 62, 97, 0.7);
}

.turnstile-title {
  font-weight: var(--font-semibold);
  color: #364066;
}

.turnstile-hint {
  font-variant-numeric: tabular-nums;
}

.auth-footer {
  text-align: center;
  margin-top: var(--spacing-4);
  font-size: var(--text-sm);
  color: rgba(52, 62, 97, 0.76);
}

.auth-footer a {
  color: #4957dd;
  font-weight: var(--font-medium);
}

.auth-footer a:hover {
  text-decoration: underline;
}

.auth-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: var(--spacing-2);
}

.back-btn {
  padding: var(--spacing-2);
  border-radius: var(--radius-full);
  border: 1px solid rgba(74, 85, 135, 0.2);
  background: rgba(95, 108, 174, 0.08);
  color: #3a4266;
}

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
  border-radius: 0.75rem;
  color: rgba(49, 58, 91, 0.72);
}

.password-toggle:hover {
  background: rgba(109, 120, 176, 0.14);
  color: #2e3554;
}

.field-hint {
  font-size: var(--text-xs);
  color: rgba(52, 62, 97, 0.76);
}

.field-error {
  font-size: var(--text-xs);
  color: var(--color-error);
}

.step-fade-enter-active,
.step-fade-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.step-fade-enter-from {
  opacity: 0;
  transform: translateX(0.75rem);
}

.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-0.75rem);
}

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
  color: rgba(52, 62, 97, 0.76);
}

.password-suggestions li {
  margin-bottom: var(--spacing-1);
}

.server-password-errors {
  margin-top: var(--spacing-1);
  padding-left: var(--spacing-4);
  font-size: var(--text-xs);
  color: var(--color-error);
}

.server-password-errors li {
  margin-bottom: var(--spacing-1);
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.step {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  color: rgba(52, 62, 97, 0.72);
  transition: color 200ms ease;
}

.step.active {
  color: #4957dd;
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
  height: 0.1rem;
  background: var(--color-border);
  transition: background 200ms ease;
}

.step-line.active {
  background: #4957dd;
}

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

.resend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-1);
}

.resend-btn,
.change-email-btn {
  font-size: var(--text-xs);
  color: rgba(52, 62, 97, 0.76);
  padding: var(--spacing-1) 0;
  transition: color 150ms ease;
}

.resend-btn:not(:disabled):hover,
.change-email-btn:hover {
  color: #4957dd;
}

.resend-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 68rem) {
  .auth-book {
    max-width: min(96vw, 64rem);
    grid-template-columns: minmax(20rem, 1.05fr) minmax(20rem, 0.95fr);
  }
}

@media (max-width: 56rem) {
  .auth-page {
    min-height: calc(100svh - var(--navbar-height) - var(--mobile-nav-height));
    min-height: calc(100dvh - var(--navbar-height) - var(--mobile-nav-height));
    padding: clamp(0.6rem, 3.2vw, 1rem);
  }

  .auth-book {
    max-width: min(95vw, 36rem);
    height: auto;
    min-height: auto;
    grid-template-columns: 1fr;
    grid-template-areas:
      'visual'
      'panel';
  }

  .auth-visual {
    min-height: 14rem;
    padding: 0;
    border-inline-end: none;
    border-bottom: 1px solid rgba(99, 111, 161, 0.2);
  }

  .auth-panel {
    max-height: none;
    overflow: visible;
    padding: clamp(0.8rem, 3.2vw, 1.25rem);
    border-inline-start: none;
  }

  .step-indicator {
    justify-content: center;
  }

  .auth-title,
  .auth-subtitle,
  .auth-helper {
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-book {
    animation: none;
  }
}

@keyframes auth-card-enter-right {
  0% {
    opacity: 0;
    transform: rotateY(14deg) translateX(1.2rem) scale(0.98);
  }

  100% {
    opacity: 1;
    transform: rotateY(0) translateX(0) scale(1);
  }
}
</style>
