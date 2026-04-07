<template>
  <div class="auth-page auth-page--login">
    <AuthEntryShell
      :title="pageTitle"
      :subtitle="pageSubtitle"
      active-tab="login"
      :redirect-to="redirectTo"
      split
      @back="handleBack"
    >
      <Transition name="step-fade" mode="out-in">
        <form
          v-if="step === 'credentials'"
          key="credentials"
          class="auth-form"
          @submit.prevent="handleCredentialsSubmit"
        >
          <div class="auth-card auth-card--stack">
            <div class="form-group">
              <label for="login-identifier">{{ $t('auth.usernameOrEmail') }}</label>
              <Input
                id="login-identifier"
                v-model="loginIdentifier"
                type="text"
                :placeholder="$t('auth.usernameOrEmailPlaceholder')"
                autocomplete="username"
                required
              />
            </div>

            <div class="form-group">
              <label for="login-password">{{ $t('auth.password') }}</label>
              <div class="password-field">
                <Input
                  id="login-password"
                  v-model="loginPassword"
                  :type="showLoginPassword ? 'text' : 'password'"
                  class="password-input"
                  :placeholder="$t('auth.passwordPlaceholder')"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  class="password-toggle"
                  :aria-label="showLoginPassword ? $t('common.hide') : $t('common.show')"
                  @click="showLoginPassword = !showLoginPassword"
                >
                  <EyeOff v-if="showLoginPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
            </div>

            <p v-if="credentialsError" class="field-error">{{ credentialsError }}</p>

            <div v-if="showCredentialsTurnstile" class="turnstile-block">
              <div class="turnstile-header">
                <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
                <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
              </div>
              <TurnstileWidget
                ref="credentialsTurnstileRef"
                :site-key="turnstileSiteKey"
                action="login"
                size="compact"
                @verify="handleCredentialsTurnstileVerify"
                @expire="handleCredentialsTurnstileExpire"
                @error="handleTurnstileError"
              />
            </div>

            <div class="action-group">
              <Button type="submit" full-width :loading="isLoading">
                {{ $t('auth.loginButton') }}
              </Button>
            </div>

            <div class="auth-primary-meta">
              <RouterLink class="auth-forgot" to="/forgot-password">{{
                $t('auth.forgotPassword')
              }}</RouterLink>
            </div>
          </div>

          <div
            v-if="isPasswordLoginUnavailable"
            class="auth-inline-state auth-inline-state--warning"
          >
            <div class="auth-inline-state__icon" aria-hidden="true">
              <CircleAlert :size="16" />
            </div>
            <div class="auth-inline-state__content">
              <p class="auth-restore__title">{{ $t('auth.passwordLoginUnavailableTitle') }}</p>
              <p class="auth-inline-state__copy">
                {{ $t('auth.passwordLoginUnavailableHint') }}
              </p>
              <div class="auth-inline-state__actions">
                <AuthProviderButton
                  action="google"
                  :label="$t('auth.googleLoginButton')"
                  :loading="googleProviderBusy"
                  :icon="IconGoogle"
                  @click="handleGoogleContinue"
                />
                <RouterLink class="auth-link" to="/forgot-password">{{
                  $t('auth.passwordLoginUnavailableResetAction')
                }}</RouterLink>
              </div>
            </div>
          </div>

          <AuthDivider :label="$t('auth.googleDivider')" />

          <AuthProviderButton
            action="google"
            :label="$t('auth.googleLoginButton')"
            :loading="googleProviderBusy"
            :icon="IconGoogle"
            @click="handleGoogleContinue"
          />

          <div
            v-if="googlePopupState === 'waiting' || googlePopupState === 'recovery'"
            class="auth-inline-state"
            :class="{ 'auth-inline-state--warning': googlePopupState === 'recovery' }"
          >
            <div class="auth-inline-state__icon" aria-hidden="true">
              <LoaderCircle
                v-if="googlePopupState === 'waiting'"
                :size="16"
                class="auth-inline-spin"
              />
              <CircleAlert v-else :size="16" />
            </div>
            <div class="auth-inline-state__content">
              <p class="auth-restore__title">
                {{
                  googlePopupState === 'recovery'
                    ? $t('auth.googlePopupFallbackTitle')
                    : $t('auth.googlePopupWaitingTitle')
                }}
              </p>
              <p class="auth-inline-state__copy">
                {{
                  googlePopupState === 'recovery'
                    ? $t('auth.googlePopupRecoveryHint')
                    : $t('auth.googlePopupWaitingHint')
                }}
              </p>
              <div v-if="googlePopupState === 'recovery'" class="auth-inline-state__actions">
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

          <div
            v-else-if="showGoogleClientChallenge"
            class="auth-inline-state auth-inline-state--warning"
          >
            <div class="auth-inline-state__icon" aria-hidden="true">
              <CircleAlert :size="16" />
            </div>
            <div class="auth-inline-state__content">
              <p class="auth-restore__title">{{ $t('auth.verifyTitle') }}</p>
              <p class="auth-inline-state__copy">{{ $t('auth.clientChallengeHint') }}</p>

              <div v-if="resolvedGoogleClientChallengeSiteKey" class="turnstile-block">
                <div class="turnstile-header">
                  <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
                  <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
                </div>
                <TurnstileWidget
                  ref="googleClientChallengeRef"
                  :site-key="resolvedGoogleClientChallengeSiteKey"
                  action="google-exchange"
                  size="compact"
                  @verify="handleGoogleClientChallengeVerify"
                  @expire="handleGoogleClientChallengeExpire"
                  @error="handleTurnstileError"
                />
              </div>

              <p v-else class="auth-inline-state__copy">{{ $t('auth.clientChallengeLoading') }}</p>
              <p v-if="googleClientChallengeError" class="field-error">
                {{ googleClientChallengeError }}
              </p>
              <p v-if="googleClientChallengeDetail" class="auth-inline-state__copy">
                {{ googleClientChallengeDetail }}
              </p>
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
        </form>

        <form
          v-else-if="step === 'risk-verification'"
          key="risk"
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
              <label for="risk-code">{{ $t('auth.riskVerificationCode') }}</label>
              <Input
                id="risk-code"
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
              <Button type="button" variant="ghost" full-width @click="returnToCredentials">
                {{ $t('auth.returnToCredentials') }}
              </Button>
            </div>
          </div>
        </form>

        <div v-else key="mfa" class="auth-form">
          <AuthMfaStep
            :pending-mfa-login-token="pendingMfaLoginToken"
            :methods="mfaMethods"
            :message="mfaMessage"
            :error-message="mfaError"
            @resolved="handleMfaResolved"
          />

          <button type="button" class="auth-link-button auth-2fa-back" @click="returnToCredentials">
            {{ $t('auth.returnToCredentials') }}
          </button>
        </div>
      </Transition>

      <template #footer>
        <section v-if="showRestorePanel && step === 'credentials'" class="auth-restore">
          <div class="auth-restore__copy">
            <p class="auth-restore__title">{{ $t('auth.restoreTitle') }}</p>
            <p class="auth-inline-state__copy">{{ restoreNotice }}</p>
          </div>

          <div class="form-group">
            <label for="restore-identifier">{{ $t('auth.usernameOrEmail') }}</label>
            <Input
              id="restore-identifier"
              v-model="restoreIdentifier"
              type="text"
              :placeholder="$t('auth.usernameOrEmailPlaceholder')"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="restore-password">{{ $t('auth.password') }}</label>
            <div class="password-field">
              <Input
                id="restore-password"
                v-model="restorePassword"
                :type="showRestorePassword ? 'text' : 'password'"
                class="password-input"
                :placeholder="$t('auth.passwordPlaceholder')"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showRestorePassword ? $t('common.hide') : $t('common.show')"
                @click="showRestorePassword = !showRestorePassword"
              >
                <EyeOff v-if="showRestorePassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            full-width
            :loading="isRestoringAccount"
            :disabled="!canRestoreAccount"
            @click="handleRestoreAccount"
          >
            {{ $t('auth.restoreButton') }}
          </Button>
        </section>

        <p v-if="step === 'credentials'" class="auth-footer">
          {{ $t('auth.noAccount') }}
          <RouterLink to="/register">{{ $t('nav.register') }}</RouterLink>
        </p>
      </template>
    </AuthEntryShell>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'LoginPage' })

