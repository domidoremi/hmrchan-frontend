<template>
  <div class="settings-panel">
    <div class="settings-header">
      <div class="settings-header-icon">
        <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="sm" />
      </div>
      <span>{{ $t('nav.settings') }}</span>
    </div>

    <!-- Theme -->
    <div class="settings-group">
      <div class="settings-group-header">
        <div class="settings-group-icon">
          <AnimatedIcon name="explore" :fallback-icon="Palette" size="sm" />
        </div>
        <span class="settings-label">{{ $t('settings.theme') }}</span>
      </div>
      <div class="settings-options ui-style-options">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          type="button"
          class="theme-btn"
          :class="{ active: theme === opt.value }"
          @click="setTheme(opt.value)"
        >
          <div class="theme-btn-icon">
            <AnimatedIcon name="explore" :fallback-icon="opt.icon" size="md" />
          </div>
          <span class="theme-btn-label">{{ $t(`settings.${opt.value}`) }}</span>
          <Transition name="check">
            <div v-if="theme === opt.value" class="theme-btn-check">
              <AnimatedIcon name="sparkle" :fallback-icon="Check" size="sm" />
            </div>
          </Transition>
        </button>
      </div>
    </div>

    <!-- UI Style -->
    <div class="settings-group">
      <div class="settings-group-header">
        <div class="settings-group-icon">
          <AnimatedIcon name="sparkle" :fallback-icon="Layers" size="sm" />
        </div>
        <span class="settings-label">{{ $t('settings.uiStyle') }}</span>
      </div>
      <div class="settings-options theme-options">
        <button
          v-for="opt in uiStyleOptions"
          :key="opt.value"
          type="button"
          class="theme-btn"
          :class="{ active: settings.uiStyle === opt.value }"
          @click="setUiStyle(opt.value)"
        >
          <div class="theme-btn-icon">
            <AnimatedIcon name="explore" :fallback-icon="opt.icon" size="md" />
          </div>
          <span class="theme-btn-label">{{ opt.label }}</span>
          <Transition name="check">
            <div v-if="settings.uiStyle === opt.value" class="theme-btn-check">
              <AnimatedIcon name="sparkle" :fallback-icon="Check" size="sm" />
            </div>
          </Transition>
        </button>
      </div>
    </div>

    <!-- Language -->
    <div class="settings-group">
      <div class="settings-group-header">
        <div class="settings-group-icon">
          <AnimatedIcon name="user" :fallback-icon="Globe" size="sm" />
        </div>
        <span class="settings-label">{{ $t('settings.language') }}</span>
      </div>
      <div class="settings-options lang-options">
        <button
          v-for="opt in localeOptions"
          :key="opt.code"
          type="button"
          class="lang-btn"
          :class="{ active: locale === opt.code }"
          @click="changeLocale(opt.code)"
        >
          <span class="lang-flag">{{ opt.flag }}</span>
          <span class="lang-name">{{ opt.name }}</span>
        </button>
      </div>
    </div>

    <!-- Video Settings -->
    <div class="settings-group">
      <div class="settings-group-header">
        <div class="settings-group-icon">
          <AnimatedIcon name="explore" :fallback-icon="Video" size="sm" />
        </div>
        <span class="settings-label">{{ $t('settings.videoSettings') }}</span>
      </div>
      <div class="link-list">
        <button type="button" class="link-btn" @click="resetVideoSettings">
          <div class="link-btn-icon">
            <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
          </div>
          <span class="link-btn-text">{{ $t('settings.resetVideoSettings') }}</span>
        </button>
      </div>
    </div>

    <!-- Links -->
    <div class="settings-group">
      <div class="settings-group-header">
        <div class="settings-group-icon">
          <AnimatedIcon name="sparkle" :fallback-icon="Info" size="sm" />
        </div>
        <span class="settings-label">{{ $t('settings.links') }}</span>
      </div>
      <div class="link-list">
        <RouterLink to="/about" class="link-btn" @click="$emit('close')">
          <div class="link-btn-icon">
            <AnimatedIcon name="explore" :fallback-icon="Info" size="sm" />
          </div>
          <span class="link-btn-text">{{ $t('nav.about') }}</span>
          <AnimatedIcon
            name="explore"
            :fallback-icon="ChevronRight"
            size="sm"
            class="link-btn-arrow"
          />
        </RouterLink>
        <RouterLink to="/contact" class="link-btn" @click="$emit('close')">
          <div class="link-btn-icon">
            <AnimatedIcon name="sparkle" :fallback-icon="Mail" size="sm" />
          </div>
          <span class="link-btn-text">{{ $t('nav.contact') }}</span>
          <AnimatedIcon
            name="explore"
            :fallback-icon="ChevronRight"
            size="sm"
            class="link-btn-arrow"
          />
        </RouterLink>
      </div>
    </div>

    <!-- Version Info -->
    <div class="settings-footer">
      <span class="version-text">MomiChan</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Check,
  ChevronRight,
  Globe,
  Info,
  Mail,
  Palette,
  Settings,
  Sun,
  Moon,
  Monitor,
  Video,
  RotateCcw,
  Layers,
  Smartphone,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore, useToastStore } from '@/stores'
import { setLocale, type SupportedLocale } from '@/i18n'
import { useVideoSettings } from '@/composables/useVideoSettings'
import type { Theme } from '@/types'
import type { UiStyle } from '@/stores/settings'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  {
    compact: true,
  }
)

defineEmits<{ close: [] }>()

