<template>
  <div class="auth-page auth-page--login">
    <AuthEntryShell
      :title="pageTitle"
      :subtitle="pageSubtitle"
      :show-back="!isPopupBridgeMode"
      :show-tabs="false"
      wide
      @back="returnToLogin"
    >
      <template v-if="isPopupBridgeMode">
        <div class="auth-card auth-card--stack auth-callback-card">
          <div class="status-icon status-icon--loading auth-callback-spinner" aria-hidden="true" />
          <p class="auth-helper">
            {{
              popupBridgeState === 'manual-close'
                ? $t('auth.callback.popupManualCloseHint')
                : $t('auth.callback.popupHint')
            }}
          </p>

          <div v-if="popupBridgeState === 'manual-close'" class="action-group">
            <Button type="button" full-width @click="closePopupWindow">
              {{ $t('auth.callback.closeAction') }}
            </Button>
          </div>
        </div>
      </template>

      <Transition v-else name="step-fade" mode="out-in">
        <div
          v-if="currentStep === 'loading'"
          key="loading"
          class="auth-card auth-card--stack auth-callback-card"
        >
          <div class="status-icon status-icon--loading auth-callback-spinner" aria-hidden="true" />
          <p class="auth-helper">{{ $t('auth.callback.loadingHint') }}</p>
        </div>

        <div
          v-else-if="currentStep === 'client-challenge'"
          key="client-challenge"
          class="auth-form"
        >
          <div class="auth-card auth-card--stack auth-callback-card">
            <AuthTurnstileStatus
              v-if="resolvedClientChallengeSiteKey"
              :status="clientChallengeStatus"
              :error-message="clientChallengeError"
              :detail="clientChallengeDetail"
              :show-widget-frame="clientChallengeStatus === 'interactive_required'"
            >
              <TurnstileWidget
                ref="clientChallengeTurnstileRef"
                :site-key="resolvedClientChallengeSiteKey"
                action="google-exchange"
                size="compact"
                appearance="execute"
                execution="execute"
                auto-execute
                @verify="handleClientChallengeVerify"
                @expire="handleClientChallengeExpire"
                @error="handleClientChallengeWidgetError"
                @status="clientChallengeStatus = $event"
              />
            </AuthTurnstileStatus>

            <p v-else class="auth-helper">{{ $t('auth.clientChallengeLoading') }}</p>

            <div class="action-group">
              <Button
                type="button"
                variant="ghost"
                full-width
                :disabled="isClientChallengeSubmitting"
                @click="returnToLogin"
              >
                {{ $t('auth.backToLogin') }}
              </Button>
            </div>
          </div>
        </div>

        <form
          v-else-if="currentStep === 'risk-verification'"
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
              <label for="callback-risk-code">{{ $t('auth.riskVerificationCode') }}</label>
              <Input
                id="callback-risk-code"
                v-model="riskVerificationCode"
                type="text"
                inputmode="numeric"
                maxlength="8"
                :placeholder="$t('auth.riskVerificationCodePlaceholder')"
                autocomplete="one-time-code"
              />
            </div>

            <p v-if="riskError" class="field-error">{{ riskError }}</p>

            <AuthTurnstileStatus
              v-if="turnstileEnabled"
              :status="riskTurnstileStatus"
              :show-widget-frame="riskTurnstileStatus === 'interactive_required'"
            >
              <TurnstileWidget
                ref="riskTurnstileRef"
                :site-key="turnstileSiteKey"
                action="risk-login"
                size="compact"
                appearance="execute"
                execution="execute"
                auto-execute
                @verify="handleRiskTurnstileVerify"
                @expire="handleRiskTurnstileExpire"
                @error="handleTurnstileError"
                @status="riskTurnstileStatus = $event"
              />
            </AuthTurnstileStatus>

            <div class="action-group">
              <Button
                type="submit"
                full-width
                :loading="isLoading || riskTurnstileStatus === 'executing'"
                :disabled="isRiskTurnstileBusy"
              >
                {{ $t('auth.verifyButton') }}
              </Button>
              <Button type="button" variant="ghost" full-width @click="returnToLogin">
                {{ $t('auth.backToLogin') }}
              </Button>
            </div>
          </div>
        </form>

        <div v-else-if="currentStep === 'mfa'" key="mfa" class="auth-form">
          <AuthMfaStep
            :pending-mfa-login-token="pendingMfaLoginToken"
            :methods="mfaMethods"
            :message="mfaMessage"
            :error-message="mfaError"
            @resolved="handleMfaResolved"
          />

          <button type="button" class="auth-link-button auth-2fa-back" @click="returnToLogin">
            {{ $t('auth.backToLogin') }}
          </button>
        </div>

        <div v-else key="error" class="auth-card auth-card--stack auth-callback-card">
          <div class="status-icon status-icon--error" aria-hidden="true">
            <AlertCircle :size="28" />
          </div>
          <p class="field-error">{{ errorMessage }}</p>
          <p v-if="errorDetail" class="auth-helper">{{ errorDetail }}</p>

          <div class="action-group">
            <Button type="button" full-width @click="retryGoogleAuth">
              {{ $t('auth.callback.retryAction') }}
            </Button>
            <Button type="button" variant="ghost" full-width @click="returnToLogin">
              {{ $t('auth.backToLogin') }}
            </Button>
          </div>
        </div>
      </Transition>
    </AuthEntryShell>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AuthCallbackPage' })

