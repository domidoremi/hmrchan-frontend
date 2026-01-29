<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <div class="auth-badge">
        <span class="auth-badge-dot" />
        <span>{{ $t('auth.secureBadge') }}</span>
      </div>
      <div class="auth-header">
        <button
          type="button"
          class="back-btn glass-button"
          :aria-label="$t('common.back')"
          @click="handleBack"
        >
          <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="sm" />
        </button>
      </div>

      <h1 class="auth-title">{{ $t('auth.loginTitle') }}</h1>
      <p class="auth-subtitle">{{ $t('auth.loginSubtitle') }}</p>
      <p class="auth-helper">{{ $t('auth.loginHint') }}</p>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="usernameOrEmail">{{ $t('auth.usernameOrEmail') }}</label>
          <Input
            id="usernameOrEmail"
            v-model="usernameOrEmail"
            type="text"
            :placeholder="$t('auth.usernameOrEmailPlaceholder')"
            autocomplete="username"
            required
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
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
              @click="showPassword = !showPassword"
            >
              <AnimatedIcon v-if="showPassword" name="explore" :fallback-icon="EyeOff" size="sm" />
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

        <Button
          type="submit"
          :loading="isLoading"
          :disabled="turnstileEnabled && !turnstileToken"
          full-width
        >
          {{ $t('auth.loginButton') }}
        </Button>
      </form>

      <p class="auth-footer">
        {{ $t('auth.noAccount') }}
        <RouterLink to="/register">{{ $t('nav.register') }}</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isLoading, isAuthenticated } = storeToRefs(authStore)

const usernameOrEmail = ref('')
const password = ref('')
const showPassword = ref(false)

const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
const turnstileEnabled = turnstileSiteKey.length > 0
const turnstileToken = ref<string | null>(null)
const turnstileRef = ref<{ reset: () => void; getResponse: () => string | undefined } | null>(null)

// 获取重定向目标（验证安全性，防止 Open Redirect 攻击）
const redirectTo = computed(() => {
  const redirect = route.query['redirect']
  if (typeof redirect !== 'string' || !redirect) {
    return '/'
  }
  // 只允许相对路径，禁止外部 URL 和协议
  // 阻止: https://evil.com, //evil.com, javascript:, data:
  if (
    redirect.startsWith('//') ||
    redirect.includes('://') ||
    redirect.startsWith('javascript:') ||
    redirect.startsWith('data:') ||
    redirect.startsWith('vbscript:')
  ) {
    return '/'
  }
  // 确保以 / 开头的相对路径
  return redirect.startsWith('/') ? redirect : '/'
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

// 如果已登录，重定向到首页
if (isAuthenticated.value) {
  router.replace(redirectTo.value)
}

async function handleLogin() {
  if (!usernameOrEmail.value || !password.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    return
  }

  if (turnstileEnabled && !turnstileToken.value) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    return
  }

  const result = await authStore.login(
    usernameOrEmail.value,
    password.value,
    turnstileToken.value || undefined
  )

  if (result.success) {
    toastStore.success(t('auth.loginSuccess'))
    router.replace(redirectTo.value)
  } else {
    turnstileToken.value = null
    turnstileRef.value?.reset()
    toastStore.error(t(result.error || 'auth.invalidCredentials'))
  }
}

function handleTurnstileVerify(token: string) {
  turnstileToken.value = token
}

function handleTurnstileExpire() {
  turnstileToken.value = null
}

function handleTurnstileError() {
  turnstileToken.value = null
  toastStore.error(t('auth.error.turnstileFailed'))
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3);
}

.auth-card {
  width: 100%;
  max-width: 380px;
  padding: var(--spacing-5);
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
  box-shadow:
    0 16px 40px -24px rgba(15, 23, 42, 0.4),
    0 6px 20px -12px rgba(15, 23, 42, 0.35);
}

@media (min-width: 640px) {
  .auth-card {
    padding: var(--spacing-6);
  }
}

.auth-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: var(--spacing-2);
}

.auth-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-text-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  width: fit-content;
  margin-bottom: var(--spacing-3);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.auth-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.6);
}

.back-btn {
  padding: var(--spacing-2);
  border-radius: var(--radius-full);
}

.auth-title {
  font-size: var(--text-xl);
  text-align: center;
  margin-bottom: var(--spacing-1);
}

@media (min-width: 640px) {
  .auth-title {
    font-size: var(--text-2xl);
  }
}

.auth-subtitle {
  text-align: center;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-4);
  font-size: var(--text-sm);
}

.auth-helper {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: calc(var(--spacing-4) * -1 + var(--spacing-2));
  margin-bottom: var(--spacing-4);
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

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 44px;
}

.password-toggle {
  position: absolute;
  right: var(--spacing-3);
  height: 32px;
  width: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
}

.password-toggle:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.turnstile-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  background: rgba(var(--color-surface-rgb), 0.6);
  border: 1px solid rgba(var(--color-border-rgb), 0.6);
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
  color: var(--color-text-secondary);
}

.turnstile-hint {
  font-variant-numeric: tabular-nums;
}

.auth-footer {
  text-align: center;
  margin-top: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.auth-footer a {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
