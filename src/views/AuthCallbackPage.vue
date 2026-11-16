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

import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { AlertCircle } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { scrubSensitiveUrlParameters } from '@/utils/sensitiveUrl'
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
import { subscribeAuthSessionScope } from '@/services/authSessionScope'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'
import { isTurnstileBusy, type TurnstileWidgetStatus } from '@/utils/turnstileWidgetStatus'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import { AuthEntryShell } from '@/components/auth/entry'
import { AuthMfaStep, AuthTurnstileStatus } from '@/components/auth/security'

type CallbackStep = 'loading' | 'client-challenge' | 'risk-verification' | 'mfa' | 'error'
type PopupBridgeState = 'posting' | 'manual-close'
const GOOGLE_AUTH_ENABLED =
  import.meta.env.MODE === 'test' || import.meta.env['VITEST'] === 'true'
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
const { isLoading: storeLoading } = storeToRefs(authStore)
const callbackBusy = ref(false)
const isLoading = computed(() => storeLoading.value || callbackBusy.value)
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
let popupBridgeCloseTimer: number | null = null
let popupBridgeManualHintTimer: number | null = null
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

type CallbackFlow = {
  signal: AbortSignal
  isCurrent: () => boolean
  observeSession: () => void
  handoffToStore: () => void
  abort: () => void
}
let currentFlow: CallbackFlow | null = null
let disposed = false

function cancelCallbackFlow() {
  const previous = currentFlow
  currentFlow = null
  previous?.abort()
  callbackBusy.value = false
  isClientChallengeSubmitting.value = false
}

function showCancelledCallback() {
  cancelCallbackFlow()
  currentStep.value = 'error'
  errorMessage.value = t('auth.error.googleLoginFailed')
  errorDetail.value = ''
}

function beginCallbackFlow(): CallbackFlow | null {
  if (disposed) return null
  cancelCallbackFlow()
  const controller = new AbortController()
  let stopSessionObservation = () => {}
  const flow: CallbackFlow = {
    signal: controller.signal,
    isCurrent: () => currentFlow === flow && !controller.signal.aborted,
    observeSession() {
      stopSessionObservation()
      if (flow.isCurrent())
        stopSessionObservation = subscribeAuthSessionScope(showCancelledCallback)
    },
    handoffToStore: () => stopSessionObservation(),
    abort() {
      controller.abort()
      stopSessionObservation()
    },
  }
  currentFlow = flow
  flow.observeSession()
  return flow
}

