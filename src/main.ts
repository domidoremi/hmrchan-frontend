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

// 导入自定义指令
import { lazyLoad } from './directives/lazyLoad'

// 导入日志工具
import logger from './utils/logger'

// 导入缓存系统
import { swManager } from './utils/serviceWorkerManager'
import { indexedDB } from './utils/indexedDB'
import { offlineQueue } from './utils/offlineQueue'

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

// 注册全局指令
app.directive('lazy', lazyLoad)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  logger.criticalError('[Global Error Handler]', err, info)
  // 可以在这里上报错误到监控服务
}

// 开发环境：过滤浏览器扩展的控制台噪音
if (import.meta.env.DEV) {
  const originalError = console.error
  const originalWarn = console.warn

  // 过滤Twitter图片加载失败（403/404）
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as any
      if (target && target.tagName === 'IMG') {
        const src = target.src || ''
        if (src.includes('pbs.twimg.com') || src.includes('twimg.com')) {
          event.preventDefault()
          event.stopPropagation()
          return false
        }
      }
    },
    true,
  )

  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    const stack = args[0]?.stack?.toString() || ''

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

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    // 过滤已知的无害警告
    if (message.includes('setupReplaceUnsafeHeader')) {
      return // 静默这个警告
    }
    originalWarn.apply(console, args)
  }
}

// 挂载应用
app.mount('#app')

// 初始化Store设置（从localStorage恢复）
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
themeStore.initTheme()
settingsStore.initSettings()

// ============================================
// 初始化缓存系统
// ============================================

// 1. 初始化IndexedDB
indexedDB.init().then(() => {
  logger.log('[Cache] IndexedDB initialized')
}).catch((error) => {
  logger.criticalError('[Cache] IndexedDB init failed:', error)
})

// 2. 注册Service Worker（仅生产环境）
if (!import.meta.env.DEV) {
  swManager
    .register()
    .then((registration) => {
      if (registration) {
        logger.log('[Cache] Service Worker registered')
        
        // 监听SW更新
        window.addEventListener('sw-update-available', () => {
          logger.log('[Cache] New version available')
          // 可以在这里显示更新提示
        })
      }
    })
    .catch((error) => {
      logger.criticalError('[Cache] Service Worker registration failed:', error)
    })
}

// 3. 设置离线队列
import('./api/client').then(({ default: apiClient }) => {
  offlineQueue.setApiClient(apiClient)
  logger.log('[Cache] Offline queue configured')
})

// 4. 定期清理旧数据（每24小时）
if (typeof window !== 'undefined') {
  setInterval(() => {
    indexedDB.clearOldPosts(7).then((count) => {
      logger.log(`[Cache] Cleared ${count} old posts`)
    })
    
    if (!import.meta.env.DEV) {
      swManager.clearOldMedia()
    }
  }, 24 * 60 * 60 * 1000)
}