import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { AlertCircle } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { authService } from '@/api'
import { clientSecurityService } from '@/api/clientSecurityService'
import { useAuthStore, useToastStore } from '@/stores'
import type { AuthFlowResult } from '@/stores/auth'
import {
  bridgeGooglePopupResult,
  getPendingGoogleAuthRequest,
  prepareGoogleAuthHandoff,
  resolveGooglePopupBridgeMessage,
  resolveGoogleAuthSecurityError,
  startGoogleAuthRedirect,
} from '@/services/googleAuthService'
import { resolveAuthRedirectTarget } from '@/utils/authRedirect'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'
import { isTurnstileBusy, type TurnstileWidgetStatus } from '@/utils/turnstileWidgetStatus'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AuthTurnstileStatus from '@/components/auth/AuthTurnstileStatus.vue'
import AuthMfaStep from '@/components/auth/AuthMfaStep.vue'
import AuthEntryShell from '@/components/auth/AuthEntryShell.vue'

type CallbackStep = 'loading' | 'client-challenge' | 'risk-verification' | 'mfa' | 'error'
type PopupBridgeState = 'posting' | 'manual-close'
const GOOGLE_AUTH_ENABLED =
  import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true'
    ? true
    : import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

const POPUP_BRIDGE_CLOSE_DELAY_MS = 320
const POPUP_BRIDGE_MANUAL_CLOSE_HINT_DELAY_MS = 1000
const CLIENT_CHALLENGE_ERROR_CODES = new Set([
  'CHALLENGE_REQUIRED',
  'TURNSTILE_REQUIRED',
  'TURNSTILE_TOKEN_MISSING',
])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()
const { isLoading } = storeToRefs(authStore)
const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()

const pendingRequest = getPendingGoogleAuthRequest()
const isPopupBridgeMode = ref(false)
const popupBridgeState = ref<PopupBridgeState>('posting')
const currentStep = ref<CallbackStep>('loading')
const pendingGoogleHandoffCode = ref('')
const nextRedirectTarget = ref(
  resolveAuthRedirectTarget(
    typeof route.query['redirect'] === 'string' ? route.query['redirect'] : null,
    pendingRequest?.redirectTo || '/'
  )
)

const riskPendingToken = ref('')
const riskVerificationCode = ref('')
const riskMessage = ref('')
const riskExpiresIn = ref<number | null>(null)
const riskError = ref('')
const clientChallengeSiteKey = ref('')
const clientChallengeError = ref('')
const clientChallengeDetail = ref('')
const isClientChallengeSubmitting = ref(false)
const clientChallengeStatus = ref<TurnstileWidgetStatus>('idle')
type TurnstileWidgetHandle = {
  reset: () => void
  execute?: () => Promise<string>
}

const clientChallengeTurnstileRef = useTemplateRef<TurnstileWidgetHandle>(
  'clientChallengeTurnstileRef'
)
const riskTurnstileRef = useTemplateRef<TurnstileWidgetHandle>('riskTurnstileRef')
const riskTurnstileToken = ref<string | null>(null)
const riskTurnstileIssuedAt = ref<number | null>(null)
const riskTurnstileStatus = ref<TurnstileWidgetStatus>('idle')

