/**
 * Service Worker 更新检测器
 * 自动检测并提示用户更新应用
 */

import { useToastStore } from '@/stores/toast'
import { reportClientError, reportClientEvent } from './clientReporter'

let isInitialized = false
let isChecking = false
let lastNotifiedScriptUrl: string | null = null
const SW_UPDATE_DEBUG = import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true'
const AUTH_ROUTE_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
])
const AUTH_ROUTE_RELOAD_GUARD_KEY = '__auth_route_sw_reload_controller__'
let checkIntervalId: ReturnType<typeof setInterval> | null = null
let visibilityHandler: (() => void) | null = null
let controllerChangeHandler: (() => void) | null = null
let initToken = 0

export interface SwUpdateOptions {
  /** 检查更新的间隔时间（毫秒），默认 30 分钟 */
  checkInterval?: number
  /** 是否在检测到更新时自动刷新，默认 false */
  autoRefresh?: boolean
  /** 是否显示更新提示，默认 true */
  showToast?: boolean
}

let reloadPageImpl = () => {
  window.location.reload()
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}

function isAuthRoutePath(pathname: string): boolean {
  return AUTH_ROUTE_PATHS.has(normalizePathname(pathname))
}

function isCurrentAuthRoute(): boolean {
  if (typeof window === 'undefined') return false
  return isAuthRoutePath(window.location.pathname)
}

function activateWaitingWorker(registration: ServiceWorkerRegistration): boolean {
  if (!registration.waiting) return false

  lastNotifiedScriptUrl = registration.waiting.scriptURL || null
  registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  return true
}

export function reloadPageForSwActivation(): void {
  reloadPageImpl()
}

export function setReloadPageForSwActivationForTest(fn: (() => void) | null): void {
  reloadPageImpl =
    fn ||
    (() => {
      window.location.reload()
    })
}

function reloadAuthRouteOnceForController(): boolean {
  if (typeof window === 'undefined' || !isCurrentAuthRoute()) {
    return false
  }

  const controllerScriptUrl = navigator.serviceWorker.controller?.scriptURL
  if (!controllerScriptUrl) {
    return false
  }

  try {
    if (sessionStorage.getItem(AUTH_ROUTE_RELOAD_GUARD_KEY) === controllerScriptUrl) {
      return false
    }
    sessionStorage.setItem(AUTH_ROUTE_RELOAD_GUARD_KEY, controllerScriptUrl)
  } catch (error) {
    if (SW_UPDATE_DEBUG) {
      console.warn('[SW Update] Failed to persist auth-route reload guard:', error)
    }
    return false
  }

  reportClientEvent('sw.update.auth_route_reloaded', {
    scriptUrl: controllerScriptUrl,
  })
  reloadPageForSwActivation()
  return true
}

/**
 * 清理更新检测器（移除监听器/定时器）
 */
export function disposeSwUpdateChecker(): void {
  if (!isInitialized) return
  initToken += 1

  if (checkIntervalId) {
    clearInterval(checkIntervalId)
    checkIntervalId = null
  }

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }

  if (controllerChangeHandler && 'serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
    controllerChangeHandler = null
  }

  isInitialized = false
  isChecking = false
  lastNotifiedScriptUrl = null
}

/**
 * 初始化 Service Worker 更新检测
 */
export function initSwUpdateChecker(options: SwUpdateOptions = {}): void {
  if (isInitialized) return
  isInitialized = true
  const token = ++initToken
  const {
    checkInterval = 30 * 60 * 1000, // 30 分钟
    autoRefresh = false,
    showToast = true,
  } = options

  if (!('serviceWorker' in navigator)) {
    if (SW_UPDATE_DEBUG) {
      console.warn('[SW Update] Service Worker not supported')
    }
    reportClientEvent('sw.update.unsupported')
    return
  }

  // 等待 SW 就绪后再开始检查，避免无效状态噪音
  navigator.serviceWorker.ready
    .then(() => {
      if (!isInitialized || token !== initToken) return
      // 监听 SW 激活
      controllerChangeHandler = () => {
        if (SW_UPDATE_DEBUG) {
          console.log('[SW Update] New service worker activated')
        }
        reportClientEvent('sw.update.activated')
        if (reloadAuthRouteOnceForController()) {
          return
        }
        if (autoRefresh) {
          window.dispatchEvent(new CustomEvent('sw:refresh-suggested'))
        }
      }
      navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)

      // 定期检查更新
      checkIntervalId = setInterval(() => {
        checkForUpdates(showToast)
      }, checkInterval)

      // 页面可见时检查更新
      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          checkForUpdates(showToast)
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)

      // 初始检查
      checkForUpdates(showToast)
    })
    .catch(() => {
      reportClientEvent('sw.update.ready_failed', undefined, { severity: 'warn' })
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
    if (registration.waiting && isCurrentAuthRoute()) {
      const scriptUrl = registration.waiting.scriptURL || 'waiting'
      const isFirstSeen = lastNotifiedScriptUrl !== scriptUrl
      const activated = activateWaitingWorker(registration)
      if (activated) {
        if (isFirstSeen) {
          reportClientEvent('sw.update.available', {
            scriptUrl,
            strategy: 'auth-route-immediate',
          })
        }
        return
      }
    }

    if (registration.waiting && showToast) {
      const scriptUrl = registration.waiting.scriptURL || 'waiting'
      if (lastNotifiedScriptUrl !== scriptUrl) {
        lastNotifiedScriptUrl = scriptUrl
        if (SW_UPDATE_DEBUG) {
          console.log('[SW Update] Update available')
        }
        reportClientEvent('sw.update.available', {
          scriptUrl,
        })
        showUpdateToast()
      }
    }
  } catch (error) {
    if (SW_UPDATE_DEBUG) {
      console.error('[SW Update] Check failed:', error)
    }
    reportClientError('sw.update.check_failed', error)
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
          if (registration?.waiting && activateWaitingWorker(registration)) {
            // bfcache 友好：避免强制 reload，交由后续导航自然应用新版本
            toastStore.success('新版本已激活，将在下次导航自动生效')
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
