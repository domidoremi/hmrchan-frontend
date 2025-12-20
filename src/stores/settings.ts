/**
 * Settings Store - 用户设置状态管理
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Settings {
  showHeroSection: boolean
  enableAnimations: boolean
  enableSwipeNavigation: boolean
  postsPerPage: number
  defaultSort: 'newest' | 'popular' | 'trending'
}

const defaultSettings: Settings = {
  showHeroSection: true,
  enableAnimations: true,
  enableSwipeNavigation: true,
  postsPerPage: 20,
  defaultSort: 'newest',
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<Settings>({ ...defaultSettings })

    function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
      settings.value[key] = value
    }

    function toggleSetting(
      key: keyof Pick<Settings, 'showHeroSection' | 'enableAnimations' | 'enableSwipeNavigation'>
    ) {
      settings.value[key] = !settings.value[key]
    }

    function resetSettings() {
      settings.value = { ...defaultSettings }
    }

    return {
      settings,
      updateSetting,
      toggleSetting,
      resetSettings,
    }
  },
  {
    persist: true,
  }
)
