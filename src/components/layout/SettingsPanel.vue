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
        class="settings-close-btn page-control-btn page-control-btn--square"
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
          :aria-pressed="theme === opt.value"
          @click="setTheme(opt.value)"
        >
          <div class="theme-btn-icon">
            <AnimatedIcon name="explore" :fallback-icon="opt.icon" size="md" />
          </div>
          <span class="theme-btn-label">{{ opt.label }}</span>
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
          :aria-pressed="settings.uiStyle === opt.value"
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
          :aria-pressed="locale === opt.code"
          @click="changeLocale(opt.code)"
        >
          <span class="lang-flag">{{ opt.flag }}</span>
          <span class="lang-name">{{ opt.name }}</span>
        </button>
      </div>
    </div>

    <!-- Display -->
    <div class="settings-group">
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
    <div class="settings-group">
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
          :aria-pressed="settings.backgroundEffect.type === opt.value"
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
            :aria-label="$t('settings.bgDensity')"
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
            :aria-label="$t('settings.bgSpeed')"
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
            :aria-label="$t('settings.bgOpacity')"
            :value="settings.backgroundEffect.opacity"
            @input="onOpacityChange"
          />
        </div>
      </template>
    </div>

    <!-- Mascot Flight Background -->
    <div class="settings-group">
      <div class="settings-group-header">
        <div class="settings-group-icon">
          <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
        </div>
        <span class="settings-label">{{ $t('settings.mascotBackground') }}</span>
      </div>

      <div class="toggle-list">
        <button type="button" class="toggle-btn" @click="toggleMascotBackground">
          <div class="toggle-btn-content">
            <div class="toggle-btn-icon">
              <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
            </div>
            <div class="toggle-btn-text">
              <span class="toggle-btn-title">{{ $t('settings.mascotEnabled') }}</span>
              <span class="toggle-btn-desc">{{ $t('settings.mascotEnabledDesc') }}</span>
            </div>
          </div>
          <div class="toggle-switch" :class="{ active: mascotBackground.enabled }">
            <span class="toggle-knob" />
          </div>
        </button>
      </div>

      <template v-if="mascotBackground.enabled">
        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.mascotDensity') }}
            <span class="slider-value">{{ mascotBackground.density.toFixed(1) }}x</span>
          </label>
          <input
            type="range"
            class="settings-slider"
            min="0.4"
            max="1.6"
            step="0.1"
            :aria-label="$t('settings.mascotDensity')"
            :value="mascotBackground.density"
            @input="onMascotDensityChange"
          />
        </div>
        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.mascotSpeed') }}
            <span class="slider-value">{{ mascotBackground.speed.toFixed(1) }}x</span>
          </label>
          <input
            type="range"
            class="settings-slider"
            min="0.6"
            max="1.8"
            step="0.1"
            :aria-label="$t('settings.mascotSpeed')"
            :value="mascotBackground.speed"
            @input="onMascotSpeedChange"
          />
        </div>
        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.mascotOpacity') }}
            <span class="slider-value">{{ Math.round(mascotBackground.opacity * 100) }}%</span>
          </label>
          <input
            type="range"
            class="settings-slider"
            min="0.3"
            max="1"
            step="0.05"
            :aria-label="$t('settings.mascotOpacity')"
            :value="mascotBackground.opacity"
            @input="onMascotOpacityChange"
          />
        </div>
      </template>
    </div>

    <!-- Desk Pet -->
    <div class="settings-group">
      <div class="settings-group-header">
        <div class="settings-group-icon">
          <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="sm" />
        </div>
        <span class="settings-label">{{ $t('settings.deskPet') }}</span>
      </div>

      <div class="toggle-list">
        <button type="button" class="toggle-btn" @click="toggleDeskPetEnabled">
          <div class="toggle-btn-content">
            <div class="toggle-btn-icon">
              <AnimatedIcon name="sparkle" :fallback-icon="Settings" size="sm" />
            </div>
            <div class="toggle-btn-text">
              <span class="toggle-btn-title">{{ $t('settings.deskPetEnabled') }}</span>
              <span class="toggle-btn-desc">{{ $t('settings.deskPetEnabledDesc') }}</span>
            </div>
          </div>
          <div class="toggle-switch" :class="{ active: deskPetConfig.enabled }">
            <span class="toggle-knob" />
          </div>
        </button>
      </div>

      <template v-if="deskPetConfig.enabled">
        <div class="toggle-list">
          <button type="button" class="toggle-btn" @click="toggleDeskPetSpeech">
            <div class="toggle-btn-content">
              <div class="toggle-btn-icon">
                <AnimatedIcon name="sparkle" :fallback-icon="Info" size="sm" />
              </div>
              <div class="toggle-btn-text">
                <span class="toggle-btn-title">{{ $t('settings.deskPetSpeech') }}</span>
                <span class="toggle-btn-desc">{{ $t('settings.deskPetSpeechDesc') }}</span>
              </div>
            </div>
            <div class="toggle-switch" :class="{ active: deskPetConfig.speechEnabled }">
              <span class="toggle-knob" />
            </div>
          </button>

          <button type="button" class="toggle-btn" @click="toggleDeskPetAutoHero">
            <div class="toggle-btn-content">
              <div class="toggle-btn-icon">
                <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
              </div>
              <div class="toggle-btn-text">
                <span class="toggle-btn-title">{{ $t('settings.deskPetAutoHero') }}</span>
                <span class="toggle-btn-desc">{{ $t('settings.deskPetAutoHeroDesc') }}</span>
              </div>
            </div>
            <div class="toggle-switch" :class="{ active: deskPetConfig.autoHeroInteraction }">
              <span class="toggle-knob" />
            </div>
          </button>
        </div>

        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.deskPetScale') }}
            <span class="slider-value">{{ deskPetConfig.scale.toFixed(1) }}x</span>
          </label>
          <input
            type="range"
            class="settings-slider"
            min="0.8"
            max="1.5"
            step="0.1"
            :aria-label="$t('settings.deskPetScale')"
            :value="deskPetConfig.scale"
            @input="onDeskPetScaleChange"
          />
        </div>
        <div class="slider-group">
          <label class="slider-label">
            {{ $t('settings.deskPetFollowSensitivity') }}
            <span class="slider-value">{{ deskPetConfig.followSensitivity.toFixed(1) }}x</span>
          </label>
          <input
            type="range"
            class="settings-slider"
            min="0.5"
            max="1.8"
            step="0.1"
            :aria-label="$t('settings.deskPetFollowSensitivity')"
            :value="deskPetConfig.followSensitivity"
            @input="onDeskPetFollowSensitivityChange"
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
  Save,
  Video,
  RotateCcw,
  Layers,
  Smartphone,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Gauge,
} from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore, useThemeStore, useSettingsStore, useToastStore } from '@/stores'
import { setLocale, type SupportedLocale } from '@/i18n'
import { usePreferencesSync } from '@/composables/usePreferencesSync'
import { useVideoSettings } from '@/composables/useVideoSettings'
import type { Theme } from '@/types'
import type { AnimationIntensity, UiStyle, ParticleEffectType } from '@/stores/settings'
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
const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()
const { resetSettings: resetVideoPlayerSettings } = useVideoSettings()
const { isSavingPreferences, resetPreferences, replacePreferences } = usePreferencesSync()

