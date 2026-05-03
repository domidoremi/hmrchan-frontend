<template>
  <section class="hmr-auth-page">
    <form class="hmr-form hmr-auth-card" @submit.prevent="submit">
      <p class="hmr-kicker">{{ t('auth.eyebrow') }}</p>
      <h1>{{ t('auth.loginTitle') }}</h1>
      <label>
        <span>{{ t('auth.username') }}</span>
        <input v-model="username" required autocomplete="username" />
      </label>
      <label>
        <span>{{ t('auth.password') }}</span>
        <input v-model="password" required type="password" autocomplete="current-password" />
      </label>
      <p v-if="auth.error" class="hmr-form-error">{{ t('auth.error') }}</p>
      <button class="hmr-cta hmr-cta--dark" type="submit" :disabled="auth.isLoading">
        {{ t('auth.submitLogin') }}
      </button>
      <RouterLink class="hmr-link" to="/register">{{ t('auth.registerTitle') }}</RouterLink>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const password = ref('')
const redirectTo = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/profile'
)

async function submit(): Promise<void> {
  const success = await auth.login(username.value, password.value)
  if (success) {
    await router.push(redirectTo.value)
  }
}
</script>
