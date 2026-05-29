<template>
  <div class="hmr-route-page hmr-route-page--settings">
    <header class="hmr-settings-header">
      <div class="hmr-container hmr-container--large">
        <p class="hmr-kicker">{{ t('settings.eyebrow') }}</p>
        <div class="hmr-settings-title-row">
          <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('settings.title') }}</h1>
          <p class="hmr-body">管理账户、安全、外观和公开缓存。</p>
        </div>
      </div>
    </header>

    <section class="hmr-settings-workspace" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <HmrPageStateBlock
          :loading="state === 'loading'"
          :empty="false"
          :error="resource.error"
          :show-when-ready="false"
          :retry-label="t('explore.loadMore')"
          @retry="refreshSettings"
        />

        <div class="hmr-settings-layout">
          <article class="hmr-settings-card hmr-settings-card--account">
            <div>
              <p class="hmr-kicker">账户与登录</p>
              <h2>{{ auth.isAuthenticated ? auth.displayName : '访客模式' }}</h2>
              <p>
                {{
                  auth.isAuthenticated
                    ? '已登录。个人资料、收藏、历史和账号安全可管理。'
                    : '登录后同步收藏、历史、通知和安全恢复。'
                }}
              </p>
            </div>
            <div class="hmr-settings-action-row">
              <RouterLink v-if="auth.isAuthenticated" class="hmr-cta" to="/profile">
                打开个人中心
              </RouterLink>
              <template v-else>
                <RouterLink class="hmr-cta" :to="settingsLoginTarget">登录</RouterLink>
                <RouterLink class="hmr-text-link" :to="settingsRegisterTarget">
                  创建账号
                </RouterLink>
              </template>
            </div>
          </article>

          <article class="hmr-settings-card">
            <div class="hmr-settings-card-head">
              <div>
                <p class="hmr-kicker">安全与恢复</p>
                <h2>登录保护</h2>
              </div>
              <span>{{ auth.isAuthenticated ? '已连接' : '待登录' }}</span>
            </div>
            <div class="hmr-settings-list">
              <RouterLink to="/auth/passkey-recovery">
                <span>Passkey 恢复</span>
                <strong>重新注册可信凭据</strong>
              </RouterLink>
              <RouterLink :to="auth.isAuthenticated ? '/profile/security' : securityLoginTarget">
                <span>设备与会话</span>
                <strong>{{ auth.isAuthenticated ? '查看安全状态' : '登录后查看' }}</strong>
              </RouterLink>
              <RouterLink :to="auth.isAuthenticated ? '/profile/inbox' : inboxLoginTarget">
                <span>邮箱与通知</span>
                <strong>{{ auth.isAuthenticated ? '管理提醒' : '登录后管理' }}</strong>
              </RouterLink>
            </div>
          </article>

          <article class="hmr-settings-card hmr-settings-card--wide">
            <div class="hmr-settings-card-head">
              <div>
                <p class="hmr-kicker">外观与语言</p>
                <h2>界面偏好</h2>
              </div>
              <span>{{ themeLabel }}</span>
            </div>
            <div class="hmr-settings-controls">
              <div class="hmr-settings-control">
                <span>主题模式</span>
                <div class="hmr-segmented-control" role="group" aria-label="主题模式">
                  <button
                    v-for="item in themeOptions"
                    :key="item.value"
                    type="button"
                    :class="{ 'is-active': theme.theme === item.value }"
                    @click="theme.setTheme(item.value)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
              <label class="hmr-settings-control">
                <span>{{ t('shell.language') }}</span>
                <select :value="locale" @change="handleLocaleChange">
                  <option v-for="item in localeOptions" :key="item.id" :value="item.id">
                    {{ item.label }}
                  </option>
                </select>
              </label>
            </div>
          </article>

          <article class="hmr-settings-card">
            <div class="hmr-settings-card-head">
              <div>
                <p class="hmr-kicker">数据与缓存</p>
                <h2>公开内容缓存</h2>
              </div>
              <span>{{ cacheClearLabel }}</span>
            </div>
            <p>
              清理公开内容的 Memory、IndexedDB 与 Service Worker 缓存。保留登录态和本地账号数据。
            </p>
            <button
              class="hmr-settings-button"
              type="button"
              :disabled="cacheClearState === 'clearing'"
              @click="clearCache"
            >
              清理公开缓存
            </button>
          </article>

          <article class="hmr-settings-card">
            <div class="hmr-settings-card-head">
              <div>
                <p class="hmr-kicker">支持</p>
                <h2>反馈与帮助</h2>
              </div>
              <span>联系</span>
            </div>
            <div class="hmr-settings-list">
              <RouterLink to="/contact">
                <span>{{ t('nav.contact') }}</span>
                <strong>联系 MomiChan</strong>
              </RouterLink>
              <RouterLink to="/about">
                <span>{{ t('nav.about') }}</span>
                <strong>了解产品与规则</strong>
              </RouterLink>
            </div>
          </article>

          <article class="hmr-settings-card hmr-settings-card--danger">
            <div>
              <p class="hmr-kicker">会话</p>
              <h2>{{ auth.isAuthenticated ? '退出当前账号' : '进入登录流程' }}</h2>
              <p>
                {{
                  auth.isAuthenticated
                    ? '退出只会结束当前浏览器会话。'
                    : '登录后可继续访问个人内容。'
                }}
              </p>
            </div>
            <button
              class="hmr-settings-button"
              type="button"
              :disabled="auth.isLoading"
              @click="logout"
            >
              {{ auth.isAuthenticated ? t('shell.logout') : t('nav.login') }}
            </button>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'

import {
  seedCommunity,
  loadSettingsContentResource,
  type HmrSettingsContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import { useHmrPrivateContentResource } from '@/hmr/composables/useHmrPrivateContentResource'
import { useHmrSettingsWorkspace } from '@/hmr/composables/useHmrSettingsWorkspace'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const { locale, t } = useI18n()
const initialSettingsContent: HmrSettingsContent = {
  account: seedCommunity,
  security: seedCommunity,
  preferences: seedCommunity,
}
const {
  content,
  pageState: state,
  resource,
  refresh: refreshSettingsResource,
  markReady: markSettingsReady,
} = useHmrPrivateContentResource<HmrSettingsContent>({
  initialData: initialSettingsContent,
  paths: ['/preferences', '/2fa/status', '/devices'],
  loader: loadSettingsContentResource,
})

const {
  cacheClearLabel,
  cacheClearState,
  clearCache,
  handleLocaleChange,
  inboxLoginTarget,
  initializeSettingsWorkspace,
  localeOptions,
  logout,
  refreshSettings,
  securityLoginTarget,
  settingsLoginTarget,
  settingsRegisterTarget,
  themeLabel,
  themeOptions,
} = useHmrSettingsWorkspace({
  auth,
  content,
  markSettingsReady,
  refreshSettingsResource,
  router,
  theme,
})

onMounted(() => {
  initializeSettingsWorkspace()
})
</script>
