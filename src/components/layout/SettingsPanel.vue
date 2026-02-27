<template>
  <div class="settings-panel" :class="{ 'settings-panel--compact': compact }">
    <div class="settings-header">
      <div class="settings-header-main">
        <div class="settings-header-icon">
          <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="sm" />
        </div>
        <span>{{ $t('nav.settings') }}</span>
      </div>
      <button
        type="button"
        class="settings-close-btn"
        :aria-label="$t('common.close')"
        @click="$emit('close')"
      >
        <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
      </button>
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

    <!-- Background Effect -->
    <div class="settings-group">
      <div class="settings-group-header">
        <div class="settings-group-icon">
          <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
        </div>
        <span class="settings-label">{{ $t('settings.backgroundEffect') }}</span>
      </div>
      <div class="settings-options bg-effect-options">
        <button
          v-for="opt in bgEffectOptions"
          :key="opt.value"
          type="button"
          class="bg-effect-btn"
          :class="{ active: settings.backgroundEffect.type === opt.value }"
          @click="setBackgroundEffect(opt.value)"
        >
          <span class="bg-effect-emoji">{{ opt.emoji }}</span>
          <span class="bg-effect-label">{{ opt.label }}</span>
        </button>
      </div>

      <!-- Density / Speed sliders (only when effect is active) -->
      <template v-if="settings.backgroundEffect.type !== 'none'">
        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.bgDensity') }}
            <span class="slider-value"
              >{{ Math.round(settings.backgroundEffect.density * 100) }}%</span
            >
          </label>
          <input
            type="range"
            class="settings-slider"
            min="0.1"
            max="1"
            step="0.1"
            :value="settings.backgroundEffect.density"
            @input="onDensityChange"
          />
        </div>
        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.bgSpeed') }}
            <span class="slider-value">{{ settings.backgroundEffect.speed.toFixed(1) }}x</span>
          </label>
          <input
            type="range"
            class="settings-slider"
            min="0.2"
            max="2"
            step="0.2"
            :value="settings.backgroundEffect.speed"
            @input="onSpeedChange"
          />
        </div>
        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.bgOpacity') }}
            <span class="slider-value"
              >{{ Math.round(settings.backgroundEffect.opacity * 100) }}%</span
            >
          </label>
          <input
            type="range"
            class="settings-slider"
            min="0.1"
            max="1"
            step="0.1"
            :value="settings.backgroundEffect.opacity"
            @input="onOpacityChange"
          />
        </div>
      </template>
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
  X,
  Settings,
  Sun,
  Moon,
  Monitor,
  Video,
  RotateCcw,
  Layers,
  Smartphone,
  Sparkles,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useThemeStore, useSettingsStore, useToastStore } from '@/stores'
import { setLocale, type SupportedLocale } from '@/i18n'
import { useVideoSettings } from '@/composables/useVideoSettings'
import type { Theme } from '@/types'
import type { UiStyle, ParticleEffectType } from '@/stores/settings'
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
  { value: 'blue' as Theme, icon: Palette },
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

const bgEffectOptions: { value: ParticleEffectType; emoji: string; label: string }[] = [
  { value: 'none', emoji: '✕', label: t('settings.bgNone') },
  { value: 'rain', emoji: '🌧', label: t('settings.bgRain') },
  { value: 'snow', emoji: '❄', label: t('settings.bgSnow') },
  { value: 'stars', emoji: '✨', label: t('settings.bgStars') },
]

function setBackgroundEffect(type: ParticleEffectType) {
  settingsStore.setBackgroundEffect({ type })
}

function onDensityChange(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  settingsStore.setBackgroundEffect({ density: value })
}

function onSpeedChange(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  settingsStore.setBackgroundEffect({ speed: value })
}

function onOpacityChange(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  settingsStore.setBackgroundEffect({ opacity: value })
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

.settings-panel--compact {
  padding: var(--spacing-2);
  gap: var(--spacing-2);
  min-width: 13.5rem;
  width: min(90vw, 20rem);
  max-height: min(70svh, calc(100svh - 9rem));
  max-height: min(70dvh, calc(100dvh - 9rem));
  background: var(--color-background);
  border: 1px solid var(--glass-border);
  border-radius: var(--ui-radius-dialog, var(--radius-xl));
}

/* 移动端优化：确保面板可以滚动 */
@media (max-width: 768px) {
  .settings-panel {
    max-height: calc(100svh - 10rem);
    max-height: calc(100dvh - 10rem);
  }

  .settings-panel--compact {
    width: min(92vw, 20rem);
    max-height: min(65svh, calc(100svh - 8rem));
    max-height: min(65dvh, calc(100dvh - 8rem));
  }
}

/* ========== Header ========== */
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-3) var(--spacing-2);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-background);
  border-bottom: 1px solid var(--glass-border);
}

