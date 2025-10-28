/**
 * 用户设置状态管理
 * 所有设置自动保存到localStorage
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserSettings {
  // 显示设置
  showHeroSection: boolean

  // 界面设置
  postsPerPage: number
  enableAnimations: boolean

  // 其他设置
  autoPlayVideos: boolean
  showImagePreviews: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  showHeroSection: true,
  postsPerPage: 20,
  enableAnimations: true,
  autoPlayVideos: false,
  showImagePreviews: true,
}

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })

  // 初始化设置（从localStorage加载）
  function initSettings() {
    const saved = localStorage.getItem('user-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        settings.value = { ...DEFAULT_SETTINGS, ...parsed }
      } catch (e) {
        console.error('Failed to parse user settings:', e)
        settings.value = { ...DEFAULT_SETTINGS }
      }
    }
  }

  // 保存设置到localStorage
  function saveSettings() {
    localStorage.setItem('user-settings', JSON.stringify(settings.value))
  }

  // 更新单个设置
  function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    settings.value[key] = value
    saveSettings()
  }

  // 切换布尔值设置
  function toggleSetting(key: keyof UserSettings) {
    const currentValue = settings.value[key]
    if (typeof currentValue === 'boolean') {
      ;(settings.value[key] as boolean) = !currentValue
      saveSettings()
    }
  }

  // 重置所有设置
  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS }
    saveSettings()
  }

  // 导出设置
  function exportSettings() {
    return JSON.stringify(settings.value, null, 2)
  }

  // 导入设置
  function importSettings(settingsJson: string) {
    try {
      const imported = JSON.parse(settingsJson)
      settings.value = { ...DEFAULT_SETTINGS, ...imported }
      saveSettings()
      return true
    } catch (e) {
      console.error('Failed to import settings:', e)
      return false
    }
  }

  return {
    settings,
    initSettings,
    updateSetting,
    toggleSetting,
    resetSettings,
    exportSettings,
    importSettings,
  }
})
