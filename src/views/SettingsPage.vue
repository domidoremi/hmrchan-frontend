<template>
  <MainLayout>
    <div class="settings-page">
      <h1 class="page-title">{{ $t('nav.settings') }}</h1>

      <div class="settings-grid">
        <!-- Theme Settings -->
        <div class="settings-card glass-card">
          <div class="card-header">
            <Palette :size="24" />
            <h3>{{ $t('settings.theme') }}</h3>
          </div>

          <div class="settings-content">
            <div class="theme-options">
              <button
                v-for="themeOption in themeOptions"
                :key="themeOption.value"
                class="theme-option"
                :class="{ active: theme === themeOption.value }"
                @click="setTheme(themeOption.value)"
              >
                <component :is="themeOption.icon" :size="20" />
                <span>{{ $t(`settings.${themeOption.value}`) }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Display Settings -->
        <div class="settings-card glass-card">
          <div class="card-header">
            <Monitor :size="24" />
            <h3>{{ $t('settings.display') }}</h3>
          </div>

          <div class="settings-content">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">{{ $t('settings.showHeroSection') }}</div>
                <div class="setting-description">{{ $t('settings.showHeroSectionDesc') }}</div>
              </div>
              <button
                class="toggle-switch"
                :class="{ active: settingsStore.settings.showHeroSection }"
                @click="settingsStore.toggleSetting('showHeroSection')"
              >
                <span class="toggle-slider"></span>
              </button>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">{{ $t('preferences.enableAnimations') }}</div>
                <div class="setting-description">{{ $t('preferences.enableAnimationsDesc') }}</div>
              </div>
              <button
                class="toggle-switch"
                :class="{ active: settingsStore.settings.enableAnimations }"
                @click="settingsStore.toggleSetting('enableAnimations')"
              >
                <span class="toggle-slider"></span>
              </button>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">{{ $t('preferences.postsPerPage') }}</div>
                <div class="setting-description">{{ $t('preferences.postsPerPageDesc') }}</div>
              </div>
              <select
                class="select-input"
                :value="settingsStore.settings.postsPerPage"
                @change="
                  settingsStore.updateSetting(
                    'postsPerPage',
                    parseInt(($event.target as HTMLSelectElement).value),
                  )
                "
              >
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="30">30</option>
                <option :value="50">50</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Media Settings -->
        <div class="settings-card glass-card">
          <div class="card-header">
            <PlayCircle :size="24" />
            <h3>{{ $t('preferences.media') }}</h3>
          </div>

          <div class="settings-content">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">{{ $t('preferences.autoPlayVideos') }}</div>
                <div class="setting-description">{{ $t('preferences.autoPlayVideosDesc') }}</div>
              </div>
              <button
                class="toggle-switch"
                :class="{ active: settingsStore.settings.autoPlayVideos }"
                @click="settingsStore.toggleSetting('autoPlayVideos')"
              >
                <span class="toggle-slider"></span>
              </button>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">{{ $t('preferences.showImagePreviews') }}</div>
                <div class="setting-description">{{ $t('preferences.showImagePreviewsDesc') }}</div>
              </div>
              <button
                class="toggle-switch"
                :class="{ active: settingsStore.settings.showImagePreviews }"
                @click="settingsStore.toggleSetting('showImagePreviews')"
              >
                <span class="toggle-slider"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Language Settings -->
        <div class="settings-card glass-card">
          <div class="card-header">
            <Languages :size="24" />
            <h3>{{ $t('settings.language') }}</h3>
          </div>

          <div class="settings-content">
            <div class="language-options">
              <button
                v-for="localeOption in localeOptions"
                :key="localeOption.code"
                class="language-option"
                :class="{ active: locale === localeOption.code }"
                @click="changeLanguage(localeOption.code)"
              >
                {{ localeOption.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Account Info -->
        <div v-if="user" class="settings-card glass-card">
          <div class="card-header">
            <User :size="24" />
            <h3>Account</h3>
          </div>

          <div class="settings-content">
            <div class="user-info">
              <div class="info-row">
                <span class="label">Username:</span>
                <span class="value">{{ user.username }}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">{{ user.email }}</span>
              </div>
              <div class="info-row">
                <span class="label">Role:</span>
                <span class="value">{{ user.is_admin ? 'Admin' : 'User' }}</span>
              </div>
            </div>

            <GlassButton variant="secondary" @click="handleLogout">
              <LogOut :size="18" />
              {{ $t('nav.logout') }}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { Palette, Languages, User, LogOut, Sun, Moon, Monitor, PlayCircle } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/ui/GlassButton.vue'

import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import type { Theme } from '@/types'

const router = useRouter()
const { locale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { user } = storeToRefs(authStore)
const { theme } = storeToRefs(themeStore)

const themeOptions = [
  { value: 'light' as Theme, icon: Sun },
  { value: 'dark' as Theme, icon: Moon },
  { value: 'auto' as Theme, icon: Monitor },
]

const localeOptions = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
]

const setTheme = (newTheme: Theme) => {
  themeStore.setTheme(newTheme)
}

const changeLanguage = (newLocale: string) => {
  locale.value = newLocale
  localStorage.setItem('locale', newLocale)
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2xl);
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.settings-card {
  padding: var(--spacing-xl);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--glass-border);
}

.card-header h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.theme-options,
.language-options {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.theme-option,
.language-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  border: 2px solid var(--glass-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-option:hover,
.language-option:hover {
  background: var(--glass-bg);
  border-color: var(--color-primary);
  color: var(--color-text-primary);
}

.theme-option.active,
.language-option.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
}

.info-row .label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.info-row .value {
  color: var(--color-text-primary);
}

/* Toggle Switch */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.setting-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background: var(--glass-border);
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.toggle-switch:hover {
  background: var(--color-text-secondary);
}

.toggle-switch.active {
  background: var(--color-primary);
}

.toggle-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform var(--transition-fast);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
  transform: translateX(24px);
}

/* Select Input */
.select-input {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: 2px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 80px;
}

.select-input:hover {
  border-color: var(--color-primary);
}

.select-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

/* Privacy Note */
.privacy-note {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-start;
  padding: var(--spacing-md);
  background: rgba(139, 92, 246, 0.05);
  border-radius: var(--radius-md);
  border: 1px solid rgba(139, 92, 246, 0.2);
  margin-top: var(--spacing-md);
}

.privacy-note p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.privacy-link {
  color: var(--color-primary);
  text-decoration: underline;
  font-weight: var(--font-medium);
}

.privacy-link:hover {
  opacity: 0.8;
}
</style>