import { computed, onMounted, onUnmounted, ref, watch, useTemplateRef } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { CircleAlert, Eye, EyeOff, LoaderCircle } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { userService, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import type { AuthFlowResult } from '@/stores/auth'
import {
  mapGooglePopupError,
  openGoogleAuthPopupFlow,
  prefersGoogleAuthPopup,
  prepareGoogleAuthHandoff,
  resolveGoogleAuthSecurityError,
  type GooglePopupMessage,
  type GooglePopupState,
} from '@/services/googleAuthService'
import { resolveAuthRedirectTarget } from '@/utils/authRedirect'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'
import { clientSecurityService } from '@/api/clientSecurityService'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AuthMfaStep from '@/components/auth/AuthMfaStep.vue'
import AuthEntryShell from '@/components/auth/AuthEntryShell.vue'
import AuthDivider from '@/components/auth/AuthDivider.vue'
import AuthProviderButton from '@/components/auth/AuthProviderButton.vue'
import IconGoogle from '@/components/icons/IconGoogle.vue'

type Step = 'credentials' | 'risk-verification' | 'mfa'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isAuthenticated, isLoading } = storeToRefs(authStore)
const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()
const CHALLENGE_TURNSTILE_ERROR_CODES = new Set([
  'CHALLENGE_REQUIRED',
  'TURNSTILE_REQUIRED',
  'TURNSTILE_TOKEN_MISSING',
  'TURNSTILE_VERIFICATION_FAILED',
])

