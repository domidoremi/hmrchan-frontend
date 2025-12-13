/**
 * 用户设置状态管理
 *
 * 功能说明：
 * - 管理用户偏好设置（显示、界面、隐私等）
 * - 支持本地存储和服务器同步
 * - 使用安全存储保存设置
 * - 防止并发操作的竞态条件
 * - 支持设置导入导出
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { services } from '@/api/services'
import { handleError } from '@/utils'
import { logger } from '@/utils/logger'
import { secureLocalStorage } from '@/utils/secureStorage'
import { useAuthStore } from './useAuth'
import { useToastStore } from './useToast'

/**
 * 用户设置接口定义
 */
export interface UserSettings {
  /** 是否显示首页横幅区域 */
  showHeroSection: boolean

  /** 每页显示的内容数量 */
  postsPerPage: number

  /** 是否启用动画效果 */
  enableAnimations: boolean

  /** 是否启用滑动导航 */
  enableSwipeNavigation: boolean

  /** 是否自动播放视频 */
  autoPlayVideos: boolean

  /** 是否显示图片预览 */
  showImagePreviews: boolean

  /** Cookie 同意状态（null=未选择, true=接受, false=拒绝） */
  cookieConsent: boolean | null

  /** 是否启用分析统计 */
  analyticsEnabled: boolean

  /** 是否启用功能性 Cookie */
  functionalCookiesEnabled: boolean

  /** 是否启用性能 Cookie */
  performanceCookiesEnabled: boolean

  /** 是否允许数据收集 */
  dataCollection: boolean

  /** 是否启用个性化内容 */
  personalizedContent: boolean
}

/** 默认设置值 */
const DEFAULT_SETTINGS: UserSettings = Object.freeze({
  showHeroSection: true,
  postsPerPage: 20,
  enableAnimations: true,
  enableSwipeNavigation: true,
  autoPlayVideos: false,
  showImagePreviews: true,
  cookieConsent: null,
  analyticsEnabled: false,
  functionalCookiesEnabled: true,
  performanceCookiesEnabled: false,
  dataCollection: false,
  personalizedContent: false,
}) as UserSettings

export const useSettingsStore = defineStore('settings', () => {
  /** 日志上下文 */
  const logContext = { category: 'SettingsStore' }

  /** 同步操作进行中标志 */
  let syncInProgress = false

  /** 加载操作进行中标志 */
  let loadInProgress = false

  /** 用户设置 */
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })

  /** 同步状态 */
  const syncing = ref(false)

  /** 最后一次同步时间 */
  const lastSyncedAt = ref<Date | null>(null)

  /** 错误信息 */
  const error = ref<string | null>(null)

  /**
   * 初始化设置
   *
   * 从安全存储加载用户设置，如果不存在则使用默认值
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
   * 同步设置到服务器
   *
   * @returns 同步是否成功
   */
  async function syncToServer() {
    const authStore = useAuthStore()
    const toastStore = useToastStore()

    if (!authStore.isAuthenticated) {
      logger.warn('Cannot sync to server: user not authenticated', logContext)
      return false
    }

    if (syncInProgress) {
      logger.warn('Sync already in progress', logContext)
      return false
    }

    syncInProgress = true

    try {
      syncing.value = true
      error.value = null

      const { enableSwipeNavigation, ...serverSettings } = settings.value
      void enableSwipeNavigation

      await services.preferences.updatePreferences(
        serverSettings as unknown as Record<string, unknown>,
      )
      lastSyncedAt.value = new Date()

      logger.info('Settings synced to server successfully', logContext)
      return true
    } catch (err) {
      const errorResponse = handleError(err, 'SettingsStore.SyncToServer', {
        silent: true,
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
   *
   * @returns 加载是否成功
   */
  async function loadFromServer() {
    const authStore = useAuthStore()
    const toastStore = useToastStore()

    if (!authStore.isAuthenticated) {
      logger.warn('Cannot load from server: user not authenticated', logContext)
      return false
    }

    if (loadInProgress) {
      logger.warn('Load already in progress', logContext)
      return false
    }

    loadInProgress = true

    try {
      syncing.value = true
      error.value = null

      const data = (await services.preferences.getPreferences()) as Partial<UserSettings> & {
        updatedAt?: string
      }

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
        silent: true,
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
   *
   * @param key - 设置项的键名
   * @param value - 新的设置值
   */
  async function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    try {
      settings.value[key] = value
      await saveSettings()

      logger.debug('Setting updated', { ...logContext, key })

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
   *
   * @param key - 设置项的键名
   */
  async function toggleSetting(key: keyof UserSettings) {
    try {
      const currentValue = settings.value[key]
      if (typeof currentValue === 'boolean') {
        ;(settings.value[key] as boolean) = !currentValue
        await saveSettings()

        logger.debug('Setting toggled', { ...logContext, key })

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
   *
   * 恢复到默认设置值
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
   *
   * @returns JSON 格式的设置字符串
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
   *
   * @param settingsJson - JSON 格式的设置字符串
   * @returns 导入是否成功
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
