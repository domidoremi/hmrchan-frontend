/**
 * Settings Store - 用户设置状态管理
 */

import { ref, computed, nextTick } from 'vue'
import { defineStore } from 'pinia'
import type { UserPreferences } from '@/api/preferencesService'
import type { AppearancePreset, ContrastMode, DensityMode, MotionMode, TextureLevel } from '@/types'
import { DEFAULT_APPEARANCE_PRESET, normalizeAppearancePreset } from '@/config/appearance'

export type AnimationIntensity = 'none' | 'reduced' | 'normal' | 'full'
export type AppUpdateStrategy = 'prompt-only' | 'public-idle-refresh' | 'aggressive-idle-refresh'
type LegacyUiStyleSnapshot = 'ios' | 'material'

/** 背景粒子效果类型 */
export type ParticleEffectType = 'none' | 'rain' | 'snow' | 'stars'

/** 粒子效果自定义参数 */
export interface ParticleEffectConfig {
  /** 效果类型 */
  type: ParticleEffectType
  /** 粒子密度 0.1–1（默认 0.5）。实际数量 = density × 基准数量 */
  density: number
  /** 速度倍率 0.2–2（默认 1） */
  speed: number
  /** 自定义颜色（CSS 颜色值，空字符串表示使用主题默认色） */
  color: string
  /** 粒子透明度 0.1–1（默认 0.6） */
  opacity: number
}

/** 吉祥物飞行背景配置 */
export interface MascotBackgroundConfig {
  /** 开关 */
  enabled: boolean
  /** 密度倍率 0.4-1.6 */
  density: number
  /** 速度倍率 0.6-1.8 */
  speed: number
  /** 透明度倍率 0.3-1 */
  opacity: number
}

/** 桌宠配置 */
export interface DeskPetConfig {
  /** 开关 */
  enabled: boolean
  /** 尺寸倍率 0.8-1.5 */
  scale: number
  /** 允许气泡台词 */
  speechEnabled: boolean
  /** 自动与 Hero 按钮互动 */
  autoHeroInteraction: boolean
  /** 跟随灵敏度 0.5-1.8 */
  followSensitivity: number
}

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
  /** 动效强度：none=无动效, reduced=减弱, normal=正常, full=完整 */
  animationIntensity: AnimationIntensity
  /** 帖子详情视图模式：stream=流媒体，data=数据展示 */
  postDetailViewMode: 'stream' | 'data'
  /** 外观预设 */
  appearancePreset: AppearancePreset
  /** 用户显式密度偏好 */
  densityMode: DensityMode
  /** 用户显式对比度偏好 */
  contrastMode: ContrastMode
  /** 装饰纹理强度 */
  textureLevel: TextureLevel
  /** 全局背景粒子效果 */
  backgroundEffect: ParticleEffectConfig
  /** 吉祥物飞行背景 */
  mascotBackground: MascotBackgroundConfig
  /** 桌宠配置 */
  deskPet: DeskPetConfig
  /** 应用更新策略 */
  appUpdateStrategy: AppUpdateStrategy
  /** 首页快捷导航在移动端吸附的侧边 */
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
  densityMode: 'comfortable',
  contrastMode: 'normal',
  textureLevel: 'subtle',
  backgroundEffect: {
    type: 'none',
    density: 0.5,
    speed: 1,
    color: '',
    opacity: 0.6,
  },
  mascotBackground: {
    enabled: false,
    density: 1,
    speed: 1,
    opacity: 0.85,
  },
  deskPet: {
    enabled: false,
    scale: 1,
    speechEnabled: true,
    autoHeroInteraction: true,
    followSensitivity: 1,
  },
  appUpdateStrategy: 'public-idle-refresh',
  homeQuickNavSide: 'right',
}

function createDefaultSettings(): Settings {
  return {
    ...defaultSettings,
    backgroundEffect: { ...defaultSettings.backgroundEffect },
    mascotBackground: { ...defaultSettings.mascotBackground },
    deskPet: { ...defaultSettings.deskPet },
  }
}

function normalizePrivacySettings(target: Settings): void {
  if (target.cookieConsent !== true) {
    target.analyticsEnabled = false
    target.performanceCookiesEnabled = false
  }
}

