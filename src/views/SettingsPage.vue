<template>
  <div class="hmr-route-page hmr-route-page--settings">
    <header class="hmr-settings-header">
      <div class="hmr-container hmr-container--large">
        <p class="hmr-kicker">{{ t('settings.eyebrow') }}</p>
        <div class="hmr-settings-title-row">
          <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('settings.title') }}</h1>
          <p class="hmr-body">{{ t('settings.body') }}</p>
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
              <p class="hmr-kicker">{{ t('settings.accountLogin') }}</p>
              <h2>{{ auth.isAuthenticated ? auth.displayName : t('settings.guestMode') }}</h2>
              <p>
                {{
                  auth.isAuthenticated ? t('settings.accountLoggedIn') : t('settings.accountGuest')
                }}
              </p>
            </div>
            <div class="hmr-settings-action-row">
              <RouterLink v-if="auth.isAuthenticated" class="hmr-cta" to="/profile">
                {{ t('settings.openProfile') }}
              </RouterLink>
              <template v-else>
                <RouterLink class="hmr-cta" :to="settingsLoginTarget">{{
                  t('nav.login')
                }}</RouterLink>
                <RouterLink class="hmr-text-link" :to="settingsRegisterTarget">
                  {{ t('auth.registerTitle') }}
                </RouterLink>
              </template>
            </div>
          </article>

          <article class="hmr-settings-card">
            <div class="hmr-settings-card-head">
              <div>
                <p class="hmr-kicker">{{ t('settings.securityRecovery') }}</p>
                <h2>{{ t('settings.loginProtection') }}</h2>
              </div>
              <span>{{
                auth.isAuthenticated ? t('settings.connected') : t('settings.loginRequired')
              }}</span>
            </div>
            <div class="hmr-settings-list">
              <RouterLink to="/auth/passkey-recovery">
                <span>{{ t('settings.passkeyRecovery') }}</span>
                <strong>{{ t('settings.passkeyRecoveryHint') }}</strong>
              </RouterLink>
              <RouterLink :to="auth.isAuthenticated ? '/profile/security' : securityLoginTarget">
                <span>{{ t('settings.devicesSessions') }}</span>
                <strong>{{
                  auth.isAuthenticated ? t('settings.viewSecurity') : t('settings.viewAfterLogin')
                }}</strong>
              </RouterLink>
              <RouterLink :to="auth.isAuthenticated ? '/profile/inbox' : inboxLoginTarget">
                <span>{{ t('settings.emailNotifications') }}</span>
                <strong>{{
                  auth.isAuthenticated ? t('settings.manageAlerts') : t('settings.manageAfterLogin')
                }}</strong>
              </RouterLink>
            </div>
          </article>

          <article class="hmr-settings-card hmr-settings-card--wide">
            <div class="hmr-settings-card-head">
              <div>
                <p class="hmr-kicker">{{ t('settings.appearanceLanguage') }}</p>
                <h2>{{ t('settings.interfacePreferences') }}</h2>
              </div>
              <span>{{ themeLabel }} / {{ appearanceLabel }}</span>
            </div>
            <div class="hmr-settings-controls">
              <div class="hmr-settings-control">
                <span>{{ t('settings.themeMode') }}</span>
                <div
                  class="hmr-segmented-control"
                  role="group"
                  :aria-label="t('settings.themeMode')"
                >
                  <button
                    v-for="item in themeOptions"
                    :key="item.value"
                    type="button"
                    :class="{ 'is-active': theme.theme === item.value }"
                    @click="theme.setTheme(item.value)"
                  >
                    {{ t(item.labelKey) }}
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
              <div class="hmr-settings-control hmr-settings-control--wide">
                <span id="hmr-appearance-preset-label">{{ t('settings.appearancePreset') }}</span>
                <div
                  class="hmr-appearance-grid"
                  role="group"
                  aria-labelledby="hmr-appearance-preset-label"
                >
                  <button
                    v-for="item in appearanceOptions"
                    :key="item.value"
                    type="button"
                    class="hmr-appearance-card"
                    :class="{ 'is-active': theme.appearancePreset === item.value }"
                    :data-preset-preview="item.value"
                    :data-preset-family="item.family"
                    :data-preset-enhancer="item.enhancer"
                    :aria-pressed="theme.appearancePreset === item.value"
                    @click="theme.setAppearancePreset(item.value)"
                  >
                    <span class="hmr-appearance-card__preview" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span class="hmr-appearance-card__copy">
                      <strong>{{ t(`settings.presets.${item.value}`) }}</strong>
                      <small>{{ t(`settings.presetSummaries.${item.value}`) }}</small>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article
            class="hmr-settings-card hmr-settings-card--cache"
            :data-cache-state="cacheClearState"
          >
            <div class="hmr-settings-card-head">
              <div>
                <p class="hmr-kicker">{{ t('settings.dataCache') }}</p>
                <h2>{{ t('settings.publicCache') }}</h2>
              </div>
              <span :data-state="cacheClearState">{{ cacheClearLabel }}</span>
            </div>
            <p id="hmr-public-cache-description">{{ t('settings.publicCacheBody') }}</p>
            <div class="hmr-settings-cache-action">
              <button
                class="hmr-settings-button hmr-settings-button--cache"
                type="button"
                aria-describedby="hmr-public-cache-description hmr-public-cache-status"
                :aria-busy="cacheClearState === 'clearing'"
                :data-state="cacheClearState"
                :disabled="cacheClearState === 'clearing'"
                @click="clearCache"
              >
                <span class="hmr-settings-button__indicator" aria-hidden="true" />
                <span>{{ cacheClearActionLabel }}</span>
              </button>
              <p
                id="hmr-public-cache-status"
                class="hmr-settings-cache-status"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                :data-state="cacheClearState"
              >
                <span class="hmr-settings-cache-status__indicator" aria-hidden="true" />
                <span>{{ cacheClearMessage }}</span>
              </p>
            </div>
          </article>

          <article class="hmr-settings-card">
            <div class="hmr-settings-card-head">
              <div>
                <p class="hmr-kicker">{{ t('settings.support') }}</p>
                <h2>{{ t('settings.feedbackHelp') }}</h2>
              </div>
              <span>{{ t('settings.contact') }}</span>
            </div>
            <div class="hmr-settings-list">
              <RouterLink to="/contact">
                <span>{{ t('nav.contact') }}</span>
                <strong>{{ t('settings.contactMomiChan') }}</strong>
              </RouterLink>
              <RouterLink to="/about">
                <span>{{ t('nav.about') }}</span>
                <strong>{{ t('settings.aboutRules') }}</strong>
              </RouterLink>
            </div>
          </article>

          <article class="hmr-settings-card hmr-settings-card--danger">
            <div>
              <p class="hmr-kicker">{{ t('settings.session') }}</p>
              <h2>
                {{ auth.isAuthenticated ? t('settings.signOutCurrent') : t('settings.enterLogin') }}
              </h2>
              <p>
                {{
                  auth.isAuthenticated ? t('settings.signOutBody') : t('settings.enterLoginBody')
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
const { locale, t } = useI18n({ useScope: 'global' })
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
  cacheClearActionLabel,
  cacheClearLabel,
  cacheClearMessage,
  cacheClearState,
  clearCache,
  handleLocaleChange,
  appearanceLabel,
  appearanceOptions,
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
  locale,
  t,
})

onMounted(() => {
  initializeSettingsWorkspace()
})
</script>
