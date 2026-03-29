<template>
  <div class="auth-page auth-page--login">
    <div class="auth-book auth-book--two-factor">
      <section class="auth-visual" aria-hidden="true">
        <AuthVisualScene
          :title="pageTitle"
          :subtitle="pageSubtitle"
          :mood="visualMood"
          :show-copy="false"
          scene-kind="login"
        />
      </section>

      <section class="auth-panel">
        <div class="auth-panel-inner auth-panel-inner--callback">
          <div class="auth-headings auth-headings--callback">
            <span class="auth-badge">
              <span class="auth-badge-dot" aria-hidden="true" />
              {{ $t('auth.googleLoginButton') }}
            </span>
            <h1 class="auth-title">{{ pageTitle }}</h1>
            <p class="auth-subtitle">{{ pageSubtitle }}</p>
          </div>

          <Transition name="step-fade" mode="out-in">
            <div
              v-if="currentStep === 'loading'"
              key="loading"
              class="auth-card auth-card--stack glass-surface--base auth-callback-card"
            >
              <div
                class="status-icon status-icon--loading auth-callback-spinner"
                aria-hidden="true"
              />
              <p class="auth-helper">{{ $t('auth.callback.loadingHint') }}</p>
            </div>

            <form
              v-else-if="currentStep === 'link-required'"
              key="link"
              class="auth-form"
              @submit.prevent="handleLinkVerificationSubmit"
            >
              <div class="auth-card auth-card--stack glass-surface--base">
                <div class="code-sent-banner">
                  <Mail :size="16" />
                  <span>{{ $t('auth.callback.linkEmailHint', { email: maskedEmail }) }}</span>
                </div>

                <p class="auth-helper">{{ $t('auth.callback.linkHint') }}</p>
                <p v-if="linkExpiresIn" class="auth-helper">
                  {{ $t('auth.callback.linkExpiresIn', { seconds: linkExpiresIn }) }}
                </p>

                <div class="form-group">
                  <label for="link-code">{{ $t('auth.verificationCode') }}</label>
                  <Input
                    id="link-code"
                    v-model="linkVerificationCode"
                    type="text"
                    inputmode="numeric"
                    maxlength="8"
                    :placeholder="$t('auth.riskVerificationCodePlaceholder')"
                    autocomplete="one-time-code"
                  />
                </div>

                <p v-if="linkError" class="field-error">{{ linkError }}</p>

                <div class="action-group">
                  <Button type="submit" full-width :loading="isLoading">
                    {{ $t('auth.callback.linkAction') }}
                  </Button>
                  <Button type="button" variant="ghost" full-width @click="returnToLogin">
                    {{ $t('auth.backToLogin') }}
                  </Button>
                </div>
              </div>
            </form>

            <form
              v-else-if="currentStep === 'risk-verification'"
              key="risk"
              class="auth-form"
              @submit.prevent="handleRiskVerificationSubmit"
            >
              <div class="auth-card auth-card--stack glass-surface--base">
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

            <div
              v-else
              key="error"
              class="auth-card auth-card--stack glass-surface--base auth-callback-card"
            >
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
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AuthCallbackPage' })

import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { AlertCircle, Mail } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useToastStore } from '@/stores'
import type { AuthFlowResult } from '@/stores/auth'
import { getPendingGoogleAuthRequest } from '@/services/googleAuthService'
import { resolveAuthRedirectTarget } from '@/utils/authRedirect'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'
import AuthMfaStep from '@/components/auth/AuthMfaStep.vue'

type CallbackStep = 'loading' | 'link-required' | 'risk-verification' | 'mfa' | 'error'
type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()
const { isLoading } = storeToRefs(authStore)
const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()

const pendingRequest = getPendingGoogleAuthRequest()
const currentStep = ref<CallbackStep>('loading')
const visualMood = ref<VisualMood>('submitting')
const nextRedirectTarget = ref(
  resolveAuthRedirectTarget(
    typeof route.query['redirect'] === 'string' ? route.query['redirect'] : null,
    pendingRequest?.redirectTo || '/'
  )
)

