<template>
  <div class="auth-page auth-page--forgot">
    <AuthEntryShell
      :title="emailSent ? $t('email.resetEmailSent') : $t('email.forgotPasswordTitle')"
      :subtitle="emailSent ? '' : $t('email.forgotPasswordHint')"
      :show-tabs="false"
      split
      @back="handleBack"
    >
      <div v-if="emailSent" class="auth-form">
        <div class="auth-card auth-card--stack auth-status-card">
          <div class="status-icon status-icon--success">
            <Mail :size="24" />
          </div>
          <div class="action-group">
            <Button variant="ghost" full-width :disabled="resendCooldown > 0" @click="handleSubmit">
              {{
                resendCooldown > 0
                  ? $t('email.resendCooldown', { seconds: resendCooldown })
                  : $t('email.resend')
              }}
            </Button>
            <RouterLink to="/login" class="auth-link">
              {{ $t('email.backToLogin') }}
            </RouterLink>
          </div>
        </div>

        <AuthTurnstileStatus
          v-if="showTurnstileChallenge"
          :status="turnstileStatus"
          :show-widget-frame="turnstileStatus === 'interactive_required'"
        >
          <TurnstileWidget
            ref="turnstileRef"
            :site-key="turnstileSiteKey"
            action="forgot-password"
            size="compact"
            appearance="execute"
            execution="execute"
            auto-execute
            @verify="handleTurnstileVerify"
            @expire="handleTurnstileExpire"
            @error="handleTurnstileError"
            @status="turnstileStatus = $event"
          />
        </AuthTurnstileStatus>
      </div>

      <form v-else class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-card auth-card--stack">
          <div class="form-group">
            <label for="email">{{ $t('auth.email') }}</label>
            <Input
              id="email"
              v-model="email"
              type="email"
              :placeholder="$t('email.emailPlaceholder')"
              autocomplete="email"
              required
            />
          </div>

          <AuthTurnstileStatus
            v-if="showTurnstileChallenge"
            :status="turnstileStatus"
            :show-widget-frame="turnstileStatus === 'interactive_required'"
          >
            <TurnstileWidget
              ref="turnstileRef"
              :site-key="turnstileSiteKey"
              action="forgot-password"
              size="compact"
              appearance="execute"
              execution="execute"
              auto-execute
              @verify="handleTurnstileVerify"
              @expire="handleTurnstileExpire"
              @error="handleTurnstileError"
              @status="turnstileStatus = $event"
            />
          </AuthTurnstileStatus>

          <div class="action-group">
            <Button
              type="submit"
              :loading="isLoading || turnstileStatus === 'executing'"
              :disabled="isTurnstileStatusBusy"
              full-width
            >
              {{ $t('email.sendResetLink') }}
            </Button>
          </div>
        </div>
      </form>

      <template #footer>
        <p class="auth-footer">
          {{ $t('email.rememberPassword') }}
          <RouterLink to="/login">{{ $t('nav.login') }}</RouterLink>
        </p>
      </template>
    </AuthEntryShell>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ForgotPasswordPage' })

import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Mail } from '@lucide/vue'
import { authService, ApiError } from '@/api'
import { clientSecurityService } from '@/api/clientSecurityService'
import { useToastStore } from '@/stores'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AuthEntryShell from '@/components/auth/AuthEntryShell.vue'
import AuthTurnstileStatus from '@/components/auth/AuthTurnstileStatus.vue'
import { useTurnstileConfig } from '@/composables/useTurnstileConfig'
import { getTurnstileErrorMessageKey, isTurnstileRequiredError } from '@/utils/turnstile'
import { isTurnstileBusy, type TurnstileWidgetStatus } from '@/utils/turnstileWidgetStatus'

const { t } = useI18n()
const toastStore = useToastStore()
const router = useRouter()

const email = ref('')
const isLoading = ref(false)
const emailSent = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const { turnstileSiteKey, turnstileEnabled } = useTurnstileConfig()
const turnstileToken = ref<string | null>(null)
const turnstileStatus = ref<TurnstileWidgetStatus>('idle')
const requiresTurnstileChallenge = ref(false)
const turnstileRef = useTemplateRef<{
  reset: () => void
  getResponse: () => string | undefined
  execute?: () => Promise<string>
}>('turnstileRef')
const showTurnstileChallenge = computed(
  () => turnstileEnabled.value && requiresTurnstileChallenge.value
)
const isTurnstileStatusBusy = computed(() => isTurnstileBusy(turnstileStatus.value))

const maskedEmail = ref('')

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
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

onMounted(() => {
  void import('@/views/LoginPage.vue').catch(() => {})
  void import('@/views/RegisterPage.vue').catch(() => {})
})

onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.replace('/login')
}

async function handleSubmit() {
  if (!email.value) {
    toastStore.warning(t('auth.emailRequired'))
    return
  }

  if (showTurnstileChallenge.value && !turnstileToken.value) {
    const token = await turnstileRef.value?.execute?.()
    if (token) {
      turnstileToken.value = token
    } else {
      toastStore.warning(t('auth.error.turnstileRequired'))
      return
    }
  }

  isLoading.value = true

  try {
    if (turnstileToken.value) {
      await clientSecurityService.verify(turnstileToken.value)
    }

    await authService.requestPasswordReset({
      email: email.value,
      ...(turnstileToken.value ? { turnstile_token: turnstileToken.value } : {}),
    })
    maskedEmail.value = maskEmail(email.value)
    emailSent.value = true
    requiresTurnstileChallenge.value = false
    turnstileToken.value = null
    startCooldown()
  } catch (error) {
    if (error instanceof ApiError) {
      if (isTurnstileRequiredError(error) && turnstileEnabled.value) {
        requiresTurnstileChallenge.value = true
        turnstileToken.value = null
        turnstileRef.value?.reset()
        toastStore.warning(t('auth.error.turnstileRequired'))
        return
      }

      if (error.status === 404 || error.status === 422) {
        maskedEmail.value = maskEmail(email.value)
        emailSent.value = true
        requiresTurnstileChallenge.value = false
        turnstileToken.value = null
        startCooldown()
      } else {
        toastStore.error(error.message)
      }
    } else {
      toastStore.error(t('auth.error.unknown'))
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
}

function handleTurnstileExpire() {
  requiresTurnstileChallenge.value = true
  turnstileToken.value = null
  turnstileStatus.value = 'expired'
}

function handleTurnstileError(error?: Error) {
  requiresTurnstileChallenge.value = true
  turnstileToken.value = null
  toastStore.error(t(getTurnstileErrorMessageKey(error)))
}
</script>

<style scoped>
.auth-status-card {
  justify-items: center;
  text-align: center;
}
</style>
