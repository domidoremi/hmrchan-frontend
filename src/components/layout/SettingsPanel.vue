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
        <div class="settings-options theme-options">
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
        <div class="settings-options strategy-options">
          <button
            v-for="opt in appUpdateStrategyOptions"
            :key="opt.value"
            type="button"
            class="theme-btn strategy-btn"
            :class="{ active: settings.appUpdateStrategy === opt.value }"
            :aria-pressed="settings.appUpdateStrategy === opt.value"
            @click="setAppUpdateStrategy(opt.value)"
          >
            <div class="theme-btn-icon">
              <AnimatedIcon name="loading" :fallback-icon="opt.icon" size="sm" />
            </div>
            <div class="strategy-btn__copy">
              <span class="strategy-btn__title">{{ opt.label }}</span>
              <span class="strategy-btn__desc">{{ opt.description }}</span>
            </div>
            <Transition name="check">
              <div v-if="settings.appUpdateStrategy === opt.value" class="theme-btn-check">
                <AnimatedIcon name="sparkle" :fallback-icon="Check" size="sm" />
              </div>
            </Transition>
          </button>
        </div>
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

      <!-- Background Effect -->
      <div v-show="isSettingsCategoryVisible('experience')" class="settings-group">
        <div class="settings-group-header">
          <div class="settings-group-icon">
            <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
          </div>
          <span class="settings-label">{{ $t('settings.backgroundEffect') }}</span>
        </div>
        <p class="settings-group-note">{{ $t('settings.ambientEffectsNote') }}</p>
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
      <div v-show="isSettingsCategoryVisible('experience')" class="settings-group">
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
      <div v-show="isSettingsCategoryVisible('experience')" class="settings-group">
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
import type { AnimationIntensity, AppUpdateStrategy, ParticleEffectType } from '@/stores/settings'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import AppearancePresetPicker from '@/components/appearance/AppearancePresetPicker.vue'
import ControlButton from '@/components/appearance/ControlButton.vue'

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
const { theme } = storeToRefs(themeStore)
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
      autoHomeEnabled: false,
      dismissedAutoHome: false,
      scale: 1,
      speechEnabled: false,
      autoHeroInteraction: false,
      followSensitivity: 1,
    }
  )
})
const themeOptions = computed(() => [
  { value: 'light' as Theme, icon: Sun, label: t('settings.light') },
  { value: 'dark' as Theme, icon: Moon, label: t('settings.dark') },
  { value: 'auto' as Theme, icon: Monitor, label: t('settings.auto') },
])
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
  const enabled = !deskPetConfig.value.enabled
  settingsStore.setDeskPet({
    enabled,
    dismissedAutoHome: enabled ? false : true,
  })
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
  --settings-shell-surface: var(--ui-compat-surface-interactive);
  --settings-shell-surface-strong: var(--ui-compat-surface-interactive-strong);
  --settings-shell-border: var(--ui-compat-border);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--appearance-surface-gap-sm);
  padding: var(--appearance-surface-padding-sm);
  min-inline-size: 0;
  inline-size: 100%;
  max-inline-size: min(100%, 24rem);
  max-block-size: var(--app-safe-block-size);
  overflow: hidden;
  overflow-x: hidden;
}

.settings-panel--compact {
  padding: 0.75rem;
  gap: 0.75rem;
  min-inline-size: min(100%, 13.5rem);
  inline-size: min(100%, 22rem);
  max-inline-size: min(100%, 22rem);
  max-block-size: min(var(--app-safe-block-size), 36rem);
  background: transparent;
  border: 0;
  border-radius: 0;
}

.settings-panel--embedded {
  padding: 0;
  gap: var(--appearance-surface-gap-md);
  max-inline-size: none;
  max-block-size: none;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.settings-panel--external-scroll {
  max-block-size: none;
  overflow: visible;
}

.settings-panel--compact.settings-panel--external-scroll {
  min-inline-size: 0;
  inline-size: 100%;
  max-inline-size: none;
  justify-self: stretch;
}

.settings-panel__body {
  display: grid;
  gap: var(--appearance-surface-gap-sm);
  min-block-size: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding-block-end: var(--spacing-1);
}

.settings-panel--embedded .settings-panel__body {
  overflow: visible;
  padding-block-end: 0;
}

.settings-panel--external-scroll .settings-panel__body {
  overflow: visible;
  padding-block-end: 0;
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

  .settings-panel--compact.settings-panel--external-scroll {
    max-inline-size: none;
  }
}

/* ========== Header ========== */
.settings-header {
  display: grid;
  gap: 0.75rem;
  padding-block: 0.875rem 0.625rem;
  padding-inline: 0.875rem;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  background: transparent;
  border-bottom: 0;
}

.settings-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.settings-header-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.settings-panel--compact .settings-header {
  padding-block: 0.75rem;
  padding-inline: 0.75rem;
}

.settings-category-switcher {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-1);
}

