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
              <RouterLink
                to="/login"
                class="auth-link page-control-btn page-control-btn--compact"
                @click="handleNavigateToLogin"
              >
                {{ $t('email.backToLogin') }}
              </RouterLink>
            </div>
            <div v-if="showTurnstileChallenge" class="turnstile-block">
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
          </template>

          <!-- Form state -->
          <template v-else>
            <div class="auth-topline">
              <div class="auth-header">
                <button
                  type="button"
                  class="back-btn page-control-btn page-control-btn--square"
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

              <div v-if="showTurnstileChallenge" class="turnstile-block">
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

              <Button type="submit" :loading="isLoading" full-width>
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

import { computed, onMounted, ref, onUnmounted, useTemplateRef } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Mail } from 'lucide-vue-next'
import { authService, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey, isTurnstileRequiredError } from '@/utils/turnstile'

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

const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()
const turnstileToken = ref<string | null>(null)
const requiresTurnstileChallenge = ref(false)
const turnstileRef = useTemplateRef<{ reset: () => void; getResponse: () => string | undefined }>(
  'turnstileRef'
)
const showTurnstileChallenge = computed(
  () => turnstileEnabled.value && requiresTurnstileChallenge.value
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

onMounted(() => {
  void import('@/views/LoginPage.vue').catch(() => {})
  void import('@/views/RegisterPage.vue').catch(() => {})
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

  if (showTurnstileChallenge.value && !turnstileToken.value) {
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
    requiresTurnstileChallenge.value = false
    turnstileToken.value = null
    setVisualMood('success', 1200)
    startCooldown()
  } catch (err) {
    if (err instanceof ApiError) {
      if (isTurnstileRequiredError(err) && turnstileEnabled.value) {
        requiresTurnstileChallenge.value = true
        turnstileToken.value = null
        turnstileRef.value?.reset()
        toastStore.warning(t('auth.error.turnstileRequired'))
        setVisualMood('typing', 900)
        return
      }
      // For security, still show success to avoid email enumeration
      if (err.status === 404 || err.status === 422) {
        maskedEmail.value = maskEmail(email.value)
        emailSent.value = true
        requiresTurnstileChallenge.value = false
        turnstileToken.value = null
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
  requiresTurnstileChallenge.value = true
  turnstileToken.value = token
  setVisualMood('typing', 500)
}

function handleTurnstileExpire() {
  requiresTurnstileChallenge.value = true
  turnstileToken.value = null
  setVisualMood('typing', 500)
}

function handleTurnstileError(error?: Error) {
  requiresTurnstileChallenge.value = true
  turnstileToken.value = null
  toastStore.error(t(getTurnstileErrorMessageKey(error)))
  setVisualMood('dodge', 900)
}
</script>
