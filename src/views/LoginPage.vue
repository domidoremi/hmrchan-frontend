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

            <div v-if="turnstileEnabled" class="turnstile-block">
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
              <span>{{ $t('auth.loginHint') }}</span>
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
                  :hint="$t('auth.googleLoginHint')"
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
            :hint="$t('auth.googleLoginHint')"
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
        </form>

        <form
          v-else-if="step === 'link-required'"
          key="link"
          class="auth-form"
          @submit.prevent="handleLinkVerificationSubmit"
        >
          <div class="auth-card auth-card--stack">
            <div class="code-sent-banner">
              <Mail :size="16" />
              <span>{{ $t('auth.callback.linkEmailHint', { email: maskedEmail }) }}</span>
            </div>

            <p class="auth-helper">{{ $t('auth.callback.linkHint') }}</p>
            <p v-if="linkExpiresIn" class="auth-helper">
              {{ $t('auth.callback.linkExpiresIn', { seconds: linkExpiresIn }) }}
            </p>

            <div class="form-group">
              <label for="login-link-code">{{ $t('auth.verificationCode') }}</label>
              <Input
                id="login-link-code"
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
              <Button type="button" variant="ghost" full-width @click="returnToCredentials">
                {{ $t('auth.returnToCredentials') }}
              </Button>
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
import { CircleAlert, Eye, EyeOff, LoaderCircle, Mail } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { userService, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import type { AuthFlowResult } from '@/stores/auth'
import {
  mapGooglePopupError,
  openGoogleAuthPopup,
  prefersGoogleAuthPopup,
  waitForGooglePopupResult,
  type GooglePopupMessage,
  type GooglePopupState,
} from '@/services/googleAuthService'
import { resolveAuthRedirectTarget } from '@/utils/authRedirect'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AuthMfaStep from '@/components/auth/AuthMfaStep.vue'
import AuthEntryShell from '@/components/auth/AuthEntryShell.vue'
import AuthDivider from '@/components/auth/AuthDivider.vue'
import AuthProviderButton from '@/components/auth/AuthProviderButton.vue'
import IconGoogle from '@/components/icons/IconGoogle.vue'

type Step = 'credentials' | 'link-required' | 'risk-verification' | 'mfa'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isAuthenticated, isLoading } = storeToRefs(authStore)
const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()

const loginIdentifier = ref('')
const loginPassword = ref('')
const showLoginPassword = ref(false)
const credentialsError = ref('')
const credentialsErrorCode = ref('')

const step = ref<Step>('credentials')
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

const pendingMfaLoginToken = ref('')
const mfaMethods = ref<string[]>([])
const mfaMessage = ref('')
const mfaError = ref('')

const nextRedirectTarget = ref('/')
const googlePopupState = ref<GooglePopupState>('idle')
const googlePopupErrorKey = ref('')
let googlePopupDispose: (() => void) | null = null

const restoreIdentifier = ref('')
const restorePassword = ref('')
const showRestorePassword = ref(false)
const isRestoringAccount = ref(false)
const showRestorePanel = ref(false)

const credentialsTurnstileRef = useTemplateRef<{ reset: () => void }>('credentialsTurnstileRef')
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
  () => ['opening', 'waiting', 'handling'].includes(googlePopupState.value) || isLoading.value
)
const googlePopupErrorMessage = computed(() =>
  googlePopupErrorKey.value ? t(googlePopupErrorKey.value) : ''
)
const pageTitle = computed(() => {
  switch (step.value) {
    case 'link-required':
      return t('auth.callback.linkTitle')
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
    case 'link-required':
      return t('auth.callback.linkHint')
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
  toastStore.error(t(getTurnstileErrorMessageKey(error)))
}

function clearInlineErrors() {
  credentialsError.value = ''
  credentialsErrorCode.value = ''
  linkError.value = ''
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

function getPrimaryFallbackRedirect(): string {
  return resolveAuthRedirectTarget(nextRedirectTarget.value, redirectTo.value)
}

function returnToCredentials() {
  step.value = 'credentials'
  pendingGoogleLinkToken.value = ''
  maskedEmail.value = ''
  linkVerificationCode.value = ''
  linkExpiresIn.value = null
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
    case 'link-required':
      resetGooglePopupState()
      step.value = 'link-required'
      pendingGoogleLinkToken.value = result.pendingGoogleLinkToken
      maskedEmail.value = result.maskedEmail
      linkExpiresIn.value = result.expiresIn ?? null
      linkVerificationCode.value = ''
      linkError.value = ''
      nextRedirectTarget.value = resolveAuthRedirectTarget(
        result.redirectTo,
        getPrimaryFallbackRedirect()
      )
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
      if (step.value === 'link-required') {
        linkError.value = t(result.error)
      } else if (step.value === 'risk-verification') {
        riskError.value = t(result.error)
      } else if (step.value === 'mfa') {
        mfaError.value = t(result.error)
      } else {
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
    turnstileEnabled.value &&
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

async function handleLinkVerificationSubmit() {
  clearInlineErrors()

  if (!linkVerificationCode.value.trim()) {
    linkError.value = t('auth.error.codeRequired')
    return
  }

  const result = await authStore.confirmGoogleLink(
    pendingGoogleLinkToken.value,
    linkVerificationCode.value.trim()
  )
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
    const result = await authStore.completeGoogleAuth(message.handoffCode)
    await applyAuthFlowResult(result)
    return
  }

  const errorKey = mapGooglePopupError(message.error)
  setGooglePopupStatus(message.error === 'popup_blocked' ? 'blocked' : 'error', errorKey)
  credentialsError.value = t(errorKey)
}

async function continueGoogleInCurrentPage() {
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

  if (!prefersGoogleAuthPopup()) {
    await continueGoogleInCurrentPage()
    return
  }

  setGooglePopupStatus('opening')
  const popupResult = openGoogleAuthPopup('login', redirectTo.value)

  if (popupResult.status === 'blocked') {
    setGooglePopupStatus('blocked', 'auth.error.googlePopupBlocked')
    return
  }

  setGooglePopupStatus('waiting')
  const pendingPopup = waitForGooglePopupResult(popupResult.popup, {
    timeoutMs: 4 * 60 * 1000,
  })
  googlePopupDispose = pendingPopup.dispose

  const message = await pendingPopup.promise
  googlePopupDispose = null
  setGooglePopupStatus('handling')
  await handleGooglePopupResult(message)
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
  clearGooglePopupListener()
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
