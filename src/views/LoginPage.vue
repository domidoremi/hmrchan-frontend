<template>
  <div class="auth-page auth-page--login">
    <div class="auth-book">
      <section class="auth-visual" aria-hidden="true">
        <AuthVisualScene
          :title="$t('auth.loginTitle')"
          :subtitle="visualSubtitle"
          :mood="visualMood"
          :show-copy="false"
          scene-kind="login"
        />
      </section>

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
                <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="sm" />
              </button>
            </div>
            <div class="auth-headings">
              <h1 class="auth-title">{{ pageTitle }}</h1>
              <p class="auth-subtitle">{{ pageSubtitle }}</p>
            </div>
          </div>

          <nav class="auth-switcher" :aria-label="$t('auth.loginTitle')">
            <RouterLink
              to="/login"
              class="auth-switcher__item auth-switcher__item--active"
              aria-current="page"
            >
              {{ $t('nav.login') }}
            </RouterLink>
            <RouterLink to="/register" class="auth-switcher__item" @click="handleNavigateLink">
              {{ $t('nav.register') }}
            </RouterLink>
          </nav>

          <Transition name="step-fade" mode="out-in">
            <form
              v-if="step === 'credentials'"
              key="credentials"
              class="auth-form"
              @submit.prevent="handleCredentialsSubmit"
            >
              <div class="auth-card auth-card--stack glass-surface--base">
                <span class="auth-badge">
                  <span class="auth-badge-dot" aria-hidden="true" />
                  {{ $t('auth.secureBadge') }}
                </span>

                <div class="form-group">
                  <label for="login-identifier">{{ $t('auth.usernameOrEmail') }}</label>
                  <Input
                    id="login-identifier"
                    v-model="loginIdentifier"
                    type="text"
                    :placeholder="$t('auth.usernameOrEmailPlaceholder')"
                    autocomplete="username"
                    required
                    @focus="handleTypingFocus"
                    @blur="handleFieldBlur"
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
                      @focus="handlePasswordFocus"
                      @blur="handleFieldBlur"
                    />
                    <button
                      type="button"
                      class="password-toggle"
                      :aria-label="showLoginPassword ? $t('common.hide') : $t('common.show')"
                      @click="togglePasswordVisibility('login')"
                    >
                      <AnimatedIcon
                        v-if="showLoginPassword"
                        name="explore"
                        :fallback-icon="EyeOff"
                        size="sm"
                      />
                      <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
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
              </div>

              <div v-if="isPasswordLoginUnavailable" class="auth-restore">
                <div class="auth-restore__copy">
                  <p class="auth-restore__title">{{ $t('auth.passwordLoginUnavailableTitle') }}</p>
                  <p class="auth-restore__hint">{{ $t('auth.passwordLoginUnavailableHint') }}</p>
                </div>

                <div class="action-group">
                  <Button type="button" variant="ghost" full-width @click="handleGoogleContinue">
                    {{ $t('auth.googleLoginButton') }}
                  </Button>
                  <RouterLink class="auth-link" to="/forgot-password" @click="handleNavigateLink">
                    {{ $t('auth.passwordLoginUnavailableResetAction') }}
                  </RouterLink>
                </div>
              </div>

              <div class="auth-provider-divider" aria-hidden="true">
                <span>{{ $t('auth.googleDivider') }}</span>
              </div>

              <div class="auth-card auth-card--stack glass-surface--base auth-provider-card">
                <div class="auth-provider-card__copy">
                  <h2 class="auth-provider-card__title">{{ $t('auth.googleLoginButton') }}</h2>
                  <p class="auth-provider-card__hint">{{ $t('auth.googleLoginHint') }}</p>
                </div>

                <div class="action-group">
                  <Button
                    type="button"
                    variant="ghost"
                    full-width
                    :loading="isLoading"
                    @click="handleGoogleContinue"
                  >
                    {{ $t('auth.googleLoginButton') }}
                  </Button>
                </div>
              </div>

              <div class="auth-support-copy">
                <p class="auth-support-copy__text">{{ $t('auth.loginHint') }}</p>
                <p class="auth-support-copy__text">{{ $t('auth.registerHint') }}</p>
              </div>
            </form>

            <form
              v-else-if="step === 'risk-verification'"
              key="risk"
              class="auth-form"
              @submit.prevent="handleRiskVerificationSubmit"
            >
              <div class="auth-card auth-card--stack glass-surface--base">
                <span class="auth-badge">
                  <span class="auth-badge-dot" aria-hidden="true" />
                  {{ $t('auth.riskVerificationTitle') }}
                </span>
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
                    @focus="handleTypingFocus"
                    @blur="handleFieldBlur"
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

              <button
                type="button"
                class="auth-link-button auth-2fa-back"
                @click="returnToCredentials"
              >
                {{ $t('auth.returnToCredentials') }}
              </button>
            </div>
          </Transition>

          <section v-if="showRestorePanel" class="auth-restore glass-surface--base">
            <div class="auth-restore__copy">
              <p class="auth-restore__title">{{ $t('auth.restoreTitle') }}</p>
              <p class="auth-restore__hint">{{ restoreNotice }}</p>
            </div>

            <div class="form-group">
              <label for="restore-identifier">{{ $t('auth.usernameOrEmail') }}</label>
              <Input
                id="restore-identifier"
                v-model="restoreIdentifier"
                type="text"
                :placeholder="$t('auth.usernameOrEmailPlaceholder')"
                autocomplete="username"
                required
                @focus="handleTypingFocus"
                @blur="handleFieldBlur"
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
                  required
                  @focus="handlePasswordFocus"
                  @blur="handleFieldBlur"
                />
                <button
                  type="button"
                  class="password-toggle"
                  :aria-label="showRestorePassword ? $t('common.hide') : $t('common.show')"
                  @click="togglePasswordVisibility('restore')"
                >
                  <AnimatedIcon
                    v-if="showRestorePassword"
                    name="explore"
                    :fallback-icon="EyeOff"
                    size="sm"
                  />
                  <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              :loading="isRestoringAccount"
              :disabled="!canRestoreAccount"
              full-width
              @click="handleRestoreAccount"
            >
              {{ $t('auth.restoreButton') }}
            </Button>
          </section>

          <p class="auth-forgot">
            <RouterLink to="/forgot-password" @click="handleNavigateLink">{{
              $t('auth.forgotPassword')
            }}</RouterLink>
          </p>

          <p class="auth-footer">
            {{ $t('auth.noAccount') }}
            <RouterLink to="/register" @click="handleNavigateLink">{{
              $t('nav.register')
            }}</RouterLink>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'LoginPage' })

