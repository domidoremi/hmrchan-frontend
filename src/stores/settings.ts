/**
 * Settings Store - 用户设置状态管理
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type AnimationIntensity = 'none' | 'reduced' | 'normal' | 'full'

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
}

const defaultSettings: Settings = {
  showHeroSection: true,
  enableAnimations: true,
  enableSwipeNavigation: true,
  postsPerPage: 20,
  defaultSort: 'newest',
  animationIntensity: 'normal',
  postDetailViewMode: 'stream',
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<Settings>({ ...defaultSettings })

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

    function resetSettings() {
      settings.value = { ...defaultSettings }
    }

    return {
      settings,
      animationDurationMultiplier,
      shouldAnimate,
      prefersReducedMotion,
      updateSetting,
      toggleSetting,
      setAnimationIntensity,
      resetSettings,
    }
  },
  {
    persist: true,
  }
)
