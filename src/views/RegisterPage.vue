<template>
  <div class="auth-page auth-page--register">
    <AuthEntryShell
      :title="pageTitle"
      :subtitle="pageSubtitle"
      active-tab="register"
      :redirect-to="redirectTo"
      split
      @back="handleBack"
    >
      <div v-if="showRegistrationProgress" class="step-indicator" role="presentation">
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

      <Transition name="step-fade" mode="out-in">
        <form
          v-if="step === 'email'"
          key="step-email"
          class="auth-form"
          @submit.prevent="handleSendCode"
        >
          <div class="auth-card auth-card--stack">
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
                size="compact"
                @verify="handleTurnstileVerify"
                @expire="handleTurnstileExpire"
                @error="handleTurnstileError"
              />
            </div>

            <div class="action-group">
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
            </div>
          </div>
        </form>

        <form
          v-else-if="step === 'register'"
          key="step-register"
          class="auth-form"
          @submit.prevent="handleRegister"
        >
          <div class="auth-card auth-card--stack">
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
                  <EyeOff v-if="showPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
              <p class="field-hint">{{ $t('auth.passwordRequirement') }}</p>
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
                <li v-for="error in serverPasswordErrors" :key="error">{{ error }}</li>
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
                  <EyeOff v-if="showConfirmPassword" :size="16" />
                  <Eye v-else :size="16" />
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

            <div v-if="showRegisterTurnstile" class="turnstile-block">
              <div class="turnstile-header">
                <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
                <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
              </div>
              <TurnstileWidget
                ref="turnstileRef"
                :site-key="turnstileSiteKey"
                action="register"
                size="compact"
                @verify="handleTurnstileVerify"
                @expire="handleTurnstileExpire"
                @error="handleTurnstileError"
              />
            </div>

            <div class="action-group">
              <Button
                type="submit"
                :loading="isLoading"
                :disabled="
                  verificationCode.length !== 6 ||
                  (!!confirmPassword && password !== confirmPassword) ||
                  (showRegisterTurnstile && !isTurnstileTokenFresh())
                "
                full-width
              >
                {{ $t('auth.registerButton') }}
              </Button>
            </div>
          </div>
        </form>

        <form
          v-else-if="step === 'risk-verification'"
          key="step-risk"
          class="auth-form"
          @submit.prevent="handleRiskVerificationSubmit"
        >
          <div class="auth-card auth-card--stack">
            <p class="auth-helper">{{ $t('auth.riskVerificationHint') }}</p>
            <p v-if="riskMessage" class="auth-helper auth-helper--emphasis">
              {{ riskMessage }}
            </p>
            <p v-if="riskExpiresIn" class="auth-helper">
              {{ $t('auth.riskVerificationExpiresIn', { seconds: riskExpiresIn }) }}
            </p>

            <div class="form-group">
              <label for="register-risk-code">{{ $t('auth.riskVerificationCode') }}</label>
              <Input
                id="register-risk-code"
                v-model="riskVerificationCode"
                type="text"
                inputmode="numeric"
                maxlength="8"
                :placeholder="$t('auth.riskVerificationCodePlaceholder')"
                autocomplete="one-time-code"
              />
            </div>

            <p v-if="riskError" class="field-error">{{ riskError }}</p>

            <div v-if="turnstileEnabled" class="turnstile-block">
              <div class="turnstile-header">
                <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
                <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
              </div>
              <TurnstileWidget
                ref="riskTurnstileRef"
                :site-key="turnstileSiteKey"
                action="risk-login"
                size="compact"
                @verify="handleRiskTurnstileVerify"
                @expire="handleRiskTurnstileExpire"
                @error="handleTurnstileError"
              />
            </div>

            <div class="action-group">
              <Button type="submit" full-width :loading="isLoading">
                {{ $t('auth.verifyButton') }}
              </Button>
              <Button type="button" variant="ghost" full-width @click="returnToPrimaryStep">
                {{ $t('auth.stepRegister') }}
              </Button>
            </div>
          </div>
        </form>

        <div v-else key="step-mfa" class="auth-form">
          <AuthMfaStep
            :pending-mfa-login-token="pendingMfaLoginToken"
            :methods="mfaMethods"
            :message="mfaMessage"
            :error-message="mfaError"
            @resolved="handleMfaResolved"
          />

          <button type="button" class="auth-link-button auth-2fa-back" @click="returnToPrimaryStep">
            {{ $t('auth.stepRegister') }}
          </button>
        </div>
      </Transition>

      <template #footer>
        <template v-if="showRegistrationProgress">
          <AuthDivider :label="$t('auth.googleDivider')" />

          <AuthProviderButton
            action="google"
            :label="$t('auth.googleRegisterButton')"
            :hint="$t('auth.googleRegisterHint')"
            :loading="googleProviderBusy"
            :icon="IconGoogle"
            @click="handleGoogleContinue"
          />

          <div v-if="googlePopupState === 'waiting'" class="auth-inline-state">
            <div class="auth-inline-state__icon" aria-hidden="true">
              <LoaderCircle :size="16" class="auth-inline-spin" />
            </div>
            <div class="auth-inline-state__content">
              <p class="auth-restore__title">{{ $t('auth.googlePopupWaitingTitle') }}</p>
              <p class="auth-inline-state__copy">{{ $t('auth.googlePopupWaitingHint') }}</p>
            </div>
          </div>

          <div
            v-else-if="googlePopupState === 'blocked' || googlePopupState === 'error'"
            class="auth-inline-state"
            :class="
              googlePopupState === 'blocked'
                ? 'auth-inline-state--warning'
                : 'auth-inline-state--error'
            "
          >
            <div class="auth-inline-state__icon" aria-hidden="true">
              <CircleAlert :size="16" />
            </div>
            <div class="auth-inline-state__content">
              <p class="auth-restore__title">{{ $t('auth.googlePopupFallbackTitle') }}</p>
              <p class="auth-inline-state__copy">{{ googlePopupErrorMessage }}</p>
              <div v-if="googlePopupState === 'blocked'" class="auth-inline-state__actions">
                <Button
                  type="button"
                  variant="ghost"
                  full-width
                  :loading="isLoading"
                  @click="continueGoogleInCurrentPage"
                >
                  {{ $t('auth.googlePopupFallbackAction') }}
                </Button>
              </div>
            </div>
          </div>

          <p class="auth-footer">
            {{ $t('auth.hasAccount') }}
            <RouterLink to="/login">{{ $t('nav.login') }}</RouterLink>
          </p>
        </template>
      </template>
    </AuthEntryShell>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RegisterPage' })

