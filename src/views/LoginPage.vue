<template>
  <div class="auth-page auth-page--login">
    <div class="auth-book" :class="{ 'auth-book--two-factor': show2fa || showRiskVerification }">
      <section class="auth-visual" aria-hidden="true">
        <AuthVisualScene
          :title="$t('auth.loginTitle')"
          :subtitle="$t('auth.loginSubtitle')"
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
              <h1 class="auth-title">{{ $t('auth.loginTitle') }}</h1>
              <p class="auth-subtitle">{{ $t('auth.loginSubtitle') }}</p>
            </div>
          </div>

          <nav
            v-if="!show2fa && !showRiskVerification"
            class="auth-switcher"
            :aria-label="$t('auth.loginTitle')"
          >
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

          <!-- 2FA 验证步骤 -->
          <div v-if="show2fa" class="auth-form">
            <p class="auth-2fa-hint">{{ $t('auth.twoFactorHint') }}</p>
            <div class="form-group">
              <label for="twoFactorCode">{{ $t('auth.twoFactorCode') }}</label>
              <Input
                id="twoFactorCode"
                v-model="twoFactorCode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                :placeholder="$t('auth.twoFactorCodePlaceholder')"
                autocomplete="one-time-code"
                required
                @focus="handleTypingFocus"
                @blur="handleFieldBlur"
                @keydown.enter="handle2faVerify"
              />
            </div>

            <p v-if="formError" class="field-error">{{ formError }}</p>

            <Button
              :loading="isLoading"
              :disabled="twoFactorCode.length < 6"
              full-width
              @click="handle2faVerify"
            >
              {{ $t('auth.verifyButton') }}
            </Button>

            <button
              type="button"
              class="auth-2fa-back page-control-btn page-control-btn--compact"
              @click="reset2fa"
            >
              {{ $t('auth.backToLogin') }}
            </button>
          </div>

          <!-- 高风险登录验证步骤 -->
          <div v-else-if="showRiskVerification" class="auth-form">
            <p class="auth-2fa-hint">
              {{
                riskChallengeType === 'email_code'
                  ? $t('auth.riskVerificationHint')
                  : $t('auth.riskVerificationFallbackHint')
              }}
            </p>
            <div class="form-group">
              <label for="riskVerificationCode">{{ $t('auth.riskVerificationCode') }}</label>
              <Input
                id="riskVerificationCode"
                v-model="riskVerificationCode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                :placeholder="$t('auth.riskVerificationCodePlaceholder')"
                autocomplete="one-time-code"
                required
                @focus="handleTypingFocus"
                @blur="handleFieldBlur"
                @keydown.enter="handleRiskVerify"
              />
            </div>

            <p v-if="riskExpiresInLabel" class="auth-2fa-hint auth-2fa-hint--subtle">
              {{ riskExpiresInLabel }}
            </p>

            <p v-if="formError" class="field-error">{{ formError }}</p>

            <Button
              :loading="isLoading"
              :disabled="riskVerificationCode.length < 6"
              full-width
              @click="handleRiskVerify"
            >
              {{ $t('auth.verifyButton') }}
            </Button>

            <button
              type="button"
              class="auth-2fa-back page-control-btn page-control-btn--compact"
              @click="resetRiskVerification"
            >
              {{ $t('auth.backToLogin') }}
            </button>
          </div>

          <!-- 正常登录表单 -->
          <form v-else class="auth-form" @submit.prevent="handleLogin">
            <div class="form-group">
              <label for="usernameOrEmail">{{ $t('auth.usernameOrEmail') }}</label>
              <Input
                id="usernameOrEmail"
                v-model="usernameOrEmail"
                type="text"
                :placeholder="$t('auth.usernameOrEmailPlaceholder')"
                autocomplete="username"
                required
                @focus="handleTypingFocus"
                @blur="handleFieldBlur"
              />
            </div>

            <div class="form-group">
              <label for="password">{{ $t('auth.password') }}</label>
              <div class="password-field">
                <Input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="password-input"
                  autocomplete="current-password"
                  required
                  @focus="handlePasswordFocus"
                  @blur="handleFieldBlur"
                />
                <button
                  type="button"
                  class="password-toggle"
                  :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
                  @click="handlePasswordToggle"
                >
                  <AnimatedIcon
                    v-if="showPassword"
                    name="explore"
                    :fallback-icon="EyeOff"
                    size="sm"
                  />
                  <AnimatedIcon v-else name="explore" :fallback-icon="Eye" size="sm" />
                </button>
              </div>
            </div>

            <div v-if="showTurnstileChallenge" class="turnstile-block">
              <div class="turnstile-header">
                <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
                <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
              </div>
              <TurnstileWidget
                ref="turnstileRef"
                :site-key="turnstileSiteKey"
                action="login"
                @verify="handleTurnstileVerify"
                @expire="handleTurnstileExpire"
                @error="handleTurnstileError"
              />
            </div>

            <p v-if="formError" class="field-error">{{ formError }}</p>

            <Button type="submit" :loading="isLoading" full-width>
              {{ $t('auth.loginButton') }}
            </Button>

            <div v-if="showRestorePanel" class="auth-restore">
              <p class="auth-restore__title">{{ $t('auth.restoreTitle') }}</p>
              <p class="auth-restore__hint">{{ restoreNotice }}</p>
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
            </div>
          </form>

          <p v-if="!show2fa && !showRiskVerification" class="auth-forgot">
            <RouterLink to="/forgot-password" @click="handleNavigateLink">{{
              $t('auth.forgotPassword')
            }}</RouterLink>
          </p>

          <p
            v-if="!show2fa && !showRiskVerification && !showRestorePanel"
            class="auth-restore-link"
          >
            <button
              type="button"
              class="auth-link-button page-control-btn page-control-btn--compact"
              @click="openRestorePanel"
            >
              {{ $t('auth.restoreLink') }}
            </button>
          </p>

          <p v-if="!show2fa && !showRiskVerification" class="auth-footer">
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

