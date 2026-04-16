/**
 * Application Entry Point
 *
 * 性能优化：
 * 1. 同步导入仅限核心依赖
 * 2. 认证初始化在 app mount 前完成
 * 3. Service Worker 在空闲时注册
 */

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

// 生产环境控制台保护（防止 Self-XSS 攻击）
import { initConsoleGuard } from './utils/consoleGuard'
const disposeConsoleGuard = initConsoleGuard()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeConsoleGuard()
  })
}

// 点击劫持防御 — 第二阶段（模块加载后）
// 第一阶段已在 index.html 内联脚本中完成（CSS 隐藏 + 同步跳出）
// 此处处理跨域 iframe 降级：清空 DOM、阻断交互
import { initFrameGuard } from './utils/frameGuard'
initFrameGuard()

import { initRuntimeIntegrityGuard } from './security/runtimeIntegrityGuard'
const disposeRuntimeIntegrityGuard = initRuntimeIntegrityGuard()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeRuntimeIntegrityGuard()
  })
}

// 过滤 Cloudflare 相关的控制台警告
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
  const earlyGooglePopupBridge = bridgeGooglePopupResult()
  if (earlyGooglePopupBridge.handled) {
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

/**
 * 动态模块加载失败兜底：
 * 发布后旧缓存可能命中失效 chunk，导致路由白屏。
 * 检测到典型 chunk load 错误时，仅在当前 Tab 自动刷新一次。
 */
const CHUNK_ERROR_RE =
  /chunkloaderror|loading chunk [\w-]+ failed|failed to fetch dynamically imported module|importing a module script failed|dynamically imported module/i
const CHUNK_RELOAD_ONCE_KEY = '__chunk_reload_once__'

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

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  // 生产环境静默处理，开发环境打印详细信息
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

// 开发环境：打印 Vue 警告详情
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

// 初始化设备指纹（异步，不阻塞应用启动）
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

// 公共页面首屏不再静默恢复登录态，避免 /login /register 等匿名入口主动触发
// refresh + challenge 噪音；受保护路由仍由路由守卫按需完成初始化。

app.mount('#app-root')
scheduleAuthSurfaceBootstrap()

void preloadActiveLocale().catch((error) => {
  if (import.meta.env.DEV) {
    console.warn('[i18n] Failed to preload active locale:', error)
  }
  reportClientError('i18n.preload_failed', error, undefined, { severity: 'warn' })
})

// 性能监控：由隐私设置动态控制
import { disposePerformanceMonitoring, initPerformanceMonitoring } from './utils/performanceMonitor'
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposePerformanceMonitoring()
  })
}

// 非关键任务：使用现代 Scheduler API 在空闲时执行
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

// Cloudflare Web Analytics（仅生产环境 + 配置 token 时启用）
const CF_BEACON_TOKEN = (import.meta.env.VITE_CF_BEACON_TOKEN ?? '').trim()

function initCloudflareAnalytics(): void {
  if (!import.meta.env.PROD) return
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

// Service Worker 注册：页面加载完成后尽快注册（user-visible 优先级）
// 这样可以更早地启用离线缓存和资源预缓存
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
      // 初始化 SW 更新检测器
      import('./utils/sw-update-checker').then(
        ({ initSwUpdateChecker, disposeSwUpdateChecker }) => {
          initSwUpdateChecker({
            checkInterval: 30 * 60 * 1000, // 30 分钟检查一次
            showToast: true, // 显示更新提示
            router,
            pinia,
          })
          // HMR 下避免重复注册监听器
          if (import.meta.hot) {
            import.meta.hot.dispose(() => {
              disposeSwUpdateChecker()
            })
          }
        }
      )
    })
  },
  { priority: 'background', delay: SW_REGISTER_DELAY_MS } // 延迟注册，降低与首屏关键资源的竞争
)

// 后台同步管理器：监听网络状态和 SW 消息
scheduleTask(
  () => {
    if (scheduledTasksDisposed) return
    import('./utils/cache/syncManager').then(
      ({ setupAutoSync, setupSwSyncListener, disposeAutoSync, disposeSwSyncListener }) => {
        setupAutoSync()
        setupSwSyncListener()
        if (import.meta.hot) {
          import.meta.hot.dispose(() => {
            disposeAutoSync()
            disposeSwSyncListener()
          })
        }
      }
    )
  },
  { priority: 'background', delay: SW_SYNC_DELAY_MS } // 进一步后移后台同步初始化，避免首屏主线程竞争
)

// 智能路由预加载：在首屏渲染完成后预加载关键路由
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

  // 长停留且无交互时仍执行预加载，兼顾二跳体验
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

// 后台维护任务：清理过期缓存/队列
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
