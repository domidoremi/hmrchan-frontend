<template>
  <div class="settings-panel">
    <!-- Theme -->
    <div class="settings-group">
      <div class="settings-label">{{ $t('settings.theme') }}</div>
      <div class="settings-options">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          class="option-btn"
          :class="{ active: theme === opt.value }"
          @click="setTheme(opt.value)"
        >
          <component :is="opt.icon" :size="18" />
          <span>{{ $t(`settings.${opt.value}`) }}</span>
        </button>
      </div>
    </div>

    <!-- Language -->
    <div class="settings-group">
      <div class="settings-label">{{ $t('settings.language') }}</div>
      <div class="settings-options">
        <button
          v-for="opt in localeOptions"
          :key="opt.code"
          class="option-btn lang-btn"
          :class="{ active: locale === opt.code }"
          @click="changeLocale(opt.code)"
        >
          {{ opt.name }}
        </button>
      </div>
    </div>

    <!-- Display Toggles -->
    <div class="settings-group">
      <div class="settings-label">{{ $t('settings.display') }}</div>
      <div class="toggle-list">
        <button class="toggle-btn" @click="toggleSetting('showHeroSection')">
          <span>{{ $t('settings.toggleHeroSection') }}</span>
          <span class="toggle-indicator" :class="{ active: settings.showHeroSection }" />
        </button>
        <button class="toggle-btn" @click="toggleSetting('enableAnimations')">
          <span>{{ $t('settings.toggleAnimations') }}</span>
          <span class="toggle-indicator" :class="{ active: settings.enableAnimations }" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore } from '@/stores'
import type { Theme } from '@/types'

defineEmits<{ close: [] }>()

const { locale } = useI18n()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()

const { theme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)

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

function setTheme(value: Theme) {
  themeStore.setTheme(value)
}

function changeLocale(code: string) {
  locale.value = code
}

function toggleSetting(key: 'showHeroSection' | 'enableAnimations') {
  settingsStore.toggleSetting(key)
}
</script>

<style scoped>
.settings-panel {
  padding: var(--spacing-2);
}

.settings-group {
  padding: var(--spacing-3);
}

.settings-group + .settings-group {
  border-top: 1px solid var(--glass-border);
}

.settings-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-2);
}

.settings-options {
  display: flex;
  gap: var(--spacing-2);
}

.option-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.option-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.option-btn.active {
  background: var(--color-primary-100);
  color: var(--color-primary);
}

[data-theme='dark'] .option-btn.active {
  background: rgba(139, 92, 246, 0.2);
}

.lang-btn {
  flex-direction: row;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--glass-border);
}

.lang-btn.active {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  transition: background var(--transition-fast);
}

.toggle-btn:hover {
  background: var(--glass-bg-light);
}

.toggle-indicator {
  width: 36px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-border);
  position: relative;
  transition: background var(--transition-fast);
}

.toggle-indicator::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  transition: transform var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.toggle-indicator.active {
  background: var(--color-primary);
}

.toggle-indicator.active::after {
  transform: translateX(16px);
}
</style>