const pendingMfaLoginToken = ref('')
const mfaMethods = ref<string[]>([])
const mfaMessage = ref('')
const mfaError = ref('')

const errorMessage = ref('')
const errorDetail = ref('')
const resolvedClientChallengeSiteKey = computed(
  () => clientChallengeSiteKey.value || turnstileSiteKey.value
)
const isRiskTurnstileBusy = computed(() => isTurnstileBusy(riskTurnstileStatus.value))

const pageTitle = computed(() => {
  if (isPopupBridgeMode.value) {
    return t('auth.callback.popupTitle')
  }

  switch (currentStep.value) {
    case 'client-challenge':
      return t('auth.verifyTitle')
    case 'risk-verification':
      return t('auth.riskVerificationTitle')
    case 'mfa':
      return t('auth.mfa.title')
    case 'error':
      return t('auth.callback.errorTitle')
    default:
      return t('auth.callback.title')
  }
})

const pageSubtitle = computed(() => {
  if (isPopupBridgeMode.value) {
    return t('auth.callback.popupSubtitle')
  }

  switch (currentStep.value) {
    case 'client-challenge':
      return ''
    case 'risk-verification':
      return t('auth.riskVerificationHint')
    case 'mfa':
      return t('auth.mfa.hint')
    case 'error':
      return t('auth.callback.errorHint')
    default:
      return t('auth.callback.subtitle')
  }
})

function isTurnstileTokenFresh(token: string | null, issuedAt: number | null): boolean {
  if (!turnstileEnabled.value) return true
  if (!token || !issuedAt) return false
  return Date.now() - issuedAt < 4 * 60 * 1000
}

function resetRiskTurnstile() {
  riskTurnstileToken.value = null
  riskTurnstileIssuedAt.value = null
  riskTurnstileStatus.value = 'idle'
  riskTurnstileRef.value?.reset()
}

function handleRiskTurnstileVerify(token: string) {
  riskTurnstileToken.value = token
  riskTurnstileIssuedAt.value = Date.now()
}

function handleRiskTurnstileExpire() {
  riskTurnstileToken.value = null
  riskTurnstileIssuedAt.value = null
  riskTurnstileStatus.value = 'expired'
}

function handleTurnstileError(error?: Error) {
  toastStore.error(t(getTurnstileErrorMessageKey(error)))
}

async function executeTurnstileChallenge(
  widget: TurnstileWidgetHandle | null | undefined,
  onToken?: (token: string) => void
): Promise<string | null> {
  const token = await widget?.execute?.()
  if (token) {
    onToken?.(token)
    return token
  }
  return null
}

function resolveSecurityStepError(error: unknown): { message: string; detail: string } {
  const resolved = resolveGoogleAuthSecurityError(error)
  return {
    message: t(resolved.messageKey),
    detail: resolved.detail,
  }
}

function clearInlineErrors() {
  clientChallengeError.value = ''
  clientChallengeDetail.value = ''
  riskError.value = ''
  mfaError.value = ''
  errorMessage.value = ''
  errorDetail.value = ''
}