const loginIdentifier = ref('')
const loginPassword = ref('')
const showLoginPassword = ref(false)
const credentialsError = ref('')
const credentialsErrorCode = ref('')
const requiresCredentialsTurnstile = ref(false)

const step = ref<Step>('credentials')
const riskPendingToken = ref('')
const riskVerificationCode = ref('')
const riskMessage = ref('')
const riskExpiresIn = ref<number | null>(null)
const riskError = ref('')

const pendingMfaLoginToken = ref('')
const mfaMethods = ref<string[]>([])
const mfaMessage = ref('')
const mfaError = ref('')

const nextRedirectTarget = ref('/')
const googlePopupState = ref<GooglePopupState>('idle')
const googlePopupErrorKey = ref('')
const pendingGoogleHandoffCode = ref('')
const googleClientChallengeSiteKey = ref('')
const googleClientChallengeError = ref('')
const googleClientChallengeDetail = ref('')
const isGoogleClientChallengeSubmitting = ref(false)
let googlePopupDispose: (() => void) | null = null
let googlePopupRecoveryTimer: ReturnType<typeof setTimeout> | null = null
let activeGooglePopupWindow: Window | null = null
let googlePopupFlowToken = 0

const restoreIdentifier = ref('')
const restorePassword = ref('')
const showRestorePassword = ref(false)
const isRestoringAccount = ref(false)
const showRestorePanel = ref(false)

const credentialsTurnstileRef = useTemplateRef<{ reset: () => void }>('credentialsTurnstileRef')
const googleClientChallengeRef = useTemplateRef<{ reset: () => void }>('googleClientChallengeRef')
const riskTurnstileRef = useTemplateRef<{ reset: () => void }>('riskTurnstileRef')
const credentialsTurnstileToken = ref<string | null>(null)
const credentialsTurnstileIssuedAt = ref<number | null>(null)
const riskTurnstileToken = ref<string | null>(null)
const riskTurnstileIssuedAt = ref<number | null>(null)

const redirectTo = computed(() => {
  const candidate = typeof route.query['redirect'] === 'string' ? route.query['redirect'] : null
  return resolveAuthRedirectTarget(candidate, '/')
})

