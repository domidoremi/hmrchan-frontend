/**
 * Settings Store - 用户设置状态管理
 */

import { ref, computed, nextTick } from 'vue'
import { defineStore } from 'pinia'

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

export interface Settings {
  showHeroSection: boolean
  enableAnimations: boolean
  enableSwipeNavigation: boolean
  postsPerPage: number
  defaultSort: 'newest' | 'popular' | 'trending'
  /** 动效强度：none=无动效, reduced=减弱, normal=正常, full=完整 */
  animationIntensity: AnimationIntensity
  /** 帖子详情视图模式：stream=流媒体，data=数据展示 */
  postDetailViewMode: 'stream' | 'data'
  /** UI 风格（默认圆润；可切换棱角） */
  uiStyle: UiStyle
  /** 全局背景粒子效果 */
  backgroundEffect: ParticleEffectConfig
  /** 是否显示桌宠 */
  showDeskPet: boolean
}

const defaultSettings: Settings = {
  showHeroSection: true,
  enableAnimations: true,
  enableSwipeNavigation: true,
  postsPerPage: 20,
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
  showDeskPet: true,
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<Settings>({ ...defaultSettings })

    // 一次性兼容迁移：补全旧版本持久化数据中缺失的新字段
    // pinia-plugin-persistedstate 在 store 创建后恢复数据，
    // 使用 nextTick 确保持久化数据已写入 ref
    nextTick(() => {
      if (!settings.value.uiStyle) settings.value.uiStyle = 'ios'
      if (!settings.value.backgroundEffect) {
        settings.value.backgroundEffect = { ...defaultSettings.backgroundEffect }
      }
      if (settings.value.showDeskPet === undefined) {
        settings.value.showDeskPet = defaultSettings.showDeskPet
      }
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

    function setBackgroundEffect(config: Partial<ParticleEffectConfig>) {
      settings.value.backgroundEffect = {
        ...settings.value.backgroundEffect,
        ...config,
      }
    }

    function resetSettings() {
      settings.value = {
        ...defaultSettings,
        backgroundEffect: { ...defaultSettings.backgroundEffect },
      }
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
      setBackgroundEffect,
      resetSettings,
    }
  },
  {
    persist: true,
  }
)