function clearPendingGoogleHandoff() {
  pendingGoogleHandoffCode.value = ''
  clientChallengeSiteKey.value = ''
  clientChallengeStatus.value = 'idle'
  clientChallengeTurnstileRef.value?.reset?.()
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

function enterClientChallengeStep(siteKey?: string | null) {
  const resolvedSiteKey =
    siteKey?.trim() || turnstileSiteKey.value.trim() || clientChallengeSiteKey.value.trim()

  if (!resolvedSiteKey) {
    currentStep.value = 'error'
    errorMessage.value = t('auth.error.turnstileFailed')
    errorDetail.value = 'Missing Turnstile site key for Google callback challenge.'
    return
  }

  clientChallengeSiteKey.value = resolvedSiteKey
  clientChallengeError.value = ''
  clientChallengeDetail.value = ''
  currentStep.value = 'client-challenge'
}

function handleClientChallengeExpire() {
  clientChallengeStatus.value = 'expired'
  clientChallengeError.value = t('auth.error.turnstileRequired')
  clientChallengeDetail.value = ''
}

function handleClientChallengeWidgetError(error?: Error) {
  clientChallengeError.value = t(getTurnstileErrorMessageKey(error))
  clientChallengeDetail.value = error?.message || ''
}

async function handleClientChallengeVerify(token: string) {
  if (isClientChallengeSubmitting.value) return

  isClientChallengeSubmitting.value = true
  clientChallengeError.value = ''
  clientChallengeDetail.value = ''

  try {
    await clientSecurityService.verify(token, { diagnosticsContext: 'google-auth' })

    if (!pendingGoogleHandoffCode.value.trim()) {
      currentStep.value = 'error'
      errorMessage.value = t('auth.error.callbackMissingHandoffCode')
      return
    }

    currentStep.value = 'loading'
    const handoffCode = pendingGoogleHandoffCode.value.trim()
    const result = await authStore.completeGoogleAuth(handoffCode)
    await applyCallbackResult(result)
  } catch (error) {
    currentStep.value = 'client-challenge'
    const resolvedError = resolveSecurityStepError(error)
    clientChallengeError.value = resolvedError.message
    clientChallengeDetail.value = resolvedError.detail
    clientChallengeTurnstileRef.value?.reset?.()
  } finally {
    isClientChallengeSubmitting.value = false
  }
}

async function finalizeSuccessfulLogin(result: Extract<AuthFlowResult, { status: 'success' }>) {
  toastStore.success(t('auth.loginSuccess'))
  await router.replace(resolveAuthRedirectTarget(result.redirectTo, nextRedirectTarget.value))
}

async function applyCallbackResult(result: AuthFlowResult) {
  switch (result.status) {
    case 'success':
      await finalizeSuccessfulLogin(result)
      return
    case 'risk-verification':
      currentStep.value = 'risk-verification'
      riskPendingToken.value = result.pendingToken
      riskVerificationCode.value = ''
      riskMessage.value = result.message || ''
      riskExpiresIn.value = result.expiresIn ?? null
      riskError.value = ''
      nextRedirectTarget.value = resolveAuthRedirectTarget(
        result.redirectTo,
        nextRedirectTarget.value
      )
      resetRiskTurnstile()
      return
    case 'mfa':
      currentStep.value = 'mfa'
      pendingMfaLoginToken.value = result.pendingMfaLoginToken
      mfaMethods.value = result.methods
      mfaMessage.value = result.message || ''
      mfaError.value = ''
      nextRedirectTarget.value = resolveAuthRedirectTarget(
        result.redirectTo,
        nextRedirectTarget.value
      )
      return
    case 'error':
      if (isExpiredGoogleHandoffResult(result)) {
        clearPendingGoogleHandoff()
        currentStep.value = 'error'
        errorMessage.value = t('auth.error.googleLoginExpired')
        errorDetail.value = result.detail || ''
        return
      }
      if (currentStep.value === 'risk-verification') {
        riskError.value = t(result.error)
      } else if (currentStep.value === 'mfa') {
        mfaError.value = t(result.error)
      } else if (result.code && CLIENT_CHALLENGE_ERROR_CODES.has(result.code)) {
        enterClientChallengeStep()
        clientChallengeError.value = t(result.error)
        clientChallengeDetail.value = result.detail || ''
      } else {
        currentStep.value = 'error'
        errorMessage.value = t(result.error)
        errorDetail.value = result.detail || ''
      }
      return
    default:
      return
  }
}

function returnToLogin() {
  const redirect = resolveAuthRedirectTarget(nextRedirectTarget.value, '/')
  if (redirect === '/') {
    void router.replace('/login')
    return
  }
  void router.replace(`/login?redirect=${encodeURIComponent(redirect)}`)
}

function closePopupWindow() {
  window.close()
}

async function retryGoogleAuth() {
  if (!GOOGLE_AUTH_ENABLED) {
    currentStep.value = 'error'
    errorMessage.value = t('auth.error.googleLoginFailed')
    errorDetail.value = 'Google login is temporarily unavailable.'
    return
  }

  const intent = pendingRequest?.intent || 'login'
  const redirect = resolveAuthRedirectTarget(pendingRequest?.redirectTo, nextRedirectTarget.value)
  startGoogleAuthRedirect(intent, redirect)
}

async function handleRiskVerificationSubmit() {
  clearInlineErrors()

  if (!riskVerificationCode.value.trim()) {
    riskError.value = t('auth.error.codeRequired')
    return
  }

  if (!isTurnstileTokenFresh(riskTurnstileToken.value, riskTurnstileIssuedAt.value)) {
    const token = await executeTurnstileChallenge(riskTurnstileRef.value, (nextToken) => {
      riskTurnstileToken.value = nextToken
      riskTurnstileIssuedAt.value = Date.now()
    })
    if (!token) {
      riskError.value = t('auth.error.turnstileRequired')
      return
    }
  }

  const result = await authStore.verifyRiskLogin(
    riskPendingToken.value,
    riskVerificationCode.value.trim(),
    riskTurnstileToken.value || undefined
  )
  if (turnstileEnabled.value) {
    resetRiskTurnstile()
  }
  await applyCallbackResult(result)
}

async function handleMfaResolved(result: AuthFlowResult) {
  await applyCallbackResult(result)
}

function shouldUsePopupBridge(): boolean {
  return resolveGooglePopupBridgeMessage({ pendingRequest }) !== null
}

async function runPopupBridge(): Promise<boolean> {
  if (!shouldUsePopupBridge()) return false

  isPopupBridgeMode.value = true
  popupBridgeState.value = 'posting'
  bridgeGooglePopupResult({ pendingRequest })

  window.setTimeout(() => {
    window.close()
  }, POPUP_BRIDGE_CLOSE_DELAY_MS)

  window.setTimeout(() => {
    popupBridgeState.value = 'manual-close'
  }, POPUP_BRIDGE_MANUAL_CLOSE_HINT_DELAY_MS)

  return true
}

async function preloadTurnstileSiteKey(): Promise<string> {
  try {
    const config = await authService.getTurnstileConfig()
    const resolvedSiteKey = config.enabled ? (config.site_key ?? '').trim() : ''
    turnstileSiteKey.value = resolvedSiteKey
    return resolvedSiteKey
  } catch {
    return turnstileSiteKey.value.trim()
  }
}

async function runInitialExchange() {
  if (!GOOGLE_AUTH_ENABLED) {
    currentStep.value = 'error'
    errorMessage.value = t('auth.error.googleLoginFailed')
    errorDetail.value = 'Google login is temporarily unavailable.'
    return
  }

  clearInlineErrors()
  currentStep.value = 'loading'

  const callbackError = typeof route.query['error'] === 'string' ? route.query['error'].trim() : ''
  const handoffCode =
    typeof route.query['handoff_code'] === 'string' ? route.query['handoff_code'] : ''
  if (callbackError) {
    currentStep.value = 'error'
    errorMessage.value = t(
      callbackError === 'access_denied'
        ? 'auth.error.googleAccessDenied'
        : 'auth.error.googleLoginFailed'
    )
    errorDetail.value = callbackError
    return
  }

  if (!handoffCode.trim()) {
    currentStep.value = 'error'
    errorMessage.value = t('auth.error.callbackMissingHandoffCode')
    errorDetail.value = 'Invalid Google callback: missing handoff_code and error.'
    return
  }

  pendingGoogleHandoffCode.value = handoffCode.trim()
  const resolvedSiteKey = await preloadTurnstileSiteKey()
  const handoffPreparation = await prepareGoogleAuthHandoff(
    pendingGoogleHandoffCode.value,
    resolvedSiteKey
  )

  if (handoffPreparation.status === 'challenge-required') {
    enterClientChallengeStep(handoffPreparation.siteKey)
    return
  }

  if (handoffPreparation.status === 'error') {
    currentStep.value = 'error'
    errorMessage.value = t(handoffPreparation.messageKey)
    errorDetail.value = handoffPreparation.detail
    return
  }

  const result = await authStore.completeGoogleAuth(pendingGoogleHandoffCode.value)
  await applyCallbackResult(result)
}

onMounted(async () => {
  if (await runPopupBridge()) {
    return
  }

  void runInitialExchange()
})
</script>

<style scoped>
.auth-callback-card {
  justify-items: center;
  text-align: center;
}

.auth-callback-spinner::before {
  content: '';
  inline-size: 2rem;
  block-size: 2rem;
  border: 0.18rem solid color-mix(in srgb, var(--auth-form-border) 80%, transparent);
  border-top-color: var(--auth-accent);
  border-radius: 999rem;
  animation: auth-callback-spin 0.9s linear infinite;
}

@keyframes auth-callback-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
