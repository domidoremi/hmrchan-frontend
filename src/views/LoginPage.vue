<template>
  <div class="auth-page auth-page--login">
    <div class="auth-book" :class="{ 'auth-book--two-factor': show2fa }">
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
                class="back-btn glass-button"
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

            <button type="button" class="auth-2fa-back" @click="reset2fa">
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

            <div v-if="turnstileEnabled" class="turnstile-block">
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

            <Button
              type="submit"
              :loading="isLoading"
              :disabled="turnstileEnabled && !turnstileToken"
              full-width
            >
              {{ $t('auth.loginButton') }}
            </Button>
          </form>

          <p v-if="!show2fa" class="auth-forgot">
            <RouterLink to="/forgot-password" @click="handleNavigateLink">{{
              $t('auth.forgotPassword')
            }}</RouterLink>
          </p>

          <p v-if="!show2fa" class="auth-footer">
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

import { ref, computed, onUnmounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'
import { isSafeRedirect } from '@/utils/security'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'

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
type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'
const visualMood = ref<VisualMood>('idle')
let moodTimer: ReturnType<typeof setTimeout> | null = null

// 2FA state
const show2fa = ref(false)
const twoFactorCode = ref('')
const pendingToken = ref('')

const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
const turnstileEnabled = turnstileSiteKey.length > 0
const turnstileToken = ref<string | null>(null)
const turnstileRef = ref<{ reset: () => void; getResponse: () => string | undefined } | null>(null)

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

async function handleLogin() {
  setVisualMood('submitting')
  formError.value = ''
  if (!usernameOrEmail.value || !password.value) {
    formError.value = t('auth.error.fieldsRequired')
    setVisualMood('typing', 900)
    return
  }

  if (turnstileEnabled && !turnstileToken.value) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    setVisualMood('typing', 900)
    return
  }

  const result = await authStore.login(
    usernameOrEmail.value,
    password.value,
    turnstileToken.value || undefined
  )

  if (result.success) {
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
    // 进入 2FA 验证步骤
    pendingToken.value = result.pendingToken
    show2fa.value = true
    formError.value = ''
    setVisualMood('typing')
  } else {
    turnstileToken.value = null
    turnstileRef.value?.reset()
    toastStore.error(t(result.error || 'auth.invalidCredentials'))
    setVisualMood('dodge', 1200)
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

function handleTurnstileVerify(token: string) {
  turnstileToken.value = token
  setVisualMood('typing', 500)
}

function handleTurnstileExpire() {
  turnstileToken.value = null
  setVisualMood('typing', 500)
}

function handleTurnstileError() {
  turnstileToken.value = null
  toastStore.error(t('auth.error.turnstileFailed'))
  setVisualMood('dodge', 900)
}
</script>

<style scoped>
.auth-page {
  --auth-stage-top: #1a1530;
  --auth-stage-mid: #251d43;
  --auth-stage-bottom: #11152b;
  --auth-card-shell: #f2ede5;
  --auth-card-shell-strong: #ebe4d9;
  --auth-panel-bg: #fffdf9;
  --auth-panel-border: rgba(62, 71, 118, 0.16);
  --auth-panel-shadow: rgba(28, 32, 58, 0.18);
  --auth-form-ring: #5f6bff;
  --auth-form-border: rgba(75, 86, 137, 0.24);
  --auth-form-surface: #f5f0e8;
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(0.8rem, 2.4vw, 1.8rem);
  background:
    radial-gradient(circle at 12% 10%, rgba(133, 122, 255, 0.42), transparent 42%),
    radial-gradient(circle at 88% 85%, rgba(255, 112, 176, 0.24), transparent 46%),
    linear-gradient(
      160deg,
      var(--auth-stage-top),
      var(--auth-stage-mid) 52%,
      var(--auth-stage-bottom)
    );
  perspective: 96rem;
}

.auth-book {
  position: relative;
  width: 100%;
  max-width: min(96vw, 72rem);
  height: min(82dvh, 46rem);
  display: grid;
  grid-template-columns: minmax(24rem, 1.08fr) minmax(22rem, 0.92fr);
  grid-template-areas: 'visual panel';
  align-items: stretch;
  border-radius: clamp(1.4rem, 2.7vw, 2.5rem);
  border: 1px solid rgba(255, 255, 255, 0.22);
  overflow: hidden;
  background: linear-gradient(145deg, var(--auth-card-shell), var(--auth-card-shell-strong));
  box-shadow:
    0 2.6rem 4.2rem -2.2rem rgba(11, 15, 34, 0.72),
    0 1.2rem 2.4rem -1.6rem rgba(10, 14, 32, 0.46);
  animation: auth-card-enter-left 560ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.auth-book::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 14% 14%, rgba(255, 255, 255, 0.34), transparent 34%),
    linear-gradient(120deg, rgba(255, 255, 255, 0.08), transparent 45%);
  pointer-events: none;
}

.auth-book > * {
  min-height: 0;
}

.auth-book--two-factor {
  grid-template-columns: minmax(22rem, 1fr) minmax(22rem, 1fr);
}

.auth-visual {
  grid-area: visual;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  background: #d7d7dc;
  border-inline-end: 1px solid rgba(99, 111, 161, 0.2);
  overflow: hidden;
}

.auth-visual :deep(.auth-scene) {
  width: 100%;
  flex: 1;
  min-height: 0;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
}

.auth-panel {
  grid-area: panel;
  display: grid;
  place-items: center;
  padding: clamp(0.85rem, 2.2vw, 1.5rem);
  background: var(--auth-panel-bg);
  border-inline-start: 1px solid rgba(99, 111, 161, 0.2);
  max-height: 100%;
  overflow-y: auto;
}

.auth-panel::-webkit-scrollbar {
  width: 0.34rem;
}

.auth-panel::-webkit-scrollbar-thumb {
  border-radius: var(--radius-full);
  background: rgba(76, 86, 134, 0.42);
}

.auth-panel-inner {
  width: min(100%, 29rem);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-2);
}

