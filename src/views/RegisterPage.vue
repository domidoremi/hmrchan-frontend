<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <h1 class="auth-title">{{ $t('auth.registerTitle') }}</h1>
      <p class="auth-subtitle">{{ $t('auth.registerSubtitle') }}</p>

      <form class="auth-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">{{ $t('auth.username') }}</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="glass-input"
            required
          />
        </div>

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
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const username = ref('')
const email = ref('')
const password = ref('')
const isLoading = ref(false)

async function handleRegister() {
  isLoading.value = true
  const result = await authStore.register(username.value, email.value, password.value)
  isLoading.value = false

  if (result.success) {
    toastStore.success(t('auth.registerSuccess'))
    router.push('/login')
  } else {
    toastStore.error(t('common.error'))
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
