// 🔒 CRITICAL: Import FIRST - intercepts ALL XHR before anything else loads
import './utils/forceHttps'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

// 导入样式
import './styles/index.css'
import './styles/mobile-optimizations.css'
import './styles/tablet-optimizations.css'
import './styles/desktop-optimizations.css'

// 导入自定义指令
import { lazyLoad } from './directives/lazyLoad'

// 导入日志工具
import logger, { LogLevel } from './utils/logger'

// 配置日志系统
logger.setConfig({
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN,
  enableTimestamp: true,
  enableContext: true,
  enableColors: true,
})

logger.setContext({ category: 'App' })

// 导入缓存系统
import { swManager } from './utils/serviceWorkerManager'
import { indexedDB } from './utils/indexedDB'

// 导入图片预加载插件
import { imagePreloadPlugin } from './plugins/imagePreload'

// 导入性能监控（仅开发环境）
import { performanceMonitor } from './utils/performance/performanceMonitor'

// 导入Store（用于初始化）
import { useThemeStore } from './stores/theme'
import { useSettingsStore } from './stores/settings'

// 创建应用
const app = createApp(App)

// 创建Pinia实例并配置持久化
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 使用插件
app.use(pinia)
app.use(router)
app.use(i18n)
app.use(imagePreloadPlugin, {
  enabled: true,
  priority: 'low',
  maxConcurrent: 3,
  wifiOnly: false,
  delay: 1000,
  criticalSelectors: ['.hero-image', '.featured-image', '[data-critical="true"] img'],
})

// 注册全局指令
app.directive('lazy', lazyLoad)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  // 过滤Cloudflare Insights CORS错误（常见的部署环境错误）
  const errorMessage = (err as Error)?.message || ''
  if (errorMessage.includes('cloudflareinsights.com') || errorMessage.includes('cdn-cgi/rum')) {
    // 静默忽略Cloudflare RUM的CORS错误
    return
  }

  // 打印错误详情到控制台（开发环境）
  if (import.meta.env.DEV) {
    console.error('[Global Error Handler]:', {
      error: err,
      component: instance?.$options?.name || 'Unknown Component',
      info,
    })
  }

  // 可以在这里添加错误上报逻辑
  // 例如发送到错误监控服务
  logger.critical(`Vue error: ${info}`, {
    component: instance?.$options?.name || 'Unknown',
    error: err instanceof Error ? err.message : String(err),
  })
}

// 开发环境：过滤浏览器扩展的控制台噪音
if (import.meta.env.DEV) {
  const originalError = console.error
  const originalWarn = console.warn

  // 过滤Twitter图片加载失败（403/404）
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as HTMLElement | null
      if (target && target.tagName === 'IMG') {
        const src = (target as HTMLImageElement).src || ''
        if (src.includes('pbs.twimg.com') || src.includes('twimg.com')) {
          event.preventDefault()
          event.stopPropagation()
          return false
        }
      }
    },
    true,
  )

  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || ''
    const stack = (args[0] as Error)?.stack?.toString() || ''

    // 过滤Cloudflare Insights CORS错误
    if (
      message.includes('cloudflareinsights.com') ||
      message.includes('cdn-cgi/rum') ||
      message.includes('ERR_BLOCKED_BY_CLIENT')
    ) {
      return // 静默Cloudflare RUM错误
    }

    // 过滤浏览器扩展相关错误
    if (
      message.includes('content_script') ||
      message.includes('chrome-extension') ||
      message.includes('A listener indicated an asynchronous response') ||
      message.includes('message channel closed') ||
      message.includes('fetchError') ||
      message.includes('Request timeout') ||
      message.includes('returning true, but the message channel closed') ||
      stack.includes('content_script') ||
      stack.includes('chrome-extension')
    ) {
      return // 静默这些错误
    }
    originalError.apply(console, args)
  }

  console.warn = (...args: unknown[]) => {
    // 过滤掉特定的警告信息
    const warningText = args.join(' ')
    if (
      warningText.includes('Extraneous non-props attributes') ||
      warningText.includes('Extraneous non-emits event listeners')
    ) {
      return // 忽略这些警告
    }
    originalWarn.apply(console, args)
  }
}

// 全局Promise rejection处理（过滤Cloudflare错误）
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason
  const errorMessage = error?.message || String(error)

  // 过滤Cloudflare Insights CORS错误
  if (
    errorMessage.includes('cloudflareinsights.com') ||
    errorMessage.includes('cdn-cgi/rum') ||
    errorMessage.includes('ERR_BLOCKED_BY_CLIENT')
  ) {
    event.preventDefault()
    return
  }

  // 其他错误正常处理
  if (import.meta.env.DEV) {
    console.error('[Unhandled Promise Rejection]:', error)
  }
})

// 挂载应用
app.mount('#app')

// 初始化Store设置（从localStorage恢复）
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
themeStore.initTheme()
settingsStore.initSettings()

// 初始化 i18n 开发工具（仅开发环境）
if (import.meta.env.DEV) {
  import('./utils/i18nDevTools').then(({ initI18nDevTools }) => {
    initI18nDevTools()
  })

  // 性能监控：在开发环境显示性能报告
  window.addEventListener('load', () => {
    setTimeout(() => {
      const report = performanceMonitor.generateReport()
      console.log(report)

      // 将性能监控暴露到全局，方便调试
      ;(
        window as Window & { __performanceMonitor__?: typeof performanceMonitor }
      ).__performanceMonitor__ = performanceMonitor
      console.log(
        '%c💡 Performance Monitor',
        'color: #8b5cf6; font-weight: bold',
        '\nAccess via: window.__performanceMonitor__',
        '\nGenerate report: window.__performanceMonitor__.generateReport()',
      )
    }, 2000)
  })
}

// ============================================
// 初始化缓存系统
// ============================================

// 1. 初始化IndexedDB
indexedDB
  .init()
  .then(() => {
    logger.info('IndexedDB initialized', { category: 'Cache' })
  })
  .catch((error) => {
    logger.critical('IndexedDB init failed', {
      category: 'Cache',
      error: error instanceof Error ? error.message : String(error),
    })
  })

// 2. 注册Service Worker（仅生产环境）
if (!import.meta.env.DEV) {
  swManager
    .register()
    .then((registration) => {
      if (registration) {
        logger.info('Service Worker registered', { category: 'Cache' })

        // 监听SW更新
        window.addEventListener('sw-update-available', () => {
          logger.info('New version available', { category: 'Cache' })
          // 可以在这里显示更新提示
        })
      }
    })
    .catch((error) => {
      logger.critical('Service Worker registration failed', {
        category: 'Cache',
        error: error instanceof Error ? error.message : String(error),
      })
    })
}

// 3. 设置离线队列

// 4. 定期清理旧数据（每24小时）
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      indexedDB.clearOldPosts(7).then((count) => {
        logger.info('Cleared old posts', { category: 'Cache', count })
      })

      if (!import.meta.env.DEV) {
        swManager.clearOldMedia()
      }
    },
    24 * 60 * 60 * 1000,
  )
}