const { isAuthenticated } = storeToRefs(authStore)
const { theme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)
const mascotBackground = computed(() => {
  return (
    settings.value.mascotBackground ?? {
      enabled: false,
      density: 1,
      speed: 1,
      opacity: 0.85,
    }
  )
})
const deskPetConfig = computed(() => {
  return (
    settings.value.deskPet ?? {
      enabled: false,
      scale: 1,
      speechEnabled: true,
      autoHeroInteraction: true,
      followSensitivity: 1,
    }
  )
})

const themeOptions = computed(() => [
  { value: 'light' as Theme, icon: Sun, label: t('settings.light') },
  { value: 'dark' as Theme, icon: Moon, label: t('settings.dark') },
  { value: 'blue' as Theme, icon: Palette, label: t('settings.blue') },
  { value: 'auto' as Theme, icon: Monitor, label: t('settings.auto') },
])

const uiStyleOptions = computed(() => [
  { value: 'ios' as UiStyle, icon: Smartphone, label: t('settings.uiStyleIos') },
  { value: 'material' as UiStyle, icon: Layers, label: t('settings.uiStyleMaterial') },
])
const animationIntensityOptions = computed<{ value: AnimationIntensity; label: string }[]>(() => [
  { value: 'none', label: t('settings.animationNone') },
  { value: 'reduced', label: t('settings.animationReduced') },
  { value: 'normal', label: t('settings.animationNormal') },
  { value: 'full', label: t('settings.animationFull') },
])
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

