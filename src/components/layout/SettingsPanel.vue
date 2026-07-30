<template>
  <div
    class="settings-panel"
    :class="{
      'settings-panel--compact': props.compact,
      'settings-panel--embedded': props.embedded,
      'settings-panel--external-scroll': props.externalScroll,
    }"
  >
    <div v-if="props.showHeader" class="settings-header">
      <div class="settings-header-bar">
        <div class="settings-header-main">
          <div class="settings-header-icon">
            <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="sm" />
          </div>
          <span>{{ $t('nav.settings') }}</span>
        </div>
        <ControlButton
          class="settings-close-btn"
          size="square"
          icon-only
          :aria-label="$t('common.close')"
          @click="$emit('close')"
        >
          <template #start>
            <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
          </template>
        </ControlButton>
      </div>

      <div
        v-if="visibleSettingsCategories.length > 1"
        class="settings-category-switcher"
        role="tablist"
        :aria-label="$t('nav.settings')"
      >
        <button
          v-for="category in visibleSettingsCategories"
          :id="`settings-category-tab-${category.id}`"
          :key="category.id"
          type="button"
          class="settings-category-switcher__item"
          :class="{
            'settings-category-switcher__item--active': activeSettingsCategory === category.id,
          }"
          :aria-selected="activeSettingsCategory === category.id"
          :tabindex="activeSettingsCategory === category.id ? 0 : -1"
          :title="category.label"
          role="tab"
          @click="setActiveSettingsCategory(category.id)"
        >
          {{ category.label }}
        </button>
      </div>
    </div>

    <div
      class="settings-panel__body"
      :id="`settings-category-panel-${activeSettingsCategory}`"
      role="tabpanel"
      :aria-labelledby="`settings-category-tab-${activeSettingsCategory}`"
    >
      <!-- Theme -->
      <div v-show="isSettingsCategoryVisible('appearance')" class="settings-group">
        <div class="settings-group-header">
          <div class="settings-group-icon">
            <AnimatedIcon name="explore" :fallback-icon="Palette" size="sm" />
          </div>
          <span class="settings-label">{{ $t('settings.theme') }}</span>
        </div>
        <ThemeModeSwitch
          :model-value="theme"
          :resolved-theme="resolvedTheme"
          :label="$t('settings.theme')"
          :light-label="$t('settings.light')"
          :dark-label="$t('settings.dark')"
          :auto-label="$t('settings.auto')"
          @update:model-value="setTheme"
        />
      </div>

      <!-- Appearance Preset -->
      <div v-show="isSettingsCategoryVisible('appearance')" class="settings-group">
        <div class="settings-group-header">
          <div class="settings-group-icon">
            <AnimatedIcon name="sparkle" :fallback-icon="Layers" size="sm" />
          </div>
          <span class="settings-label">{{ $t('settings.appearancePreset') }}</span>
        </div>
        <p class="settings-group-lead">{{ $t('settings.appearanceLead') }}</p>
        <AppearancePresetPicker />
      </div>

      <!-- Language -->
      <div v-show="isSettingsCategoryVisible('system')" class="settings-group">
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
            :aria-pressed="locale === opt.code"
            @click="changeLocale(opt.code)"
          >
            <span class="lang-flag">{{ opt.flag }}</span>
            <span class="lang-name">{{ opt.name }}</span>
          </button>
        </div>
      </div>

      <div v-show="isSettingsCategoryVisible('system')" class="settings-group">
        <div class="settings-group-header">
          <div class="settings-group-icon">
            <AnimatedIcon name="loading" :fallback-icon="RefreshCw" size="sm" />
          </div>
          <span class="settings-label">{{ $t('settings.appUpdateTitle') }}</span>
        </div>
        <div
          class="update-strategy-options"
          role="radiogroup"
          :aria-label="$t('settings.appUpdateTitle')"
        >
          <button
            v-for="opt in appUpdateStrategyOptions"
            :key="opt.value"
            type="button"
            class="update-strategy-option"
            :class="{
              'update-strategy-option--active': settings.appUpdateStrategy === opt.value,
            }"
            role="radio"
            :aria-checked="settings.appUpdateStrategy === opt.value"
            @click="setAppUpdateStrategy(opt.value)"
          >
            <span class="update-strategy-option__icon">
              <AnimatedIcon name="loading" :fallback-icon="opt.icon" size="sm" />
            </span>
            <span class="update-strategy-option__label">{{ opt.label }}</span>
          </button>
        </div>
        <p class="update-strategy-description" aria-live="polite">
          {{ selectedAppUpdateStrategyDescription }}
        </p>
      </div>

      <!-- Display -->
      <div v-show="isSettingsCategoryVisible('experience')" class="settings-group">
        <div class="settings-group-header">
          <div class="settings-group-icon">
            <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="sm" />
          </div>
          <span class="settings-label">{{ $t('settings.display') }}</span>
        </div>

        <div class="toggle-list">
          <button type="button" class="toggle-btn" @click="toggleHeroSection">
            <div class="toggle-btn-content">
              <div class="toggle-btn-icon">
                <AnimatedIcon name="explore" :fallback-icon="Layers" size="sm" />
              </div>
              <div class="toggle-btn-text">
                <span class="toggle-btn-title">{{ $t('settings.toggleHeroSection') }}</span>
                <span class="toggle-btn-desc">{{ $t('settings.heroSectionDesc') }}</span>
              </div>
            </div>
            <div class="toggle-switch" :class="{ active: settings.showHeroSection }">
              <span class="toggle-knob" />
            </div>
          </button>

          <button type="button" class="toggle-btn" @click="toggleAnimations">
            <div class="toggle-btn-content">
              <div class="toggle-btn-icon">
                <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
              </div>
              <div class="toggle-btn-text">
                <span class="toggle-btn-title">{{ $t('settings.toggleAnimations') }}</span>
                <span class="toggle-btn-desc">{{ $t('settings.animationsDesc') }}</span>
              </div>
            </div>
            <div class="toggle-switch" :class="{ active: settings.enableAnimations }">
              <span class="toggle-knob" />
            </div>
          </button>

          <button type="button" class="toggle-btn" @click="toggleSwipeNavigation">
            <div class="toggle-btn-content">
              <div class="toggle-btn-icon">
                <AnimatedIcon name="explore" :fallback-icon="Smartphone" size="sm" />
              </div>
              <div class="toggle-btn-text">
                <span class="toggle-btn-title">{{ $t('settings.toggleSwipeNavigation') }}</span>
                <span class="toggle-btn-desc">{{ $t('settings.swipeNavigationDesc') }}</span>
              </div>
            </div>
            <div class="toggle-switch" :class="{ active: settings.enableSwipeNavigation }">
              <span class="toggle-knob" />
            </div>
          </button>
        </div>

        <template v-if="settings.enableAnimations">
          <div class="slider-group">
            <label class="slider-label">
              {{ $t('settings.animationIntensity') }}
              <span class="slider-value">{{ selectedAnimationIntensityLabel }}</span>
            </label>
            <div class="settings-options bg-effect-options">
              <button
                v-for="opt in animationIntensityOptions"
                :key="opt.value"
                type="button"
                class="bg-effect-btn"
                :class="{ active: settings.animationIntensity === opt.value }"
                :aria-pressed="settings.animationIntensity === opt.value"
                @click="setAnimationIntensity(opt.value)"
              >
                <span class="bg-effect-label">{{ opt.label }}</span>
              </button>
            </div>
          </div>
        </template>

        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.postsPerPage') }}
            <span class="slider-value">{{ settings.postsPerPage }}</span>
          </label>
          <div class="settings-options bg-effect-options">
            <button
              v-for="pageSize in postsPerPageOptions"
              :key="pageSize"
              type="button"
              class="bg-effect-btn"
              :class="{ active: settings.postsPerPage === pageSize }"
              :aria-pressed="settings.postsPerPage === pageSize"
              @click="setPostsPerPage(pageSize)"
            >
              <span class="bg-effect-label">{{ pageSize }}</span>
            </button>
          </div>
        </div>

        <div v-if="isAuthenticated" class="link-list preferences-actions">
          <button
            type="button"
            class="link-btn"
            :disabled="isSavingPreferences"
            @click="handleReplacePreferences"
          >
            <div class="link-btn-icon">
              <AnimatedIcon name="sparkle" :fallback-icon="Save" size="sm" />
            </div>
            <span class="link-btn-text">{{ $t('settings.replacePreferences') }}</span>
          </button>
          <button
            type="button"
            class="link-btn"
            :disabled="isSavingPreferences"
            @click="handleResetPreferences"
          >
            <div class="link-btn-icon">
              <AnimatedIcon name="loading" :fallback-icon="RotateCcw" size="sm" />
            </div>
            <span class="link-btn-text">{{ $t('settings.resetPreferences') }}</span>
          </button>
        </div>
      </div>

      <!-- Privacy & Analytics -->
      <div v-show="isSettingsCategoryVisible('privacy')" class="settings-group">
        <div class="settings-group-header">
          <div class="settings-group-icon">
            <AnimatedIcon name="sparkle" :fallback-icon="ShieldCheck" size="sm" />
          </div>
          <span class="settings-label">{{ $t('settings.privacy') }}</span>
        </div>

        <div class="toggle-list">
          <button type="button" class="toggle-btn" @click="toggleCookieConsent">
            <div class="toggle-btn-content">
              <div class="toggle-btn-icon">
                <AnimatedIcon name="sparkle" :fallback-icon="ShieldCheck" size="sm" />
              </div>
              <div class="toggle-btn-text">
                <span class="toggle-btn-title">{{ $t('settings.cookieConsent') }}</span>
                <span class="toggle-btn-desc">{{ $t('settings.cookieConsentDesc') }}</span>
              </div>
            </div>
            <div class="toggle-switch" :class="{ active: settings.cookieConsent === true }">
              <span class="toggle-knob" />
            </div>
          </button>

          <button type="button" class="toggle-btn" @click="toggleAnalyticsEnabled">
            <div class="toggle-btn-content">
              <div class="toggle-btn-icon">
                <AnimatedIcon name="explore" :fallback-icon="BarChart3" size="sm" />
              </div>
              <div class="toggle-btn-text">
                <span class="toggle-btn-title">{{ $t('settings.analyticsEnabled') }}</span>
                <span class="toggle-btn-desc">{{ $t('settings.analyticsEnabledDesc') }}</span>
              </div>
            </div>
            <div class="toggle-switch" :class="{ active: settings.analyticsEnabled }">
              <span class="toggle-knob" />
            </div>
          </button>

          <button type="button" class="toggle-btn" @click="togglePerformanceCookies">
            <div class="toggle-btn-content">
              <div class="toggle-btn-icon">
                <AnimatedIcon name="explore" :fallback-icon="Gauge" size="sm" />
              </div>
              <div class="toggle-btn-text">
                <span class="toggle-btn-title">{{ $t('settings.performanceCookies') }}</span>
                <span class="toggle-btn-desc">{{ $t('settings.performanceCookiesDesc') }}</span>
              </div>
            </div>
            <div class="toggle-switch" :class="{ active: settings.performanceCookiesEnabled }">
              <span class="toggle-knob" />
            </div>
          </button>
        </div>
      </div>

      <!-- Video Settings -->
      <div v-show="isSettingsCategoryVisible('system')" class="settings-group">
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
      <div v-show="isSettingsCategoryVisible('system')" class="settings-group">
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
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRight,
  Globe,
  Info,
  Mail,
  Palette,
  X,
  Settings,
  Save,
  Video,
  RotateCcw,
  RefreshCw,
  Layers,
  Smartphone,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Gauge,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore, useThemeStore, useSettingsStore, useToastStore } from '@/stores'
