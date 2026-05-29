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
import { onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useHmrAuthCallbackFlow } from '@/hmr/composables/useHmrAuthCallbackFlow'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { completeCallback, statusCopy } = useHmrAuthCallbackFlow({ auth, route, router, t })

onMounted(() => {
  void completeCallback()
})
</script>