const pendingGoogleLinkToken = ref('')
const maskedEmail = ref('')
const linkVerificationCode = ref('')
const linkExpiresIn = ref<number | null>(null)
const linkError = ref('')

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
  switch (currentStep.value) {
    case 'link-required':
      return t('auth.callback.linkTitle')
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
  switch (currentStep.value) {
    case 'link-required':
      return t('auth.callback.linkHint')
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
  visualMood.value = 'dodge'
}

function clearInlineErrors() {
  linkError.value = ''
  riskError.value = ''
  mfaError.value = ''
  errorMessage.value = ''
  errorDetail.value = ''
}

async function finalizeSuccessfulLogin(result: Extract<AuthFlowResult, { status: 'success' }>) {
  visualMood.value = 'success'
  toastStore.success(t('auth.loginSuccess'))
  await router.replace(resolveAuthRedirectTarget(result.redirectTo, nextRedirectTarget.value))
}

async function applyCallbackResult(result: AuthFlowResult) {
  switch (result.status) {
    case 'success':
      await finalizeSuccessfulLogin(result)
      return
    case 'link-required':
      currentStep.value = 'link-required'
      visualMood.value = 'typing'
      pendingGoogleLinkToken.value = result.pendingGoogleLinkToken
      maskedEmail.value = result.maskedEmail
      linkExpiresIn.value = result.expiresIn ?? null
      linkVerificationCode.value = ''
      linkError.value = ''
      nextRedirectTarget.value = resolveAuthRedirectTarget(
        result.redirectTo,
        nextRedirectTarget.value
      )
      return
    case 'risk-verification':
      currentStep.value = 'risk-verification'
      visualMood.value = 'typing'
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
      visualMood.value = 'typing'
      pendingMfaLoginToken.value = result.pendingMfaLoginToken
      mfaMethods.value = result.methods
      mfaMessage.value = result.message || ''
      mfaError.value = ''
      nextRedirectTarget.value = resolveAuthRedirectTarget(
        result.redirectTo,
        nextRedirectTarget.value
      )
      return
    case 'error': {
      const translated = t(result.error)
      if (currentStep.value === 'link-required') {
        linkError.value = translated
      } else if (currentStep.value === 'risk-verification') {
        riskError.value = translated
      } else if (currentStep.value === 'mfa') {
        mfaError.value = translated
      } else {
        currentStep.value = 'error'
        errorMessage.value = translated
        errorDetail.value = result.detail || ''
      }
      visualMood.value = 'dodge'
      return
    }
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

async function retryGoogleAuth() {
  visualMood.value = 'submitting'
  const intent = pendingRequest?.intent || 'login'
  const redirect = resolveAuthRedirectTarget(pendingRequest?.redirectTo, nextRedirectTarget.value)
  const result = await authStore.startGoogleAuth(intent, redirect)
  if (result.status === 'error') {
    currentStep.value = 'error'
    errorMessage.value = t(result.error)
    errorDetail.value = ''
    visualMood.value = 'dodge'
  }
}

async function handleLinkVerificationSubmit() {
  clearInlineErrors()
  visualMood.value = 'submitting'

  if (!linkVerificationCode.value.trim()) {
    linkError.value = t('auth.error.codeRequired')
    visualMood.value = 'typing'
    return
  }

  const result = await authStore.confirmGoogleLink(
    pendingGoogleLinkToken.value,
    linkVerificationCode.value.trim()
  )
  await applyCallbackResult(result)
}

async function handleRiskVerificationSubmit() {
  clearInlineErrors()
  visualMood.value = 'submitting'

  if (!riskVerificationCode.value.trim()) {
    riskError.value = t('auth.error.codeRequired')
    visualMood.value = 'typing'
    return
  }

  if (!isTurnstileTokenFresh(riskTurnstileToken.value, riskTurnstileIssuedAt.value)) {
    riskError.value = t('auth.error.turnstileRequired')
    visualMood.value = 'typing'
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

async function runInitialExchange() {
  clearInlineErrors()
  currentStep.value = 'loading'
  visualMood.value = 'submitting'

  const handoffCode =
    typeof route.query['handoff_code'] === 'string' ? route.query['handoff_code'] : ''
  if (!handoffCode.trim()) {
    currentStep.value = 'error'
    errorMessage.value = t(
      route.query['error'] === 'access_denied'
        ? 'auth.error.googleAccessDenied'
        : 'auth.error.callbackMissingHandoffCode'
    )
    errorDetail.value = ''
    visualMood.value = 'dodge'
    return
  }

  const result = await authStore.completeGoogleAuth(handoffCode.trim())
  await applyCallbackResult(result)
}

onMounted(() => {
  void runInitialExchange()
})
</script>

<style scoped>
.auth-panel-inner--callback {
  justify-content: center;
}

.auth-headings--callback {
  display: grid;
  gap: 0.8rem;
}

.auth-callback-card {
  justify-items: center;
  text-align: center;
}

.auth-callback-spinner::before {
  content: '';
  width: 2rem;
  height: 2rem;
  border-radius: 999rem;
  border: 0.18rem solid rgba(37, 99, 235, 0.18);
  border-top-color: rgba(37, 99, 235, 0.94);
  animation: auth-callback-spin 0.9s linear infinite;
}

.auth-helper--emphasis {
  color: var(--auth-text-strong);
}

@keyframes auth-callback-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
