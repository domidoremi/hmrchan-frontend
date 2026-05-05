<template>
  <section class="hmr-auth-page">
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
        <p v-if="auth.passkeyRecovery" class="hmr-auth-status">{{ recoveryStatusCopy }}</p>
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
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const verificationCode = ref('')
const recoveryStep = computed(() => (auth.passkeyRecovery?.id ? 'verify' : 'start'))
const recoveryStatusCopy = computed(() => {
  if (!auth.passkeyRecovery) return ''
  if (auth.passkeyRecovery.canRegister || auth.passkeyRecovery.status === 'ready') {
    return '恢复验证已通过，可以继续注册新的 Passkey。'
  }
  if (auth.passkeyRecovery.status === 'blocked') return '恢复暂时受限，请稍后再试。'
  if (auth.passkeyRecovery.status === 'cooldown') return '恢复请求需要等待片刻。'
  return '恢复请求已创建，请继续完成验证。'
})

async function submit(): Promise<void> {
  const payload = {
    email: email.value,
    password: password.value,
    verificationCode: verificationCode.value,
  }

  if (recoveryStep.value === 'start') {
    await auth.startPasskeyRecovery(payload)
    return
  }

  await auth.verifyPasskeyRecovery(payload)
}

async function pollStatus(): Promise<void> {
  await auth.pollPasskeyRecoveryStatus()
}
</script>