const canRestoreAccount = computed(
  () => Boolean(restoreIdentifier.value.trim()) && Boolean(restorePassword.value)
)
const restoreNotice = computed(() =>
  route.query['restore_notice'] === 'deleted'
    ? t('auth.restoreAfterDeleteNotice')
    : t('auth.restoreHint')
)
const isPasswordLoginUnavailable = computed(
  () => credentialsErrorCode.value === 'password_login_unavailable'
)
const googleProviderBusy = computed(
  () =>
    ['opening', 'waiting', 'recovery', 'handling'].includes(googlePopupState.value) ||
    isLoading.value
)
const showCredentialsTurnstile = computed(
  () => turnstileEnabled.value && requiresCredentialsTurnstile.value
)
const googlePopupErrorMessage = computed(() =>
  googlePopupErrorKey.value ? t(googlePopupErrorKey.value) : ''
)
const resolvedGoogleClientChallengeSiteKey = computed(
  () => googleClientChallengeSiteKey.value || turnstileSiteKey.value
)
const showGoogleClientChallenge = computed(
  () => googlePopupState.value === 'handling' && Boolean(pendingGoogleHandoffCode.value)
)
const pageTitle = computed(() => {
  switch (step.value) {
    case 'risk-verification':
      return t('auth.riskVerificationTitle')
    case 'mfa':
      return t('auth.mfa.title')
    default:
      return t('auth.loginTitle')
  }
})
const pageSubtitle = computed(() => {
  switch (step.value) {
    case 'risk-verification':
      return t('auth.riskVerificationHint')
    case 'mfa':
      return t('auth.mfa.hint')
    default:
      return t('auth.loginSubtitle')
  }
})

function isTurnstileTokenFresh(
  token: string | null,
  issuedAt: number | null,
  enabled: boolean
): boolean {
  if (!enabled) return true
  if (!token || !issuedAt) return false
  return Date.now() - issuedAt < 4 * 60 * 1000
}

function resetCredentialsTurnstile() {
  credentialsTurnstileToken.value = null
  credentialsTurnstileIssuedAt.value = null
  credentialsTurnstileRef.value?.reset()
}

function resetRiskTurnstile() {
  riskTurnstileToken.value = null
  riskTurnstileIssuedAt.value = null
  riskTurnstileRef.value?.reset()
}

function handleCredentialsTurnstileVerify(token: string) {
  requiresCredentialsTurnstile.value = true
  credentialsTurnstileToken.value = token
  credentialsTurnstileIssuedAt.value = Date.now()
}

function handleCredentialsTurnstileExpire() {
  credentialsTurnstileToken.value = null
  credentialsTurnstileIssuedAt.value = null
}

function handleRiskTurnstileVerify(token: string) {
  riskTurnstileToken.value = token
  riskTurnstileIssuedAt.value = Date.now()
}

function handleRiskTurnstileExpire() {
  riskTurnstileToken.value = null
  riskTurnstileIssuedAt.value = null
}

function handleTurnstileError(error?: Error) {
  if (step.value === 'credentials') {
    requiresCredentialsTurnstile.value = true
  }
  toastStore.error(t(getTurnstileErrorMessageKey(error)))
}

function clearInlineErrors() {
  credentialsError.value = ''
  credentialsErrorCode.value = ''
  riskError.value = ''
  mfaError.value = ''
}

function isExpiredGoogleHandoffResult(
  result: Extract<AuthFlowResult, { status: 'error' }>
): boolean {
  const detail = result.detail?.trim().toLowerCase() ?? ''
  return (
    result.error === 'auth.error.googleLoginExpired' ||
    result.code === 'invalid_google_handoff' ||
    detail === 'invalid or expired google handoff code' ||
    detail === 'invalid google handoff code'
  )
}

function resetGoogleClientChallengeState() {
  pendingGoogleHandoffCode.value = ''
  googleClientChallengeSiteKey.value = ''
  googleClientChallengeError.value = ''
  googleClientChallengeDetail.value = ''
  isGoogleClientChallengeSubmitting.value = false
  googleClientChallengeRef.value?.reset?.()
}