import { computed, onMounted, onUnmounted, ref, watch, useTemplateRef } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { CircleAlert, Eye, EyeOff, LoaderCircle, Mail } from '@lucide/vue'
import { useAuthStore, useToastStore } from '@/stores'
import { authService, ApiError } from '@/api'
import { useI18n } from 'vue-i18n'
import { checkPasswordStrength } from '@/utils/crypto'
import {
  mapGooglePopupError,
  openGoogleAuthPopup,
  prefersGoogleAuthPopup,
  waitForGooglePopupResult,
  type GooglePopupMessage,
  type GooglePopupState,
} from '@/services/googleAuthService'
import { resolveAuthRedirectTarget } from '@/utils/authRedirect'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import EmailCodeInput from '@/components/ui/EmailCodeInput.vue'
import AuthMfaStep from '@/components/auth/AuthMfaStep.vue'
import AuthEntryShell from '@/components/auth/AuthEntryShell.vue'
import AuthDivider from '@/components/auth/AuthDivider.vue'
import AuthProviderButton from '@/components/auth/AuthProviderButton.vue'
import IconGoogle from '@/components/icons/IconGoogle.vue'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { validateMainstreamEmailDomain } from '@/utils/emailDomainPolicy'
import { getTurnstileErrorMessageKey, isTurnstileRequiredError } from '@/utils/turnstile'
import type { AuthFlowResult } from '@/stores/auth'

type Step = 'email' | 'register' | 'risk-verification' | 'mfa'
type RegistrationStep = 'email' | 'register'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isLoading, isAuthenticated } = storeToRefs(authStore)

const step = ref<Step>('email')
const primaryStep = ref<RegistrationStep>('email')

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
const forceTurnstileForRegister = ref(false)

