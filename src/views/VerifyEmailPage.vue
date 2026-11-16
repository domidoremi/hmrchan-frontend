<template>
  <div class="auth-page auth-page--verify">
    <div class="auth-card auth-card--stack">
      <!-- Verifying -->
      <template v-if="status === 'loading'">
        <div class="status-icon status-icon--loading">
          <span class="spinner" />
        </div>
        <h1 class="auth-title">{{ $t('email.verifying') }}</h1>
        <p class="auth-subtitle">{{ $t('email.verifyingHint') }}</p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="status-icon status-icon--success">
          <CheckCircle :size="40" />
        </div>
        <h1 class="auth-title">{{ $t('email.verifySuccess') }}</h1>
        <p class="auth-subtitle">{{ $t('email.verifySuccessHint') }}</p>
        <Button full-width @click="goToLogin">
          {{ $t('auth.loginButton') }}
        </Button>
      </template>

      <!-- Error -->
      <template v-else-if="status === 'error'">
        <div class="status-icon status-icon--error">
          <XCircle :size="40" />
        </div>
        <h1 class="auth-title">{{ $t('email.verifyFailed') }}</h1>
        <p class="auth-subtitle">{{ errorMessage || $t('email.verifyFailedHint') }}</p>
        <div class="action-group">
          <Button full-width @click="goToLogin">
            {{ $t('auth.loginButton') }}
          </Button>
          <Button variant="ghost" full-width :loading="isResending" @click="resend">
            {{ $t('email.resend') }}
          </Button>
        </div>
      </template>

      <!-- No token -->
      <template v-else>
        <div class="status-icon status-icon--error">
          <AlertTriangle :size="40" />
        </div>
        <h1 class="auth-title">{{ $t('email.invalidLink') }}</h1>
        <p class="auth-subtitle">{{ $t('email.invalidLinkHint') }}</p>
        <Button full-width @click="goToLogin">
          {{ $t('auth.loginButton') }}
        </Button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'VerifyEmailPage' })

import { ref, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CheckCircle, XCircle, AlertTriangle } from '@lucide/vue'
import { authService, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import { scrubSensitiveUrlParameters } from '@/utils/sensitiveUrl'
import Button from '@/components/ui/Button.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

type Status = 'loading' | 'success' | 'error' | 'invalid'
const status = ref<Status>('loading')
const errorMessage = ref('')
const isResending = ref(false)
let verifyController: AbortController | null = null
let resendController: AbortController | null = null
let disposed = false

function cancelResend() {
  resendController?.abort()
  resendController = null
  isResending.value = false
}

function cancelRequests() {
  verifyController?.abort()
  verifyController = null
  cancelResend()
}

async function verifyCurrentLink() {
  if (disposed) return
  cancelRequests()
  errorMessage.value = ''
  status.value = 'loading'
  const token = route.query['token']
  scrubSensitiveUrlParameters(['token'])
  if (typeof token !== 'string' || !token.trim()) {
    status.value = 'invalid'
    return
  }

  const controller = new AbortController()
  verifyController = controller
  try {
    await authService.verifyEmail(token.trim(), { signal: controller.signal })
    if (controller.signal.aborted) return
    status.value = 'success'
  } catch (err) {
    if (controller.signal.aborted) return
    status.value = 'error'
    if (err instanceof ApiError) {
      errorMessage.value = err.message
    }
  } finally {
    if (verifyController === controller) {
      verifyController = null
    }
  }
}

watch(() => route.query['token'], verifyCurrentLink, { immediate: true, flush: 'sync' })
watch(() => route.query['email'], cancelResend, { flush: 'sync' })
watch(
  () => route.query,
  () => scrubSensitiveUrlParameters(['token']),
  { deep: true, flush: 'sync' }
)

onBeforeUnmount(() => {
  disposed = true
  cancelRequests()
})

function goToLogin() {
  cancelRequests()
  router.push('/login')
}

async function resend() {
  if (disposed || isResending.value || status.value !== 'error') return
  const emailFromQuery = route.query['email']
  const emailParam =
    typeof emailFromQuery === 'string' && emailFromQuery ? { email: emailFromQuery } : undefined

  const controller = new AbortController()
  resendController = controller
  const isCurrent = () => resendController === controller && !controller.signal.aborted
  isResending.value = true
  try {
    await authService.sendVerificationEmail(emailParam, { signal: controller.signal })
    if (!isCurrent()) return
    toastStore.success(t('email.resendSuccess'))
  } catch (err) {
    if (!isCurrent()) return
    if (err instanceof ApiError) {
      if (err.status === 401 && emailParam) {
        toastStore.warning(t('email.loginToResend'))
      } else {
        toastStore.error(err.message)
      }
    } else {
      toastStore.error(t('email.resendFailed'))
    }
  } finally {
    if (resendController === controller) {
      resendController = null
      isResending.value = false
    }
  }
}
</script>

<style scoped>
.auth-card {
  justify-items: center;
  text-align: center;
}

.auth-subtitle {
  margin: 0;
  max-inline-size: 32ch;
}
</style>
