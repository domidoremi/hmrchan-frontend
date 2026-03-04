/**
 * Application Entry Point
 *
 * 性能优化：
 * 1. 同步导入仅限核心依赖
 * 2. 认证初始化在 app mount 前完成
 * 3. Service Worker 在空闲时注册
 */

import { createApp, vaporInteropPlugin } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

import './styles/index.css'

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

// 过滤 Cloudflare 相关的控制台警告
import { disposeConsoleFilter, initConsoleFilter } from './utils/consoleFilter'
initConsoleFilter()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeConsoleFilter()
  })
}

const app = createApp(App)

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

  // 可以在这里上报错误到监控服务
  // reportError({ error: err, component: instance?.$options.name, info })
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

// 初始化认证状态（异步：需要从安全存储解密 token）
// 必须在 mount 前完成，确保路由守卫能正确判断认证状态
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
const disposeAuthListener = authStore.setupAuthListener()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeAuthListener?.()
    authStore.cleanup?.()
  })
}

// 初始化设备指纹（异步，不阻塞应用启动）
import { initFingerprint } from './utils/fingerprint'
initFingerprint().catch(() => {
  // 指纹初始化失败不影响应用运行
})

// 初始化客户端安全（获取 client_token/secret），必须在 auth 之前完成
// 后续所有 API 请求都需要安全头
import { clientSecurityService } from './api/clientSecurityService'
const enableClientSecurityInit = import.meta.env.VITE_ENABLE_CLIENT_INIT !== 'false'
const enableDataPrefetch = import.meta.env.VITE_ENABLE_DATA_PREFETCH !== 'false'
const enableDeferredAnimationStyles =
  import.meta.env.VITE_ENABLE_DEFERRED_ANIMATION_STYLES !== 'false'

// 等待客户端安全初始化 → 认证初始化完成后再挂载，避免路由守卫竞态
const clientSecurityReady = enableClientSecurityInit
  ? clientSecurityService.init().catch(() => {
      // 客户端安全初始化失败不阻塞应用
    })
  : Promise.resolve()

clientSecurityReady
  .then(() => authStore.initAuth())
  .catch(() => {})
  .finally(() => {
    app.mount('#app-root')
  })

// 性能监控：立即启动以捕获所有指标
import { disposePerformanceMonitoring, initPerformanceMonitoring } from './utils/performanceMonitor'
initPerformanceMonitoring()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposePerformanceMonitoring()
  })
}

// 非关键任务：使用现代 Scheduler API 在空闲时执行
import { scheduleTask } from './utils/modernAPIs'
let scheduledTasksDisposed = false
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scheduledTasksDisposed = true
  })
}

// 延迟加载纯动画样式，降低首屏 CSS 体积与未使用样式占比
scheduleTask(
  () => {
    if (scheduledTasksDisposed) return
    if (!enableDeferredAnimationStyles) return
    import('./styles/animations.css')
  },
  { priority: 'background', delay: 2000 }
)

// Cloudflare Web Analytics（仅生产环境 + 配置 token 时启用）
const CF_BEACON_TOKEN = (import.meta.env.VITE_CF_BEACON_TOKEN ?? '').trim()

function initCloudflareAnalytics(): void {
  if (!import.meta.env.PROD) return
  if (!CF_BEACON_TOKEN) return
  if (typeof document === 'undefined') return
  if (document.querySelector('script[data-cf-beacon]')) return

  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  script.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_BEACON_TOKEN }))
  document.body.appendChild(script)
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
      registerServiceWorker()
      // 初始化 SW 更新检测器
      import('./utils/sw-update-checker').then(
        ({ initSwUpdateChecker, disposeSwUpdateChecker }) => {
          initSwUpdateChecker({
            checkInterval: 30 * 60 * 1000, // 30 分钟检查一次
            autoRefresh: false, // 不自动刷新，让用户决定
            showToast: true, // 显示更新提示
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
  { priority: 'background', delay: 5000 } // 延迟 5 秒，降低与首屏关键资源的竞争
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
  { priority: 'background', delay: 9000 } // 延迟后台同步初始化，避免首屏主线程竞争
)

// 智能路由预加载：在首屏渲染完成后预加载关键路由
import { disposePrefetch, prefetchCriticalRoutes, setupHoverPrefetch } from './utils/prefetch'
const PREFETCH_SETUP_DELAY_MS = 10000
const PREFETCH_FALLBACK_DELAY_MS = 30000
const POPULAR_PREFETCH_DELAY_AFTER_INTENT_MS = 8000
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
        prefetchPopularContent().then((result) => {
          if (import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
            console.log('[Prefetch] Popular content prefetched:', result)
          }
        })
      })
    },
    { priority: 'background', delay: POPULAR_PREFETCH_DELAY_AFTER_INTENT_MS }
  )
}

function setupIntentDrivenPrefetch(): void {
  if (typeof window === 'undefined') return
  if (scheduledTasksDisposed || prefetchTaskDisposed || prefetchStarted) return

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
