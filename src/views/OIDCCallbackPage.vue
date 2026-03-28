<template>
  <div class="auth-page auth-page--login">
    <div class="auth-book auth-book--callback">
      <section class="auth-visual" aria-hidden="true">
        <AuthVisualScene
          :title="$t('auth.oidc.callbackTitle')"
          :subtitle="statusSubtitle"
          :mood="hasError ? 'dodge' : 'submitting'"
          :show-copy="false"
          scene-kind="login"
        />
      </section>

      <section class="auth-panel">
        <div class="auth-panel-inner auth-panel-inner--callback">
          <div class="auth-headings auth-headings--callback">
            <p class="auth-callback__eyebrow">{{ $t('auth.oidc.webEyebrow') }}</p>
            <h1 class="auth-title">{{ $t('auth.oidc.callbackTitle') }}</h1>
            <p class="auth-subtitle">
              {{ statusSubtitle }}
            </p>
          </div>

          <div class="auth-callback__card">
            <template v-if="!hasError">
              <div class="auth-callback__spinner" aria-hidden="true" />
              <p class="auth-callback__message">{{ $t('auth.oidc.callbackLoading') }}</p>
            </template>

            <template v-else>
              <p class="field-error">{{ errorMessage }}</p>
              <p v-if="errorDetail" class="auth-callback__detail">{{ errorDetail }}</p>

              <div class="auth-callback__actions">
                <Button type="button" full-width @click="retryOIDCLogin">
                  {{ $t('auth.oidc.retryButton') }}
                </Button>
                <RouterLink class="auth-callback__link" to="/login">
                  {{ $t('auth.backToLogin') }}
                </RouterLink>
              </div>
            </template>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'OIDCCallbackPage' })

import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useToastStore } from '@/stores'
import Button from '@/components/ui/Button.vue'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const hasError = ref(false)
const errorMessage = ref('')
const errorDetail = ref('')

const fallbackRedirect = computed(() => {
  const redirect = route.query['redirect']
  return typeof redirect === 'string' && redirect.trim() ? redirect : '/'
})
const statusSubtitle = computed(() =>
  hasError.value ? t('auth.oidc.callbackError') : t('auth.oidc.callbackSubtitle')
)

async function retryOIDCLogin() {
  const result = await authStore.loginWithOIDC('web', fallbackRedirect.value)
  if (!result.success) {
    errorMessage.value = t(result.error || 'auth.error.oidcLoginFailed')
  }
}

onMounted(async () => {
  const result = await authStore.completeOIDCLogin('web', window.location.href)

  if (!result.success) {
    hasError.value = true
    errorMessage.value = t(result.error || 'auth.error.oidcLoginFailed')
    errorDetail.value = result.detail || ''
    return
  }

  toastStore.success(t('auth.loginSuccess'))
  const redirectTo =
    typeof result.redirectTo === 'string' && result.redirectTo.trim()
      ? result.redirectTo
      : fallbackRedirect.value
  await router.replace(redirectTo)
})
</script>

<style scoped>
.auth-book--callback {
  align-items: stretch;
}

.auth-panel-inner--callback {
  justify-content: center;
  gap: 1.5rem;
}

.auth-headings--callback {
  gap: 0.75rem;
}

.auth-callback__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.62);
}

.auth-callback__card {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.auth-callback__spinner {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  border: 0.18rem solid rgba(37, 99, 235, 0.18);
  border-top-color: rgba(37, 99, 235, 0.94);
  animation: auth-callback-spin 0.9s linear infinite;
}

.auth-callback__message,
.auth-callback__detail {
  margin: 0;
  color: rgba(15, 23, 42, 0.72);
  line-height: 1.6;
}

.auth-callback__detail {
  font-size: 0.92rem;
}

.auth-callback__actions {
  display: grid;
  gap: 0.75rem;
}

.auth-callback__link {
  justify-self: center;
  color: var(--color-primary, #2563eb);
  font-weight: 600;
  text-decoration: none;
}

@keyframes auth-callback-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
