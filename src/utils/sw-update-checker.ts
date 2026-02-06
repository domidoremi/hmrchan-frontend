/**
 * Service Worker 更新检测器
 * 自动检测并提示用户更新应用
 */

import { useToastStore } from '@/stores/toast'

let isInitialized = false
let isChecking = false
let lastNotifiedScriptUrl: string | null = null
const SW_UPDATE_DEBUG = import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true'

export interface SwUpdateOptions {
  /** 检查更新的间隔时间（毫秒），默认 30 分钟 */
  checkInterval?: number
  /** 是否在检测到更新时自动刷新，默认 false */
  autoRefresh?: boolean
  /** 是否显示更新提示，默认 true */
  showToast?: boolean
}

/**
 * 初始化 Service Worker 更新检测
 */
export function initSwUpdateChecker(options: SwUpdateOptions = {}): void {
  if (isInitialized) return
  isInitialized = true
  const {
    checkInterval = 30 * 60 * 1000, // 30 分钟
    autoRefresh = false,
    showToast = true,
  } = options

  if (!('serviceWorker' in navigator)) {
    if (SW_UPDATE_DEBUG) {
      console.warn('[SW Update] Service Worker not supported')
    }
    return
  }

  // 等待 SW 就绪后再开始检查，避免无效状态噪音
  navigator.serviceWorker.ready
    .then(() => {
      // 监听 SW 激活
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (SW_UPDATE_DEBUG) {
          console.log('[SW Update] New service worker activated')
        }
        if (autoRefresh) {
          window.location.reload()
        }
      })

      // 定期检查更新
      setInterval(() => {
        checkForUpdates(showToast)
      }, checkInterval)

      // 页面可见时检查更新
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdates(showToast)
        }
      })

      // 初始检查
      checkForUpdates(showToast)
    })
    .catch(() => {
      // ignore
    })
}

/**
 * 检查 Service Worker 更新
 */
async function checkForUpdates(showToast: boolean): Promise<void> {
  if (isChecking) return
  isChecking = true
  try {
    const registration =
      (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready)
    if (!registration) return

    // 检查 registration 状态是否有效
    if (!registration.active && !registration.installing && !registration.waiting) return

    // 手动触发更新检查
    try {
      await registration.update()
    } catch (error) {
      // 忽略 InvalidStateError，这通常发生在 SW 正在更新时
      if (isInvalidStateError(error)) {
        if (SW_UPDATE_DEBUG) {
          console.log('[SW Update] Update already in progress')
        }
        return
      }
      throw error
    }

    // 如果有等待中的 SW，提示用户
    if (registration.waiting && showToast) {
      const scriptUrl = registration.waiting.scriptURL || 'waiting'
      if (lastNotifiedScriptUrl !== scriptUrl) {
        lastNotifiedScriptUrl = scriptUrl
        if (SW_UPDATE_DEBUG) {
          console.log('[SW Update] Update available')
        }
        showUpdateToast()
      }
    }
  } catch (error) {
    if (SW_UPDATE_DEBUG) {
      console.error('[SW Update] Check failed:', error)
    }
  } finally {
    isChecking = false
  }
}

/**
 * Type guard for InvalidStateError
 */
function isInvalidStateError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'InvalidStateError'
}

/**
 * 显示更新提示
 */
function showUpdateToast(): void {
  const toastStore = useToastStore()

  toastStore.info('发现新版本，点击立即更新', 0, {
    title: '应用更新',
    action: {
      label: '立即更新',
      onClick: () => {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration?.waiting) {
            lastNotifiedScriptUrl = registration.waiting.scriptURL || null
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            // 等待新 SW 激活后刷新页面
            setTimeout(() => {
              window.location.reload()
            }, 500)
          }
        })
      },
    },
  })
}

/**
 * 强制清除所有缓存（调试用）
 */
export async function clearAllCaches(): Promise<boolean> {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((name) => caches.delete(name)))
    if (SW_UPDATE_DEBUG) {
      console.log('[SW Update] All caches cleared')
    }
    return true
  } catch (error) {
    if (SW_UPDATE_DEBUG) {
      console.error('[SW Update] Clear caches failed:', error)
    }
    return false
  }
}

/**
 * 注销 Service Worker（调试用）
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.unregister()
      if (SW_UPDATE_DEBUG) {
        console.log('[SW Update] Service Worker unregistered')
      }
      return true
    }
    return false
  } catch (error) {
    if (SW_UPDATE_DEBUG) {
      console.error('[SW Update] Unregister failed:', error)
    }
    return false
  }
}
