<template>
  <div class="auth-page auth-page--login">
    <div class="auth-book auth-book--logout-callback">
      <section class="auth-visual" aria-hidden="true">
        <AuthVisualScene
          :title="$t('auth.oidc.logoutTitle')"
          :subtitle="$t('auth.oidc.logoutSubtitle')"
          mood="success"
          :show-copy="false"
          scene-kind="login"
        />
      </section>

      <section class="auth-panel">
        <div class="auth-panel-inner auth-panel-inner--logout-callback">
          <div class="auth-headings">
            <h1 class="auth-title">{{ $t('auth.oidc.logoutTitle') }}</h1>
            <p class="auth-subtitle">{{ $t('auth.oidc.logoutSubtitle') }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'OIDCLogoutCallbackPage' })

import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '@/stores'
import AuthVisualScene from '@/components/auth/AuthVisualScene.vue'

const router = useRouter()
const toastStore = useToastStore()
const { t } = useI18n()

onMounted(async () => {
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'logout_callback' } }))
  toastStore.success(t('auth.logoutSuccess'))
  await router.replace('/login')
})
</script>