import { ref, computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'
import { isSafeRedirect } from '@/utils/security'
import { userService, ApiError } from '@/api'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey } from '@/utils/turnstile'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isLoading, isAuthenticated } = storeToRefs(authStore)

const usernameOrEmail = ref('')
const password = ref('')
const showPassword = ref(false)
const formError = ref('')
const showRestorePanel = ref(false)
const isRestoringAccount = ref(false)
type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'
const visualMood = ref<VisualMood>('idle')
let moodTimer: ReturnType<typeof setTimeout> | null = null

// 2FA state
const show2fa = ref(false)
const twoFactorCode = ref('')
const pendingToken = ref('')
const showRiskVerification = ref(false)
const riskVerificationCode = ref('')
const riskPendingToken = ref('')
const riskChallengeType = ref('email_code')
const riskExpiresIn = ref<number | null>(null)

const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()
const turnstileToken = ref<string | null>(null)
const requiresTurnstileChallenge = ref(false)
const turnstileRef = useTemplateRef<{ reset: () => void; getResponse: () => string | undefined }>(
  'turnstileRef'
)
const showTurnstileChallenge = computed(
  () => turnstileEnabled.value && requiresTurnstileChallenge.value
)

const riskExpiresInLabel = computed(() => {
  if (!riskExpiresIn.value || riskExpiresIn.value <= 0) return ''
  return t('auth.riskVerificationExpiresIn', { seconds: riskExpiresIn.value })
})

const canRestoreAccount = computed(() => {
  return !!usernameOrEmail.value.trim() && !!password.value
})

