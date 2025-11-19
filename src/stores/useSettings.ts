/**
 * 用户设置状态管理
 * v3.0 - 安全增强版
 * - 使用安全存储
 * - 防止竞态条件
 * - 支持 localStorage 和服务器同步
 * - 增强浏览器兼容性
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import { handleError } from '@/utils/error'
import logger from '@/utils/logger'
import { secureLocalStorage } from '@/utils/secureStorage'
import { useAuthStore } from './useAuth'
import { useToastStore } from './useToast'

export interface UserSettings {
  // 显示设置
  showHeroSection: boolean

  // 界面设置
  postsPerPage: number
  enableAnimations: boolean

  // 其他设置
  enableSwipeNavigation: boolean
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
  enableSwipeNavigation: true,
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
  // 设置日志上下文
  const logContext = { category: 'SettingsStore' }

  // 操作锁，防止竞态条件
  let syncInProgress = false
  let loadInProgress = false

  // ==================== 状态 ====================
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })
  const syncing = ref(false)
  const lastSyncedAt = ref<Date | null>(null)
  const error = ref<string | null>(null)

  // ==================== Actions ====================

  /**
   * 初始化设置（从安全存储加载）
   */
  async function initSettings() {
    try {
      const saved = await secureLocalStorage.get<UserSettings>('user-settings', {
        silent: true,
      })

      if (saved) {
        settings.value = { ...DEFAULT_SETTINGS, ...saved }
        logger.debug('Settings loaded from secure storage', logContext)
      } else {
        logger.debug('Using default settings', logContext)
      }
    } catch (err) {
      logger.error('Failed to load user settings', {
        ...logContext,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      settings.value = { ...DEFAULT_SETTINGS }
    }
  }

  /**
   * 保存设置到安全存储
   */
  async function saveSettings() {
    try {
      await secureLocalStorage.set('user-settings', settings.value, {
        silent: true,
      })
      logger.debug('Settings saved to secure storage', logContext)
    } catch (err) {
      logger.error('Failed to save settings', {
        ...logContext,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  /**
   * 同步到服务器
   */
  async function syncToServer() {
    const authStore = useAuthStore()
    const toastStore = useToastStore()

    if (!authStore.isAuthenticated) {
      logger.warn('Cannot sync to server: user not authenticated', logContext)
      return false
    }

    // 防止重复同步
    if (syncInProgress) {
      logger.warn('Sync already in progress', logContext)
      return false
    }

    syncInProgress = true

    try {
      syncing.value = true
      error.value = null

      const { enableSwipeNavigation, ...serverSettings } = settings.value
      void enableSwipeNavigation // excluded from server payload but kept for type safety

      await api.patch('/preferences', serverSettings)
      lastSyncedAt.value = new Date()

      logger.info('Settings synced to server successfully', logContext)
      return true
    } catch (err) {
      const errorResponse = handleError(err, 'SettingsStore.SyncToServer', {
        silent: true, // Don't show toast here, we'll handle it below
      })
      error.value = errorResponse.message
      toastStore.error('Failed to sync settings to server', 'Settings')
      return false
    } finally {
      syncing.value = false
      syncInProgress = false
    }
  }

  /**
   * 从服务器加载设置
   */
  async function loadFromServer() {
    const authStore = useAuthStore()
    const toastStore = useToastStore()

    if (!authStore.isAuthenticated) {
      logger.warn('Cannot load from server: user not authenticated', logContext)
      return false
    }

    // 防止重复加载
    if (loadInProgress) {
      logger.warn('Load already in progress', logContext)
      return false
    }

    loadInProgress = true

    try {
      syncing.value = true
      error.value = null

      const data = await api.get<Partial<UserSettings> & { updatedAt?: string }>('/preferences', {
        cache: false,
      })

      if (data) {
        settings.value = { ...DEFAULT_SETTINGS, ...data }
        await saveSettings()
        if (data.updatedAt) {
          lastSyncedAt.value = new Date(data.updatedAt)
        } else {
          lastSyncedAt.value = new Date()
        }
        logger.info('Settings loaded from server successfully', logContext)
        return true
      }
      return false
    } catch (err) {
      const errorResponse = handleError(err, 'SettingsStore.LoadFromServer', {
        silent: true, // Don't show toast here, we'll handle it below
      })
      error.value = errorResponse.message
      toastStore.warning('Failed to load settings from server, using local settings', 'Settings')
      return false
    } finally {
      syncing.value = false
      loadInProgress = false
    }
  }

  /**
   * 更新单个设置
   */
  async function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    try {
      settings.value[key] = value
      await saveSettings()

      logger.debug('Setting updated', { ...logContext, key })

      // 如果已登录，同步到服务器（防抖处理由调用方控制）
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        await syncToServer()
      }
    } catch (err) {
      logger.error('Failed to update setting', {
        ...logContext,
        key,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  /**
   * 切换布尔值设置
   */
  async function toggleSetting(key: keyof UserSettings) {
    try {
      const currentValue = settings.value[key]
      if (typeof currentValue === 'boolean') {
        ;(settings.value[key] as boolean) = !currentValue
        await saveSettings()

        logger.debug('Setting toggled', { ...logContext, key })

        // 如果已登录，同步到服务器
        const authStore = useAuthStore()
        if (authStore.isAuthenticated) {
          await syncToServer()
        }
      }
    } catch (err) {
      logger.error('Failed to toggle setting', {
        ...logContext,
        key,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  /**
   * 重置所有设置
   */
  async function resetSettings() {
    try {
      settings.value = { ...DEFAULT_SETTINGS }
      await saveSettings()
      logger.info('Settings reset to defaults', logContext)
    } catch (err) {
      logger.error('Failed to reset settings', {
        ...logContext,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  /**
   * 导出设置
   */
  function exportSettings() {
    try {
      const exported = JSON.stringify(settings.value, null, 2)
      logger.debug('Settings exported', logContext)
      return exported
    } catch (err) {
      logger.error('Failed to export settings', {
        ...logContext,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      return '{}'
    }
  }

  /**
   * 导入设置
   */
  async function importSettings(settingsJson: string) {
    try {
      const imported = JSON.parse(settingsJson)
      settings.value = { ...DEFAULT_SETTINGS, ...imported }
      await saveSettings()
      logger.info('Settings imported successfully', logContext)
      return true
    } catch (err) {
      logger.error('Failed to import settings', {
        ...logContext,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      return false
    }
  }

  return {
    settings,
    syncing,
    lastSyncedAt,
    error,
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
