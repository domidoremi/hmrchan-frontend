<template>
  <div class="auth-page auth-page--forgot">
    <div class="auth-book" :class="{ 'auth-book--sent': emailSent }">
      <section class="auth-visual" aria-hidden="true">
        <AuthVisualScene
          :title="$t('email.forgotPasswordTitle')"
          :subtitle="emailSent ? $t('email.resetEmailSent') : $t('email.forgotPasswordHint')"
          :mood="visualMood"
          :show-copy="false"
          scene-kind="forgot"
        />
      </section>

      <section class="auth-panel">
        <div class="auth-panel-inner">
          <!-- Success state: email sent -->
          <template v-if="emailSent">
            <div class="status-icon status-icon--success">
              <Mail :size="40" />
            </div>
            <h1 class="auth-title">{{ $t('email.resetEmailSent') }}</h1>
            <p class="auth-subtitle">
              {{ $t('email.resetEmailSentHint', { email: maskedEmail }) }}
            </p>
            <div class="action-group">
              <Button
                variant="ghost"
                full-width
                :disabled="resendCooldown > 0"
                @click="handleSubmit"
              >
                {{
                  resendCooldown > 0
                    ? $t('email.resendCooldown', { seconds: resendCooldown })
                    : $t('email.resend')
                }}
              </Button>
              <RouterLink to="/login" class="auth-link" @click="handleNavigateToLogin">
                {{ $t('email.backToLogin') }}
              </RouterLink>
            </div>
          </template>

          <!-- Form state -->
          <template v-else>
            <div class="auth-topline">
              <div class="auth-header">
                <button
                  type="button"
                  class="back-btn glass-button"
                  :aria-label="$t('common.back')"
                  @click="handleBackWithMood"
                >
                  <ArrowLeft :size="18" />
                </button>
              </div>
              <div class="auth-headings">
                <h1 class="auth-title">{{ $t('email.forgotPasswordTitle') }}</h1>
                <p class="auth-subtitle">{{ $t('email.forgotPasswordHint') }}</p>
              </div>
            </div>

            <form class="auth-form" @submit.prevent="handleSubmit">
              <div class="form-group">
                <label for="email">{{ $t('auth.email') }}</label>
                <Input
                  id="email"
                  v-model="email"
                  type="email"
                  :placeholder="$t('email.emailPlaceholder')"
                  autocomplete="email"
                  required
                  @focus="handleTypingFocus"
                  @blur="handleFieldBlur"
                />
              </div>

              <div v-if="turnstileEnabled" class="turnstile-block">
                <div class="turnstile-header">
                  <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
                  <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
                </div>
                <TurnstileWidget
                  ref="turnstileRef"
                  :site-key="turnstileSiteKey"
                  action="forgot-password"
                  @verify="handleTurnstileVerify"
                  @expire="handleTurnstileExpire"
                  @error="handleTurnstileError"
                />
              </div>

              <Button
                type="submit"
                :loading="isLoading"
                :disabled="turnstileEnabled && !turnstileToken"
                full-width
              >
                {{ $t('email.sendResetLink') }}
              </Button>
            </form>

            <p class="auth-footer">
              {{ $t('email.rememberPassword') }}
              <RouterLink to="/login" @click="handleNavigateToLogin">{{
                $t('nav.login')
              }}</RouterLink>
            </p>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ForgotPasswordPage' })

import { ref, onUnmounted, useTemplateRef } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Mail } from 'lucide-vue-next'
import { authService, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'

const { t } = useI18n()
const toastStore = useToastStore()
const router = useRouter()

const email = ref('')
const isLoading = ref(false)
const emailSent = ref(false)
const resendCooldown = ref(0)
type VisualMood = 'idle' | 'typing' | 'dodge' | 'submitting' | 'success'
const visualMood = ref<VisualMood>('idle')
let moodTimer: ReturnType<typeof setTimeout> | null = null
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
const turnstileEnabled = turnstileSiteKey.length > 0
const turnstileToken = ref<string | null>(null)
const turnstileRef = useTemplateRef<{ reset: () => void; getResponse: () => string | undefined }>(
  'turnstileRef'
)

const maskedEmail = ref('')

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

function handleFieldBlur() {
  if (visualMood.value === 'submitting') return
  setVisualMood('idle')
}

function maskEmail(raw: string): string {
  const parts = raw.split('@')
  const local = parts[0] ?? ''
  const domain = parts[1]
  if (!domain) return raw
  const visible = local.length <= 2 ? local : local.slice(0, 2)
  return `${visible}***@${domain}`
}

function startCooldown() {
  resendCooldown.value = 60
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
  if (moodTimer) {
    clearTimeout(moodTimer)
    moodTimer = null
  }
})

