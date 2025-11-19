/**
 * 应用入口文件
 *
 * 初始化顺序：
 * 1. HTTPS 强制跳转（必须最先执行）
 * 2. Vue 应用和插件
 * 3. 样式和指令
 * 4. 缓存和性能监控
 */

// 🔒 关键：必须首先导入 - 拦截所有 XHR 请求
import './utils/forceHttps'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

// 导入样式文件
import './styles/index.css'
import './styles/mobile-optimizations.css'
import './styles/tablet-optimizations.css'
import './styles/desktop-optimizations.css'

// 导入自定义指令
import { lazyLoad } from './directives/lazyLoad'

// 导入日志工具
import logger, { LogLevel } from './utils/logger'

/**
 * 配置日志系统
 * 开发环境：DEBUG 级别，显示所有日志
 * 生产环境：WARN 级别，仅显示警告和错误
 */
logger.setConfig({
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN,
  enableTimestamp: true,
  enableContext: true,
  enableColors: true,
})

logger.setContext({ category: 'App' })

// 导入缓存系统
import { swManager } from './utils/serviceWorkerManager'
import { indexedDB } from './utils/storage'

// 导入图片预加载插件
import { imagePreloadPlugin } from './plugins/imagePreload'

// 导入性能监控工具（仅开发环境）
import { performanceMonitor } from './utils/performance/performanceMonitor'

// 导入状态管理（用于初始化）
import { useThemeStore } from './stores/useTheme'
import { useSettingsStore } from './stores/useSettings'

/**
 * 创建 Vue 应用实例
 */
const app = createApp(App)

/**
 * 创建 Pinia 实例并配置持久化插件
 * 持久化插件会自动将状态保存到 localStorage
 */
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

/**
 * 注册应用插件
 */
app.use(pinia)
app.use(router)
app.use(i18n)

/**
 * 配置图片预加载插件
 * 在空闲时预加载关键图片，提升用户体验
 */
app.use(imagePreloadPlugin, {
  enabled: true,
  priority: 'low',
  maxConcurrent: 3,
  wifiOnly: false,
  delay: 1000,
  criticalSelectors: ['.hero-image', '.featured-image', '[data-critical="true"] img'],
})

/**
 * 注册全局自定义指令
 */
app.directive('lazy', lazyLoad)

/**
 * 全局错误处理器
 * 捕获 Vue 组件中的所有错误
 */
app.config.errorHandler = (err, instance, info) => {
  const errorMessage = (err as Error)?.message || ''

  // 过滤 Cloudflare Insights CORS 错误（部署环境常见错误）
  if (errorMessage.includes('cloudflareinsights.com') || errorMessage.includes('cdn-cgi/rum')) {
    return
  }

  // 开发环境：打印详细错误信息
  if (import.meta.env.DEV) {
    console.error('[全局错误处理器]:', {
      error: err,
      component: instance?.$options?.name || '未知组件',
      info,
    })
  }

  // 记录错误日志（可扩展为错误上报服务）
  logger.critical(`Vue 错误: ${info}`, {
    component: instance?.$options?.name || '未知',
    error: err instanceof Error ? err.message : String(err),
  })
}

/**
 * 开发环境：过滤控制台噪音
 * 屏蔽浏览器扩展和第三方服务产生的无关错误
 */
if (import.meta.env.DEV) {
  const originalError = console.error
  const originalWarn = console.warn

  /**
   * 过滤图片加载失败错误
   * 主要针对 Twitter 图片的 403/404 错误
   */
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

  /**
   * 重写 console.error，过滤无关错误
   */
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || ''
    const stack = (args[0] as Error)?.stack?.toString() || ''

    // 过滤 Cloudflare Insights CORS 错误
    if (
      message.includes('cloudflareinsights.com') ||
      message.includes('cdn-cgi/rum') ||
      message.includes('ERR_BLOCKED_BY_CLIENT')
    ) {
      return
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
      return
    }

    originalError.apply(console, args)
  }

  /**
   * 重写 console.warn，过滤无关警告
   */
  console.warn = (...args: unknown[]) => {
    const warningText = args.join(' ')

    // 过滤 Vue 的属性和事件警告
    if (
      warningText.includes('Extraneous non-props attributes') ||
      warningText.includes('Extraneous non-emits event listeners')
    ) {
      return
    }

    originalWarn.apply(console, args)
  }
}