.auth-panel :deep(.ui-input) {
  border-radius: 0.95rem;
  border-color: var(--auth-form-border);
  background: var(--auth-form-surface);
  color: #21263f;
}

.auth-panel :deep(.ui-input::placeholder) {
  color: rgba(57, 66, 106, 0.56);
}

.auth-panel :deep(.ui-input:hover:not(:disabled):not(.ui-input--readonly)) {
  border-color: rgba(82, 94, 148, 0.36);
  background: #f8f3ec;
}

.auth-panel :deep(.ui-input:focus) {
  border-color: var(--auth-form-ring);
  box-shadow: 0 0 0 3px rgba(95, 107, 255, 0.14);
  background: #fffcf9;
}

.auth-panel :deep(.btn) {
  border-radius: 1rem;
  font-weight: var(--font-semibold);
}

.auth-panel :deep(.btn-default) {
  background: linear-gradient(132deg, #5f6bff, #7a6cff);
  color: #f7f9ff;
  box-shadow: 0 0.8rem 1.6rem -1rem rgba(80, 88, 210, 0.72);
}

.auth-panel :deep(.btn-default:hover:not(:disabled)) {
  background: linear-gradient(132deg, #5462f4, #6f61f3);
  box-shadow: 0 1rem 1.9rem -1rem rgba(74, 82, 198, 0.72);
}

.auth-panel :deep(.btn-ghost) {
  border: 1px solid rgba(80, 89, 135, 0.22);
  background: #f4efe7;
  color: #2f3657;
}

.auth-panel :deep(.btn-ghost:hover:not(:disabled)) {
  background: #ede6da;
}

.auth-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: var(--spacing-2);
}

.back-btn {
  padding: var(--spacing-2);
  border-radius: var(--radius-full);
  border: 1px solid rgba(74, 85, 135, 0.2);
  background: rgba(95, 108, 174, 0.08);
  color: #3a4266;
}

.auth-title {
  font-size: clamp(1.45rem, 1.2rem + 1.1vw, 2.1rem);
  color: #212840;
  text-align: left;
  margin-bottom: var(--spacing-1);
  letter-spacing: 0.012em;
}

.auth-subtitle {
  text-align: left;
  color: rgba(50, 58, 90, 0.72);
  margin-bottom: var(--spacing-5);
  font-size: var(--text-xs);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: #303a5c;
}

.field-error {
  font-size: var(--text-xs);
  color: var(--color-error);
}

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 2.75rem;
}

.password-toggle {
  position: absolute;
  right: var(--spacing-3);
  height: 2rem;
  width: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  color: rgba(49, 58, 91, 0.72);
}

.password-toggle:hover {
  background: rgba(109, 120, 176, 0.14);
  color: #2e3554;
}

.turnstile-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: 0.95rem;
  background: rgba(110, 120, 182, 0.08);
  border: 1px solid rgba(82, 95, 150, 0.2);
}

.turnstile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.turnstile-title {
  font-weight: var(--font-semibold);
  color: #364066;
}

.turnstile-hint {
  font-variant-numeric: tabular-nums;
}

.auth-forgot {
  text-align: right;
  margin-top: var(--spacing-2);
  font-size: var(--text-sm);
}

.auth-forgot a {
  color: rgba(52, 62, 97, 0.72);
}

.auth-forgot a:hover {
  color: #4957dd;
  text-decoration: underline;
}

.auth-2fa-hint {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-2);
}

.auth-2fa-back {
  display: block;
  margin: var(--spacing-2) auto 0;
  font-size: var(--text-sm);
  color: rgba(52, 62, 97, 0.76);
  transition: color 150ms ease;
}

.auth-2fa-back:hover {
  color: #4957dd;
}

.auth-footer {
  text-align: center;
  margin-top: var(--spacing-4);
  font-size: var(--text-sm);
  color: rgba(52, 62, 97, 0.76);
}

.auth-footer a {
  color: #4957dd;
  font-weight: var(--font-medium);
}

.auth-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 68rem) {
  .auth-book {
    max-width: min(96vw, 64rem);
    grid-template-columns: minmax(20rem, 1.05fr) minmax(20rem, 0.95fr);
  }
}

@media (max-width: 56rem) {
  .auth-page {
    min-height: calc(100svh - var(--navbar-height) - var(--mobile-nav-height));
    min-height: calc(100dvh - var(--navbar-height) - var(--mobile-nav-height));
    padding: clamp(0.6rem, 3.2vw, 1rem);
  }

  .auth-book,
  .auth-book--two-factor {
    max-width: min(95vw, 36rem);
    height: auto;
    min-height: auto;
    grid-template-columns: 1fr;
    grid-template-areas:
      'visual'
      'panel';
  }

  .auth-visual {
    min-height: 14rem;
    padding: 0;
    border-inline-end: none;
    border-bottom: 1px solid rgba(99, 111, 161, 0.2);
  }

  .auth-panel {
    max-height: none;
    padding: clamp(0.8rem, 3.2vw, 1.25rem);
    overflow: visible;
    border-inline-start: none;
  }

  .auth-title,
  .auth-subtitle {
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-book {
    animation: none;
  }
}

@keyframes auth-card-enter-left {
  0% {
    opacity: 0;
    transform: translateY(1rem) scale3d(0.985, 0.985, 1);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale3d(1, 1, 1);
  }
}
</style>