import { computed, onMounted, onUnmounted, ref, watch, useTemplateRef } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { userService, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import type { AuthFlowResult } from '@/stores/auth'
import { resolveAuthRedirectTarget } from '@/utils/authRedirect'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'
import AuthMfaStep from '@/components/auth/AuthMfaStep.vue'

type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'
type Step = 'credentials' | 'risk-verification' | 'mfa'
type PasswordFieldTarget = 'login' | 'restore'

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

const restoreIdentifier = ref('')
const restorePassword = ref('')
const showRestorePassword = ref(false)
const isRestoringAccount = ref(false)
const showRestorePanel = ref(false)

const visualMood = ref<VisualMood>('idle')
let moodTimer: ReturnType<typeof setTimeout> | null = null

const credentialsTurnstileRef = useTemplateRef<{
  reset: () => void
}>('credentialsTurnstileRef')
const riskTurnstileRef = useTemplateRef<{
  reset: () => void
}>('riskTurnstileRef')
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
const visualSubtitle = computed(() => {
  switch (step.value) {
    case 'risk-verification':
      return t('auth.riskVerificationTitle')
    case 'mfa':
      return t('auth.mfa.badge')
    default:
      return t('auth.loginSubtitle')
  }
})

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
  setVisualMood(step.value === 'credentials' ? 'idle' : 'typing')
}

function togglePasswordVisibility(target: PasswordFieldTarget) {
  if (target === 'login') {
    showLoginPassword.value = !showLoginPassword.value
  } else {
    showRestorePassword.value = !showRestorePassword.value
  }
  setVisualMood('dodge', 520)
}

function handleNavigateLink() {
  setVisualMood('submitting', 580)
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

  router.replace('/')
}

function handleBackWithMood() {
  setVisualMood('dodge', 460)
  handleBack()
}

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
  setVisualMood('dodge', 900)
}

function getPrimaryFallbackRedirect(): string {
  return resolveAuthRedirectTarget(nextRedirectTarget.value, redirectTo.value)
}