const restoreNotice = computed(() => {
  return route.query['restore_notice'] === 'deleted'
    ? t('auth.restoreAfterDeleteNotice')
    : t('auth.restoreHint')
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
  setVisualMood('idle')
}

onUnmounted(() => {
  if (moodTimer) {
    clearTimeout(moodTimer)
    moodTimer = null
  }
})

onMounted(() => {
  void import('@/views/RegisterPage.vue').catch(() => {})
  void import('@/views/ForgotPasswordPage.vue').catch(() => {})
})

// 获取重定向目标（验证安全性，防止 Open Redirect 攻击）
const redirectTo = computed(() => {
  const redirect = route.query['redirect']
  if (typeof redirect !== 'string' || !redirect) return '/'
  return isSafeRedirect(redirect) ? redirect : '/'
})

function handleBack() {
  const redirect = route.query['redirect']
  if (typeof redirect === 'string' && redirect) {
    router.replace('/')
    return
  }

  if (window.history.length > 1) {
    router.back()
    return
  }

  const safeRedirect = redirectTo.value
  router.replace(safeRedirect || '/')
}

function handleBackWithMood() {
  setVisualMood('dodge', 460)
  handleBack()
}

function handlePasswordToggle() {
  showPassword.value = !showPassword.value
  setVisualMood('dodge', 520)
}

function handleNavigateLink() {
  setVisualMood('submitting', 580)
}

// 如果已登录，重定向到首页
if (isAuthenticated.value) {
  router.replace(redirectTo.value)
}

watch(
  () => route.query['mode'],
  (mode) => {
    if (mode === 'restore') {
      showRestorePanel.value = true
    }
  },
  { immediate: true }
)

watch(
  () => route.query['identifier'],
  (identifier) => {
    if (typeof identifier === 'string' && identifier.trim()) {
      usernameOrEmail.value = identifier.trim()
    }
  },
  { immediate: true }
)

function openRestorePanel() {
  showRestorePanel.value = true
  formError.value = ''
  setVisualMood('typing', 600)
}

function buildLoginQueryWithoutRestore() {
  const nextQuery = { ...route.query }
  delete nextQuery['mode']
  delete nextQuery['identifier']
  delete nextQuery['restore_notice']
  return nextQuery
}

async function handleLogin() {
  setVisualMood('submitting')
  formError.value = ''
  if (!usernameOrEmail.value || !password.value) {
    formError.value = t('auth.error.fieldsRequired')
    setVisualMood('typing', 900)
    return
  }

  if (showTurnstileChallenge.value && !turnstileToken.value) {
    formError.value = t('auth.error.turnstileRequired')
    toastStore.warning(formError.value)
    setVisualMood('typing', 900)
    return
  }

  const result = await authStore.login(
    usernameOrEmail.value,
    password.value,
    turnstileToken.value || undefined
  )

  if (result.success) {
    requiresTurnstileChallenge.value = false
    turnstileToken.value = null
    setVisualMood('success', 900)
    toastStore.success(t('auth.loginSuccess'))
    // 显示安全警告（新设备、异常 IP 等）
    if (result.securityWarning === 'high') {
      toastStore.warning(t('auth.securityWarningHigh'))
    } else if (result.securityWarning === 'medium') {
      toastStore.warning(t('auth.securityWarningMedium'))
    }
    router.replace(redirectTo.value)
  } else if (result.requires2fa && result.pendingToken) {
    requiresTurnstileChallenge.value = false
    turnstileToken.value = null
    // 进入 2FA 验证步骤
    pendingToken.value = result.pendingToken
    show2fa.value = true
    showRiskVerification.value = false
    formError.value = ''
    setVisualMood('typing')
  } else if (result.requiresRiskVerification && result.pendingToken) {
    requiresTurnstileChallenge.value = false
    turnstileToken.value = null
    riskPendingToken.value = result.pendingToken
    riskChallengeType.value = result.challengeType || 'email_code'
    riskExpiresIn.value = result.expiresIn ?? null
    show2fa.value = false
    showRiskVerification.value = true
    formError.value = ''
    setVisualMood('typing')
  } else {
    const turnstileRequired = result.error === 'auth.error.turnstileRequired'
    turnstileToken.value = null
    if (turnstileRequired && turnstileEnabled.value) {
      requiresTurnstileChallenge.value = true
      turnstileRef.value?.reset()
      formError.value = t('auth.error.turnstileRequired')
      toastStore.warning(formError.value)
      setVisualMood('typing', 900)
      return
    }

    turnstileRef.value?.reset()
    toastStore.error(t(result.error || 'auth.invalidCredentials'))
    setVisualMood('dodge', 1200)
  }
}

async function handleRestoreAccount() {
  if (isRestoringAccount.value) return

  setVisualMood('submitting')
  formError.value = ''

  if (!canRestoreAccount.value) {
    formError.value = t('auth.error.fieldsRequired')
    setVisualMood('typing', 900)
    return
  }

  isRestoringAccount.value = true
  try {
    await userService.restoreAccount({
      identifier: usernameOrEmail.value.trim(),
      password: password.value,
    })
    password.value = ''
    showRestorePanel.value = false
    toastStore.success(t('profile.restoreAccountSuccess'))
    await router.replace({
      name: 'login',
      query: buildLoginQueryWithoutRestore(),
    })
    setVisualMood('success', 900)
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : t('common.error')
    setVisualMood('dodge', 1200)
  } finally {
    isRestoringAccount.value = false
  }
}

async function handle2faVerify() {
  setVisualMood('submitting')
  formError.value = ''
  if (twoFactorCode.value.length < 6) {
    setVisualMood('typing', 800)
    return
  }

  const result = await authStore.verify2faLogin(pendingToken.value, twoFactorCode.value)

  if (result.success) {
    setVisualMood('success', 900)
    toastStore.success(t('auth.loginSuccess'))
    router.replace(redirectTo.value)
  } else if (result.requiresRiskVerification && result.pendingToken) {
    twoFactorCode.value = ''
    pendingToken.value = ''
    riskPendingToken.value = result.pendingToken
    riskChallengeType.value = result.challengeType || 'email_code'
    riskExpiresIn.value = result.expiresIn ?? null
    show2fa.value = false
    showRiskVerification.value = true
    formError.value = ''
    setVisualMood('typing')
  } else {
    twoFactorCode.value = ''
    formError.value = t(result.error || 'auth.error.twoFactorInvalid')
    setVisualMood('typing', 1200)
  }
}

function reset2fa() {
  show2fa.value = false
  twoFactorCode.value = ''
  pendingToken.value = ''
  formError.value = ''
  setVisualMood('idle')
}

async function handleRiskVerify() {
  setVisualMood('submitting')
  formError.value = ''
  if (riskVerificationCode.value.length < 6) {
    formError.value = t('auth.error.codeRequired')
    setVisualMood('typing', 800)
    return
  }

  const result = await authStore.verifyRiskLogin(riskPendingToken.value, riskVerificationCode.value)

  if (result.success) {
    setVisualMood('success', 900)
    toastStore.success(t('auth.loginSuccess'))
    router.replace(redirectTo.value)
  } else {
    riskVerificationCode.value = ''
    formError.value = t(result.error || 'auth.error.riskVerificationInvalid')
    setVisualMood('typing', 1200)
  }
}

function resetRiskVerification() {
  showRiskVerification.value = false
  riskVerificationCode.value = ''
  riskPendingToken.value = ''
  riskChallengeType.value = 'email_code'
  riskExpiresIn.value = null
  formError.value = ''
  setVisualMood('idle')
}

function handleTurnstileVerify(token: string) {
  requiresTurnstileChallenge.value = true
  turnstileToken.value = token
  formError.value = ''
  setVisualMood('typing', 500)
}

function handleTurnstileExpire() {
  requiresTurnstileChallenge.value = true
  turnstileToken.value = null
  formError.value = t('auth.error.turnstileRequired')
  setVisualMood('typing', 500)
}

function handleTurnstileError(error?: Error) {
  requiresTurnstileChallenge.value = true
  turnstileToken.value = null
  const message = t(getTurnstileErrorMessageKey(error))
  formError.value = message
  toastStore.error(message)
  setVisualMood('dodge', 900)
}
</script>