function handleBackWithMood() {
  setVisualMood('dodge', 460)
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/login')
  }
}

function handleNavigateToLogin() {
  setVisualMood('submitting', 580)
}

async function handleSubmit() {
  setVisualMood('submitting')
  if (!email.value) {
    toastStore.warning(t('auth.emailRequired'))
    setVisualMood('typing', 900)
    return
  }

  if (turnstileEnabled && !turnstileToken.value) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    setVisualMood('typing', 900)
    return
  }

  isLoading.value = true

  try {
    await authService.requestPasswordReset({
      email: email.value,
      ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
    })
    maskedEmail.value = maskEmail(email.value)
    emailSent.value = true
    setVisualMood('success', 1200)
    startCooldown()
  } catch (err) {
    if (err instanceof ApiError) {
      // For security, still show success to avoid email enumeration
      if (err.status === 404 || err.status === 422) {
        maskedEmail.value = maskEmail(email.value)
        emailSent.value = true
        setVisualMood('success', 1200)
        startCooldown()
      } else {
        toastStore.error(err.message)
        setVisualMood('typing', 1200)
      }
    } else {
      toastStore.error(t('auth.error.unknown'))
      setVisualMood('typing', 1200)
    }
    turnstileToken.value = null
    turnstileRef.value?.reset()
  } finally {
    isLoading.value = false
  }
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
  --auth-stage-top: #19152f;
  --auth-stage-mid: #241c42;
  --auth-stage-bottom: #12162d;
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
  perspective: 96rem;
  background:
    radial-gradient(circle at 10% 12%, rgba(133, 122, 255, 0.42), transparent 42%),
    radial-gradient(circle at 88% 84%, rgba(255, 112, 176, 0.24), transparent 46%),
    linear-gradient(
      160deg,
      var(--auth-stage-top),
      var(--auth-stage-mid) 52%,
      var(--auth-stage-bottom)
    );
}

.auth-book {
  position: relative;
  width: 100%;
  max-width: min(96vw, 72rem);
  height: min(82dvh, 46rem);
  display: grid;
  grid-template-columns: minmax(24rem, 1.08fr) minmax(22rem, 0.92fr);
  grid-template-areas: 'visual panel';
  border-radius: clamp(1.4rem, 2.7vw, 2.5rem);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.22);
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

.auth-visual {
  grid-area: visual;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  min-height: 0;
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
  margin-bottom: var(--spacing-2);
}

.back-btn {
  padding: var(--spacing-2);
  border-radius: var(--radius-full);
  border: 1px solid rgba(74, 85, 135, 0.2);
  background: rgba(95, 108, 174, 0.08);
  color: #3a4266;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: var(--radius-full);
  margin: 0 auto var(--spacing-4);
}

.status-icon--success {
  background: rgba(var(--color-success-rgb, 34, 197, 94), 0.1);
  color: var(--color-success);
}

.auth-title {
  font-size: clamp(1.45rem, 1.2rem + 1.1vw, 2rem);
  text-align: center;
  margin-bottom: var(--spacing-1);
  color: #212840;
}

.auth-subtitle {
  text-align: center;
  color: rgba(50, 58, 90, 0.72);
  margin-bottom: var(--spacing-4);
  font-size: var(--text-xs);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
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
  color: rgba(52, 62, 97, 0.7);
}

.turnstile-title {
  font-weight: var(--font-semibold);
  color: #364066;
}

.turnstile-hint {
  font-variant-numeric: tabular-nums;
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

.action-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.auth-link {
  font-size: var(--text-sm);
  color: #4957dd;
  font-weight: var(--font-medium);
}

.auth-link:hover {
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

  .auth-book {
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
    overflow: visible;
    padding: clamp(0.8rem, 3.2vw, 1.25rem);
    border-inline-start: none;
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
    transform: rotateY(-14deg) translateX(-1.2rem) scale(0.98);
  }

  100% {
    opacity: 1;
    transform: rotateY(0) translateX(0) scale(1);
  }
}
</style>
