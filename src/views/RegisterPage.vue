<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <h1 class="auth-title">{{ $t('auth.registerTitle') }}</h1>
      <p class="auth-subtitle">{{ $t('auth.registerSubtitle') }}</p>

      <form class="auth-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">{{ $t('auth.username') }}</label>
          <input id="username" v-model="username" type="text" class="glass-input" required />
        </div>

        <div class="form-group">
          <label for="email">{{ $t('auth.email') }}</label>
          <input id="email" v-model="email" type="email" class="glass-input" required />
        </div>

        <div class="form-group">
          <label for="password">{{ $t('auth.password') }}</label>
          <input id="password" v-model="password" type="password" class="glass-input" required />
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

        <TurnstileWidget
          v-if="turnstileEnabled"
          ref="turnstileRef"
          :site-key="turnstileSiteKey"
          action="register"
          @verify="handleTurnstileVerify"
          @expire="handleTurnstileExpire"
          @error="handleTurnstileError"
        />

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
    weak: t('auth.passwordWeak', '弱'),
    fair: t('auth.passwordFair', '一般'),
    good: t('auth.passwordGood', '良好'),
    strong: t('auth.passwordStrong', '强'),
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
    toastStore.warning(t('auth.error.passwordTooWeak', '密码强度太弱，请增加复杂度'))
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