import { setLocale, type SupportedLocale } from '@/i18n'
import { usePreferencesSync } from '@/composables/usePreferencesSync'
import { useVideoSettings } from '@/composables/useVideoSettings'
import type { Theme } from '@/types'
import type { AnimationIntensity, AppUpdateStrategy } from '@/stores/settings'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import AppearancePresetPicker from '@/components/appearance/AppearancePresetPicker.vue'
import ControlButton from '@/components/appearance/ControlButton.vue'
import ThemeModeSwitch from '@/components/appearance/ThemeModeSwitch.vue'

type SettingsCategory = 'appearance' | 'experience' | 'privacy' | 'system'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    embedded?: boolean
    showHeader?: boolean
    externalScroll?: boolean
    allowedCategories?: SettingsCategory[]
  }>(),
  {
    compact: true,
    embedded: false,
    showHeader: true,
    externalScroll: false,
    allowedCategories: () => [],
  }
)

defineEmits<{ close: [] }>()

const { locale, t } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()
const { resetSettings: resetVideoPlayerSettings } = useVideoSettings()
const { isSavingPreferences, resetPreferences, replacePreferences } = usePreferencesSync()

const { isAuthenticated } = storeToRefs(authStore)
const { theme, resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)
const visibleSettingsCategories = computed<{ id: SettingsCategory; label: string }[]>(() => {
  const allCategories = [
    { id: 'appearance' as SettingsCategory, label: t('settings.categoryAppearance') },
    { id: 'experience' as SettingsCategory, label: t('settings.categoryExperience') },
    { id: 'privacy' as SettingsCategory, label: t('settings.categoryPrivacy') },
    { id: 'system' as SettingsCategory, label: t('settings.categorySystem') },
  ]
  if (!props.allowedCategories.length) return allCategories
  return allCategories.filter((category) => props.allowedCategories.includes(category.id))
})
const activeSettingsCategory = ref<SettingsCategory>(
  props.allowedCategories[0] ?? ('appearance' as SettingsCategory)
)
const animationIntensityOptions = computed<{ value: AnimationIntensity; label: string }[]>(() => [
  { value: 'none', label: t('settings.animationNone') },
  { value: 'reduced', label: t('settings.animationReduced') },
  { value: 'normal', label: t('settings.animationNormal') },
  { value: 'full', label: t('settings.animationFull') },
])
const appUpdateStrategyOptions = computed<
  Array<{
    value: AppUpdateStrategy
    icon: typeof RefreshCw
    label: string
    description: string
  }>
