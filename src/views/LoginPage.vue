<template>
  <div class="auth-page auth-page--login">
    <AuthEntryShell
      :title="pageTitle"
      :subtitle="pageSubtitle"
      active-tab="login"
      :redirect-to="redirectTo"
      :data-media-caption="$t('auth.loginMediaCaption')"
      :show-tabs="false"
      :show-back="false"
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
                autocomplete="username webauthn"
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

            <AuthTurnstileStatus
              v-if="showCredentialsTurnstile"
              :status="credentialsTurnstileStatus"
              :show-widget-frame="credentialsTurnstileStatus === 'interactive_required'"
            >
              <TurnstileWidget
                ref="credentialsTurnstileRef"
                :site-key="turnstileSiteKey"
                action="login"
                size="compact"
                appearance="execute"
                execution="execute"
                auto-execute
                @verify="handleCredentialsTurnstileVerify"
                @expire="handleCredentialsTurnstileExpire"
                @error="handleTurnstileError"
                @status="credentialsTurnstileStatus = $event"
              />
            </AuthTurnstileStatus>

            <div class="action-group">
              <Button
                type="submit"
                full-width
                :loading="isLoading || credentialsTurnstileStatus === 'executing'"
                :disabled="isCredentialsTurnstileBusy"
              >
                {{ $t('auth.loginButton') }}
              </Button>
              <Button
                v-if="webauthnSupported"
                type="button"
                variant="ghost"
                full-width
                :loading="isLoading"
                @click="handlePasswordlessContinue"
              >
                {{ $t('auth.mfa.passkeyAction') }}
              </Button>
              <p
                v-if="conditionalPasskeyAvailable"
                class="auth-helper auth-helper--compact sr-only"
              >
                {{ $t('auth.passkeyAutofillHint') }}
              </p>
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
              <div v-if="googleAuthEnabled" class="auth-inline-state__actions">
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

          <template v-if="googleAuthEnabled">
            <AuthDivider :label="$t('auth.googleDivider')" />

            <AuthProviderButton
              action="google"
              :label="$t('auth.googleLoginButton')"
              :loading="googleProviderBusy"
              :icon="IconGoogle"
              @click="handleGoogleContinue"
            />
          </template>

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
              <div class="auth-inline-state__actions">
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

              <AuthTurnstileStatus
                v-if="resolvedGoogleClientChallengeSiteKey"
                :status="googleClientChallengeStatus"
                :error-message="googleClientChallengeError"
                :detail="googleClientChallengeDetail"
                :show-widget-frame="googleClientChallengeStatus === 'interactive_required'"
              >
                <TurnstileWidget
                  ref="googleClientChallengeRef"
                  :site-key="resolvedGoogleClientChallengeSiteKey"
                  action="google-exchange"
                  size="compact"
                  appearance="execute"
                  execution="execute"
                  auto-execute
                  @verify="handleGoogleClientChallengeVerify"
                  @expire="handleGoogleClientChallengeExpire"
                  @error="handleTurnstileError"
                  @status="googleClientChallengeStatus = $event"
                />
              </AuthTurnstileStatus>

              <p v-else class="auth-inline-state__copy">{{ $t('auth.clientChallengeLoading') }}</p>
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
              <Button
                v-if="riskSupportsWebAuthn"
                type="button"
                variant="ghost"
                full-width
                :loading="isLoading"
                :disabled="!webauthnSupported"
                @click="handleRiskPasskeyContinue"
              >
                {{ $t('auth.mfa.passkeyAction') }}
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

      <p v-if="step === 'credentials'" class="auth-footer auth-footer--entry">
        {{ $t('auth.noAccount') }}
        <RouterLink to="/register">{{ $t('nav.register') }}</RouterLink>
      </p>
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
import { userService, twoFactorService, ApiError } from '@/api'
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
import { isTurnstileBusy, type TurnstileWidgetStatus } from '@/utils/turnstileWidgetStatus'
import {
  getWebAuthnAssertion,
  isConditionalMediationAvailable,
  isWebAuthnSupported,
  serializePublicKeyCredential,
} from '@/utils/webauthn'
import { clientSecurityService } from '@/api/clientSecurityService'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import { AuthDivider, AuthEntryShell, AuthProviderButton } from '@/components/auth/entry'
import { AuthMfaStep, AuthTurnstileStatus } from '@/components/auth/security'
import IconGoogle from '@/components/icons/IconGoogle.vue'
import * as loginModel from './login/loginPageModel'