const riskPendingToken = ref('')
const riskVerificationCode = ref('')
const riskMessage = ref('')
const riskExpiresIn = ref<number | null>(null)
const riskError = ref('')

const pendingMfaLoginToken = ref('')
const mfaMethods = ref<string[]>([])
const mfaMessage = ref('')
const mfaError = ref('')

const googlePopupState = ref<GooglePopupState>('idle')
const googlePopupErrorKey = ref('')
let googlePopupDispose: (() => void) | null = null

const codeInputRef = useTemplateRef<InstanceType<typeof EmailCodeInput>>('codeInputRef')
const emailError = ref('')
const serverPasswordErrors = ref<string[]>([])
const riskTurnstileRef = useTemplateRef<{ reset: () => void }>('riskTurnstileRef')

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

const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()
const turnstileToken = ref<string | null>(null)
const turnstileIssuedAt = ref<number | null>(null)
const turnstileRef = useTemplateRef<{ reset: () => void; getResponse: () => string | undefined }>(
  'turnstileRef'
)
const riskTurnstileToken = ref<string | null>(null)
const riskTurnstileIssuedAt = ref<number | null>(null)

const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
let registrationCodeController: AbortController | null = null
let registrationCodeRequestToken = 0

const redirectTo = computed(() => {
  const redirect = typeof route.query['redirect'] === 'string' ? route.query['redirect'] : null
  return resolveAuthRedirectTarget(redirect, '/')
})

const maskedEmail = computed(() => {
  if (!email.value) return ''
  const parts = email.value.split('@')
  const local = parts[0] ?? ''
  const domain = parts[1]
  if (!domain) return email.value
  const visible = local.length <= 2 ? local : local.slice(0, 2)
  return `${visible}***@${domain}`
})

const showRegistrationProgress = computed(() => step.value === 'email' || step.value === 'register')
const googleProviderBusy = computed(
  () => ['opening', 'waiting', 'handling'].includes(googlePopupState.value) || isLoading.value
)
const showRegisterTurnstile = computed(
  () => turnstileEnabled.value && !hasValidRegisterToken() && forceTurnstileForRegister.value
)
const googlePopupErrorMessage = computed(() =>
  googlePopupErrorKey.value ? t(googlePopupErrorKey.value) : ''
)
const pageTitle = computed(() => {
  switch (step.value) {
    case 'risk-verification':
      return t('auth.riskVerificationTitle')
    case 'mfa':
      return t('auth.mfa.title')
    default:
      return t('auth.registerTitle')
  }
})
const pageSubtitle = computed(() => {
  switch (step.value) {
    case 'register':
      return t('auth.stepRegister')
    case 'risk-verification':
      return t('auth.riskVerificationHint')
    case 'mfa':
      return t('auth.mfa.hint')
    default:
      return t('auth.registerSubtitle')
  }
})

watch(email, () => {
  emailError.value = ''
})

watch(password, () => {
  serverPasswordErrors.value = []
})

if (isAuthenticated.value) {
  void router.replace(redirectTo.value)
}

function clearInlineErrors() {
  emailError.value = ''
  riskError.value = ''
  mfaError.value = ''
}

function setGooglePopupStatus(state: GooglePopupState, errorKey = '') {
  googlePopupState.value = state
  googlePopupErrorKey.value = errorKey
}

function clearGooglePopupListener() {
  if (googlePopupDispose) {
    googlePopupDispose()
    googlePopupDispose = null
  }
}

function resetGooglePopupState() {
  clearGooglePopupListener()
  setGooglePopupStatus('idle')
}

function rememberPrimaryStep() {
  if (step.value === 'email' || step.value === 'register') {
    primaryStep.value = step.value
  }
}

function returnToPrimaryStep() {
  step.value = primaryStep.value
  riskPendingToken.value = ''
  riskVerificationCode.value = ''
  riskMessage.value = ''
  riskExpiresIn.value = null
  riskError.value = ''
  pendingMfaLoginToken.value = ''
  mfaMethods.value = []
  mfaMessage.value = ''
  mfaError.value = ''
  resetRiskTurnstile()
  resetGooglePopupState()
}

