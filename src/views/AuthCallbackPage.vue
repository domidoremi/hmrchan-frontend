<template>
  <section class="hmr-panel-hero">
    <article class="hmr-panel hmr-panel--center hmr-auth-callback" data-hmr-reveal>
      <p class="hmr-kicker">{{ t('auth.callbackEyebrow') }}</p>
      <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('auth.callbackTitle') }}</h1>
      <p class="hmr-body">{{ statusCopy }}</p>
      <div class="hmr-auth-status-orbit" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p v-if="auth.error" class="hmr-form-error">{{ auth.error }}</p>
      <RouterLink v-if="auth.error" class="hmr-text-link" to="/login">回到登录</RouterLink>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { resolveRedirectTarget } from '@/router/redirect'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const nextRedirect = computed(() => resolveRedirectTarget(route.query.redirect))
const statusCopy = computed(() => auth.error ?? t('auth.callbackBody'))

onMounted(async () => {
  const exchangedRedirect = await auth.exchangeGoogleCallback()
  if (!auth.isAuthenticated) {
    await auth.resolveSession()
  }
  if (auth.isAuthenticated) {
    await router.replace(resolveRedirectTarget(exchangedRedirect, nextRedirect.value))
  }
})
</script>
