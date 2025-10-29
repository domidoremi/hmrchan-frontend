/**
 * 用户设置状态管理
 * 支持 localStorage 和服务器同步
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { api } from '@/api/client'

export interface UserSettings {
  // 显示设置
  showHeroSection: boolean

  // 界面设置
  postsPerPage: number
  enableAnimations: boolean

  // 其他设置
  autoPlayVideos: boolean
  showImagePreviews: boolean

  // 隐私设置
  cookieConsent: boolean | null // null = 未选择, true = 接受, false = 拒绝
  analyticsEnabled: boolean
  functionalCookiesEnabled: boolean
  performanceCookiesEnabled: boolean

  // 数据偏好
  dataCollection: boolean
  personalizedContent: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  showHeroSection: true,
  postsPerPage: 20,
  enableAnimations: true,
  autoPlayVideos: false,
  showImagePreviews: true,

  // 隐私默认值
  cookieConsent: null,
  analyticsEnabled: false,
  functionalCookiesEnabled: true, // 必需的功能性 cookies
  performanceCookiesEnabled: false,

  // 数据默认值
  dataCollection: false,
  personalizedContent: false,
}

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })
  const syncing = ref(false)
  const lastSyncedAt = ref<Date | null>(null)

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

  // 同步到服务器
  async function syncToServer() {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      return false
    }

    try {
      syncing.value = true
      await api.put('/preferences', settings.value)
      lastSyncedAt.value = new Date()
      return true
    } catch (error) {
      console.error('Failed to sync settings to server:', error)
      return false
    } finally {
      syncing.value = false
    }
  }

  // 从服务器加载设置
  async function loadFromServer() {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      return false
    }

    try {
      syncing.value = true
      const data = await api.get('/preferences', { cache: false })
      if (data) {
        settings.value = { ...DEFAULT_SETTINGS, ...data }
        saveSettings()
        lastSyncedAt.value = new Date(data.updatedAt)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to load settings from server:', error)
      return false
    } finally {
      syncing.value = false
    }
  }

  // 更新单个设置
  async function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    settings.value[key] = value
    saveSettings()

    // 如果已登录，同步到服务器
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      await syncToServer()
    }
  }

  // 切换布尔值设置
  async function toggleSetting(key: keyof UserSettings) {
    const currentValue = settings.value[key]
    if (typeof currentValue === 'boolean') {
      ;(settings.value[key] as boolean) = !currentValue
      saveSettings()

      // 如果已登录，同步到服务器
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        await syncToServer()
      }
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
    syncing,
    lastSyncedAt,
    initSettings,
    updateSetting,
    toggleSetting,
    resetSettings,
    exportSettings,
    importSettings,
    syncToServer,
    loadFromServer,
  }
})