function clearInlineErrors() {
  credentialsError.value = ''
  credentialsErrorCode.value = ''
  riskError.value = ''
  mfaError.value = ''
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
  riskError.value = ''
  mfaError.value = ''
  resetRiskTurnstile()
  setVisualMood('typing', 420)
}

async function finalizeSuccessfulLogin(result: Extract<AuthFlowResult, { status: 'success' }>) {
  if (result.securityWarning === 'high') {
    toastStore.warning(t('auth.securityWarningHigh'))
  } else if (result.securityWarning === 'medium') {
    toastStore.warning(t('auth.securityWarningMedium'))
  } else {
    toastStore.success(t('auth.loginSuccess'))
  }

  setVisualMood('success', 900)

  await router.replace(resolveAuthRedirectTarget(result.redirectTo, getPrimaryFallbackRedirect()))
}

async function applyAuthFlowResult(result: AuthFlowResult) {
  switch (result.status) {
    case 'success':
      await finalizeSuccessfulLogin(result)
      return
    case 'risk-verification':
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
      setVisualMood('typing', 420)
      return
    case 'mfa':
      step.value = 'mfa'
      pendingMfaLoginToken.value = result.pendingMfaLoginToken
      mfaMethods.value = result.methods
      mfaMessage.value = result.message || ''
      mfaError.value = ''
      nextRedirectTarget.value = resolveAuthRedirectTarget(
        result.redirectTo,
        getPrimaryFallbackRedirect()
      )
      setVisualMood('typing', 420)
      return
    case 'error': {
      const translated = t(result.error)
      if (step.value === 'risk-verification') {
        riskError.value = translated
      } else if (step.value === 'mfa') {
        mfaError.value = translated
      } else {
        credentialsError.value = translated
        credentialsErrorCode.value = result.code || ''
      }
      setVisualMood('dodge', 1200)
      return
    }
    default:
      return
  }
}

async function handleCredentialsSubmit() {
  if (isLoading.value) return

  setVisualMood('submitting')
  clearInlineErrors()

  if (!loginIdentifier.value.trim() || !loginPassword.value) {
    credentialsError.value = t('auth.error.fieldsRequired')
    setVisualMood('typing', 900)
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
    setVisualMood('typing', 900)
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
  if (isLoading.value) return

  setVisualMood('submitting')
  riskError.value = ''
  mfaError.value = ''

  if (!riskVerificationCode.value.trim()) {
    riskError.value = t('auth.error.codeRequired')
    setVisualMood('typing', 900)
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
    setVisualMood('typing', 900)
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

async function handleGoogleContinue() {
  setVisualMood('submitting')
  const result = await authStore.startGoogleAuth('login', redirectTo.value)
  if (result.status === 'error') {
    credentialsError.value = t(result.error)
    setVisualMood('dodge', 1200)
  }
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

  setVisualMood('submitting')

  if (!canRestoreAccount.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    setVisualMood('typing', 900)
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
    setVisualMood('success', 900)
  } catch (error) {
    toastStore.error(error instanceof ApiError ? error.message : t('common.error'))
    setVisualMood('dodge', 1200)
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
  if (moodTimer) {
    clearTimeout(moodTimer)
    moodTimer = null
  }
})
</script>

<style scoped>
.auth-provider-divider {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.25rem;
}

.auth-provider-divider::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  top: 50%;
  border-top: 0.0625rem solid color-mix(in srgb, var(--auth-panel-border) 80%, transparent);
}

.auth-provider-divider > span {
  position: relative;
  padding-inline: 0.85rem;
  background: var(--auth-panel-bg);
  color: var(--auth-text-soft);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.auth-provider-card,
.auth-support-copy {
  display: grid;
  gap: 0.85rem;
}

.auth-provider-card__copy {
  display: grid;
  gap: 0.45rem;
}

.auth-provider-card__title {
  margin: 0;
  color: var(--auth-text-strong);
  font-size: clamp(1.05rem, 0.95rem + 0.45vw, 1.2rem);
  font-weight: var(--font-semibold);
}

.auth-provider-card__hint,
.auth-support-copy__text,
.auth-helper--emphasis {
  margin: 0;
  color: var(--auth-text-muted);
  line-height: 1.6;
}
</style>