.settings-header-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.settings-panel--compact .settings-header {
  padding: var(--spacing-2) var(--spacing-2);
}

.settings-header-icon {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  border-radius: var(--radius-md);
  color: var(--color-on-primary);
}

.settings-panel--compact .settings-header-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.settings-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border);
  transition: all var(--transition-fast);
}

.settings-panel--compact .settings-close-btn {
  width: 1.75rem;
  height: 1.75rem;
}

.settings-close-btn:hover {
  color: var(--color-text-primary);
  background: var(--glass-bg-light);
  border-color: var(--glass-border-strong);
}

/* ========== Group ========== */
.settings-group {
  padding: var(--spacing-2);
}

.settings-group + .settings-group {
  border-top: 1px solid var(--glass-border);
}

.settings-panel--compact .settings-group {
  padding: var(--spacing-2) var(--spacing-1);
}

.settings-group-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.settings-group-icon {
  width: 1.5rem;
  height: 1.5rem;
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

.settings-panel--compact .theme-btn {
  padding: var(--spacing-2) var(--spacing-1);
  gap: var(--spacing-1);
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
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.settings-panel--compact .theme-btn-icon {
  width: 2rem;
  height: 2rem;
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
  width: 1.125rem;
  height: 1.125rem;
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

.settings-panel--compact .lang-btn {
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--text-xs);
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
  width: 2rem;
  height: 2rem;
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
  gap: 0.125rem;
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
  width: 2.75rem;
  height: 1.5rem;
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
  top: 0.125rem;
  left: 0.125rem;
  width: 1.25rem;
  height: 1.25rem;
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

.settings-panel--compact .link-btn {
  padding: var(--spacing-2);
}

.link-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
  transform: translateX(2px);
}

.link-btn-icon {
  width: 2rem;
  height: 2rem;
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

/* ========== Background Effect Options ========== */
.bg-effect-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.bg-effect-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-1);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.settings-panel--compact .bg-effect-btn {
  padding: var(--spacing-1) var(--spacing-1);
}

.bg-effect-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
  transform: translateY(-2px);
}

.bg-effect-btn.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: var(--color-primary);
}

.bg-effect-emoji {
  font-size: var(--text-lg);
  line-height: 1;
}

.bg-effect-label {
  font-size: 0.625rem;
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.bg-effect-btn.active .bg-effect-label {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
}

/* ========== Slider Group ========== */
.slider-group {
  padding: var(--spacing-2) 0 0;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-1);
}

.slider-value {
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.settings-slider {
  width: 100%;
  height: 0.25rem;
  appearance: none;
  background: var(--color-gray-200);
  border-radius: var(--radius-full);
  outline: none;
  cursor: pointer;
}

.settings-slider::-webkit-slider-thumb {
  appearance: none;
  width: 1rem;
  height: 1rem;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform var(--transition-fast);
}

.settings-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.settings-slider::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

[data-theme='dark'] .settings-slider {
  background: var(--color-gray-700);
}

/* ========== Dark Mode ========== */
[data-theme='dark'] .theme-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
}

[data-theme='dark'] .bg-effect-btn:not(.active) {
  background: rgba(255, 255, 255, 0.03);
}

[data-theme='dark'] .bg-effect-btn.active {
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

/* ========== Blue Theme ========== */
[data-theme='blue'] .theme-btn.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

[data-theme='blue'] .theme-btn.active .theme-btn-icon {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

[data-theme='blue'] .theme-btn.active .theme-btn-label {
  color: #2563eb;
}

[data-theme='blue'] .bg-effect-btn.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

[data-theme='blue'] .bg-effect-btn.active .bg-effect-label {
  color: #2563eb;
}

[data-theme='blue'] .lang-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: transparent;
  color: #ffffff;
}

[data-theme='blue'] .settings-slider::-webkit-slider-thumb {
  background: #3b82f6;
}

[data-theme='blue'] .settings-slider::-moz-range-thumb {
  background: #3b82f6;
}

[data-theme='blue'] .toggle-switch.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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
  margin-top: 0.0625rem;
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
  width: 2rem;
  height: 2rem;
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