.settings-category-switcher__item {
  min-inline-size: 0;
  min-block-size: calc(var(--ui-control-height-sm) + 0.1875rem);
  padding-block: max(0.4375rem, calc(var(--ui-control-padding-y-sm) - 0.0625rem));
  padding-inline: max(0.75rem, var(--ui-control-padding-x-sm));
  border: 1px solid var(--settings-shell-border);
  border-radius: var(--ui-compat-control-radius);
  background: var(--settings-shell-surface);
  color: var(--ui-compat-text-secondary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1.2;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.settings-category-switcher__item:hover {
  color: var(--color-text-primary);
  background: var(--settings-shell-surface-strong);
  border-color: var(--ui-compat-border-strong);
}

.settings-category-switcher__item--active {
  color: var(--color-primary);
  background: var(--ui-compat-surface-accent);
  border-color: var(--ui-compat-border-strong);
  box-shadow: inset 0 0 0 0.0625rem rgba(var(--color-primary-rgb), 0.06);
}

.settings-header-icon {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, rgba(var(--color-primary-rgb), 0.22) 72%, transparent);
  border-radius: var(--radius-lg);
  color: var(--color-primary);
}

.settings-panel--compact .settings-header-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.settings-close-btn.page-control {
  min-inline-size: 2rem;
  block-size: 2rem;
  padding: 0.375rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--chrome-action-bg) 46%, transparent);
  border: 1px solid color-mix(in srgb, var(--chrome-action-border) 68%, transparent);
  box-shadow: none;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.settings-panel--compact .settings-close-btn.page-control {
  min-inline-size: 1.75rem;
  block-size: 1.75rem;
  padding: 0.3125rem;
}

.settings-close-btn.page-control:hover,
.settings-close-btn.page-control:focus-visible {
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--chrome-action-bg-hover) 62%, transparent);
  border-color: color-mix(in srgb, var(--chrome-action-border-strong) 72%, transparent);
  transform: none;
  box-shadow: none;
}

/* ========== Group ========== */
.settings-group {
  padding: var(--appearance-surface-padding-md);
  min-inline-size: 0;
  border: 1px solid var(--ui-compat-border);
  border-radius: var(--ui-radius-card, var(--radius-xl));
  background: var(--ui-compat-surface-base);
  box-shadow: var(--ui-compat-shadow);
}

.settings-group + .settings-group {
  border-top: 1px solid color-mix(in srgb, var(--ui-compat-border) 72%, transparent);
}

.settings-panel--compact .settings-group {
  padding: 0.9375rem;
}

.settings-group-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
}

.settings-group-icon {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--chrome-action-bg-hover) 56%, transparent);
  border: 1px solid color-mix(in srgb, var(--chrome-action-border) 70%, transparent);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
}

.settings-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ========== Theme Options ========== */
.theme-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.theme-options--presets {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.strategy-options {
  grid-template-columns: 1fr;
}

.theme-btn {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.875rem;
  padding-block: 0.9375rem;
  padding-inline: 0.875rem;
  background: var(--ui-compat-surface-interactive);
  border: 1px solid var(--ui-compat-border);
  border-radius: var(--radius-lg);
  min-inline-size: 0;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    color var(--transition-fast);
}

.theme-btn--preset {
  align-items: flex-start;
  text-align: left;
}

.settings-panel--compact .theme-btn {
  padding-block: 0.8125rem;
  padding-inline: 0.75rem;
  gap: 0.625rem;
}

.theme-btn:hover {
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
}

.theme-btn.active {
  background: var(--ui-compat-surface-accent);
  border-color: var(--ui-compat-border-strong);
}

.theme-btn-icon {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-compat-surface-interactive);
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

.theme-btn-copy {
  display: grid;
  gap: 0.25rem;
  width: 100%;
  min-inline-size: 0;
}

.theme-btn:hover .theme-btn-icon {
  background: var(--ui-compat-surface-interactive-strong);
  color: var(--color-text-primary);
}

.theme-btn.active .theme-btn-icon {
  background: var(--color-primary);
  color: var(--color-on-primary);
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
}

.strategy-btn {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--spacing-3);
  text-align: left;
}

