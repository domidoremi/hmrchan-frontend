<template>
  <section class="hmr-auth-page auth-page auth-page--passkey-recovery">
    <div class="hmr-auth-layout hmr-form-layout--wide">
      <aside class="hmr-auth-story" data-hmr-reveal>
        <p class="hmr-kicker">{{ t('auth.recoveryEyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('auth.recoveryTitle') }}</h1>
        <p class="hmr-body">{{ t('auth.recoveryBody') }}</p>
        <div class="hmr-auth-orbit" aria-hidden="true">
          <span>开始</span>
          <span>验证</span>
          <span>恢复</span>
        </div>
        <div class="hmr-auth-timeline" aria-label="Passkey recovery steps">
          <span :class="{ 'is-active': recoveryStep === 'start' }">开始</span>
          <span :class="{ 'is-active': recoveryStep === 'verify' }">验证</span>
          <span :class="{ 'is-active': auth.passkeyRecovery?.canRegister }">完成</span>
        </div>
      </aside>

      <form class="hmr-form hmr-auth-card" data-hmr-reveal @submit.prevent="submit">
        <p class="hmr-kicker">恢复请求</p>
        <label>
          <span>{{ t('auth.email') }}</span>
          <input v-model="email" required type="email" autocomplete="email" />
        </label>
        <label>
          <span>{{ t('auth.password') }}</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <label v-if="recoveryStep === 'verify'">
          <span>邮箱验证码</span>
          <input v-model="verificationCode" required autocomplete="one-time-code" />
        </label>
        <div
          v-if="auth.passkeyRecovery"
          class="hmr-auth-status hmr-auth-status--dots"
          aria-hidden="true"
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p v-if="auth.error" class="hmr-form-error">{{ auth.error || t('auth.error') }}</p>
        <button class="hmr-cta" type="submit" :disabled="auth.isLoading">
          {{ recoveryStep === 'start' ? '开始恢复' : '验证恢复请求' }}
        </button>
        <button
          v-if="auth.passkeyRecovery?.id"
          class="hmr-auth-provider"
          type="button"
          :disabled="auth.isLoading"
          @click="pollStatus"
        >
          刷新恢复状态
        </button>
        <RouterLink class="hmr-text-link" to="/login">回到登录</RouterLink>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useHmrPasskeyRecoveryFlow } from '@/hmr/composables/useHmrPasskeyRecoveryFlow'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const { email, password, pollStatus, recoveryStep, submit, verificationCode } =
  useHmrPasskeyRecoveryFlow(auth)
</script>
