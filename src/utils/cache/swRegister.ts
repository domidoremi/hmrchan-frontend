/**
 * Service Worker 注册与生命周期管理
 */

const SW_PATH = '/sw.js'

function buildSwConfig(): { apiBase: string; apiHostnames: string[] } {
  const apiBase =
    import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
  const hostnames = new Set<string>()

  try {
    if (apiBase.startsWith('http')) {
      hostnames.add(new URL(apiBase).hostname)
    }
  } catch {
    // ignore
  }

  // Fallback to current origin if API base is relative
  if (!hostnames.size && typeof window !== 'undefined') {
    hostnames.add(window.location.hostname)
  }

  return { apiBase, apiHostnames: Array.from(hostnames) }
}

function postConfigToSW(registration: ServiceWorkerRegistration): void {
  const message = { type: 'CONFIG', payload: buildSwConfig() }
  if (registration.active) {
    registration.active.postMessage(message)
    return
  }
  navigator.serviceWorker.controller?.postMessage(message)
}

interface SWRegistrationResult {
  success: boolean
  registration?: ServiceWorkerRegistration
  error?: Error
}

/**
 * 注册 Service Worker
 * 仅在生产环境且支持 SW 的浏览器中注册
 */
export async function registerServiceWorker(): Promise<SWRegistrationResult> {
  if (!('serviceWorker' in navigator)) {
    return { success: false, error: new Error('Service Worker not supported') }
  }

  // 开发环境跳过 SW（避免缓存干扰开发）
  if (import.meta.env.DEV) {
    return { success: false }
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
      updateViaCache: 'none',
    })
    // 向 SW 发送运行时配置
    postConfigToSW(registration)

    // 监听更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 新版本可用，通知用户
          dispatchSWUpdateEvent()
        }
      })
    })

    // 立即检查更新
    registration.update().catch(() => {
      // 静默失败
    })

    // 确保 ready 后再次发送配置（防止首次控制权为空）
    navigator.serviceWorker.ready.then((ready) => {
      postConfigToSW(ready)
    })

    return { success: true, registration }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * 注销 Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.unregister()
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * 通知 SW 跳过等待并立即激活
 */
export function skipWaiting(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
}

/**
 * 请求 SW 清理所有缓存
 */
export function clearSWCache(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' })
}

/**
 * 派发 SW 更新事件
 */
function dispatchSWUpdateEvent(): void {
  window.dispatchEvent(new CustomEvent('sw-update-available'))
}

/**
 * 监听 SW 更新
 */
export function onSWUpdate(callback: () => void): () => void {
  const handler = () => callback()
  window.addEventListener('sw-update-available', handler)
  return () => window.removeEventListener('sw-update-available', handler)
}
