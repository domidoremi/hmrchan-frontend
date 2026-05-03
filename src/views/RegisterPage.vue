<template>
  <section class="hmr-auth-page">
    <form class="hmr-form hmr-auth-card" @submit.prevent="submit">
      <p class="hmr-kicker">{{ t('auth.eyebrow') }}</p>
      <h1>{{ t('auth.registerTitle') }}</h1>
      <label>
        <span>{{ t('auth.username') }}</span>
        <input v-model="username" required autocomplete="username" />
      </label>
      <label>
        <span>{{ t('auth.email') }}</span>
        <input v-model="email" required type="email" autocomplete="email" />
      </label>
      <label>
        <span>{{ t('auth.password') }}</span>
        <input v-model="password" required type="password" autocomplete="new-password" />
      </label>
      <p v-if="auth.error" class="hmr-form-error">{{ t('auth.error') }}</p>
      <button class="hmr-cta hmr-cta--dark" type="submit" :disabled="auth.isLoading">
        {{ t('auth.submitRegister') }}
      </button>
      <RouterLink class="hmr-link" to="/login">{{ t('auth.loginTitle') }}</RouterLink>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const email = ref('')
const password = ref('')

async function submit(): Promise<void> {
  const success = await auth.register(username.value, email.value, password.value)
  if (success) {
    await router.push('/login')
  }
}
</script>
