<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <h1 class="auth-title">{{ $t('auth.loginTitle') }}</h1>
      <p class="auth-subtitle">{{ $t('auth.loginSubtitle') }}</p>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">{{ $t('auth.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="glass-input"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">{{ $t('auth.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="glass-input"
            required
          />
        </div>

        <Button type="submit" :loading="isLoading" full-width>
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
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const { isLoading, isAuthenticated } = storeToRefs(authStore)

const email = ref('')
const password = ref('')

// 获取重定向目标
const redirectTo = computed(() => {
  const redirect = route.query['redirect']
  return typeof redirect === 'string' ? redirect : '/'
})

// 如果已登录，重定向到首页
if (isAuthenticated.value) {
  router.replace(redirectTo.value)
}

async function handleLogin() {
  if (!email.value || !password.value) {
    toastStore.warning(t('auth.error.fieldsRequired'))
    return
  }

  const result = await authStore.login(email.value, password.value)

  if (result.success) {
    toastStore.success(t('auth.loginSuccess'))
    router.push(redirectTo.value)
  } else {
    toastStore.error(t(result.error || 'auth.invalidCredentials'))
  }
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-8);
}

.auth-title {
  font-size: var(--text-2xl);
  text-align: center;
  margin-bottom: var(--spacing-2);
}

.auth-subtitle {
  text-align: center;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-6);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
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
  margin-top: var(--spacing-6);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.auth-footer a {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}
</style>
