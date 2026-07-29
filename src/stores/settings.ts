import { ref, computed, nextTick } from 'vue'
import { defineStore } from 'pinia'
import type { UserPreferences } from '@/api/preferencesService'
import type { AppearancePreset, MotionMode } from '@/types'
import { DEFAULT_APPEARANCE_PRESET, normalizeAppearancePreset } from '@/config/appearance'

export type AnimationIntensity = 'none' | 'reduced' | 'normal' | 'full'
export type AppUpdateStrategy = 'prompt-only' | 'public-idle-refresh' | 'aggressive-idle-refresh'
type LegacyUiStyleSnapshot = 'ios' | 'material'

export interface Settings {
  showHeroSection: boolean
  enableAnimations: boolean
  enableSwipeNavigation: boolean
  postsPerPage: number
  cookieConsent: boolean | null
  analyticsEnabled: boolean
  functionalCookiesEnabled: boolean
  performanceCookiesEnabled: boolean
  dataCollection: boolean
  personalizedContent: boolean
  defaultSort: 'newest' | 'popular' | 'trending'

  animationIntensity: AnimationIntensity

  postDetailViewMode: 'stream' | 'data'

  appearancePreset: AppearancePreset

  appUpdateStrategy: AppUpdateStrategy

  homeQuickNavSide: 'left' | 'right'
}

const defaultSettings: Settings = {
  showHeroSection: true,
  enableAnimations: true,
  enableSwipeNavigation: true,
  postsPerPage: 20,
  cookieConsent: null,
  analyticsEnabled: false,
  functionalCookiesEnabled: true,
  performanceCookiesEnabled: false,
  dataCollection: false,
  personalizedContent: false,
  defaultSort: 'newest',
  animationIntensity: 'normal',
  postDetailViewMode: 'stream',
  appearancePreset: DEFAULT_APPEARANCE_PRESET,
  appUpdateStrategy: 'public-idle-refresh',
  homeQuickNavSide: 'right',
}

function createDefaultSettings(): Settings {
  return { ...defaultSettings }
}

function normalizePrivacySettings(target: Settings): void {
  if (target.cookieConsent !== true) {
    target.analyticsEnabled = false
    target.performanceCookiesEnabled = false
  }
}

type SettingsHydrationSnapshot = Settings & {
  uiStyle?: LegacyUiStyleSnapshot
  densityMode?: string
  contrastMode?: string
  textureLevel?: string
  backgroundEffect?: unknown
  mascotBackground?: unknown
  deskPet?: unknown
}

