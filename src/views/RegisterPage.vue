<template>
  <section class="hmr-auth-page auth-page auth-page--register">
    <div class="hmr-auth-layout hmr-form-layout--wide">
      <aside class="hmr-auth-story" data-hmr-reveal>
        <p class="hmr-kicker">注册</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('auth.registerTitle') }}</h1>
        <p class="hmr-body">创建账号后可以使用个人资料、收藏和提醒。</p>
        <div class="hmr-auth-orbit" aria-hidden="true">
          <span>创建</span>
          <span>验证</span>
          <span>进入</span>
        </div>
        <div class="hmr-story-stack" role="list" aria-label="Registration flow">
          <article class="hmr-story-block" role="listitem">
            <p class="hmr-kicker">01 / 创建</p>
            <strong>创建账号</strong>
            <span>用户名、邮箱和密码会建立 MomiChan 账户。</span>
          </article>
          <article class="hmr-story-block" role="listitem">
            <p class="hmr-kicker">02 / 验证</p>
            <strong>验证码可选</strong>
            <span>此项可留空，其他信息填写完成后即可继续。</span>
          </article>
        </div>
      </aside>

      <form class="hmr-form hmr-auth-card" data-hmr-reveal @submit.prevent="submit">
        <p class="hmr-kicker">创建账户</p>
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
        <label>
          <span>邮箱验证码（可选）</span>
          <input
            v-model="verificationCode"
            autocomplete="one-time-code"
            inputmode="numeric"
            placeholder="收到验证码时填写"
          />
        </label>
        <p class="hmr-auth-status">
          {{ auth.isLoading ? '正在创建账号...' : '继续完善资料即可。' }}
        </p>
        <p v-if="auth.error" class="hmr-form-error">{{ auth.error || t('auth.error') }}</p>
        <button class="hmr-cta" type="submit" :disabled="auth.isLoading">
          {{ t('auth.submitRegister') }}
        </button>
        <button
          class="hmr-auth-provider"
          type="button"
          :disabled="auth.isLoading"
          @click="startGoogle"
        >
          使用 Google 注册
        </button>
        <RouterLink class="hmr-text-link" :to="loginTarget">{{ t('auth.loginTitle') }}</RouterLink>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useHmrAuthEntry } from '@/hmr/composables/useHmrAuthEntry'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const {
  email,
  loginTarget,
  password,
  startGoogle,
  submitRegister: submit,
  username,
  verificationCode,
} = useHmrAuthEntry({ auth, mode: 'register', route, router })
</script>
