<template>
  <div class="hmr-route-page hmr-route-page--settings">
    <header class="hmr-auth-page hmr-settings-hero">
      <div class="hmr-auth-layout hmr-form-layout--wide">
        <aside class="hmr-auth-story" data-hmr-reveal>
          <p class="hmr-kicker">{{ t('settings.eyebrow') }}</p>
          <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('settings.title') }}</h1>
          <div class="hmr-story-stack">
            <article v-for="item in settingsStories" :key="item.title" class="hmr-story-block">
              <p class="hmr-kicker">{{ item.kicker }}</p>
              <strong>{{ item.title }}</strong>
              <span>{{ item.body }}</span>
            </article>
          </div>
        </aside>

        <article class="hmr-panel hmr-settings-panel" data-hmr-reveal>
          <p class="hmr-kicker">{{ t('settings.account') }}</p>
          <h2 class="hmr-card-title">
            {{ auth.isAuthenticated ? auth.displayName : t('nav.login') }}
          </h2>
          <HmrPageStateBlock
            :loading="state === 'loading'"
            :empty="false"
            :error="resource.error"
            :show-when-ready="false"
            :retry-label="t('explore.loadMore')"
            @retry="refreshSettings"
          />
          <div class="hmr-setting-list">
            <button type="button" @click="theme.toggleTheme">
              <span>{{ t('shell.theme') }}</span>
              <strong>{{ theme.isDark ? t('shell.darkMode') : t('shell.lightMode') }}</strong>
            </button>
            <label class="hmr-setting-list__select">
              <span>{{ t('shell.language') }}</span>
              <select :value="locale" @change="handleLocaleChange">
                <option v-for="item in localeOptions" :key="item.id" :value="item.id">
                  {{ item.label }}
                </option>
              </select>
            </label>
            <RouterLink to="/profile">
              <span>{{ t('settings.account') }}</span>
              <strong>{{ auth.isAuthenticated ? auth.displayName : '未登录' }}</strong>
            </RouterLink>
            <RouterLink to="/auth/passkey-recovery">
              <span>Passkey</span>
              <strong>{{ t('settings.recovery') }}</strong>
            </RouterLink>
            <RouterLink to="/contact">
              <span>{{ t('nav.contact') }}</span>
              <strong>联系 MomiChan</strong>
            </RouterLink>
            <button type="button" :disabled="auth.isLoading" @click="logout">
              <span>{{ t('settings.session') }}</span>
              <strong>{{ auth.isAuthenticated ? t('shell.logout') : t('nav.login') }}</strong>
            </button>
          </div>
        </article>
      </div>
    </header>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">{{ t('settings.index') }}</p>
          <h2 class="hmr-section-title">{{ t('settings.state') }}</h2>
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
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'

import {
  seedCommunity,
  loadSettingsContentResource,
  type HmrSettingsContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'
import { applyLocale, type SupportedLocale, supportedLocales } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const { locale, t } = useI18n()
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
const localeLabels: Record<SupportedLocale, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'ja-JP': '日本語',
}
const localeOptions = supportedLocales.map((id) => ({
  id,
  label: localeLabels[id],
}))
const settingsStories = computed(() => [
  {
    kicker: '01 / 账户',
    title: t('settings.account'),
    body: t('settings.accountBody'),
  },
  {
    kicker: '02 / 偏好',
    title: t('settings.preferences'),
    body: t('settings.preferencesBody'),
  },
  {
    kicker: '03 / 支持',
    title: t('settings.support'),
    body: t('settings.supportBody'),
  },
])

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
        message: '',
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

function handleLocaleChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as SupportedLocale
  if (supportedLocales.includes(value)) {
    applyLocale(value)
  }
}

onMounted(() => {
  void refreshSettings()
})
</script>