type SettingsHydrationSnapshot = Settings & {
  uiStyle?: LegacyUiStyleSnapshot
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
  target.densityMode = ['compact', 'comfortable', 'spacious'].includes(target.densityMode)
    ? target.densityMode
    : 'comfortable'
  target.contrastMode = target.contrastMode === 'high' ? 'high' : 'normal'
  target.textureLevel = ['off', 'subtle', 'rich'].includes(target.textureLevel)
    ? target.textureLevel
    : 'subtle'

  if ('uiStyle' in target) {
    delete target.uiStyle
  }
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<Settings>(createDefaultSettings())

    // 一次性兼容迁移：补全旧版本持久化数据中缺失的新字段
    // pinia-plugin-persistedstate 在 store 创建后恢复数据，
    // 使用 nextTick 确保持久化数据已写入 ref
    nextTick(() => {
      if (!settings.value.appearancePreset)
        settings.value.appearancePreset = DEFAULT_APPEARANCE_PRESET
      if (!settings.value.densityMode) settings.value.densityMode = 'comfortable'
      if (!settings.value.contrastMode) settings.value.contrastMode = 'normal'
      if (!settings.value.textureLevel) settings.value.textureLevel = 'subtle'
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
      if (!settings.value.backgroundEffect) {
        settings.value.backgroundEffect = { ...defaultSettings.backgroundEffect }
      }
      if (!settings.value.mascotBackground) {
        settings.value.mascotBackground = { ...defaultSettings.mascotBackground }
      }
      if (!settings.value.deskPet) {
        settings.value.deskPet = {
          ...defaultSettings.deskPet,
        }
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

      settings.value.mascotBackground = {
        ...defaultSettings.mascotBackground,
        ...settings.value.mascotBackground,
      }
      settings.value.deskPet = {
        ...defaultSettings.deskPet,
        ...settings.value.deskPet,
      }

      settings.value.mascotBackground.density = Math.min(
        1.6,
        Math.max(0.4, settings.value.mascotBackground.density)
      )
      settings.value.mascotBackground.speed = Math.min(
        1.8,
        Math.max(0.6, settings.value.mascotBackground.speed)
      )
      settings.value.mascotBackground.opacity = Math.min(
        1,
        Math.max(0.3, settings.value.mascotBackground.opacity)
      )

      settings.value.deskPet.scale = Math.min(1.5, Math.max(0.8, settings.value.deskPet.scale))
      settings.value.deskPet.followSensitivity = Math.min(
        1.8,
        Math.max(0.5, settings.value.deskPet.followSensitivity)
      )
      settings.value.appUpdateStrategy = [
        'prompt-only',
        'public-idle-refresh',
        'aggressive-idle-refresh',
      ].includes(settings.value.appUpdateStrategy)
        ? settings.value.appUpdateStrategy
        : defaultSettings.appUpdateStrategy

      normalizeAppearanceSettings(settings.value)
      normalizePrivacySettings(settings.value)
    })

    /**
     * 计算实际的动效时长倍数
     * none: 0 (无动效)
     * reduced: 0.5 (减半)
     * normal: 1 (正常)
     * full: 1.2 (增强)
     */
    const animationDurationMultiplier = computed(() => {
      const multipliers: Record<AnimationIntensity, number> = {
        none: 0,
        reduced: 0.5,
        normal: 1,
        full: 1.2,
      }
      return multipliers[settings.value.animationIntensity]
    })

    /**
     * 是否应该播放动画
     */
    const shouldAnimate = computed(() => {
      return settings.value.enableAnimations && settings.value.animationIntensity !== 'none'
    })

    /**
     * 是否使用减弱动效（用于 prefers-reduced-motion 兼容）
     */
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
      // 如果设置为 none，同时禁用动画
      if (intensity === 'none') {
        settings.value.enableAnimations = false
      } else if (!settings.value.enableAnimations) {
        settings.value.enableAnimations = true
      }
    }

    function setAppearancePreset(preset: AppearancePreset) {
      settings.value.appearancePreset = normalizeAppearancePreset(preset)
    }

    function setDensityMode(mode: DensityMode) {
      settings.value.densityMode = mode
    }

    function setContrastMode(mode: ContrastMode) {
      settings.value.contrastMode = mode
    }

    function setTextureLevel(level: TextureLevel) {
      settings.value.textureLevel = level
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

    function setBackgroundEffect(config: Partial<ParticleEffectConfig>) {
      settings.value.backgroundEffect = {
        ...settings.value.backgroundEffect,
        ...config,
      }
    }

    function setMascotBackground(config: Partial<MascotBackgroundConfig>) {
      const next = {
        ...settings.value.mascotBackground,
        ...config,
      }
      next.density = Math.min(1.6, Math.max(0.4, next.density))
      next.speed = Math.min(1.8, Math.max(0.6, next.speed))
      next.opacity = Math.min(1, Math.max(0.3, next.opacity))
      settings.value.mascotBackground = next
    }

    function setDeskPet(config: Partial<DeskPetConfig>) {
      const next = {
        ...settings.value.deskPet,
        ...config,
      }
      next.scale = Math.min(1.5, Math.max(0.8, next.scale))
      next.followSensitivity = Math.min(1.8, Math.max(0.5, next.followSensitivity))
      settings.value.deskPet = next
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
      setDensityMode,
      setContrastMode,
      setTextureLevel,
      setCookieConsent,
      setAnalyticsEnabled,
      setPerformanceCookiesEnabled,
      setBackgroundEffect,
      setMascotBackground,
      setDeskPet,
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