function setTheme(value: Theme) {
  themeStore.setTheme(value)
}

function setUiStyle(value: UiStyle) {
  settingsStore.setUiStyle(value)
}

function changeLocale(code: SupportedLocale) {
  void setLocale(code)
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

const bgEffectOptions = computed<{ value: ParticleEffectType; emoji: string; label: string }[]>(
  () => [
    { value: 'none', emoji: '✕', label: t('settings.bgNone') },
    { value: 'rain', emoji: '🌧', label: t('settings.bgRain') },
    { value: 'snow', emoji: '❄', label: t('settings.bgSnow') },
    { value: 'stars', emoji: '✨', label: t('settings.bgStars') },
  ]
)

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

function toggleMascotBackground() {
  settingsStore.setMascotBackground({ enabled: !mascotBackground.value.enabled })
}

function onMascotDensityChange(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  settingsStore.setMascotBackground({ density: value })
}

function onMascotSpeedChange(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  settingsStore.setMascotBackground({ speed: value })
}

function onMascotOpacityChange(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  settingsStore.setMascotBackground({ opacity: value })
}

function toggleDeskPetEnabled() {
  settingsStore.setDeskPet({ enabled: !deskPetConfig.value.enabled })
}

function toggleDeskPetSpeech() {
  settingsStore.setDeskPet({ speechEnabled: !deskPetConfig.value.speechEnabled })
}

function toggleDeskPetAutoHero() {
  settingsStore.setDeskPet({ autoHeroInteraction: !deskPetConfig.value.autoHeroInteraction })
}

function onDeskPetScaleChange(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  settingsStore.setDeskPet({ scale: value })
}

function onDeskPetFollowSensitivityChange(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  settingsStore.setDeskPet({ followSensitivity: value })
}

async function handleResetPreferences() {
  try {
    await resetPreferences()
    toastStore.success(t('settings.preferencesReset'))
  } catch {
    // 错误提示由同步层统一处理
  }
}

async function handleReplacePreferences() {
  try {
    await replacePreferences()
    toastStore.success(t('settings.preferencesReplaced'))
  } catch {
    // 错误提示由同步层统一处理
  }
}

function resetVideoSettings() {
  resetVideoPlayerSettings()
  toastStore.success(t('settings.videoSettingsReset'))
}
</script>

<style scoped>
.settings-panel {
  padding: var(--spacing-2);
  min-inline-size: 0;
  inline-size: 100%;
  max-inline-size: min(100%, 24rem);
  max-block-size: var(--app-safe-block-size);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.settings-panel--compact {
  padding: var(--spacing-2);
  gap: var(--spacing-2);
  min-inline-size: min(100%, 13.5rem);
  inline-size: min(100%, 22rem);
  max-inline-size: min(100%, 22rem);
  max-block-size: min(var(--app-safe-block-size), 36rem);
  background: var(--color-background);
  border: 1px solid var(--glass-border);
  border-radius: var(--ui-radius-dialog, var(--radius-xl));
}

/* 移动端优化：确保面板可以滚动 */
@media (max-width: 768px) {
  .settings-panel {
    max-block-size: var(--app-safe-block-size-with-mobile-nav);
  }

  .settings-panel--compact {
    inline-size: 100%;
    max-inline-size: min(100%, 22rem);
    max-block-size: min(var(--app-safe-block-size-with-mobile-nav), 34rem);
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
  inset-block-start: 0;
  z-index: 2;
  background: var(--color-background);
  border-bottom: 1px solid var(--glass-border);
}

.settings-header-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-inline-size: 0;
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
  box-shadow: none;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.settings-panel--compact .settings-close-btn {
  width: 1.75rem;
  height: 1.75rem;
}

.settings-close-btn:hover {
  color: var(--color-text-primary);
  background: var(--glass-bg-light);
  border-color: var(--glass-border-strong);
  transform: none;
  box-shadow: none;
}

/* ========== Group ========== */
.settings-group {
  padding: var(--spacing-2);
  min-inline-size: 0;
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-2);
  min-inline-size: 0;
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
  min-inline-size: 0;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    color var(--transition-fast);
}

.settings-panel--compact .theme-btn {
  padding: var(--spacing-2) var(--spacing-1);
  gap: var(--spacing-1);
}

.theme-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
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
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
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
  overflow-wrap: anywhere;
  text-align: center;
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
    transform: scale(1.03);
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
  min-inline-size: 0;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  min-inline-size: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.settings-panel--compact .lang-btn {
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--text-xs);
}

.lang-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
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
  min-inline-size: 0;
}

