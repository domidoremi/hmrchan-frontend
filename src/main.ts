/**
 * Application Entry Point
 *
 * 性能优化：
 * 1. 同步导入仅限核心依赖
 * 2. 认证初始化在 app mount 前完成
 * 3. Service Worker 在空闲时注册
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

import './styles/index.css'

// 生产环境控制台保护（防止 Self-XSS 攻击）
import { initConsoleGuard } from './utils/consoleGuard'
initConsoleGuard()

// 过滤 Cloudflare 相关的控制台警告
import { disposeConsoleFilter, initConsoleFilter } from './utils/consoleFilter'
initConsoleFilter()
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeConsoleFilter()
  })
}

const app = createApp(App)

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

// 全局 Promise 未捕获异常处理
app.config.warnHandler = import.meta.env.DEV
  ? (msg, instance, trace) => {
      console.warn('Vue Warning:', msg)
      if (trace) console.warn('Trace:', trace)
    }
  : null

// Pinia with persistence
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(i18n)

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

// 等待认证初始化完成后再挂载，避免路由守卫竞态
authStore
  .initAuth()
  .catch(() => {})
  .finally(() => {
    app.mount('#app')
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
  { priority: 'user-visible', delay: 1000 } // 延迟 1 秒，确保首屏渲染完成
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
  { priority: 'user-visible', delay: 1500 }
)

// 智能路由预加载：在首屏渲染完成后预加载关键路由
import { disposePrefetch, prefetchCriticalRoutes, setupHoverPrefetch } from './utils/prefetch'
let prefetchTaskDisposed = false
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    prefetchTaskDisposed = true
    disposePrefetch()
  })
}
scheduleTask(
  () => {
    if (scheduledTasksDisposed || prefetchTaskDisposed) return
    prefetchCriticalRoutes()
    setupHoverPrefetch()
  },
  { priority: 'background', delay: 2000 } // 延迟 2 秒，低优先级后台任务
)

// 智能预缓存：在空闲时预加载热门内容
scheduleTask(
  () => {
    if (scheduledTasksDisposed) return
    import('./utils/cache/smartPrefetch').then(({ prefetchPopularContent }) => {
      prefetchPopularContent().then((result) => {
        if (import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true') {
          console.log('[Prefetch] Popular content prefetched:', result)
        }
      })
    })
  },
  { priority: 'background', delay: 5000 } // 延迟 5 秒，最低优先级
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
  { priority: 'background', delay: 8000 }
)
