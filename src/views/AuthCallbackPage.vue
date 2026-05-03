<template>
  <section class="hmr-page-hero">
    <p class="hmr-kicker">{{ t('auth.callbackEyebrow') }}</p>
    <h1>{{ t('auth.callbackTitle') }}</h1>
    <p>{{ t('auth.callbackBody') }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  await auth.resolveSession()
  if (auth.isAuthenticated) {
    await router.replace('/profile')
  }
})
</script>
