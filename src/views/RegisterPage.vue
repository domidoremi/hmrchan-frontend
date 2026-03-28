<template>
  <div class="auth-page auth-page--register">
    <div class="auth-book">
      <section class="auth-panel">
        <div class="auth-panel-inner">
          <div class="auth-topline">
            <div class="auth-header">
              <button
                type="button"
                class="back-btn page-control-btn page-control-btn--square"
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

          <nav class="auth-switcher" :aria-label="$t('auth.registerTitle')">
            <RouterLink to="/login" class="auth-switcher__item" @click="handleNavigateToLogin">
              {{ $t('nav.login') }}
            </RouterLink>
            <RouterLink
              to="/register"
              class="auth-switcher__item auth-switcher__item--active"
              aria-current="page"
            >
              {{ $t('nav.register') }}
            </RouterLink>
          </nav>

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
                    class="resend-btn page-control-btn page-control-btn--compact"
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
                  <button
                    type="button"
                    class="change-email-btn page-control-btn page-control-btn--compact"
                    @click="handleChangeEmailClick"
                  >
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

import { ref, computed, watch, onMounted, onUnmounted, useTemplateRef } from 'vue'
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
import { validateMainstreamEmailDomain } from '@/utils/emailDomainPolicy'
import { getTurnstileErrorMessageKey, isTurnstileRequiredError } from '@/utils/turnstile'

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

onMounted(() => {
  void import('@/views/LoginPage.vue').catch(() => {})
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

function validateRegistrationEmail(options: { showToast?: boolean } = {}) {
  const { showToast = false } = options
  const validation = validateMainstreamEmailDomain(email.value)

  if (!validation.valid) {
    const message =
      validation.reason === 'domain'
        ? t('auth.error.mainstreamEmailOnly')
        : t('auth.error.invalidEmail')

    emailError.value = message
    if (showToast) {
      toastStore.warning(message)
    }

    return {
      valid: false,
      normalizedEmail: validation.normalizedEmail,
    }
  }

  emailError.value = ''
  return {
    valid: true,
    normalizedEmail: validation.normalizedEmail,
  }
}

async function handleSendCode() {
  setVisualMood('submitting')
  emailError.value = ''
  if (!email.value.trim()) {
    emailError.value = t('auth.emailRequired')
    setVisualMood('typing', 900)
    return
  }
  const validation = validateRegistrationEmail()
  if (!validation.valid) {
    setVisualMood('typing', 900)
    return
  }
  const trimmedEmail = validation.normalizedEmail
  email.value = trimmedEmail
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
  if (!email.value.trim()) {
    toastStore.warning(t('auth.emailRequired'))
    setVisualMood('typing', 900)
    return
  }
  const validation = validateRegistrationEmail({ showToast: true })
  if (!validation.valid) {
    setVisualMood('typing', 900)
    return
  }
  const trimmedEmail = validation.normalizedEmail
  email.value = trimmedEmail
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
  const emailValidation = validateRegistrationEmail({ showToast: true })
  const trimmedEmail = emailValidation.normalizedEmail

  if (!trimmedUsername || !password.value || !confirmPassword.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    setVisualMood('typing', 1000)
    return
  }
  if (!emailValidation.valid) {
    setVisualMood('typing', 1000)
    return
  }
  email.value = trimmedEmail
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
    router.replace('/login')
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

function handleTurnstileError(error?: Error) {
  turnstileToken.value = null
  turnstileIssuedAt.value = null
  toastStore.error(t(getTurnstileErrorMessageKey(error)))
  setVisualMood('dodge', 900)
}

function isTurnstileTokenFresh() {
  if (!turnstileEnabled.value) return true
  if (!turnstileToken.value || !turnstileIssuedAt.value) return false
  return Date.now() - turnstileIssuedAt.value < 4 * 60 * 1000
}
</script>
