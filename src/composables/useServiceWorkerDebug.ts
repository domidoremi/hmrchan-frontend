/**
 * Service Worker Debug Composable
 * Provides reactive SW state and control methods
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { clearAllCaches, unregisterServiceWorker } from '@/utils/sw-update-checker'

export interface SwDebugState {
  status: string
  cacheVersion: string
  updateAvailable: boolean
  isSupported: boolean
}

export function useServiceWorkerDebug() {
  const swStatus = ref('未知')
  const cacheVersion = ref('未知')
  const updateAvailable = ref(false)
  const isSupported = 'serviceWorker' in navigator

  let intervalId: ReturnType<typeof setInterval> | null = null

  async function updateStatus() {
    if (!isSupported) {
      swStatus.value = '不支持'
      return
    }

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      swStatus.value = '未注册'
      return
    }

    if (registration.active) {
      swStatus.value = '已激活'
    } else if (registration.installing) {
      swStatus.value = '安装中'
    } else if (registration.waiting) {
      swStatus.value = '等待激活'
      updateAvailable.value = true
    }

    // Get cache version - use app name from env
    const cachePrefix = import.meta.env.VITE_APP_NAME?.toLowerCase() || 'app'
    const cacheNames = await caches.keys()
    const appCaches = cacheNames.filter((name) => name.startsWith(`${cachePrefix}-`))

    if (appCaches.length > 0) {
      cacheVersion.value = appCaches[0].split('-').pop() || '未知'
    }
  }

  async function checkUpdate() {
    if (!isSupported) return false

    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.update()
      await updateStatus()
      return true
    }
    return false
  }

  async function forceUpdate() {
    if (!isSupported) return false

    const registration = await navigator.serviceWorker.getRegistration()
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      setTimeout(() => window.location.reload(), 100)
      return true
    }
    return false
  }

  async function clearCaches() {
    const success = await clearAllCaches()
    if (success) {
      await updateStatus()
    }
    return success
  }

  async function unregister() {
    const success = await unregisterServiceWorker()
    if (success) {
      await updateStatus()
    }
    return success
  }

  function startPolling(interval = 5000) {
    if (intervalId) return

    updateStatus()
    intervalId = setInterval(updateStatus, interval)
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  // Auto cleanup on unmount
  onMounted(() => startPolling())
  onUnmounted(() => stopPolling())

  return {
    // State
    swStatus,
    cacheVersion,
    updateAvailable,
    isSupported,

    // Methods
    updateStatus,
    checkUpdate,
    forceUpdate,
    clearCaches,
    unregister,
    startPolling,
    stopPolling,
  }
}