.toggle-btn {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  min-inline-size: 0;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.toggle-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
}

.toggle-btn-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex: 1;
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
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
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
  line-height: 1.3;
  white-space: normal;
}

.toggle-btn-desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.35;
}

/* ========== Toggle Switch ========== */
.toggle-switch {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  background: rgba(148, 163, 184, 0.28);
  border-radius: var(--radius-full);
  flex-shrink: 0;
  margin-top: 0.125rem;
  transition: background var(--transition-fast);
}

[data-theme='dark'] .toggle-switch {
  background: rgba(148, 163, 184, 0.22);
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
  transform: translateX(1.25rem);
}

/* ========== Link List ========== */
.link-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-inline-size: 0;
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
  min-inline-size: 0;
  color: var(--color-text-primary);
  text-decoration: none;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.settings-panel--compact .link-btn {
  padding: var(--spacing-2);
}

.link-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
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
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
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
  overflow-wrap: anywhere;
}

.link-btn-arrow {
  color: var(--color-text-tertiary);
  opacity: 0;
  transform: translateX(-0.25rem);
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast),
    color var(--transition-fast);
}

.link-btn:hover .link-btn-arrow {
  opacity: 1;
  transform: translateX(0);
}

.link-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.link-btn:disabled:hover {
  background: var(--glass-bg-light);
  border-color: var(--glass-border);
  transform: none;
}

.preferences-actions {
  padding-top: var(--spacing-2);
}

/* ========== Background Effect Options ========== */
.bg-effect-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.bg-effect-btn {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-1);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    color var(--transition-fast);
}

.settings-panel--compact .bg-effect-btn {
  padding: var(--spacing-1) var(--spacing-1);
}

.bg-effect-btn:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border-strong);
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
  overflow-wrap: anywhere;
  text-align: center;
}

.bg-effect-btn.active .bg-effect-label {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
}

/* ========== Slider Group ========== */
.slider-group {
  padding: var(--spacing-2) 0 0;
  min-inline-size: 0;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-1) var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-1);
}

.slider-value {
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-inline-start: auto;
  flex-shrink: 0;
}

.settings-slider {
  width: 100%;
  height: 0.25rem;
  appearance: none;
  background: rgba(148, 163, 184, 0.22);
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
  transform: scale(1.03);
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
  background: rgba(255, 255, 255, 0.14);
}

/* ========== Dark Mode ========== */
[data-theme='dark'] .theme-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
}

[data-theme='dark'] .bg-effect-btn:not(.active) {
  background: rgba(18, 24, 36, 0.78);
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme='dark'] .bg-effect-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
}

[data-theme='dark'] .lang-btn:not(.active) {
  background: rgba(18, 24, 36, 0.78);
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme='dark'] .toggle-btn {
  background: rgba(18, 24, 36, 0.78);
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme='dark'] .toggle-btn:hover {
  background: rgba(28, 36, 52, 0.96);
  border-color: rgba(var(--color-primary-rgb), 0.18);
}

[data-theme='dark'] .link-btn {
  background: rgba(18, 24, 36, 0.78);
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme='dark'] .link-btn:hover {
  background: rgba(28, 36, 52, 0.96);
  border-color: rgba(var(--color-primary-rgb), 0.18);
}

/* ========== Blue Theme ========== */
[data-theme='blue'] .theme-btn.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

[data-theme='blue'] .theme-btn.active .theme-btn-icon {
  background: #3b82f6;
  color: var(--color-on-primary);
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
  color: var(--color-on-primary);
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

@media (max-width: 28rem) {
  .toggle-btn {
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }

  .toggle-btn-content {
    gap: var(--spacing-2);
  }

  .toggle-btn-icon {
    width: 1.75rem;
    height: 1.75rem;
  }
}
</style>
