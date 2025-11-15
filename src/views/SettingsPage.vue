<template>
  <MainLayout>
    <div class="settings-page">
      <div class="settings-header">
        <h1 class="page-title">{{ $t('nav.settings') }}</h1>
        <p class="page-subtitle">
          {{ isAuthenticated ? $t('settings.welcomeBack') : $t('settings.welcome') }}
        </p>
      </div>

      <div class="settings-grid">
        <!-- ====================公共设置==================== -->
        <div class="settings-section">
          <h2 class="section-title">
            <Sliders :size="24" />
            {{ $t('settings.generalSettings') }}
          </h2>

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
                  role="switch"
                  :aria-checked="settingsStore.settings.showHeroSection ? 'true' : 'false'"
                  :aria-label="$t('settings.showHeroSection')"
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
                  role="switch"
                  :aria-checked="settingsStore.settings.enableAnimations ? 'true' : 'false'"
                  :aria-label="$t('preferences.enableAnimations')"
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
                  role="switch"
                  :aria-checked="settingsStore.settings.autoPlayVideos ? 'true' : 'false'"
                  :aria-label="$t('preferences.autoPlayVideos')"
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
                  role="switch"
                  :aria-checked="settingsStore.settings.showImagePreviews ? 'true' : 'false'"
                  :aria-label="$t('preferences.showImagePreviews')"
                >
                  <span class="toggle-slider"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- Cache Management -->
          <CacheManagement />
        </div>

        <!-- ====================账户设置（仅登录用户）==================== -->
        <div v-if="isAuthenticated" class="settings-section">
          <h2 class="section-title">
            <UserCog :size="24" />
            {{ $t('settings.accountSettings') }}
          </h2>

          <!-- Account Info -->
          <div class="settings-card glass-card">
            <div class="card-header">
              <User :size="24" />
              <h3>{{ $t('settings.accountInfo') }}</h3>
            </div>

            <div class="settings-content">
              <div class="user-info">
                <div class="info-row">
                  <span class="label">{{ $t('auth.username') }}</span>
                  <span class="value">{{ user?.username }}</span>
                </div>
                <div class="info-row">
                  <span class="label">{{ $t('auth.email') }}</span>
                  <span class="value">{{ user?.email }}</span>
                </div>
                <div class="info-row">
                  <span class="label">{{ $t('settings.role') }}</span>
                  <span class="value">{{ user?.is_admin ? 'Admin' : 'User' }}</span>
                </div>
              </div>

              <div class="action-buttons">
                <RouterLink to="/profile" class="text-button">
                  <UserCog :size="18" />
                  {{ $t('settings.manageProfile') }}
                </RouterLink>

                <button class="text-button danger" @click="handleLogout">
                  <LogOut :size="18" />
                  {{ $t('nav.logout') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 未登录提示 -->
        <div v-else class="settings-section">
          <div class="login-prompt glass-card">
            <div class="prompt-icon">
              <UserPlus :size="48" />
            </div>
            <h3>{{ $t('settings.loginPromptTitle') }}</h3>
            <p>{{ $t('settings.loginPromptDesc') }}</p>
            <div class="prompt-actions">
              <RouterLink to="/login">
                <GlassButton>
                  <LogIn :size="18" />
                  {{ $t('nav.login') }}
                </GlassButton>
              </RouterLink>
              <RouterLink to="/register">
                <GlassButton variant="secondary">
                  <UserPlus :size="18" />
                  {{ $t('nav.register') }}
                </GlassButton>
              </RouterLink>
            </div>
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
import {
  Palette,
  Languages,
  User,
  UserCog,
  UserPlus,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Monitor,
  PlayCircle,
  Sliders,
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/base/Button.vue'
import CacheManagement from '@/components/business/CacheManagement.vue'

import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import type { Theme } from '@/types'

const router = useRouter()
const { locale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { user, isAuthenticated } = storeToRefs(authStore)
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
  router.push('/')
}
</script>

<style scoped>
.settings-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6) var(--spacing-4);
}

.settings-header {
  margin-bottom: var(--spacing-8);
  text-align: center;
}

.page-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.page-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-10);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-4);
}

.settings-card {
  padding: var(--spacing-6);
  transition: all var(--transition-fast);
}

.settings-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-5);
  padding-bottom: var(--spacing-4);
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
  gap: var(--spacing-4);
}

/* Theme & Language Options */
.theme-options,
.language-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-3);
}

.theme-option,
.language-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-light);
  border: 2px solid var(--glass-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-weight: var(--font-medium);
}

.theme-option:hover,
.language-option:hover {
  background: var(--glass-bg);
  border-color: var(--color-primary);
  color: var(--color-text-primary);
  transform: translateY(-2px);
}

.theme-option.active,
.language-option.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* Setting Row */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  transition: background var(--transition-fast);
}

.setting-row:hover {
  background: var(--glass-bg);
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-1);
}

.setting-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  min-width: 52px; /* 防止被压缩 */
  min-height: 28px;
  max-width: 52px; /* 防止被拉伸 */
  max-height: 28px;
  border-radius: 14px;
  background: var(--glass-border);
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
  flex-shrink: 0;
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
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  border: 2px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
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

/* User Info */
.user-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3);
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
}

.info-row .label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.info-row .value {
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.text-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  color: var(--color-text-primary);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.text-button:hover {
  background: var(--glass-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
}

.text-button.danger:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* Login Prompt */
.login-prompt {
  padding: var(--spacing-8);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
}

.prompt-icon {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  margin-bottom: var(--spacing-2);
}

.login-prompt h3 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.login-prompt p {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 400px;
}

.prompt-actions {
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
}

/* Responsive */
@media (max-width: 768px) {
  .settings-page {
    padding: var(--spacing-4) var(--spacing-3);
  }

  .page-title {
    font-size: var(--text-3xl);
  }

  .section-title {
    font-size: var(--text-xl);
  }

  .theme-options,
  .language-options {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .prompt-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>
