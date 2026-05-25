import { runWhenIdle } from '@/utils/performance'

let registrationStarted = false

export function registerPublicCacheServiceWorker(): void {
  if (registrationStarted) return
  registrationStarted = true

  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  runWhenIdle(() => void navigator.serviceWorker.register('/sw.js'), { fallbackDelay: 1200 })
}
