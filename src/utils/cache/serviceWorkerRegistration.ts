let registrationStarted = false

export function registerPublicCacheServiceWorker(): void {
  if (registrationStarted) return
  registrationStarted = true

  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => void navigator.serviceWorker.register('/sw.js'))
    return
  }

  window.setTimeout(() => {
    void navigator.serviceWorker.register('/sw.js')
  }, 1200)
}
