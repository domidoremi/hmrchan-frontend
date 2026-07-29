import { createApp, vaporInteropPlugin, watch } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import i18n, { preloadActiveLocale } from './i18n'

import 'lenis/dist/lenis.css'
import './styles/index.css'
import {
  canTrackAnalytics,
  canTrackPerformance,
  updateAnalyticsConsent,
} from './utils/analyticsConsent'
import { reportClientError, reportClientEvent } from './utils/clientReporter'
import vClickOutside from './directives/clickOutside'
import { ensureAuthStoreLoaded, useAuthSurface } from './services/authSurface'

import { initConsoleGuard } from './utils/consoleGuard'
const disposeConsoleGuard = initConsoleGuard()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeConsoleGuard()
  })
}

import { initFrameGuard } from './utils/frameGuard'
initFrameGuard()

import { initRuntimeIntegrityGuard } from './security/runtimeIntegrityGuard'
const disposeRuntimeIntegrityGuard = initRuntimeIntegrityGuard()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeRuntimeIntegrityGuard()
  })
}

import { disposeConsoleFilter, initConsoleFilter } from './utils/consoleFilter'
initConsoleFilter()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeConsoleFilter()
  })
}

const EARLY_GOOGLE_POPUP_CLOSE_DELAY_MS = 320
const EARLY_GOOGLE_POPUP_MANUAL_CLOSE_HINT_DELAY_MS = 1000

function resolveEarlyGooglePopupCopy(): { title: string; body: string; action: string } {
  const locale = typeof navigator !== 'undefined' ? navigator.language.trim().toLowerCase() : 'en'

  if (locale.startsWith('zh-cn') || locale.startsWith('zh-hans')) {
    return {
      title: 'Google 登录完成',
      body: '此窗口即将自动关闭。如未关闭，可手动关闭后返回原窗口继续。',
      action: '关闭窗口',
    }
  }

  if (locale.startsWith('zh-tw') || locale.startsWith('zh-hk') || locale.startsWith('zh-hant')) {
    return {
      title: 'Google 登入已完成',
      body: '此視窗即將自動關閉。若未關閉，請手動關閉後返回原頁面繼續。',
      action: '關閉視窗',
    }
  }

  if (locale.startsWith('ja')) {
    return {
      title: 'Google ログインが完了しました',
      body: 'このウィンドウは自動で閉じるはずです。閉じない場合は手動で閉じて元のタブに戻ってください。',
      action: 'ウィンドウを閉じる',
    }
  }

  return {
    title: 'Google sign-in complete',
    body: 'This window should close automatically. If it stays open, close it and return to the original tab.',
    action: 'Close window',
  }
}

function renderEarlyGooglePopupFallback(): void {
  if (typeof document === 'undefined') return

  const copy = resolveEarlyGooglePopupCopy()
  const mountTarget = document.getElementById('app-root') ?? document.body
  if (!mountTarget) return

  mountTarget.innerHTML = ''

  const shell = document.createElement('div')
  shell.setAttribute(
    'style',
    [
      'min-height:100vh',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:2rem',
      'background:#0b1117',
      'color:#f3f7fb',
      'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    ].join(';')
  )

  const card = document.createElement('div')
  card.setAttribute(
    'style',
    [
      'width:min(28rem,100%)',
      'padding:1.5rem',
      'border:0.0625rem solid rgba(255,255,255,0.12)',
      'border-radius:1rem',
      'background:rgba(12,18,26,0.92)',
      'box-shadow:0 1rem 3rem rgba(0,0,0,0.32)',
      'text-align:center',
    ].join(';')
  )

  const title = document.createElement('p')
  title.textContent = copy.title
  title.setAttribute('style', 'margin:0 0 0.75rem;font-size:1rem;font-weight:600;')

  const body = document.createElement('p')
  body.textContent = copy.body
  body.setAttribute(
    'style',
    'margin:0;color:rgba(243,247,251,0.76);font-size:0.9375rem;line-height:1.5;'
  )

  const action = document.createElement('button')
  action.type = 'button'
  action.textContent = copy.action
  action.hidden = true
  action.setAttribute(
    'style',
    [
      'margin-top:1rem',
      'padding:0.75rem 1rem',
      'border:0',
      'border-radius:999rem',
      'background:#f3f7fb',
      'color:#0b1117',
      'font:inherit',
      'cursor:pointer',
    ].join(';')
  )
  action.addEventListener('click', () => {
    window.close()
  })

  card.append(title, body, action)
  shell.append(card)
  mountTarget.append(shell)

  window.setTimeout(() => {
    action.hidden = false
  }, EARLY_GOOGLE_POPUP_MANUAL_CLOSE_HINT_DELAY_MS)
}

function shouldHandleEarlyGooglePopupBridge(): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.pathname !== '/auth/callback') return false

  const params = new URLSearchParams(window.location.search)
  return (
    Boolean(window.opener) ||
    window.name.startsWith('momi-google-auth:') ||
    params.has('handoff_code') ||
    params.has('error')
  )
}

