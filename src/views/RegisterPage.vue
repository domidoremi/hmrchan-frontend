<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <div class="auth-badge">
        <span class="auth-badge-dot" />
        <span>{{ $t('auth.secureBadge') }}</span>
      </div>
      <h1 class="auth-title">{{ $t('auth.registerTitle') }}</h1>
      <p class="auth-subtitle">{{ $t('auth.registerSubtitle') }}</p>
      <p class="auth-helper">{{ $t('auth.registerHint') }}</p>

      <form class="auth-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">{{ $t('auth.username') }}</label>
          <Input id="username" v-model="username" type="text" required />
        </div>

        <div class="form-group">
          <label for="email">{{ $t('auth.email') }}</label>
          <Input id="email" v-model="email" type="email" required />
        </div>

        <div class="form-group">
          <label for="password">{{ $t('auth.password') }}</label>
          <Input id="password" v-model="password" type="password" required />
          <!-- Password Strength Indicator -->
          <div v-if="password" class="password-strength">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="`strength-${passwordStrengthResult.level}`"
                :style="{ width: `${passwordStrengthResult.percentage}%` }"
              />
            </div>
            <span class="strength-text" :class="`strength-${passwordStrengthResult.level}`">
              {{ passwordStrengthText }}
            </span>
          </div>
          <ul
            v-if="password && passwordStrengthResult.suggestions.length > 0"
            class="password-suggestions"
          >
            <li v-for="suggestion in passwordStrengthResult.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>

        <div v-if="turnstileEnabled" class="turnstile-block">
          <div class="turnstile-header">
            <span class="turnstile-title">{{ $t('auth.verifyTitle') }}</span>
            <span class="turnstile-hint">{{ $t('auth.verifyHint') }}</span>
          </div>
          <TurnstileWidget
            ref="turnstileRef"
            :site-key="turnstileSiteKey"
            action="register"
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
          {{ $t('auth.registerButton') }}
        </Button>
      </form>

      <p class="auth-footer">
        {{ $t('auth.hasAccount') }}
        <RouterLink to="/login">{{ $t('nav.login') }}</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { checkPasswordStrength } from '@/utils/crypto'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import TurnstileWidget from '@/components/ui/TurnstileWidget.vue'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isLoading, isAuthenticated } = storeToRefs(authStore)

const username = ref('')
const email = ref('')
const password = ref('')

// Password strength
const passwordStrengthResult = computed(() => checkPasswordStrength(password.value))
const passwordStrengthText = computed(() => {
  const textMap: Record<string, string> = {
    weak: t('auth.passwordWeak'),
    fair: t('auth.passwordFair'),
    good: t('auth.passwordGood'),
    strong: t('auth.passwordStrong'),
  }
  return textMap[passwordStrengthResult.value.level]
})

const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
const turnstileEnabled = turnstileSiteKey.length > 0
const turnstileToken = ref<string | null>(null)
const turnstileRef = ref<{ reset: () => void; getResponse: () => string | undefined } | null>(null)

// 如果已登录，重定向到首页
if (isAuthenticated.value) {
  router.replace('/')
}

async function handleRegister() {
  if (!username.value || !email.value || !password.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    return
  }

  if (turnstileEnabled && !turnstileToken.value) {
    toastStore.warning(t('auth.error.turnstileRequired'))
    return
  }

  // 基础密码验证 - 使用 crypto 模块检查强度
  if (password.value.length < 8) {
    toastStore.warning(t('auth.error.passwordTooShort'))
    return
  }

  // 密码强度检查
  if (passwordStrengthResult.value.level === 'weak') {
    toastStore.warning(t('auth.error.passwordTooWeak'))
    return
  }

  const result = await authStore.register(
    username.value,
    email.value,
    password.value,
    turnstileToken.value || undefined
  )

  if (result.success) {
    toastStore.success(t('auth.registerSuccess'))
    router.push('/')
  } else {
    turnstileToken.value = null
    turnstileRef.value?.reset()
    toastStore.error(t(result.error || 'auth.error.registerFailed'))
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

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
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

/* Password Strength */
.password-strength {
  margin-top: var(--spacing-2);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition:
    width 0.3s ease,
    background 0.3s ease;
}

.strength-fill.strength-weak {
  background: var(--color-error);
}

.strength-fill.strength-fair {
  background: var(--color-warning, #f59e0b);
}

.strength-fill.strength-good {
  background: var(--color-info, #3b82f6);
}

.strength-fill.strength-strong {
  background: var(--color-success);
}

.strength-text {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  min-width: 2.5rem;
}

.strength-text.strength-weak {
  color: var(--color-error);
}

.strength-text.strength-fair {
  color: var(--color-warning, #f59e0b);
}

.strength-text.strength-good {
  color: var(--color-info, #3b82f6);
}

.strength-text.strength-strong {
  color: var(--color-success);
}

.password-suggestions {
  margin-top: var(--spacing-1);
  padding-left: var(--spacing-4);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.password-suggestions li {
  margin-bottom: var(--spacing-1);
}
</style>
