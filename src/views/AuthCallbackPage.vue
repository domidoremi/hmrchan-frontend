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
import { useAuthStore, useToastStore } from '@/stores'
import type { AuthFlowResult } from '@/stores/auth'
import {
  getPendingGoogleAuthRequest,
  publishGooglePopupResult,
  resolveGoogleAuthPopupRequestIdFromWindowName,
  startGoogleAuthRedirect,
  type GooglePopupMessage,
} from '@/services/googleAuthService'
import { resolveAuthRedirectTarget } from '@/utils/authRedirect'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'
import { resolveTrustedFrontendTargetOrigin, safePostMessage } from '@/utils/security'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AuthMfaStep from '@/components/auth/AuthMfaStep.vue'
import AuthEntryShell from '@/components/auth/AuthEntryShell.vue'

type CallbackStep = 'loading' | 'risk-verification' | 'mfa' | 'error'
type PopupBridgeState = 'posting' | 'manual-close'

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
const riskTurnstileRef = useTemplateRef<{ reset: () => void }>('riskTurnstileRef')
const riskTurnstileToken = ref<string | null>(null)
const riskTurnstileIssuedAt = ref<number | null>(null)

const pendingMfaLoginToken = ref('')
const mfaMethods = ref<string[]>([])
const mfaMessage = ref('')
const mfaError = ref('')

const errorMessage = ref('')
const errorDetail = ref('')

const pageTitle = computed(() => {
  if (isPopupBridgeMode.value) {
    return t('auth.callback.popupTitle')
  }

  switch (currentStep.value) {
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
  riskTurnstileRef.value?.reset()
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
  toastStore.error(t(getTurnstileErrorMessageKey(error)))
}

function clearInlineErrors() {
  riskError.value = ''
  mfaError.value = ''
  errorMessage.value = ''
  errorDetail.value = ''
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
      if (currentStep.value === 'risk-verification') {
        riskError.value = t(result.error)
      } else if (currentStep.value === 'mfa') {
        mfaError.value = t(result.error)
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
  await applyCallbackResult(result)
}

async function handleMfaResolved(result: AuthFlowResult) {
  await applyCallbackResult(result)
}

function buildPopupBridgeMessage(): GooglePopupMessage {
  const popupRequestId =
    pendingRequest?.requestId || resolveGoogleAuthPopupRequestIdFromWindowName()
  const handoffCode =
    typeof route.query['handoff_code'] === 'string' ? route.query['handoff_code'].trim() : ''
  const error = typeof route.query['error'] === 'string' ? route.query['error'].trim() : ''

  if (handoffCode) {
    return {
      type: 'google-auth-result',
      requestId: popupRequestId || undefined,
      status: 'success',
      handoffCode,
      redirectTo: pendingRequest?.redirectTo,
      intent: pendingRequest?.intent,
    }
  }

  return {
    type: 'google-auth-result',
    requestId: popupRequestId || undefined,
    status: 'error',
    error: error || 'missing_handoff_code',
    redirectTo: pendingRequest?.redirectTo,
    intent: pendingRequest?.intent,
  }
}

function shouldUsePopupBridge(): boolean {
  const hasCallbackPayload =
    typeof route.query['handoff_code'] === 'string' || typeof route.query['error'] === 'string'

  if (!hasCallbackPayload) return false
  if (pendingRequest?.mode === 'popup') return true
  return Boolean(resolveGoogleAuthPopupRequestIdFromWindowName())
}

async function runPopupBridge(): Promise<boolean> {
  if (!shouldUsePopupBridge()) return false

  isPopupBridgeMode.value = true
  popupBridgeState.value = 'posting'
  const popupMessage = buildPopupBridgeMessage()

  publishGooglePopupResult(popupMessage)
  if (window.opener) {
    safePostMessage(window.opener, popupMessage, resolveTrustedFrontendTargetOrigin())
  }

  window.setTimeout(() => {
    window.close()
  }, 80)

  window.setTimeout(() => {
    popupBridgeState.value = 'manual-close'
  }, 700)

  return true
}

async function runInitialExchange() {
  clearInlineErrors()
  currentStep.value = 'loading'

  const handoffCode =
    typeof route.query['handoff_code'] === 'string' ? route.query['handoff_code'] : ''
  if (!handoffCode.trim()) {
    currentStep.value = 'error'
    errorMessage.value = t(
      route.query['error'] === 'access_denied'
        ? 'auth.error.googleAccessDenied'
        : 'auth.error.callbackMissingHandoffCode'
    )
    return
  }

  const result = await authStore.completeGoogleAuth(handoffCode.trim())
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