if (shouldHandleEarlyGooglePopupBridge()) {
  const { bridgeGooglePopupResult } = await import('./services/googleAuthService')
  const { scrubSensitiveUrlParameters } = await import('./utils/sensitiveUrl')
  const earlyGooglePopupBridge = bridgeGooglePopupResult()
  if (earlyGooglePopupBridge.handled) {
    scrubSensitiveUrlParameters(['handoff_code'])
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.close()
      }, EARLY_GOOGLE_POPUP_CLOSE_DELAY_MS)
    }

    renderEarlyGooglePopupFallback()
    await new Promise<void>(() => undefined)
  }
}

const app = createApp(App)
app.directive('click-outside', vClickOutside)

const CHUNK_ERROR_RE =
  /chunkloaderror|loading chunk [\w-]+ failed|failed to fetch dynamically imported module|importing a module script failed|dynamically imported module/i
const CHUNK_RELOAD_ONCE_KEY = '__chunk_reload_once__'

// One session-scoped reload recovers stale chunk URLs after deployment without a reload loop.

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error ?? '')
}

function isChunkLoadError(error: unknown): boolean {
  return CHUNK_ERROR_RE.test(toErrorMessage(error))
}

function reloadOnceForChunkError(reason: string): void {
  if (typeof window === 'undefined') return

  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_ONCE_KEY) === '1') {
      if (import.meta.env.DEV) {
        console.warn('[Chunk Recovery] Skip repeated reload:', reason)
      }
      return
    }
    sessionStorage.setItem(CHUNK_RELOAD_ONCE_KEY, '1')
  } catch {
    // ignore storage errors and still try to reload
  }

  if (import.meta.env.DEV) {
    console.warn('[Chunk Recovery] Reloading due to chunk error:', reason)
  }
  reportClientEvent(
    'chunk.reload_requested',
    {
      reason,
    },
    { severity: 'warn' }
  )
  window.location.reload()
}

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event: Event) => {
    const preloadEvent = event as Event & { payload?: unknown }
    if (!isChunkLoadError(preloadEvent.payload)) return
    event.preventDefault()
    reloadOnceForChunkError(`vite:preloadError: ${toErrorMessage(preloadEvent.payload)}`)
  })

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (!isChunkLoadError(event.reason)) return
    reloadOnceForChunkError(`unhandledrejection: ${toErrorMessage(event.reason)}`)
  })
}

router.onError((error) => {
  if (!isChunkLoadError(error)) return
  reloadOnceForChunkError(`router.onError: ${toErrorMessage(error)}`)
})

app.config.errorHandler = (err, instance, info) => {
  if (import.meta.env.DEV) {
    console.error('Vue Error:', err)
    console.error('Component:', instance)
    console.error('Info:', info)
  }

  reportClientError('vue.error', err, {
    component:
      instance && '$options' in instance
        ? ((instance.$options as { name?: string } | undefined)?.name ?? 'anonymous')
        : 'anonymous',
    info,
  })
}

