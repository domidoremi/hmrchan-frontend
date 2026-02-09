<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-vue-next'
import { authService, ApiError } from '@/api'
import { useToastStore } from '@/stores'
import Button from '@/components/ui/Button.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toastStore = useToastStore()

type Status = 'loading' | 'success' | 'error' | 'invalid'
const status = ref<Status>('loading')
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query['token']
  if (typeof token !== 'string' || !token) {
    status.value = 'invalid'
    return
  }

  try {
    await authService.verifyEmail(token)
    status.value = 'success'
  } catch (err) {
    status.value = 'error'
    if (err instanceof ApiError) {
      errorMessage.value = err.message
    }
  }
})

function goToLogin() {
  router.push('/login')
}

async function resend() {
  try {
    await authService.sendVerificationEmail()
    toastStore.success(t('email.resendSuccess'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('email.resendFailed'))
    }
  }
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3);
}

.auth-card {
  width: 100%;
  max-width: min(90vw, 23.75rem);
  padding: var(--spacing-6);
  text-align: center;
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
  box-shadow:
    0 16px 40px -24px rgba(15, 23, 42, 0.4),
    0 6px 20px -12px rgba(15, 23, 42, 0.35);
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  margin: 0 auto var(--spacing-4);
}

.status-icon--loading {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.status-icon--success {
  background: rgba(var(--color-success-rgb, 34, 197, 94), 0.1);
  color: var(--color-success);
}

.status-icon--error {
  background: rgba(var(--color-error-rgb, 239, 68, 68), 0.1);
  color: var(--color-error);
}

.auth-title {
  font-size: var(--text-xl);
  margin-bottom: var(--spacing-1);
}

@media (min-width: 640px) {
  .auth-title {
    font-size: var(--text-2xl);
  }
}

.auth-subtitle {
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-5);
  font-size: var(--text-sm);
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
</style>