const GOOGLE_AUTH_ENABLED =
  import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true'
    ? true
    : import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

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
const requiresCredentialsTurnstile = ref(false)

const step = ref<loginModel.LoginStep>('credentials')
const riskPendingToken = ref('')
const riskVerificationCode = ref('')
const riskMessage = ref('')
const riskExpiresIn = ref<number | null>(null)
const riskMethods = ref<string[]>([])
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
let activeGooglePopupWindow: Window | null = null
let googlePopupFlowToken = 0

const restoreIdentifier = ref('')
const restorePassword = ref('')
const showRestorePassword = ref(false)
const isRestoringAccount = ref(false)
const showRestorePanel = ref(false)
const webauthnSupported = isWebAuthnSupported()
const conditionalPasskeyAvailable = ref(false)
let conditionalPasskeyAbortController: AbortController | null = null
let conditionalPasskeyStarted = false
const PASSKEY_RECOMMENDATION_STORAGE_KEY = 'hmrchan:passkey-recommendation-dismissed:v1'

type TurnstileWidgetHandle = {
  reset: () => void
  execute?: () => Promise<string>
}

const credentialsTurnstileRef = useTemplateRef<TurnstileWidgetHandle>('credentialsTurnstileRef')
const googleClientChallengeRef = useTemplateRef<TurnstileWidgetHandle>('googleClientChallengeRef')
const riskTurnstileRef = useTemplateRef<TurnstileWidgetHandle>('riskTurnstileRef')
const credentialsTurnstileToken = ref<string | null>(null)
const credentialsTurnstileIssuedAt = ref<number | null>(null)
const credentialsTurnstileStatus = ref<TurnstileWidgetStatus>('idle')
const googleClientChallengeStatus = ref<TurnstileWidgetStatus>('idle')
const riskTurnstileStatus = ref<TurnstileWidgetStatus>('idle')
const riskTurnstileToken = ref<string | null>(null)
const riskTurnstileIssuedAt = ref<number | null>(null)

const redirectTo = computed(() => {
  const candidate = typeof route.query['redirect'] === 'string' ? route.query['redirect'] : null
  return resolveAuthRedirectTarget(candidate, '/')
})
const isSensitiveReauth = computed(() => loginModel.isSensitiveLoginReauth(route.query['reauth']))

const canRestoreAccount = computed(
  () =>
    loginModel.validateRestoreAccountForm({
      identifier: restoreIdentifier.value,
      password: restorePassword.value,
    }).valid
)
const restoreNotice = computed(() =>
  t(loginModel.resolveRestoreNoticeKey(route.query['restore_notice']))
)
const isPasswordLoginUnavailable = computed(() =>
  loginModel.isPasswordLoginUnavailable(credentialsErrorCode.value)
)
const googleProviderBusy = computed(() =>
  loginModel.isGoogleProviderBusy({
    popupState: googlePopupState.value,
    isLoading: isLoading.value,
  })
)
const googleAuthEnabled = computed(() => GOOGLE_AUTH_ENABLED)
const showCredentialsTurnstile = computed(
  () => turnstileEnabled.value && requiresCredentialsTurnstile.value
)
const isCredentialsTurnstileBusy = computed(() => isTurnstileBusy(credentialsTurnstileStatus.value))
const isRiskTurnstileBusy = computed(() => isTurnstileBusy(riskTurnstileStatus.value))
const riskSupportsWebAuthn = computed(() => loginModel.hasRiskWebAuthnMethod(riskMethods.value))
const googlePopupErrorMessage = computed(() =>
  googlePopupErrorKey.value ? t(googlePopupErrorKey.value) : ''
)
const resolvedGoogleClientChallengeSiteKey = computed(
  () => googleClientChallengeSiteKey.value || turnstileSiteKey.value
)
const showGoogleClientChallenge = computed(() =>
  loginModel.shouldShowGoogleClientChallenge({
    popupState: googlePopupState.value,
    handoffCode: pendingGoogleHandoffCode.value,
  })
)
const pageTitle = computed(() => t(loginModel.resolveLoginPageTitleKey(step.value)))
const pageSubtitle = computed(() => t(loginModel.resolveLoginPageSubtitleKey(step.value)))