function handleBack() {
  if (step.value === 'register') {
    goBackToEmail()
    return
  }

  if (step.value !== 'email') {
    returnToPrimaryStep()
    return
  }

  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.replace('/')
}

function startCooldown() {
  resendCooldown.value = 60
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1
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

function isTurnstileTokenFresh() {
  if (!turnstileEnabled.value) return true
  if (!turnstileToken.value || !turnstileIssuedAt.value) return false
  return Date.now() - turnstileIssuedAt.value < 4 * 60 * 1000
}

function isRiskTurnstileTokenFresh() {
  if (!turnstileEnabled.value) return true
  if (!riskTurnstileToken.value || !riskTurnstileIssuedAt.value) return false
  return Date.now() - riskTurnstileIssuedAt.value < 4 * 60 * 1000
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

function handleTurnstileVerify(token: string) {
  turnstileToken.value = token
  turnstileIssuedAt.value = Date.now()
}

function handleTurnstileExpire() {
  turnstileToken.value = null
  turnstileIssuedAt.value = null
}

function handleRiskTurnstileVerify(token: string) {
  riskTurnstileToken.value = token
  riskTurnstileIssuedAt.value = Date.now()
}

function handleRiskTurnstileExpire() {
  riskTurnstileToken.value = null
  riskTurnstileIssuedAt.value = null
}

function resetRiskTurnstile() {
  riskTurnstileToken.value = null
  riskTurnstileIssuedAt.value = null
  riskTurnstileRef.value?.reset()
}

function handleTurnstileError(error?: Error) {
  turnstileToken.value = null
  turnstileIssuedAt.value = null
  toastStore.error(t(getTurnstileErrorMessageKey(error)))
}

async function finalizeSuccessfulGoogleAuth(
  result: Extract<AuthFlowResult, { status: 'success' }>
) {
  resetGooglePopupState()
  toastStore.success(t('auth.registerSuccess'))
  await router.replace(resolveAuthRedirectTarget(result.redirectTo, redirectTo.value))
}

async function applyAuthFlowResult(result: AuthFlowResult) {
  switch (result.status) {
    case 'success':
      await finalizeSuccessfulGoogleAuth(result)
      return
    case 'risk-verification':
      rememberPrimaryStep()
      resetGooglePopupState()
      step.value = 'risk-verification'
      riskPendingToken.value = result.pendingToken
      riskVerificationCode.value = ''
      riskMessage.value = result.message || ''
      riskExpiresIn.value = result.expiresIn ?? null
      riskError.value = ''
      resetRiskTurnstile()
      return
    case 'mfa':
      rememberPrimaryStep()
      resetGooglePopupState()
      step.value = 'mfa'
      pendingMfaLoginToken.value = result.pendingMfaLoginToken
      mfaMethods.value = result.methods
      mfaMessage.value = result.message || ''
      mfaError.value = ''
      return
    case 'error':
      if (step.value === 'risk-verification') {
        riskError.value = t(result.error)
      } else if (step.value === 'mfa') {
        mfaError.value = t(result.error)
      } else {
        toastStore.error(t(result.error))
      }
      return
    default:
      return
  }
}

async function handleGooglePopupResult(message: GooglePopupMessage) {
  if (message.status === 'success' && message.handoffCode) {
    const callbackRedirect = resolveAuthRedirectTarget(message.redirectTo, redirectTo.value)
    await router.replace({
      path: '/auth/callback',
      query: {
        handoff_code: message.handoffCode,
        ...(callbackRedirect !== '/' ? { redirect: callbackRedirect } : {}),
      },
    })
    return
  }

  const errorKey = mapGooglePopupError(message.error)
  setGooglePopupStatus(
    message.error === 'popup_blocked' || message.error === 'popup_closed' ? 'blocked' : 'error',
    errorKey
  )
}

async function continueGoogleInCurrentPage() {
  setGooglePopupStatus('handling')
  const result = await authStore.startGoogleAuth('register', redirectTo.value)

  if (result.status === 'error') {
    setGooglePopupStatus('error', result.error)
    toastStore.error(t(result.error))
  }
}

async function handleGoogleContinue() {
  if (googleProviderBusy.value) return

  clearInlineErrors()

  if (!prefersGoogleAuthPopup()) {
    await continueGoogleInCurrentPage()
    return
  }

  setGooglePopupStatus('opening')
  const popupResult = openGoogleAuthPopup('register', redirectTo.value)

  if (popupResult.status === 'blocked') {
    setGooglePopupStatus('blocked', 'auth.error.googlePopupBlocked')
    return
  }

  setGooglePopupStatus('waiting')
  const pendingPopup = waitForGooglePopupResult(popupResult.popup, {
    requestId: popupResult.requestId,
    timeoutMs: 4 * 60 * 1000,
  })
  googlePopupDispose = pendingPopup.dispose

  const message = await pendingPopup.promise
  googlePopupDispose = null
  setGooglePopupStatus('handling')
  await handleGooglePopupResult(message)
}

async function handleSendCode() {
  clearInlineErrors()

  if (!email.value.trim()) {
    emailError.value = t('auth.emailRequired')
    return
  }

  const validation = validateRegistrationEmail()
  if (!validation.valid) {
    return
  }

  const normalizedEmail = validation.normalizedEmail
  email.value = normalizedEmail

  if (turnstileEnabled.value && forceTurnstileForSend.value && !isTurnstileTokenFresh()) {
    toastStore.warning(t('auth.error.turnstileRequired'))
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
        email: normalizedEmail,
        ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
      },
      { signal: controller.signal }
    )

    if (controller.signal.aborted || requestToken !== registrationCodeRequestToken) return

    setRegisterToken(response.register_token, response.expires_in)
    step.value = 'register'
    primaryStep.value = 'register'
    forceTurnstileForSend.value = false
    toastStore.success(t('emailCode.codeSent'))
    startCooldown()

    if (turnstileEnabled.value) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }
  } catch (error) {
    if (controller.signal.aborted || requestToken !== registrationCodeRequestToken) return

    turnstileToken.value = null
    turnstileIssuedAt.value = null
    turnstileRef.value?.reset()

    if (error instanceof ApiError) {
      if (isTurnstileRequiredError(error)) {
        forceTurnstileForSend.value = true
        toastStore.warning(t('auth.error.turnstileRequired'))
        return
      }

      if (error.status === 429) {
        toastStore.error(t('emailCode.tooManyRequests'))
      } else if (error.code === 'EMAIL_EXISTS' || error.status === 409) {
        emailError.value = t('auth.error.emailExists')
      } else if (error.status === 400) {
        emailError.value = error.message || t('error.badRequest')
      } else {
        toastStore.error(error.message)
      }
    } else {
      toastStore.error(t('emailCode.sendFailed'))
    }
  } finally {
    if (requestToken === registrationCodeRequestToken) {
      isSendingCode.value = false
      if (registrationCodeController === controller) {
        registrationCodeController = null
      }
    }
  }
}