async function completeCallbackRequest(flow: CallbackFlow, request: () => Promise<AuthFlowResult>) {
  flow.handoffToStore()
  const result = await request()
  if (!flow.isCurrent()) return
  if (result.status === 'error' && result.code === 'auth_flow_cancelled') {
    showCancelledCallback()
    return
  }
  if (result.status !== 'success' && result.status !== 'mfa') flow.observeSession()
  await applyCallbackResult(result)
}

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
  widget: TurnstileWidgetHandle | null | undefined
): Promise<string | null> {
  const token = await widget?.execute?.()
  return token || null
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
  const flow = currentFlow
  if (!flow?.isCurrent() || currentStep.value !== 'client-challenge' || isLoading.value) return

  callbackBusy.value = true
  isClientChallengeSubmitting.value = true
  clientChallengeError.value = ''
  clientChallengeDetail.value = ''

  try {
    await clientSecurityService.verify(token, {
      diagnosticsContext: 'google-auth',
      signal: flow.signal,
    })
    if (!flow.isCurrent()) return

    if (!pendingGoogleHandoffCode.value.trim()) {
      currentStep.value = 'error'
      errorMessage.value = t('auth.error.callbackMissingHandoffCode')
      return
    }

    currentStep.value = 'loading'
    const handoffCode = pendingGoogleHandoffCode.value.trim()
    await completeCallbackRequest(flow, () =>
      authStore.completeGoogleAuth(handoffCode, { signal: flow.signal })
    )
  } catch (error) {
    if (!flow.isCurrent()) return
    currentStep.value = 'client-challenge'
    const resolvedError = resolveSecurityStepError(error)
    clientChallengeError.value = resolvedError.message
    clientChallengeDetail.value = resolvedError.detail
    clientChallengeTurnstileRef.value?.reset?.()
  } finally {
    if (flow.isCurrent()) {
      callbackBusy.value = false
      isClientChallengeSubmitting.value = false
    }
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
      currentFlow?.handoffToStore()
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
  cancelCallbackFlow()
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

function clearPopupBridgeTimers() {
  if (popupBridgeCloseTimer) {
    window.clearTimeout(popupBridgeCloseTimer)
    popupBridgeCloseTimer = null
  }
  if (popupBridgeManualHintTimer) {
    window.clearTimeout(popupBridgeManualHintTimer)
    popupBridgeManualHintTimer = null
  }
}

async function retryGoogleAuth() {
  cancelCallbackFlow()
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
  const flow = currentFlow
  if (!flow?.isCurrent() || currentStep.value !== 'risk-verification' || isLoading.value) return
  clearInlineErrors()

  if (!riskVerificationCode.value.trim()) {
    riskError.value = t('auth.error.codeRequired')
    return
  }

  const pendingToken = riskPendingToken.value
  const code = riskVerificationCode.value.trim()
  callbackBusy.value = true
  try {
    if (!isTurnstileTokenFresh(riskTurnstileToken.value, riskTurnstileIssuedAt.value)) {
      const token = await executeTurnstileChallenge(riskTurnstileRef.value)
      if (!flow.isCurrent()) return
      if (!token) {
        riskError.value = t('auth.error.turnstileRequired')
        return
      }
      riskTurnstileToken.value = token
      riskTurnstileIssuedAt.value = Date.now()
    }
    await completeCallbackRequest(flow, () =>
      authStore.verifyRiskLogin(pendingToken, code, riskTurnstileToken.value || undefined, {
        signal: flow.signal,
      })
    )
  } catch (error) {
    if (flow.isCurrent()) riskError.value = t(getTurnstileErrorMessageKey(error))
  } finally {
    if (flow.isCurrent()) {
      if (turnstileEnabled.value) resetRiskTurnstile()
      callbackBusy.value = false
    }
  }
}

async function handleMfaResolved(result: AuthFlowResult) {
  if (!currentFlow?.isCurrent() || currentStep.value !== 'mfa') return
  await applyCallbackResult(result)
}

function shouldUsePopupBridge(): boolean {
  return resolveGooglePopupBridgeMessage({ pendingRequest }) !== null
}

function runPopupBridge(): boolean {
  if (!shouldUsePopupBridge()) return false

  isPopupBridgeMode.value = true
  popupBridgeState.value = 'posting'
  bridgeGooglePopupResult({ pendingRequest })
  scrubSensitiveUrlParameters(['handoff_code'])
  clearPopupBridgeTimers()

  popupBridgeCloseTimer = window.setTimeout(() => {
    popupBridgeCloseTimer = null
    window.close()
  }, POPUP_BRIDGE_CLOSE_DELAY_MS)

  popupBridgeManualHintTimer = window.setTimeout(() => {
    popupBridgeManualHintTimer = null
    popupBridgeState.value = 'manual-close'
  }, POPUP_BRIDGE_MANUAL_CLOSE_HINT_DELAY_MS)

  return true
}

async function runInitialExchange() {
  const flow = beginCallbackFlow()
  if (!flow) return
  if (!GOOGLE_AUTH_ENABLED) {
    currentStep.value = 'error'
    errorMessage.value = t('auth.error.googleLoginFailed')
    errorDetail.value = 'Google login is temporarily unavailable.'
    return
  }

  clearInlineErrors()
  currentStep.value = 'loading'
  clearPendingGoogleHandoff()
  riskPendingToken.value = ''
  pendingMfaLoginToken.value = ''
  nextRedirectTarget.value = resolveAuthRedirectTarget(
    typeof route.query['redirect'] === 'string' ? route.query['redirect'] : null,
    pendingRequest?.redirectTo || '/'
  )

  const callbackError = typeof route.query['error'] === 'string' ? route.query['error'].trim() : ''
  const handoffCode =
    typeof route.query['handoff_code'] === 'string' ? route.query['handoff_code'] : ''
  scrubSensitiveUrlParameters(['handoff_code'])
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
  const code = pendingGoogleHandoffCode.value
  callbackBusy.value = true
  try {
    const preparation = await prepareGoogleAuthHandoff(code, turnstileSiteKey.value.trim(), {
      signal: flow.signal,
    })
    if (!flow.isCurrent()) return
    if (preparation.status === 'challenge-required') {
      enterClientChallengeStep(preparation.siteKey)
      return
    }
    if (preparation.status === 'error') {
      currentStep.value = 'error'
      errorMessage.value = t(preparation.messageKey)
      errorDetail.value = preparation.detail
      return
    }
    await completeCallbackRequest(flow, () =>
      authStore.completeGoogleAuth(code, { signal: flow.signal })
    )
  } catch (error) {
    if (!flow.isCurrent()) return
    currentStep.value = 'error'
    const resolved = resolveSecurityStepError(error)
    errorMessage.value = resolved.message
    errorDetail.value = resolved.detail
  } finally {
    if (flow.isCurrent()) callbackBusy.value = false
  }
}

function initializeCallback() {
  if (disposed) return
  cancelCallbackFlow()
  clearPopupBridgeTimers()
  isPopupBridgeMode.value = false
  if (runPopupBridge()) {
    return
  }
  void runInitialExchange()
}

onMounted(initializeCallback)
watch(() => route.query, initializeCallback, { deep: true, flush: 'sync' })

onBeforeUnmount(() => {
  disposed = true
  cancelCallbackFlow()
  clearPopupBridgeTimers()
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