const { locale, t } = useI18n()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()
const { resetSettings } = useVideoSettings()

const { theme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)

const themeOptions = [
  { value: 'light' as Theme, icon: Sun },
  { value: 'dark' as Theme, icon: Moon },
  { value: 'auto' as Theme, icon: Monitor },
]

const uiStyleOptions = [
  { value: 'ios' as UiStyle, icon: Smartphone, label: t('settings.uiStyleIos') },
  { value: 'material' as UiStyle, icon: Layers, label: t('settings.uiStyleMaterial') },
]

const localeOptions: { code: SupportedLocale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
]

function setTheme(value: Theme) {
  themeStore.setTheme(value)
}

function setUiStyle(value: UiStyle) {
  settingsStore.setUiStyle(value)
}

function changeLocale(code: SupportedLocale) {
  setLocale(code)
}

function resetVideoSettings() {
  resetSettings()
  toastStore.success(t('settings.videoSettingsReset'))
}
</script>

<style scoped>
.settings-panel {
  padding: var(--spacing-2);
  min-width: 15rem;
  max-height: calc(100svh - 7.5rem);
  max-height: calc(100dvh - 7.5rem);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* 移动端优化：确保面板可以滚动 */
@media (max-width: 768px) {
  .settings-panel {
    max-height: calc(100svh - 10rem);
    max-height: calc(100dvh - 10rem);
  }
}

/* ========== Header ========== */
.settings-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-3) var(--spacing-2);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.settings-header-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  border-radius: var(--radius-md);
  color: var(--color-on-primary);
}

/* ========== Group ========== */
.settings-group {
  padding: var(--spacing-2);
}

.settings-group + .settings-group {
  border-top: 1px solid var(--glass-border);
}

.settings-group-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
}

.settings-group-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
}

.settings-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ========== Theme Options ========== */
.theme-options,
.ui-style-options {
  display: flex;
  gap: var(--spacing-2);
}

.theme-btn {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-2);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.theme-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
  transform: translateY(-2px);
}

.theme-btn.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: var(--color-primary);
}

.theme-btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.theme-btn:hover .theme-btn-icon {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.theme-btn.active .theme-btn-icon {
  background: var(--color-primary);
  color: var(--color-on-primary);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.theme-btn-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}

.theme-btn.active .theme-btn-label {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
}

.theme-btn-check {
  position: absolute;
  top: var(--spacing-1);
  right: var(--spacing-1);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  color: var(--color-on-primary);
}

/* Check animation */
.check-enter-active {
  animation: check-pop var(--duration-normal) var(--ease-spring);
}

.check-leave-active {
  animation: check-pop var(--duration-fast) var(--ease-out) reverse;
}

@keyframes check-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ========== Language Options ========== */
.lang-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.lang-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
  transform: translateY(-1px);
}

.lang-btn.active {
  background: var(--gradient-primary);
  border-color: transparent;
  color: var(--color-on-primary);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.lang-flag {
  font-size: var(--text-base);
  line-height: 1;
}

.lang-name {
  font-weight: var(--font-medium);
}

/* ========== Toggle List ========== */
.toggle-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.toggle-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
}

.toggle-btn-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  min-width: 0;
}

.toggle-btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.toggle-btn:hover .toggle-btn-icon {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.toggle-btn-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.toggle-btn-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.toggle-btn-desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========== Toggle Switch ========== */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--color-gray-300);
  border-radius: var(--radius-full);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

[data-theme='dark'] .toggle-switch {
  background: var(--color-gray-600);
}

.toggle-switch.active {
  background: var(--gradient-primary);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: var(--color-white);
  border-radius: var(--radius-full);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: transform var(--transition-fast);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(20px);
}

/* ========== Link List ========== */
.link-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.link-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.link-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
  transform: translateX(2px);
}

.link-btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.link-btn:hover .link-btn-icon {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.link-btn-text {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.link-btn-arrow {
  color: var(--color-text-tertiary);
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--transition-fast);
}

.link-btn:hover .link-btn-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ========== Footer ========== */
.settings-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-top: 1px solid var(--glass-border);
}

.version-text {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.version-divider {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

/* ========== Dark Mode ========== */
[data-theme='dark'] .theme-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
}

[data-theme='dark'] .lang-btn:not(.active) {
  background: rgba(255, 255, 255, 0.03);
}

[data-theme='dark'] .toggle-btn {
  background: rgba(255, 255, 255, 0.03);
}

[data-theme='dark'] .toggle-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* ========== Reduced Motion Notice ========== */
.reduced-motion-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(var(--color-warning-rgb, 245, 158, 11), 0.1);
  border: 1px solid rgba(var(--color-warning-rgb, 245, 158, 11), 0.2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.reduced-motion-notice svg {
  flex-shrink: 0;
  color: rgb(var(--color-warning-rgb, 245, 158, 11));
  margin-top: 1px;
}

/* ========== Link List ========== */
.link-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.link-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-text-primary);
  transition: all var(--transition-fast);
}

.link-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
  transform: translateX(4px);
}

.link-btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.link-btn:hover .link-btn-icon {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.link-btn-text {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-align: left;
}

.link-btn-arrow {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.link-btn:hover .link-btn-arrow {
  transform: translateX(4px);
  color: var(--color-primary);
}

/* Dark mode adjustments */
[data-theme='dark'] .link-btn {
  background: rgba(255, 255, 255, 0.03);
}

[data-theme='dark'] .link-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}
</style>
