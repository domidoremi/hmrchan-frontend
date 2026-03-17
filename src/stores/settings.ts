/**
 * Settings Store - 用户设置状态管理
 */

import { ref, computed, nextTick } from 'vue'
import { defineStore } from 'pinia'
import type { UserPreferences } from '@/api/preferencesService'

export type AnimationIntensity = 'none' | 'reduced' | 'normal' | 'full'
export type UiStyle = 'ios' | 'material'

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
  /** UI 风格（默认圆润；可切换棱角） */
  uiStyle: UiStyle
  /** 全局背景粒子效果 */
  backgroundEffect: ParticleEffectConfig
  /** 吉祥物飞行背景 */
  mascotBackground: MascotBackgroundConfig
  /** 桌宠配置 */
  deskPet: DeskPetConfig
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
  uiStyle: 'ios',
  backgroundEffect: {
    type: 'none',
    density: 0.5,
    speed: 1,
    color: '',
    opacity: 0.6,
  },
  mascotBackground: {
    enabled: true,
    density: 1,
    speed: 1,
    opacity: 0.85,
  },
  deskPet: {
    enabled: true,
    scale: 1,
    speechEnabled: true,
    autoHeroInteraction: true,
    followSensitivity: 1,
  },
}

function createDefaultSettings(): Settings {
  return {
    ...defaultSettings,
    backgroundEffect: { ...defaultSettings.backgroundEffect },
    mascotBackground: { ...defaultSettings.mascotBackground },
    deskPet: { ...defaultSettings.deskPet },
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
      if (!settings.value.uiStyle) settings.value.uiStyle = 'ios'
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
        const legacyShowDeskPet = (settings.value as Settings & { showDeskPet?: boolean })
          .showDeskPet
        settings.value.deskPet = {
          ...defaultSettings.deskPet,
          enabled:
            legacyShowDeskPet === undefined ? defaultSettings.deskPet.enabled : legacyShowDeskPet,
        }
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

    function setUiStyle(style: UiStyle) {
      settings.value.uiStyle = style
    }

    function setCookieConsent(value: boolean | null) {
      settings.value.cookieConsent = value

      if (value !== true) {
        settings.value.analyticsEnabled = false
        settings.value.performanceCookiesEnabled = false
      }
    }

    function setAnalyticsEnabled(enabled: boolean) {
      settings.value.analyticsEnabled = enabled

      if (enabled) {
        settings.value.cookieConsent = true
        settings.value.performanceCookiesEnabled = true
      } else {
        settings.value.performanceCookiesEnabled = false
      }
    }

    function setPerformanceCookiesEnabled(enabled: boolean) {
      settings.value.performanceCookiesEnabled = enabled

      if (enabled) {
        settings.value.cookieConsent = true
        settings.value.analyticsEnabled = true
      }
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
      updateSetting,
      toggleSetting,
      setAnimationIntensity,
      setUiStyle,
      setCookieConsent,
      setAnalyticsEnabled,
      setPerformanceCookiesEnabled,
      setBackgroundEffect,
      setMascotBackground,
      setDeskPet,
      applyPreferences,
      exportPreferences,
      resetSettings,
    }
  },
  {
    persist: true,
  }
)