function setGooglePopupStatus(state: GooglePopupState, errorKey = '') {
  googlePopupState.value = state
  googlePopupErrorKey.value = errorKey
}

function clearGooglePopupRecoveryTimer() {
  if (!googlePopupRecoveryTimer) return
  clearTimeout(googlePopupRecoveryTimer)
  googlePopupRecoveryTimer = null
}

function closeActiveGooglePopupWindow() {
  const popup = activeGooglePopupWindow
  activeGooglePopupWindow = null

  if (!popup) return

  try {
    if (!popup.closed) {
      popup.close()
    }
  } catch {
    // ignore close failures
  }
}

function armGooglePopupRecovery(flowToken: number) {
  clearGooglePopupRecoveryTimer()
  googlePopupRecoveryTimer = setTimeout(() => {
    if (flowToken === googlePopupFlowToken && googlePopupState.value === 'waiting') {
      void continueGoogleInCurrentPage({ closePopup: true })
    }
  }, 12000)
}

function clearGooglePopupListener(options: { closePopup?: boolean; invalidate?: boolean } = {}) {
  if (options.invalidate !== false) {
    googlePopupFlowToken += 1
  }
  if (googlePopupDispose) {
    googlePopupDispose()
    googlePopupDispose = null
  }
  clearGooglePopupRecoveryTimer()
  if (options.closePopup) {
    closeActiveGooglePopupWindow()
    return
  }
  activeGooglePopupWindow = null
}

function resetGooglePopupState() {
  clearGooglePopupListener()
  setGooglePopupStatus('idle')
  resetGoogleClientChallengeState()
}

function getPrimaryFallbackRedirect(): string {
  return resolveAuthRedirectTarget(nextRedirectTarget.value, redirectTo.value)
}

function returnToCredentials() {
  step.value = 'credentials'
  riskPendingToken.value = ''
  riskVerificationCode.value = ''
  riskMessage.value = ''
  riskExpiresIn.value = null
  pendingMfaLoginToken.value = ''
  mfaMethods.value = []
  mfaMessage.value = ''
  clearInlineErrors()
  resetRiskTurnstile()
  resetGooglePopupState()
}

function handleBack() {
  if (step.value !== 'credentials') {
    returnToCredentials()
    return
  }

  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.replace('/')
}

async function finalizeSuccessfulLogin(result: Extract<AuthFlowResult, { status: 'success' }>) {
  if (result.securityWarning === 'high') {
    toastStore.warning(t('auth.securityWarningHigh'))
  } else if (result.securityWarning === 'medium') {
    toastStore.warning(t('auth.securityWarningMedium'))
  } else {
    toastStore.success(t('auth.loginSuccess'))
  }

  await router.replace(resolveAuthRedirectTarget(result.redirectTo, getPrimaryFallbackRedirect()))
}

async function applyAuthFlowResult(result: AuthFlowResult) {
  switch (result.status) {
    case 'success':
      resetGooglePopupState()
      await finalizeSuccessfulLogin(result)
      return
    case 'risk-verification':
      resetGooglePopupState()
      step.value = 'risk-verification'
      riskPendingToken.value = result.pendingToken
      riskVerificationCode.value = ''
      riskMessage.value = result.message || ''
      riskExpiresIn.value = result.expiresIn ?? null
      riskError.value = ''
      nextRedirectTarget.value = resolveAuthRedirectTarget(
        result.redirectTo,
        getPrimaryFallbackRedirect()
      )
      resetRiskTurnstile()
      return
    case 'mfa':
      resetGooglePopupState()
      step.value = 'mfa'
      pendingMfaLoginToken.value = result.pendingMfaLoginToken
      mfaMethods.value = result.methods
      mfaMessage.value = result.message || ''
      mfaError.value = ''
      nextRedirectTarget.value = resolveAuthRedirectTarget(
        result.redirectTo,
        getPrimaryFallbackRedirect()
      )
      return
    case 'error': {
      if (step.value === 'risk-verification') {
        riskError.value = t(result.error)
      } else if (step.value === 'mfa') {
        mfaError.value = t(result.error)
      } else {
        if (
          (result.code && CHALLENGE_TURNSTILE_ERROR_CODES.has(result.code)) ||
          result.error === 'auth.error.turnstileRequired' ||
          result.error === 'auth.error.turnstileFailed'
        ) {
          requiresCredentialsTurnstile.value = true
        }
        credentialsError.value = t(result.error)
        credentialsErrorCode.value = result.code || ''
      }
      return
    }
    default:
      return
  }
}

