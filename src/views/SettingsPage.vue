<template>
  <div class="hmr-route-page hmr-route-page--settings">
    <header class="hmr-auth-page hmr-settings-hero">
      <div class="hmr-auth-layout hmr-form-layout--wide">
        <aside class="hmr-auth-story" data-hmr-reveal>
          <p class="hmr-kicker">设置</p>
          <h1 class="hmr-page-title" data-hmr-text-reveal>设置中枢。</h1>
          <p class="hmr-body">主题、账户、安全和反馈都从这里进入。</p>
          <div class="hmr-story-stack">
            <article v-for="item in settingsStories" :key="item.title" class="hmr-story-block">
              <p class="hmr-kicker">{{ item.kicker }}</p>
              <strong>{{ item.title }}</strong>
              <span>{{ item.body }}</span>
            </article>
          </div>
        </aside>

        <article class="hmr-panel hmr-settings-panel" data-hmr-reveal>
          <p class="hmr-kicker">账户控制</p>
          <h2 class="hmr-card-title">当前状态</h2>
          <p class="hmr-body">
            {{ auth.isAuthenticated ? `${auth.displayName} 已登录。` : '登录后同步个人偏好。' }}
          </p>
          <HmrPageStateBlock
            :loading="state === 'loading'"
            :empty="false"
            :error="resource.error"
            :show-when-ready="false"
            error-title="设置同步失败。"
            error-body="稍后再试，页面会保留当前选项。"
            @retry="refreshSettings"
          />
          <div class="hmr-setting-list">
            <button type="button" @click="theme.toggleTheme">
              <span>主题</span>
              <strong>{{ theme.isDark ? '深色' : '浅色' }}</strong>
            </button>
            <RouterLink to="/profile">
              <span>账户</span>
              <strong>{{ auth.isAuthenticated ? auth.displayName : '未登录' }}</strong>
            </RouterLink>
            <RouterLink to="/auth/passkey-recovery">
              <span>Passkey</span>
              <strong>恢复入口</strong>
            </RouterLink>
            <RouterLink to="/contact">
              <span>反馈</span>
              <strong>联系 HMRChan</strong>
            </RouterLink>
            <button type="button" :disabled="auth.isLoading" @click="logout">
              <span>会话</span>
              <strong>{{ auth.isAuthenticated ? '退出登录' : '去登录' }}</strong>
            </button>
          </div>
        </article>
      </div>
    </header>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">账户索引</p>
          <h2 class="hmr-section-title">每个状态都有落点。</h2>
        </div>
        <div class="hmr-signal-grid hmr-settings-grid">
          <article v-for="item in settingsDeck" :key="item.id" class="hmr-mini-panel">
            <p class="hmr-kicker">{{ item.metric }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import {
  seedCommunity,
  loadSettingsContentResource,
  type HmrSettingsContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const state = ref<HmrPageState>('idle')
const content = ref<HmrSettingsContent>({
  account: seedCommunity,
  security: seedCommunity,
  preferences: seedCommunity,
})
const resource = ref<HmrAsyncResource<HmrSettingsContent>>({
  state: 'idle',
  data: content.value,
  source: 'local',
  error: null,
  paths: ['/preferences', '/2fa/status', '/devices'],
  updatedAt: null,
})
const settingsDeck = computed(() => [
  ...content.value.account,
  ...content.value.security,
  ...content.value.preferences,
])
const settingsStories = [
  {
    kicker: '01 / 账户',
    title: '身份入口保持清楚。',
    body: '个人页、安全状态、Passkey 和退出动作都在同一个面板里。',
  },
  {
    kicker: '02 / 偏好',
    title: '界面状态即时生效。',
    body: '主题、语言和内容密度会逐步同步到个人偏好。',
  },
  {
    kicker: '03 / 支持',
    title: '反馈直接进入联系页。',
    body: '账号问题、内容建议和社区反馈共用同一个提交入口。',
  },
]

async function logout(): Promise<void> {
  if (!auth.isAuthenticated) {
    await router.push('/login')
    return
  }

  await auth.logout()
  await router.push('/login')
}

async function refreshSettings(): Promise<void> {
  if (!auth.isAuthenticated) {
    resource.value = {
      state: 'ready',
      data: content.value,
      source: 'local',
      error: {
        kind: 'unauthorized',
        message: '登录后才会同步偏好、安全状态和设备列表。',
        path: '/preferences',
      },
      paths: ['/preferences', '/2fa/status', '/devices'],
      updatedAt: new Date().toISOString(),
    }
    state.value = 'ready'
    return
  }

  state.value = 'loading'
  const nextResource = await loadSettingsContentResource()
  resource.value = nextResource
  content.value = nextResource.data
  state.value = 'ready'
}

onMounted(() => {
  void refreshSettings()
})
</script>