>(() => [
  {
    value: 'prompt-only',
    icon: RefreshCw,
    label: t('settings.appUpdatePromptOnly'),
    description: t('settings.appUpdatePromptOnlyDesc'),
  },
  {
    value: 'public-idle-refresh',
    icon: Globe,
    label: t('settings.appUpdatePublicIdle'),
    description: t('settings.appUpdatePublicIdleDesc'),
  },
  {
    value: 'aggressive-idle-refresh',
    icon: Gauge,
    label: t('settings.appUpdateAggressive'),
    description: t('settings.appUpdateAggressiveDesc'),
  },
])
const selectedAppUpdateStrategyDescription = computed(
  () =>
    appUpdateStrategyOptions.value.find(
      (option) => option.value === settings.value.appUpdateStrategy
    )?.description ?? ''
)
const selectedAnimationIntensityLabel = computed(() => {
  return (
    animationIntensityOptions.value.find((opt) => opt.value === settings.value.animationIntensity)
      ?.label ?? ''
  )
})
const postsPerPageOptions = [10, 20, 30, 50] as const

const localeOptions: { code: SupportedLocale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
]

function setActiveSettingsCategory(category: SettingsCategory) {
  activeSettingsCategory.value = category
}

function isSettingsCategoryVisible(category: SettingsCategory) {
  if (props.embedded) {
    return visibleSettingsCategories.value.some((item) => item.id === category)
  }
  return activeSettingsCategory.value === category
}