async function handleCredentialsSubmit() {
  if (isLoading.value) return

  clearInlineErrors()
  resetGooglePopupState()

  if (!loginIdentifier.value.trim() || !loginPassword.value) {
    credentialsError.value = t('auth.error.fieldsRequired')
    return
  }

  if (
    showCredentialsTurnstile.value &&
    !isTurnstileTokenFresh(
      credentialsTurnstileToken.value,
      credentialsTurnstileIssuedAt.value,
      turnstileEnabled.value
    )
  ) {
    credentialsError.value = t('auth.error.turnstileRequired')
    return
  }

  nextRedirectTarget.value = redirectTo.value

  const result = await authStore.login(
    loginIdentifier.value.trim(),
    loginPassword.value,
    credentialsTurnstileToken.value || undefined
  )
  if (turnstileEnabled.value) {
    resetCredentialsTurnstile()
  }
  await applyAuthFlowResult(result)
}

async function handleRiskVerificationSubmit() {
  clearInlineErrors()

  if (!riskVerificationCode.value.trim()) {
    riskError.value = t('auth.error.codeRequired')
    return
  }

  if (
    turnstileEnabled.value &&
    !isTurnstileTokenFresh(
      riskTurnstileToken.value,
      riskTurnstileIssuedAt.value,
      turnstileEnabled.value
    )
  ) {
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

async function handleGooglePopupResult(message: GooglePopupMessage) {
  if (message.status === 'success' && message.handoffCode) {
    nextRedirectTarget.value = resolveAuthRedirectTarget(
      message.redirectTo,
      getPrimaryFallbackRedirect()
    )
    pendingGoogleHandoffCode.value = message.handoffCode
    googleClientChallengeError.value = ''
    googleClientChallengeDetail.value = ''

    const handoffPreparation = await prepareGoogleAuthHandoff(
      message.handoffCode,
      turnstileSiteKey.value.trim()
    )

    if (handoffPreparation.status === 'challenge-required') {
      googleClientChallengeSiteKey.value = handoffPreparation.siteKey
      setGooglePopupStatus('handling')
      return
    }

    if (handoffPreparation.status === 'error') {
      resetGoogleClientChallengeState()
      setGooglePopupStatus('error', handoffPreparation.messageKey)
      credentialsError.value = t(handoffPreparation.messageKey)
      return
    }

    const result = await authStore.completeGoogleAuth(handoffPreparation.handoffCode)
    await applyAuthFlowResult(result)
    return
  }

  resetGoogleClientChallengeState()
  const errorKey = mapGooglePopupError(message.error)
  setGooglePopupStatus(
    message.error === 'popup_blocked' || message.error === 'popup_closed' ? 'blocked' : 'error',
    errorKey
  )
  credentialsError.value = t(errorKey)
}

function handleGoogleClientChallengeExpire() {
  googleClientChallengeError.value = t('auth.error.turnstileRequired')
  googleClientChallengeDetail.value = ''
}

async function handleGoogleClientChallengeVerify(token: string) {
  if (isGoogleClientChallengeSubmitting.value) return

  isGoogleClientChallengeSubmitting.value = true
  googleClientChallengeError.value = ''
  googleClientChallengeDetail.value = ''

  try {
    await clientSecurityService.verify(token)

    if (!pendingGoogleHandoffCode.value.trim()) {
      setGooglePopupStatus('error', 'auth.error.callbackMissingHandoffCode')
      credentialsError.value = t('auth.error.callbackMissingHandoffCode')
      return
    }

    const result = await authStore.completeGoogleAuth(pendingGoogleHandoffCode.value.trim())
    if (result.status === 'error') {
      if (isExpiredGoogleHandoffResult(result)) {
        resetGoogleClientChallengeState()
        setGooglePopupStatus('error', 'auth.error.googleLoginExpired')
        credentialsError.value = ''
        return
      }
      googleClientChallengeError.value = t(result.error)
      googleClientChallengeDetail.value = result.detail || ''
      return
    }
    await applyAuthFlowResult(result)
  } catch (error) {
    const resolvedError = resolveGoogleAuthSecurityError(error)
    googleClientChallengeError.value = t(resolvedError.messageKey)
    googleClientChallengeDetail.value = resolvedError.detail
    googleClientChallengeRef.value?.reset?.()
  } finally {
    isGoogleClientChallengeSubmitting.value = false
  }
}

async function continueGoogleInCurrentPage(options: { closePopup?: boolean } = {}) {
  clearGooglePopupListener({
    closePopup: options.closePopup ?? false,
  })
  resetGoogleClientChallengeState()
  setGooglePopupStatus('handling')
  const result = await authStore.startGoogleAuth('login', redirectTo.value)

  if (result.status === 'error') {
    setGooglePopupStatus('error', result.error)
    credentialsError.value = t(result.error)
  }
}

async function handleGoogleContinue() {
  if (googleProviderBusy.value) return

  clearInlineErrors()
  resetGoogleClientChallengeState()

  if (!prefersGoogleAuthPopup()) {
    await continueGoogleInCurrentPage()
    return
  }

  clearGooglePopupListener({ closePopup: true })
  setGooglePopupStatus('opening')
  const popupResult = openGoogleAuthPopupFlow('login', redirectTo.value, {
    timeoutMs: 4 * 60 * 1000,
  })

  if (popupResult.status === 'blocked') {
    setGooglePopupStatus('blocked', 'auth.error.googlePopupBlocked')
    return
  }

  const flowToken = ++googlePopupFlowToken
  activeGooglePopupWindow = popupResult.popup
  googlePopupDispose = popupResult.dispose
  setGooglePopupStatus('waiting')
  armGooglePopupRecovery(flowToken)

  void popupResult.promise.then(async (message) => {
    if (flowToken !== googlePopupFlowToken) {
      return
    }

    googlePopupDispose = null
    clearGooglePopupRecoveryTimer()
    activeGooglePopupWindow = null
    setGooglePopupStatus('handling')
    await handleGooglePopupResult(message)
  })
}

function buildLoginQueryWithoutRestore() {
  const nextQuery = { ...route.query }
  delete nextQuery['mode']
  delete nextQuery['identifier']
  delete nextQuery['restore_notice']
  return nextQuery
}

async function handleRestoreAccount() {
  if (isRestoringAccount.value) return

  if (!canRestoreAccount.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    return
  }

  isRestoringAccount.value = true
  try {
    await userService.restoreAccount({
      identifier: restoreIdentifier.value.trim(),
      password: restorePassword.value,
    })

    restorePassword.value = ''
    toastStore.success(t('profile.restoreAccountSuccess'))
    await router.replace({
      name: 'login',
      query: buildLoginQueryWithoutRestore(),
    })
  } catch (error) {
    toastStore.error(error instanceof ApiError ? error.message : t('common.error'))
  } finally {
    isRestoringAccount.value = false
  }
}

watch(
  () => route.query['mode'],
  (mode) => {
    showRestorePanel.value = mode === 'restore'
  },
  { immediate: true }
)

watch(
  () => route.query['identifier'],
  (identifier) => {
    if (typeof identifier === 'string' && identifier.trim()) {
      restoreIdentifier.value = identifier.trim()
    }
  },
  { immediate: true }
)

if (isAuthenticated.value) {
  void router.replace(redirectTo.value)
}

onMounted(() => {
  void import('@/views/RegisterPage.vue').catch(() => {})
  void import('@/views/ForgotPasswordPage.vue').catch(() => {})
})

onUnmounted(() => {
  clearGooglePopupListener({ closePopup: true })
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