.strategy-btn__copy {
  display: grid;
  gap: 0.25rem;
  min-inline-size: 0;
  flex: 1;
}

.strategy-btn__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  line-height: 1.35;
}

.strategy-btn__desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: 1.45;
}

.theme-btn-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
  text-align: center;
  transition: color var(--transition-fast);
}

.theme-btn--preset .theme-btn-label {
  text-align: left;
}

.theme-btn-summary {
  font-size: var(--text-xs);
  line-height: 1.45;
  color: var(--ui-compat-text-secondary);
  text-align: left;
}

.theme-btn-meta {
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ui-compat-text-muted);
  text-align: left;
}

.theme-btn.active .theme-btn-label {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
}

.theme-btn.active .theme-btn-summary,
.theme-btn.active .theme-btn-meta {
  color: var(--color-text-primary);
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

.settings-group-lead,
.settings-group-note {
  margin: 0 0 var(--spacing-3);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--ui-compat-text-secondary);
}

.settings-gallery-links {
  padding-block-start: var(--spacing-2);
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
  padding-block: 0.6875rem;
  padding-inline: 0.9375rem;
  background: var(--ui-compat-surface-interactive);
  border: 1px solid var(--ui-compat-border);
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
  padding-block: 0.5625rem;
  padding-inline: 0.8125rem;
  font-size: var(--text-xs);
}

.lang-btn:hover {
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
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
  padding: 1rem;
  background: var(--ui-compat-surface-interactive);
  border: 1px solid var(--ui-compat-border);
  border-radius: var(--radius-lg);
  min-inline-size: 0;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.toggle-btn:hover {
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
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
  background: var(--ui-compat-surface-interactive);
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

[data-color-mode='dark'] .toggle-switch {
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
  padding: 1rem;
  background: var(--ui-compat-surface-interactive);
  border: 1px solid var(--ui-compat-border);
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
  padding: 0.8125rem;
}

.link-btn:hover {
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
}

.link-btn-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-compat-surface-interactive);
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
  padding-block: 0.6875rem;
  padding-inline: 0.6875rem;
  background: var(--ui-compat-surface-interactive);
  border: 1px solid var(--ui-compat-border);
  border-radius: var(--radius-lg);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    color var(--transition-fast);
}

.settings-panel--compact .bg-effect-btn {
  padding-block: 0.5625rem;
  padding-inline: 0.625rem;
}

.bg-effect-btn:hover {
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
}

.bg-effect-btn.active {
  background: var(--ui-compat-surface-accent);
  border-color: var(--ui-compat-border-strong);
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
  padding-block-start: 0.75rem;
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

[data-color-mode='dark'] .settings-slider {
  background: rgba(255, 255, 255, 0.14);
}

/* ========== Dark Mode ========== */
[data-color-mode='dark'] .theme-btn.active {
  background: rgba(var(--color-primary-rgb), 0.15);
}

[data-color-mode='dark'] .settings-panel {
  --settings-shell-surface: var(--ui-compat-surface-interactive);
  --settings-shell-surface-strong: var(--ui-compat-surface-interactive-strong);
  --settings-shell-border: var(--ui-compat-border);
}

[data-color-mode='dark'] .settings-group {
  background: var(--ui-compat-surface-base);
  box-shadow: var(--ui-compat-shadow);
}

[data-color-mode='dark'] .bg-effect-btn:not(.active) {
  background: var(--ui-compat-surface-interactive);
  border-color: var(--ui-compat-border);
}

[data-color-mode='dark'] .bg-effect-btn.active {
  background: var(--ui-compat-surface-accent);
}

[data-color-mode='dark'] .lang-btn:not(.active) {
  background: var(--ui-compat-surface-interactive);
  border-color: var(--ui-compat-border);
}

[data-color-mode='dark'] .toggle-btn {
  background: var(--ui-compat-surface-interactive);
  border-color: var(--ui-compat-border);
}

[data-color-mode='dark'] .toggle-btn:hover {
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
}

[data-color-mode='dark'] .link-btn {
  background: var(--ui-compat-surface-interactive);
  border-color: var(--ui-compat-border);
}

[data-color-mode='dark'] .link-btn:hover {
  background: var(--ui-compat-surface-interactive-strong);
  border-color: var(--ui-compat-border-strong);
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
  .settings-category-switcher {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toggle-btn {
    gap: var(--spacing-2);
    padding: 0.75rem;
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