if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, _instance, trace) => {
    console.warn('Vue Warning:', msg)
    if (trace) console.warn('Trace:', trace)
  }
}

// Pinia with persistence
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(vaporInteropPlugin)

// Track last pointer position for click-origin animations (e.g. opening preview modal)
import { disposeLastPointerTracker, initLastPointerTracker } from './utils/lastPointer'
initLastPointerTracker()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeLastPointerTracker()
  })
}

import { useSettingsStore } from './stores/settings'
const settingsStore = useSettingsStore(pinia)

watch(
  () => ({
    cookieConsent: settingsStore.settings.cookieConsent,
    analyticsEnabled: settingsStore.settings.analyticsEnabled,
    performanceCookiesEnabled: settingsStore.settings.performanceCookiesEnabled,
  }),
  (snapshot) => {
    updateAnalyticsConsent(snapshot)

    if (canTrackAnalytics(snapshot)) {
      initCloudflareAnalytics()
    } else {
      removeCloudflareAnalytics()
    }

    if (canTrackPerformance(snapshot)) {
      initPerformanceMonitoring()
    } else {
      disposePerformanceMonitoring()
    }
  },
  { immediate: true, deep: true }
)

import { initFingerprint } from './utils/fingerprint'

function scheduleFingerprintInit(): void {
  const run = () => {
    if (scheduledTasksDisposed) return
    initFingerprint().catch((error) => {
      reportClientError('fingerprint.init_failed', error, undefined, { severity: 'warn' })
    })
  }

  if (typeof window === 'undefined') {
    run()
    return
  }

  let triggered = false
  const cleanup = () => {
    window.removeEventListener('pointerdown', onIntent)
    window.removeEventListener('keydown', onIntent)
    window.removeEventListener('touchstart', onIntent)
  }
  const onIntent = () => {
    if (triggered) return
    triggered = true
    cleanup()
    scheduleTask(run, { priority: 'background', delay: 1500 })
  }

  window.addEventListener('pointerdown', onIntent, { once: true, passive: true })
  window.addEventListener('keydown', onIntent, { once: true })
  window.addEventListener('touchstart', onIntent, { once: true, passive: true })

  scheduleTask(
    () => {
      if (triggered) return
      triggered = true
      cleanup()
      run()
    },
    { priority: 'background', delay: 12000 }
  )
}

scheduleFingerprintInit()

const enableDataPrefetch = import.meta.env.VITE_ENABLE_DATA_PREFETCH !== 'false'

async function mountApp(): Promise<void> {
  try {
    await preloadActiveLocale()
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[i18n] Failed to preload active locale:', error)
    }
    reportClientError('i18n.preload_failed', error, undefined, { severity: 'warn' })
  }

  app.mount('#app-root')
  scheduleAuthSurfaceBootstrap()
}

void mountApp()

import { disposePerformanceMonitoring, initPerformanceMonitoring } from './utils/performanceMonitor'
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposePerformanceMonitoring()
  })
}

import { scheduleTask } from './utils/modernAPIs'
import { shouldEnableCloudflareAnalytics } from './utils/runtimeHost'
const PREFETCH_SETUP_DELAY_MS = 14000
const PREFETCH_FALLBACK_DELAY_MS = 40000
const POPULAR_PREFETCH_DELAY_AFTER_INTENT_MS = 12000
const SW_REGISTER_DELAY_MS = 8000
const SW_SYNC_DELAY_MS = 14000
let scheduledTasksDisposed = false
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scheduledTasksDisposed = true
  })
}

const authSurface = useAuthSurface()
const AUTH_ENTRY_ROUTE_NAMES = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'auth-callback',
])

function isAuthEntryRouteActive(): boolean {
  const routeName = router.currentRoute.value.name
  const normalizedRouteName = typeof routeName === 'string' ? routeName : ''
  if (AUTH_ENTRY_ROUTE_NAMES.has(normalizedRouteName)) return true

  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/auth/callback')
  )
}

