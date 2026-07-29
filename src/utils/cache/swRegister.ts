export const SW_PATH = '/sw.js'
const isVitestRuntime =
  import.meta.env.MODE === 'test' ||
  Boolean((import.meta as ImportMeta & { vitest?: unknown }).vitest)

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

export async function registerServiceWorker(): Promise<SWRegistrationResult> {
  if (!('serviceWorker' in navigator)) {
    return { success: false, error: new Error('Service Worker not supported') }
  }

  if (import.meta.env.DEV && !isVitestRuntime) {
    return { success: false }
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
      updateViaCache: 'none',
    })

    postConfigToSW(registration)

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          dispatchSWUpdateEvent()
        }
      })
    })

    registration.update().catch(() => {})

    navigator.serviceWorker.ready.then((ready) => {
      postConfigToSW(ready)
    })

    return { success: true, registration }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

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

export function skipWaiting(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
}

export function clearSWCache(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' })
}

function dispatchSWUpdateEvent(): void {
  window.dispatchEvent(new CustomEvent('sw-update-available'))
}

export function onSWUpdate(callback: () => void): () => void {
  const handler = () => callback()
  window.addEventListener('sw-update-available', handler)
  return () => window.removeEventListener('sw-update-available', handler)
}