/**
 * 全局 Promise Rejection 处理器
 * 捕获未处理的 Promise 错误
 */
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason
  const errorMessage = error?.message || String(error)

  // 过滤 Cloudflare Insights CORS 错误
  if (
    errorMessage.includes('cloudflareinsights.com') ||
    errorMessage.includes('cdn-cgi/rum') ||
    errorMessage.includes('ERR_BLOCKED_BY_CLIENT')
  ) {
    event.preventDefault()
    return
  }

  // 开发环境：记录其他未处理的 Promise 错误
  if (import.meta.env.DEV) {
    console.error('[未处理的 Promise 错误]:', error)
  }
})

/**
 * 挂载 Vue 应用到 DOM
 */
app.mount('#app')

/**
 * 初始化状态管理
 * 从 localStorage 恢复用户设置
 */
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
themeStore.initTheme()
settingsStore.initSettings()

/**
 * 开发环境：初始化开发工具
 */
if (import.meta.env.DEV) {
  // 国际化开发工具
  import('./utils/i18nDevTools').then(({ initI18nDevTools }) => {
    initI18nDevTools()
  })

  // 性能监控工具
  window.addEventListener('load', () => {
    setTimeout(() => {
      const report = performanceMonitor.generateReport()
      console.log(report)

      // 将性能监控暴露到全局，方便调试
      ;(
        window as Window & { __performanceMonitor__?: typeof performanceMonitor }
      ).__performanceMonitor__ = performanceMonitor

      console.log(
        '%c💡 性能监控工具',
        'color: #8b5cf6; font-weight: bold',
        '\n访问方式: window.__performanceMonitor__',
        '\n生成报告: window.__performanceMonitor__.generateReport()',
      )
    }, 2000)
  })
}

/**
 * ============================================
 * 初始化缓存系统
 * ============================================
 */

/**
 * 1. 初始化 IndexedDB
 * 用于离线存储帖子数据
 */
indexedDB
  .init()
  .then(() => {
    logger.info('IndexedDB 初始化成功', { category: 'Cache' })
  })
  .catch((error) => {
    logger.critical('IndexedDB 初始化失败', {
      category: 'Cache',
      error: error instanceof Error ? error.message : String(error),
    })
  })

/**
 * 2. 注册 Service Worker（仅生产环境）
 * 用于缓存静态资源和 API 响应
 */
if (!import.meta.env.DEV) {
  swManager
    .register()
    .then((registration) => {
      if (registration) {
        logger.info('Service Worker 注册成功', { category: 'Cache' })

        // 监听 Service Worker 更新
        window.addEventListener('sw-update-available', () => {
          logger.info('发现新版本', { category: 'Cache' })
          // TODO: 显示更新提示给用户
        })
      }
    })
    .catch((error) => {
      logger.critical('Service Worker 注册失败', {
        category: 'Cache',
        error: error instanceof Error ? error.message : String(error),
      })
    })
}

/**
 * 3. 定期清理旧数据
 * 每 24 小时清理一次过期缓存
 */
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      // 清理 7 天前的帖子数据
      indexedDB.clearOldPosts(7).then((count) => {
        logger.info('清理旧帖子', { category: 'Cache', count })
      })

      // 清理旧媒体文件（仅生产环境）
      if (!import.meta.env.DEV) {
        swManager.clearOldMedia()
      }
    },
    24 * 60 * 60 * 1000, // 24 小时
  )
}
