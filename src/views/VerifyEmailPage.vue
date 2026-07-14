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
          <Button variant="ghost" full-width @click="resend">
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

import { ref, onMounted, onUnmounted } from 'vue'
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
let verifyController: AbortController | null = null

onMounted(async () => {
  const token = route.query['token']
  scrubSensitiveUrlParameters(['token'])
  if (typeof token !== 'string' || !token) {
    status.value = 'invalid'
    return
  }

  const controller = new AbortController()
  verifyController = controller
  try {
    await authService.verifyEmail(token, { signal: controller.signal })
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
})

onUnmounted(() => {
  verifyController?.abort()
  verifyController = null
})

function goToLogin() {
  router.push('/login')
}

async function resend() {
  // 从 URL query 中获取 email（未登录用户无法通过认证接口重发）
  const emailFromQuery = route.query['email']
  const emailParam =
    typeof emailFromQuery === 'string' && emailFromQuery ? { email: emailFromQuery } : undefined

  try {
    await authService.sendVerificationEmail(emailParam)
    toastStore.success(t('email.resendSuccess'))
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401 && emailParam) {
        // 未登录且有 email 参数，提示用户先登录
        toastStore.warning(t('email.loginToResend'))
      } else {
        toastStore.error(err.message)
      }
    } else {
      toastStore.error(t('email.resendFailed'))
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