async function handleResendCode() {
  if (!email.value.trim()) {
    toastStore.warning(t('auth.emailRequired'))
    return
  }

  const validation = validateRegistrationEmail({ showToast: true })
  if (!validation.valid) {
    return
  }

  const normalizedEmail = validation.normalizedEmail
  email.value = normalizedEmail

  if (turnstileEnabled.value && forceTurnstileForSend.value && !isTurnstileTokenFresh()) {
    toastStore.warning(t('auth.error.turnstileRequired'))
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
        email: normalizedEmail,
        ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
      },
      { signal: controller.signal }
    )

    if (controller.signal.aborted || requestToken !== registrationCodeRequestToken) return

    setRegisterToken(response.register_token, response.expires_in)
    toastStore.success(t('emailCode.codeSent'))
    codeError.value = false
    codeInputRef.value?.reset()
    forceTurnstileForSend.value = false
    startCooldown()

    if (turnstileEnabled.value) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }
  } catch (error) {
    if (controller.signal.aborted || requestToken !== registrationCodeRequestToken) return

    if (turnstileEnabled.value) {
      turnstileToken.value = null
      turnstileIssuedAt.value = null
      turnstileRef.value?.reset()
    }

    if (error instanceof ApiError) {
      if (isTurnstileRequiredError(error)) {
        forceTurnstileForSend.value = true
        toastStore.warning(t('auth.error.turnstileRequired'))
        return
      }

      if (error.status === 429) {
        toastStore.error(t('emailCode.tooManyRequests'))
      } else {
        toastStore.error(error.message)
      }
    } else {
      toastStore.error(t('emailCode.sendFailed'))
    }
  } finally {
    if (requestToken === registrationCodeRequestToken) {
      isSendingCode.value = false
      if (registrationCodeController === controller) {
        registrationCodeController = null
      }
    }
  }
}