function retireVisualRuntimeSettings(target: SettingsHydrationSnapshot): void {
  delete target.backgroundEffect
  delete target.mascotBackground
  delete target.deskPet

  try {
    globalThis.localStorage?.removeItem('desk-pet:last-position')
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

function resolvePresetFromLegacyUiStyle(style: LegacyUiStyleSnapshot): AppearancePreset {
  return style === 'material' ? 'material-calm' : DEFAULT_APPEARANCE_PRESET
}

function normalizeAppearanceSettings(target: SettingsHydrationSnapshot): void {
  const normalizedPreset = normalizeAppearancePreset(target.appearancePreset)
  const legacyUiStyle = target.uiStyle

  target.appearancePreset =
    legacyUiStyle && normalizedPreset === DEFAULT_APPEARANCE_PRESET
      ? resolvePresetFromLegacyUiStyle(legacyUiStyle)
      : normalizedPreset

  if ('uiStyle' in target) {
    delete target.uiStyle
  }
  if ('densityMode' in target) {
    delete target.densityMode
  }
  if ('contrastMode' in target) {
    delete target.contrastMode
  }
  if ('textureLevel' in target) {
    delete target.textureLevel
  }
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<Settings>(createDefaultSettings())

    nextTick(() => {
      if (!settings.value.appearancePreset)
        settings.value.appearancePreset = DEFAULT_APPEARANCE_PRESET
      if (settings.value.cookieConsent === undefined) settings.value.cookieConsent = null
      if (settings.value.analyticsEnabled === undefined) settings.value.analyticsEnabled = false
      if (settings.value.functionalCookiesEnabled === undefined) {
        settings.value.functionalCookiesEnabled = true
      }
      if (settings.value.performanceCookiesEnabled === undefined) {
        settings.value.performanceCookiesEnabled = false
      }
      if (settings.value.dataCollection === undefined) settings.value.dataCollection = false
      if (settings.value.personalizedContent === undefined) {
        settings.value.personalizedContent = false
      }
      if (!settings.value.appUpdateStrategy) {
        settings.value.appUpdateStrategy = defaultSettings.appUpdateStrategy
      }
      if (
        settings.value.homeQuickNavSide !== 'left' &&
        settings.value.homeQuickNavSide !== 'right'
      ) {
        settings.value.homeQuickNavSide = defaultSettings.homeQuickNavSide
      }

      settings.value.appUpdateStrategy = [
        'prompt-only',
        'public-idle-refresh',
        'aggressive-idle-refresh',
      ].includes(settings.value.appUpdateStrategy)
        ? settings.value.appUpdateStrategy
        : defaultSettings.appUpdateStrategy

      retireVisualRuntimeSettings(settings.value)
      normalizeAppearanceSettings(settings.value)
      normalizePrivacySettings(settings.value)
    })

    const animationDurationMultiplier = computed(() => {
      const multipliers: Record<AnimationIntensity, number> = {
        none: 0,
        reduced: 0.5,
        normal: 1,
        full: 1.2,
      }
      return multipliers[settings.value.animationIntensity]
    })

    const shouldAnimate = computed(() => {
      return settings.value.enableAnimations && settings.value.animationIntensity !== 'none'
    })

    const prefersReducedMotion = computed(() => {
      return (
        settings.value.animationIntensity === 'reduced' ||
        settings.value.animationIntensity === 'none'
      )
    })

    const motionMode = computed<MotionMode>(() => {
      if (!settings.value.enableAnimations || settings.value.animationIntensity === 'none') {
        return 'none'
      }
      if (settings.value.animationIntensity === 'reduced') return 'reduced'
      if (settings.value.animationIntensity === 'full') return 'expressive'
      return 'standard'
    })

    function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
      settings.value[key] = value
    }

    function toggleSetting(
      key: keyof Pick<Settings, 'showHeroSection' | 'enableAnimations' | 'enableSwipeNavigation'>
    ) {
      settings.value[key] = !settings.value[key]
    }

    function setAnimationIntensity(intensity: AnimationIntensity) {
      settings.value.animationIntensity = intensity

      if (intensity === 'none') {
        settings.value.enableAnimations = false
      } else if (!settings.value.enableAnimations) {
        settings.value.enableAnimations = true
      }
    }

    function setAppearancePreset(preset: AppearancePreset) {
      settings.value.appearancePreset = normalizeAppearancePreset(preset)
    }

    function setCookieConsent(value: boolean | null) {
      settings.value.cookieConsent = value
      normalizePrivacySettings(settings.value)
    }

    function setAnalyticsEnabled(enabled: boolean) {
      if (enabled) {
        settings.value.cookieConsent = true
      }

      settings.value.analyticsEnabled = enabled
      normalizePrivacySettings(settings.value)
    }

    function setPerformanceCookiesEnabled(enabled: boolean) {
      if (enabled) {
        settings.value.cookieConsent = true
      }

      settings.value.performanceCookiesEnabled = enabled
      normalizePrivacySettings(settings.value)
    }

    function setAppUpdateStrategy(strategy: AppUpdateStrategy) {
      settings.value.appUpdateStrategy = strategy
    }

    function setHomeQuickNavSide(side: 'left' | 'right') {
      settings.value.homeQuickNavSide = side
    }

    function applyPreferences(preferences: UserPreferences) {
      const nextSettings = {
        ...settings.value,
      }

      if (typeof preferences.show_hero_section === 'boolean') {
        nextSettings.showHeroSection = preferences.show_hero_section
      }

      if (typeof preferences.enable_animations === 'boolean') {
        nextSettings.enableAnimations = preferences.enable_animations
      }

      if (
        typeof preferences.posts_per_page === 'number' &&
        Number.isFinite(preferences.posts_per_page)
      ) {
        nextSettings.postsPerPage = Math.max(1, Math.round(preferences.posts_per_page))
      }

      if (preferences.cookie_consent === null || typeof preferences.cookie_consent === 'boolean') {
        nextSettings.cookieConsent = preferences.cookie_consent ?? null
      }

      if (typeof preferences.analytics_enabled === 'boolean') {
        nextSettings.analyticsEnabled = preferences.analytics_enabled
      }

      if (typeof preferences.functional_cookies_enabled === 'boolean') {
        nextSettings.functionalCookiesEnabled = preferences.functional_cookies_enabled
      }

      if (typeof preferences.performance_cookies_enabled === 'boolean') {
        nextSettings.performanceCookiesEnabled = preferences.performance_cookies_enabled
      }

      if (typeof preferences.data_collection === 'boolean') {
        nextSettings.dataCollection = preferences.data_collection
      }

      if (typeof preferences.personalized_content === 'boolean') {
        nextSettings.personalizedContent = preferences.personalized_content
      }

      normalizePrivacySettings(nextSettings)
      normalizeAppearanceSettings(nextSettings)
      settings.value = nextSettings
    }

    function exportPreferences(): UserPreferences {
      return {
        show_hero_section: settings.value.showHeroSection,
        enable_animations: settings.value.enableAnimations,
        posts_per_page: settings.value.postsPerPage,
        cookie_consent: settings.value.cookieConsent,
        analytics_enabled: settings.value.analyticsEnabled,
        functional_cookies_enabled: settings.value.functionalCookiesEnabled,
        performance_cookies_enabled: settings.value.performanceCookiesEnabled,
        data_collection: settings.value.dataCollection,
        personalized_content: settings.value.personalizedContent,
      }
    }

    function resetSettings() {
      settings.value = createDefaultSettings()
    }

    return {
      settings,
      animationDurationMultiplier,
      shouldAnimate,
      prefersReducedMotion,
      motionMode,
      updateSetting,
      toggleSetting,
      setAnimationIntensity,
      setAppearancePreset,
      setCookieConsent,
      setAnalyticsEnabled,
      setPerformanceCookiesEnabled,
      setAppUpdateStrategy,
      setHomeQuickNavSide,
      applyPreferences,
      exportPreferences,
      resetSettings,
    }
  },
  {
    persist: true,
  }
)
