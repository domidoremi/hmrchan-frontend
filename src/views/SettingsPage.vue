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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { Palette, Languages, User, LogOut, Sun, Moon, Monitor } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/ui/GlassButton.vue'

import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { Theme } from '@/types'

const router = useRouter()
const { locale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()

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
</style>