function handleResendCodeClick() {
  void handleResendCode()
}

function handleChangeEmailClick() {
  goBackToEmail()
}

function handleCodeComplete(code: string) {
  verificationCode.value = code
}

function goBackToEmail() {
  abortRegistrationCodeRequest()
  isSendingCode.value = false
  step.value = 'email'
  primaryStep.value = 'email'
  verificationCode.value = ''
  codeError.value = false
  serverPasswordErrors.value = []
  setRegisterToken()
  resetGooglePopupState()

  if (turnstileEnabled.value) {
    turnstileToken.value = null
    turnstileIssuedAt.value = null
    turnstileRef.value?.reset()
  }

  forceTurnstileForSend.value = false
  forceTurnstileForRegister.value = false
}

async function handleRegister() {
  const trimmedUsername = username.value.trim()
  const emailValidation = validateRegistrationEmail({ showToast: true })
  const normalizedEmail = emailValidation.normalizedEmail

  if (!trimmedUsername || !password.value || !confirmPassword.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    return
  }
  if (!emailValidation.valid) return

  email.value = normalizedEmail

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
  if (turnstileEnabled.value && needsTurnstile && !isTurnstileTokenFresh()) {
    forceTurnstileForRegister.value = true
    toastStore.warning(t('auth.error.turnstileRequired'))
    return
  }

  serverPasswordErrors.value = []

  const result = await authStore.register(
    trimmedUsername,
    normalizedEmail,
    password.value,
    verificationCode.value,
    undefined,
    needsTurnstile ? turnstileToken.value || undefined : undefined,
    hasValidRegisterToken() ? registerToken.value || undefined : undefined
  )

  if (result.success) {
    forceTurnstileForRegister.value = false
    toastStore.success(t('auth.registerSuccess'))
    const nextLogin =
      redirectTo.value === '/'
        ? '/login'
        : `/login?redirect=${encodeURIComponent(redirectTo.value)}`
    await router.replace(nextLogin)
    return
  }

  codeError.value = true
  codeInputRef.value?.reset()

  if (result.passwordErrors && result.passwordErrors.length > 0) {
    serverPasswordErrors.value = result.passwordErrors
  }

  if (
    result.error === 'auth.error.turnstileRequired' ||
    result.error === 'auth.error.turnstileFailed'
  ) {
    forceTurnstileForRegister.value = true
    turnstileToken.value = null
    turnstileIssuedAt.value = null
    turnstileRef.value?.reset()
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
}

async function handleRiskVerificationSubmit() {
  clearInlineErrors()

  if (!riskVerificationCode.value.trim()) {
    riskError.value = t('auth.error.codeRequired')
    return
  }

  if (turnstileEnabled.value && !isRiskTurnstileTokenFresh()) {
    riskError.value = t('auth.error.turnstileRequired')
    return
  }

  const result = await authStore.verifyRiskLogin(
    riskPendingToken.value,
    riskVerificationCode.value.trim(),
    riskTurnstileToken.value || undefined
  )

  if (turnstileEnabled.value) {
    resetRiskTurnstile()
  }

  await applyAuthFlowResult(result)
}

async function handleMfaResolved(result: AuthFlowResult) {
  await applyAuthFlowResult(result)
}

onMounted(() => {
  void import('@/views/LoginPage.vue').catch(() => {})
})

onUnmounted(() => {
  abortRegistrationCodeRequest()
  clearGooglePopupListener()
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})
</script>

<style scoped>
.auth-inline-spin {
  animation: auth-inline-spin 0.9s linear infinite;
}

@keyframes auth-inline-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