function setTheme(value: Theme) {
  themeStore.setTheme(value)
}

async function changeLocale(code: SupportedLocale) {
  if (code === locale.value) return
  await setLocale(code)
}

function setAppUpdateStrategy(value: AppUpdateStrategy) {
  if (settings.value.appUpdateStrategy === value) return
  settingsStore.setAppUpdateStrategy(value)
}

function toggleHeroSection() {
  settingsStore.toggleSetting('showHeroSection')
}

function toggleAnimations() {
  settingsStore.toggleSetting('enableAnimations')
}

function toggleSwipeNavigation() {
  settingsStore.toggleSetting('enableSwipeNavigation')
}

function setAnimationIntensity(value: AnimationIntensity) {
  settingsStore.setAnimationIntensity(value)
}

function setPostsPerPage(value: number) {
  settingsStore.updateSetting('postsPerPage', value)
}

function toggleCookieConsent() {
  settingsStore.setCookieConsent(settings.value.cookieConsent === true ? false : true)
}

function toggleAnalyticsEnabled() {
  settingsStore.setAnalyticsEnabled(!settings.value.analyticsEnabled)
}

function togglePerformanceCookies() {
  settingsStore.setPerformanceCookiesEnabled(!settings.value.performanceCookiesEnabled)
}

async function handleResetPreferences() {
  try {
    await resetPreferences()
    toastStore.success(t('settings.preferencesReset'))
  } catch {}
}

async function handleReplacePreferences() {
  try {
    await replacePreferences()
    toastStore.success(t('settings.preferencesReplaced'))
  } catch {}
}

function resetVideoSettings() {
  resetVideoPlayerSettings()
  toastStore.success(t('settings.videoSettingsReset'))
}
</script>

<style scoped src="../../styles/components/settings-panel.css"></style>