function resetCredentialsTurnstile() {
  credentialsTurnstileToken.value = null
  credentialsTurnstileIssuedAt.value = null
  credentialsTurnstileStatus.value = 'idle'
  credentialsTurnstileRef.value?.reset()
}

function resetRiskTurnstile() {
  riskTurnstileToken.value = null
  riskTurnstileIssuedAt.value = null
  riskTurnstileStatus.value = 'idle'
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
  credentialsTurnstileStatus.value = 'expired'
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
  if (step.value === 'credentials') {
    requiresCredentialsTurnstile.value = true
  }
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

function clearInlineErrors() {
  credentialsError.value = ''
  credentialsErrorCode.value = ''
  riskError.value = ''
  mfaError.value = ''
}

function resetGoogleClientChallengeState() {
  pendingGoogleHandoffCode.value = ''
  googleClientChallengeSiteKey.value = ''
  googleClientChallengeError.value = ''
  googleClientChallengeDetail.value = ''
  isGoogleClientChallengeSubmitting.value = false
  googleClientChallengeStatus.value = 'idle'
  googleClientChallengeRef.value?.reset?.()
}

function setGooglePopupStatus(state: GooglePopupState, errorKey = '') {
  googlePopupState.value = state
  googlePopupErrorKey.value = errorKey
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
    /* noop */
  }
}

function clearGooglePopupListener(options: { closePopup?: boolean; invalidate?: boolean } = {}) {
  if (options.invalidate !== false) {
    googlePopupFlowToken += 1
  }
  if (googlePopupDispose) {
    googlePopupDispose()
    googlePopupDispose = null
  }
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
  riskMethods.value = []
  pendingMfaLoginToken.value = ''
  mfaMethods.value = []
  mfaMessage.value = ''
  clearInlineErrors()
  resetRiskTurnstile()
  resetGooglePopupState()
}