function scheduleAuthSurfaceBootstrap(): void {
  if (typeof window === 'undefined') return

  let triggered = false

  const cleanup = () => {
    window.removeEventListener('pointerdown', onIntent)
    window.removeEventListener('keydown', onIntent)
    window.removeEventListener('touchstart', onIntent)
  }

  const run = () => {
    if (triggered || scheduledTasksDisposed) return
    triggered = true
    cleanup()
    scheduleTask(
      () => {
        if (scheduledTasksDisposed) return
        if (isAuthEntryRouteActive()) return
        void ensureAuthStoreLoaded({ initialize: true }).catch((error) => {
          reportClientError('auth.bootstrap_failed', error, undefined, { severity: 'warn' })
        })
      },
      { priority: 'background', delay: 1500 }
    )
  }

  const onIntent = () => {
    run()
  }

  window.addEventListener('pointerdown', onIntent, { once: true, passive: true })
  window.addEventListener('keydown', onIntent, { once: true })
  window.addEventListener('touchstart', onIntent, { once: true, passive: true })

  scheduleTask(run, { priority: 'background', delay: 12000 })
}

const CF_BEACON_TOKEN = (import.meta.env.VITE_CF_BEACON_TOKEN ?? '').trim()
const CF_BEACON_ENABLED = import.meta.env.VITE_ENABLE_CF_BEACON === 'true'

function initCloudflareAnalytics(): void {
  if (!import.meta.env.PROD) return
  if (!CF_BEACON_ENABLED) return
  if (!CF_BEACON_TOKEN) return
  if (typeof document === 'undefined') return
  if (!shouldEnableCloudflareAnalytics()) return
  if (!canTrackAnalytics()) return
  if (document.querySelector('script[data-cf-beacon]')) return

  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  script.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_BEACON_TOKEN }))
  document.body.appendChild(script)
  reportClientEvent('analytics.cloudflare.injected')
}

function removeCloudflareAnalytics(): void {
  if (typeof document === 'undefined') return
  const existingScript = document.querySelector('script[data-cf-beacon]')
  existingScript?.parentElement?.removeChild(existingScript)
}

scheduleTask(
  () => {
    if (scheduledTasksDisposed) return
    initCloudflareAnalytics()
  },
  { priority: 'background', delay: 5000 }
)

scheduleTask(
  () => {
    if (scheduledTasksDisposed) return
    import('./utils/cache').then(({ registerServiceWorker }) => {
      registerServiceWorker().then((result) => {
        if (!result.success && result.error) {
          reportClientError('sw.register_failed', result.error, undefined, { severity: 'warn' })
        } else if (result.success) {
          reportClientEvent('sw.registered')
        }
      })

      import('./utils/sw-update-checker').then(
        ({ initSwUpdateChecker, disposeSwUpdateChecker }) => {
          initSwUpdateChecker({
            checkInterval: 30 * 60 * 1000,
            showToast: true,
            router,
            pinia,
          })

          if (import.meta.hot) {
            import.meta.hot.dispose(() => {
              disposeSwUpdateChecker()
            })
          }
        }
      )
    })
  },
  { priority: 'background', delay: SW_REGISTER_DELAY_MS }
)

scheduleTask(
  () => {
    if (scheduledTasksDisposed) return
    import('./utils/cache/syncManager').then(
      ({ setupAutoSync, setupSwSyncListener, disposeAutoSync, disposeSwSyncListener }) => {
        const getOfflineActionOwnerId = () => authSurface.user.value?.id
        setupAutoSync(getOfflineActionOwnerId)
        setupSwSyncListener(getOfflineActionOwnerId)
        if (import.meta.hot) {
          import.meta.hot.dispose(() => {
            disposeAutoSync()
            disposeSwSyncListener()
          })
        }
      }
    )
  },
  { priority: 'background', delay: SW_SYNC_DELAY_MS }
)

import { disposePrefetch, prefetchCriticalRoutes, setupHoverPrefetch } from './utils/prefetch'
let prefetchTaskDisposed = false
let prefetchStarted = false
let prefetchFallbackTimer: number | null = null
let prefetchIntentCleanup: (() => void) | null = null

