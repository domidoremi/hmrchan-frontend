import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import generateSitemap from 'vite-ssg-sitemap'

import App from './App.vue'
import { routes } from './router'
import i18n from './i18n'

// 导入样式
import './styles/index.css'

// 导入自定义指令
import { lazyLoad } from './directives/lazyLoad'

// 导入Service Worker
import { swManager } from './utils/serviceWorker'

// 导入日志工具
import logger from './utils/logger'

// 导入Store（用于初始化）
import { useThemeStore } from './stores/theme'
import { useSettingsStore } from './stores/settings'

// 使用 vite-ssg 创建应用
export const createApp = ViteSSG(
  App,
  {
    routes,
    base: import.meta.env.BASE_URL,
  },
  ({ app, router, initialState, isClient }) => {
    // 创建Pinia实例并配置持久化
    const pinia = createPinia()

    // 仅在客户端启用持久化
    if (isClient) {
      pinia.use(piniaPluginPersistedstate)
    }

    // 使用插件
    app.use(pinia)
    app.use(i18n)

    // 注册全局指令
    app.directive('lazy', lazyLoad)

    // 全局错误处理
    app.config.errorHandler = (err, instance, info) => {
      logger.criticalError('[Global Error Handler]', err, info)
    }

    // 仅在客户端执行
    if (isClient) {
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

      // 初始化Store设置（从localStorage恢复）
      const themeStore = useThemeStore()
      const settingsStore = useSettingsStore()
      themeStore.initTheme()
      settingsStore.initSettings()

      // 注册Service Worker (生产环境)
      if (!import.meta.env.DEV) {
        swManager
          .register()
          .then(() => {
            logger.log('Service Worker registered successfully')
          })
          .catch((error) => {
            logger.criticalError('Service Worker registration failed:', error)
          })
      }
    }
  },
  {
    // SSG 配置选项
    formatting: 'minify',
    crittersOptions: {
      // 内联关键 CSS
      reduceInlineStyles: false,
    },
    includedRoutes(paths) {
      // 指定要预渲染的路由
      return paths.filter((path) => {
        // 排除需要认证的页面
        return !['/profile', '/favorites', '/settings'].includes(path)
      })
    },
    onFinished() {
      // 生成 sitemap
      generateSitemap({
        hostname: 'https://your-domain.com/', // 替换为您的域名
      })
    },
  },
)