function handleBack() {
  switch (
    loginModel.resolveLoginBackNavigationIntent({
      step: step.value,
      historyLength: window.history.length,
    })
  ) {
    case 'return-to-credentials':
      returnToCredentials()
      return
    case 'history-back':
      router.back()
      return
    case 'home-replace':
      void router.replace('/')
  }
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
  void maybePromptPasskeyEnrollment()
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
      riskMethods.value = result.methods
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
        if (loginModel.shouldRequireCredentialsTurnstile(result)) {
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

  stopConditionalPasskeyAutofill()
  clearInlineErrors()
  resetGooglePopupState()

  const validation = loginModel.validateLoginCredentials({
    identifier: loginIdentifier.value,
    password: loginPassword.value,
  })

  if (!validation.valid) {
    credentialsError.value = t(validation.messageKey)
    return
  }

  if (
    showCredentialsTurnstile.value &&
    !loginModel.isTurnstileTokenFresh({
      token: credentialsTurnstileToken.value,
      issuedAt: credentialsTurnstileIssuedAt.value,
      enabled: turnstileEnabled.value,
    })
  ) {
    const token = await executeTurnstileChallenge(credentialsTurnstileRef.value, (nextToken) => {
      credentialsTurnstileToken.value = nextToken
      credentialsTurnstileIssuedAt.value = Date.now()
    })
    if (!token) {
      credentialsError.value = t('auth.error.turnstileRequired')
      return
    }
  }

  nextRedirectTarget.value = redirectTo.value

  const result = await authStore.login(
    validation.trimmedIdentifier,
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
  const code = loginModel.normalizeRiskVerificationCode(riskVerificationCode.value)

  if (!code) {
    riskError.value = t('auth.error.codeRequired')
    return
  }

  if (
    turnstileEnabled.value &&
    !loginModel.isTurnstileTokenFresh({
      token: riskTurnstileToken.value,
      issuedAt: riskTurnstileIssuedAt.value,
      enabled: turnstileEnabled.value,
    })
  ) {
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
    code,
    riskTurnstileToken.value || undefined
  )
  if (turnstileEnabled.value) {
    resetRiskTurnstile()
  }
  await applyAuthFlowResult(result)
}

async function handleRiskPasskeyContinue() {
  if (!webauthnSupported) {
    riskError.value = t('auth.error.webauthnUnsupported')
    return
  }

  const optionsResult = await authStore.beginRiskWebAuthnLogin(riskPendingToken.value)
  if (optionsResult.status === 'error') {
    riskError.value = t(optionsResult.error)
    return
  }

  try {
    const assertion = await getWebAuthnAssertion(optionsResult.options)
    if (!(assertion instanceof PublicKeyCredential)) {
      riskError.value = t('auth.error.webauthnLoginFailed')
      return
    }

    const result = await authStore.finishRiskWebAuthnLogin(
      riskPendingToken.value,
      optionsResult.ceremonyId,
      serializePublicKeyCredential(assertion)
    )
    await applyAuthFlowResult(result)
  } catch {
    riskError.value = t('auth.error.webauthnLoginFailed')
  }
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
    await clientSecurityService.verify(token, { diagnosticsContext: 'google-auth' })

    if (!pendingGoogleHandoffCode.value.trim()) {
      setGooglePopupStatus('error', 'auth.error.callbackMissingHandoffCode')
      credentialsError.value = t('auth.error.callbackMissingHandoffCode')
      return
    }

    const result = await authStore.completeGoogleAuth(pendingGoogleHandoffCode.value.trim())
    if (result.status === 'error') {
      if (loginModel.isExpiredGoogleHandoffResult(result)) {
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
  if (!GOOGLE_AUTH_ENABLED) {
    credentialsError.value = t('auth.error.googleLoginFailed')
    return
  }

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

  stopConditionalPasskeyAutofill()
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

  void popupResult.promise.then(async (message) => {
    if (flowToken !== googlePopupFlowToken) {
      return
    }

    googlePopupDispose = null
    activeGooglePopupWindow = null
    setGooglePopupStatus('handling')
    await handleGooglePopupResult(message)
  })
}

async function handlePasswordlessContinue() {
  if (!webauthnSupported) {
    credentialsError.value = t('auth.error.webauthnUnsupported')
    return
  }

  stopConditionalPasskeyAutofill()
  clearInlineErrors()
  resetGooglePopupState()

  const optionsResult = await authStore.beginPasswordlessLogin(
    loginIdentifier.value.trim() || undefined
  )
  if (optionsResult.status === 'error') {
    credentialsError.value = t(optionsResult.error)
    return
  }

  try {
    const assertion = await getWebAuthnAssertion(optionsResult.options)
    if (!(assertion instanceof PublicKeyCredential)) {
      credentialsError.value = t('auth.error.webauthnLoginFailed')
      return
    }

    const result = await authStore.finishPasswordlessLogin(
      optionsResult.ceremonyId,
      serializePublicKeyCredential(assertion)
    )
    await applyAuthFlowResult(result)
  } catch {
    credentialsError.value = t('auth.error.webauthnLoginFailed')
  }
}

function stopConditionalPasskeyAutofill() {
  conditionalPasskeyAbortController?.abort()
  conditionalPasskeyAbortController = null
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function initializeConditionalPasskeyAutofill() {
  if (
    !loginModel.shouldStartConditionalPasskeyAutofill({
      started: conditionalPasskeyStarted,
      webauthnSupported,
      isAuthenticated: isAuthenticated.value,
    })
  ) {
    return
  }

  conditionalPasskeyStarted = true
  conditionalPasskeyAvailable.value = await isConditionalMediationAvailable()
  if (!conditionalPasskeyAvailable.value) {
    return
  }

  const abortController = new AbortController()
  conditionalPasskeyAbortController = abortController

  try {
    const optionsResult = await authStore.beginPasswordlessLogin()
    if (optionsResult.status === 'error' || abortController.signal.aborted) {
      return
    }

    const assertion = await getWebAuthnAssertion(optionsResult.options, {
      conditional: true,
      signal: abortController.signal,
    })
    if (!(assertion instanceof PublicKeyCredential) || abortController.signal.aborted) {
      return
    }

    const result = await authStore.finishPasswordlessLogin(
      optionsResult.ceremonyId,
      serializePublicKeyCredential(assertion)
    )
    if (!abortController.signal.aborted) {
      await applyAuthFlowResult(result)
    }
  } catch (error) {
    if (!isAbortError(error)) {
      credentialsError.value = t('auth.error.webauthnLoginFailed')
    }
  } finally {
    if (conditionalPasskeyAbortController === abortController) {
      conditionalPasskeyAbortController = null
    }
  }
}

async function maybePromptPasskeyEnrollment() {
  if (!webauthnSupported) return
  if (localStorage.getItem(PASSKEY_RECOMMENDATION_STORAGE_KEY) === 'dismissed') return

  try {
    const status = await twoFactorService.getStatus()
    if (status.webauthn_credentials?.length) {
      localStorage.setItem(PASSKEY_RECOMMENDATION_STORAGE_KEY, 'dismissed')
      return
    }
    localStorage.setItem(PASSKEY_RECOMMENDATION_STORAGE_KEY, 'dismissed')
    toastStore.info(t('auth.passkeyRecommendation.message'), 12000, {
      title: t('auth.passkeyRecommendation.title'),
      action: {
        label: t('auth.passkeyRecommendation.action'),
        onClick: () => {
          void router.push('/profile/security')
        },
      },
    })
  } catch {
    /* noop */
  }
}

async function handleRestoreAccount() {
  if (isRestoringAccount.value) return

  const validation = loginModel.validateRestoreAccountForm({
    identifier: restoreIdentifier.value,
    password: restorePassword.value,
  })

  if (!validation.valid) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    return
  }

  isRestoringAccount.value = true
  try {
    await userService.restoreAccount({
      identifier: validation.trimmedIdentifier,
      password: restorePassword.value,
    })

    restorePassword.value = ''
    toastStore.success(t('profile.restoreAccountSuccess'))
    await router.replace({
      name: 'login',
      query: loginModel.buildLoginQueryWithoutRestore(route.query),
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
    showRestorePanel.value = loginModel.shouldShowRestoreAccountPanel(mode)
  },
  { immediate: true }
)

watch(
  () => route.query['identifier'],
  (identifier) => {
    const normalizedIdentifier = loginModel.normalizeRestoreIdentifierQuery(identifier)
    if (normalizedIdentifier) {
      restoreIdentifier.value = normalizedIdentifier
    }
  },
  { immediate: true }
)

if (isAuthenticated.value && !isSensitiveReauth.value) {
  void router.replace(redirectTo.value)
}

onMounted(() => {
  void import('@/views/RegisterPage.vue').catch(() => {})
  void import('@/views/ForgotPasswordPage.vue').catch(() => {})
  void initializeConditionalPasskeyAutofill()
})

onUnmounted(() => {
  stopConditionalPasskeyAutofill()
  clearGooglePopupListener({ closePopup: true })
})
</script>

<style scoped>
.auth-inline-spin {
  animation: auth-inline-spin 0.9s linear infinite;
}

.auth-helper--compact {
  margin: 0;
  text-align: center;
}

@keyframes auth-inline-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