function cleanupPrefetchIntentListeners(): void {
  prefetchIntentCleanup?.()
  prefetchIntentCleanup = null
  if (prefetchFallbackTimer !== null) {
    clearTimeout(prefetchFallbackTimer)
    prefetchFallbackTimer = null
  }
}

function triggerPrefetchPipeline(reason: 'intent' | 'fallback'): void {
  if (scheduledTasksDisposed || prefetchTaskDisposed || prefetchStarted) return
  if (!authSurface.isAuthenticated.value) return
  prefetchStarted = true
  cleanupPrefetchIntentListeners()

  if (import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
    console.log(`[Prefetch] Triggered by ${reason}`)
  }

  prefetchCriticalRoutes()
  setupHoverPrefetch()

  if (!enableDataPrefetch) return
  scheduleTask(
    () => {
      if (scheduledTasksDisposed || prefetchTaskDisposed) return
      import('./utils/cache/smartPrefetch').then(({ prefetchPopularContent }) => {
        prefetchPopularContent()
          .then((result) => {
            if (import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
              console.log('[Prefetch] Popular content prefetched:', result)
            }
            reportClientEvent('prefetch.popular_content_completed', result)
          })
          .catch((error) => {
            if (import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
              console.warn('[Prefetch] Popular content prefetch skipped:', error)
            }
            reportClientError(
              'prefetch.popular_content_failed',
              error,
              { reason },
              { severity: 'warn' }
            )
          })
      })
    },
    { priority: 'background', delay: POPULAR_PREFETCH_DELAY_AFTER_INTENT_MS }
  )
}

function setupIntentDrivenPrefetch(): void {
  if (typeof window === 'undefined') return
  if (scheduledTasksDisposed || prefetchTaskDisposed || prefetchStarted) return
  if (!authSurface.isAuthenticated.value) return

  cleanupPrefetchIntentListeners()

  const onIntent = () => {
    triggerPrefetchPipeline('intent')
  }

  window.addEventListener('pointerdown', onIntent, { once: true, passive: true })
  window.addEventListener('touchstart', onIntent, { once: true, passive: true })
  window.addEventListener('scroll', onIntent, { once: true, passive: true })
  window.addEventListener('keydown', onIntent, { once: true })

  prefetchIntentCleanup = () => {
    window.removeEventListener('pointerdown', onIntent)
    window.removeEventListener('touchstart', onIntent)
    window.removeEventListener('scroll', onIntent)
    window.removeEventListener('keydown', onIntent)
  }

  prefetchFallbackTimer = window.setTimeout(() => {
    triggerPrefetchPipeline('fallback')
  }, PREFETCH_FALLBACK_DELAY_MS)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    prefetchTaskDisposed = true
    cleanupPrefetchIntentListeners()
    disposePrefetch()
  })
}
watch(
  () => authSurface.isAuthenticated.value,
  (isAuthenticated) => {
    if (scheduledTasksDisposed || prefetchTaskDisposed) return

    if (isAuthenticated) {
      setupIntentDrivenPrefetch()
      return
    }

    cleanupPrefetchIntentListeners()
    disposePrefetch()
    prefetchStarted = false
  }
)
scheduleTask(
  () => {
    if (scheduledTasksDisposed || prefetchTaskDisposed) return
    setupIntentDrivenPrefetch()
  },
  { priority: 'background', delay: PREFETCH_SETUP_DELAY_MS }
)

scheduleTask(
  async () => {
    if (scheduledTasksDisposed) return
    const [{ postCache, authorCache }, { cleanupViewRecords }, { cleanupFailedActions }] =
      await Promise.all([
        import('./utils/cache'),
        import('./composables/useViewTracking'),
        import('./utils/cache/offlineQueue'),
      ])

    await Promise.allSettled([
      postCache.cleanup(),
      authorCache.cleanup(),
      cleanupViewRecords(),
      cleanupFailedActions(),
    ])
  },
  { priority: 'background', delay: 22000 }
)
