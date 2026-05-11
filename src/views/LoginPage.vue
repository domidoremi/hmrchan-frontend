<template>
  <section class="hmr-auth-page">
    <div class="hmr-auth-layout hmr-form-layout--wide">
      <aside class="hmr-auth-story" data-hmr-reveal>
        <p class="hmr-kicker">登录</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('auth.loginTitle') }}</h1>
        <p class="hmr-body">登录后查看收藏、历史、回复提醒和安全状态。</p>
        <div class="hmr-auth-orbit" aria-hidden="true">
          <span>内容</span>
          <span>个人</span>
          <span>Passkey</span>
        </div>
        <div class="hmr-story-stack" aria-label="Login benefits">
          <article class="hmr-story-block">
            <p class="hmr-kicker">01 / 内容</p>
            <strong>恢复内容</strong>
            <span>继续查看收藏、历史和回复。</span>
          </article>
          <article class="hmr-story-block">
            <p class="hmr-kicker">02 / 安全</p>
            <strong>保护账号</strong>
            <span>支持密码、Google 登录和 Passkey 恢复。</span>
          </article>
        </div>
      </aside>

      <form class="hmr-form hmr-auth-card" data-hmr-reveal @submit.prevent="submit">
        <p class="hmr-kicker">账户登录</p>
        <label>
          <span>{{ t('auth.username') }}</span>
          <input v-model="username" required autocomplete="username" />
        </label>
        <label>
          <span>{{ t('auth.password') }}</span>
          <input v-model="password" required type="password" autocomplete="current-password" />
        </label>
        <p class="hmr-auth-status">
          {{ auth.isLoading ? '正在登录...' : '输入账号密码后继续。' }}
        </p>
        <p v-if="auth.error" class="hmr-form-error">{{ auth.error || t('auth.error') }}</p>
        <button class="hmr-cta" type="submit" :disabled="auth.isLoading">
          {{ t('auth.submitLogin') }}
        </button>
        <button
          class="hmr-auth-provider"
          type="button"
          :disabled="auth.isLoading"
          @click="startGoogle"
        >
          使用 Google 继续
        </button>
        <div class="hmr-auth-links">
          <RouterLink class="hmr-text-link" :to="registerTarget">
            {{ t('auth.registerTitle') }}
          </RouterLink>
          <RouterLink class="hmr-text-link" to="/auth/passkey-recovery">恢复 Passkey</RouterLink>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { resolveRedirectTarget } from '@/router/redirect'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const password = ref('')
const redirectTo = computed(() => resolveRedirectTarget(route.query.redirect))
const registerTarget = computed(() => ({
  path: '/register',
  query: { redirect: redirectTo.value },
}))

async function submit(): Promise<void> {
  const success = await auth.login(username.value, password.value)
  if (success) {
    await router.push(redirectTo.value)
    return
  }
}

function startGoogle(): void {
  auth.startGoogleLogin('login', redirectTo.value)
}
</script>
