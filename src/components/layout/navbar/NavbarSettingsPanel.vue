<template>
  <div class="settings-panel">
    <!-- Theme Options -->
    <div class="settings-group">
      <div class="settings-group-title">{{ $t('settings.theme') }}</div>
      <div class="settings-theme-options">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          class="settings-theme-button"
          :class="{ active: theme === option.value }"
          @click="setTheme(option.value)"
        >
          <component :is="option.icon" :size="18" />
          <span>{{ $t(`settings.${option.value}`) }}</span>
        </button>
      </div>
    </div>

    <!-- Language Options -->
    <div class="settings-group">
      <div class="settings-group-title">{{ $t('settings.language') }}</div>
      <div class="settings-language-options">
        <button
          v-for="localeOption in localeOptions"
          :key="localeOption.code"
          type="button"
          class="settings-language-button"
          :class="{ active: locale === localeOption.code }"
          @click="changeLanguage(localeOption.code)"
        >
          {{ localeOption.name }}
        </button>
      </div>
    </div>

    <!-- Display Toggles -->
    <div class="settings-group">
      <div class="settings-group-title">{{ $t('settings.display') }}</div>
      <div class="settings-toggle-list">
        <button
          type="button"
          class="settings-toggle"
          :class="{ active: settings.showHeroSection }"
          @click="toggleSetting('showHeroSection')"
        >
          <span class="settings-toggle-label">{{ $t('settings.toggleHeroSection') }}</span>
          <span class="settings-toggle-indicator" :class="{ active: settings.showHeroSection }" />
        </button>

        <button
          type="button"
          class="settings-toggle"
          :class="{ active: settings.enableAnimations }"
          @click="toggleSetting('enableAnimations')"
        >
          <span class="settings-toggle-label">{{ $t('settings.toggleAnimations') }}</span>
          <span class="settings-toggle-indicator" :class="{ active: settings.enableAnimations }" />
        </button>

        <button
          type="button"
          class="settings-toggle"
          :class="{ active: settings.enableSwipeNavigation }"
          @click="toggleSetting('enableSwipeNavigation')"
        >
          <span class="settings-toggle-label">{{ $t('settings.toggleSwipeNavigation') }}</span>
          <span
            class="settings-toggle-indicator"
            :class="{ active: settings.enableSwipeNavigation }"
          />
        </button>
      </div>
    </div>

    <!-- Advanced Settings Link -->
    <div v-if="showAdvancedLink" class="settings-group settings-advanced-link">
      <button type="button" class="settings-advanced-button" @click="$emit('go-advanced')">
        <Settings :size="18" />
        <div class="advanced-labels">
          <span class="advanced-title">{{ $t('settings.openAdvanced') }}</span>
        </div>
        <ArrowRight :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * NavbarSettingsPanel - 导航栏快捷设置面板
 *
 * 提供主题、语言和显示选项的快捷设置
 * 可在桌面端下拉菜单和移动端模态框中复用
 */

import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { Sun, Moon, Monitor, Settings, ArrowRight } from 'lucide-vue-next'
import { useSettingsStore, useThemeStore } from '@/stores'
import { useI18nOptimized } from '@/composables/useI18nOptimized'
import type { Theme } from '@/types'

withDefaults(
  defineProps<{
    /** 是否显示高级设置链接 */
    showAdvancedLink?: boolean
  }>(),
  {
    showAdvancedLink: true,
  },
)

defineEmits<{
  'go-advanced': []
}>()

const { locale } = useI18n()
const { changeLocale: changeLocaleOptimized } = useI18nOptimized()

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

const { settings } = storeToRefs(settingsStore)
const { theme } = storeToRefs(themeStore)

/** 主题选项 */
const themeOptions = [
  { value: 'light' as Theme, icon: Sun },
  { value: 'dark' as Theme, icon: Moon },
  { value: 'auto' as Theme, icon: Monitor },
]

/** 语言选项 */
const localeOptions = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
]

/** 设置主题 */
function setTheme(newTheme: Theme) {
  themeStore.setTheme(newTheme)
}

/** 切换语言 */
async function changeLanguage(newLocale: string) {
  try {
    await changeLocaleOptimized(newLocale as 'en' | 'zh-CN' | 'ja')
  } catch (error) {
    console.warn('[NavbarSettingsPanel] Language switch error:', error)
  }
}

/** 切换设置项 */
function toggleSetting(key: 'showHeroSection' | 'enableAnimations' | 'enableSwipeNavigation') {
  settingsStore.toggleSetting(key)
}
</script>

<style scoped>
.settings-panel {
  width: 100%;
}

.settings-group {
  padding: var(--spacing-3) var(--spacing-4);
}

.settings-group + .settings-group {
  border-top: 1px solid var(--glass-border);
}

.settings-group-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-2);
}

/* Theme Options */
.settings-theme-options {
  display: flex;
  gap: var(--spacing-2);
}

.settings-theme-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
  border: 1px solid transparent;
}

.settings-theme-button:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.settings-theme-button.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* Language Options */
.settings-language-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.settings-language-button {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
  border: 1px solid var(--glass-border);
}

.settings-language-button:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.settings-language-button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

/* Toggle List */
.settings-toggle-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.settings-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
  border: none;
  width: 100%;
  text-align: left;
}

.settings-toggle:hover {
  background: var(--glass-bg-light);
}

.settings-toggle-label {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.settings-toggle-indicator {
  width: 36px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-border);
  position: relative;
  transition: background var(--duration-fast) var(--ease-standard);
}

.settings-toggle-indicator::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  transition: transform var(--duration-fast) var(--ease-standard);
  box-shadow: var(--shadow-sm);
}

.settings-toggle-indicator.active {
  background: var(--color-primary);
}

.settings-toggle-indicator.active::after {
  transform: translateX(16px);
}

/* Advanced Link */
.settings-advanced-link {
  border-top: 1px solid var(--glass-border);
}

.settings-advanced-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
  border: none;
  text-align: left;
  color: var(--color-text-secondary);
}

.settings-advanced-button:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.advanced-labels {
  flex: 1;
}

.advanced-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}
</style>
