/**
 * Service Worker 更新检测器
 * 自动检测并提示用户更新应用
 */

import { useToastStore } from '@/stores/toast'

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
export function initSwUpdateChecker(options: SwUpdateOptions = {}) {
  const {
    checkInterval = 30 * 60 * 1000, // 30 分钟
    autoRefresh = false,
    showToast = true,
  } = options

  if (!('serviceWorker' in navigator)) {
    console.warn('[SW Update] Service Worker not supported')
    return
  }

  // 监听 SW 更新
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW Update] New service worker activated')

    if (autoRefresh) {
      window.location.reload()
    } else if (showToast) {
      showUpdateToast()
    }
  })

  // 定期检查更新
  setInterval(() => {
    checkForUpdates()
  }, checkInterval)

  // 页面可见时检查更新
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates()
    }
  })

  // 初始检查
  checkForUpdates()
}

/**
 * 检查 Service Worker 更新
 */
async function checkForUpdates() {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return

    // 手动触发更新检查
    await registration.update()

    // 如果有等待中的 SW，提示用户
    if (registration.waiting) {
      console.log('[SW Update] Update available')
      showUpdateToast()
    }
  } catch (error) {
    console.error('[SW Update] Check failed:', error)
  }
}

/**
 * 显示更新提示
 */
function showUpdateToast() {
  const toastStore = useToastStore()

  // Toast store doesn't support action buttons, use long duration instead
  const toastId = toastStore.info('发现新版本，请刷新页面以更新', 0)

  // Auto-trigger update after showing toast
  setTimeout(() => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        // Remove toast before reload
        toastStore.removeToast(toastId)
      }
    })
  }, 3000)
}

/**
 * 强制清除所有缓存（调试用）
 */
export async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((name) => caches.delete(name)))
    console.log('[SW Update] All caches cleared')
    return true
  } catch (error) {
    console.error('[SW Update] Clear caches failed:', error)
    return false
  }
}

/**
 * 注销 Service Worker（调试用）
 */
export async function unregisterServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.unregister()
      console.log('[SW Update] Service Worker unregistered')
      return true
    }
    return false
  } catch (error) {
    console.error('[SW Update] Unregister failed:', error)
    return false
  }
}
