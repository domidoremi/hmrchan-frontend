/**
 * 应用入口文件
 *
 * 主要功能：
 * - 初始化 Vue 应用实例
 * - 配置应用插件（Pinia、Router、i18n）
 * - 注册全局指令和错误处理器
 * - 初始化缓存系统（IndexedDB、Service Worker）
 * - 配置日志系统和性能监控
 * - 提供根组件运行环境（根组件内部负责初始化主题和设置状态）
 *
 * 初始化顺序：
 * 1. HTTPS 强制跳转（必须最先执行）
 * 2. Vue 应用和插件配置
 * 3. 样式和自定义指令
 * 4. 错误处理和日志系统
 * 5. 缓存系统和性能监控
 */

// ============================================
// 核心依赖导入
// ============================================

/** HTTPS 强制跳转工具 - 必须首先导入以拦截所有请求 */
import './utils/forceHttps'

/** Vue 核心库 */
import { createApp } from 'vue'

/** Pinia 状态管理库及持久化插件 */
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/** 根组件 */
import App from './App.vue'

/** 路由配置 */
import router from './router'

/** 国际化配置 */
import i18n from './i18n'

// ============================================
// 样式文件导入
// ============================================

/** 全局基础样式 */
import './styles/index.css'

/** 移动端优化样式 */
import './styles/mobile-optimizations.css'

/** 平板端优化样式 */
import './styles/tablet-optimizations.css'

/** 桌面端优化样式 */
import './styles/desktop-optimizations.css'

// ============================================
// 自定义指令导入
// ============================================

/** 图片懒加载指令 */
import { lazyLoad } from './directives/lazyLoad'

// ============================================
// 工具和插件导入
// ============================================

/** 日志工具 */
import logger, { LogLevel } from './utils/logger'

/** Service Worker 管理器 */
import { swManager } from './utils/serviceWorkerManager'

/** IndexedDB 存储工具 */
import { indexedDB } from './utils/storage'

/** 图片预加载插件 */
import { imagePreloadPlugin } from './plugins/imagePreload'

/** 性能监控工具 */
import { performanceMonitor } from './utils/performance/performanceMonitor'

// ============================================
// 状态管理导入
// ============================================

/** 主题状态管理 */
/** 设置状态管理 */

// ============================================
// 日志系统配置
// ============================================

/**
 * 配置日志系统
 * - 开发环境：DEBUG 级别，显示所有日志
 * - 生产环境：WARN 级别，仅显示警告和错误
 */
logger.setConfig({
  /** 日志级别 */
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN,
  /** 启用时间戳 */
  enableTimestamp: true,
  /** 启用上下文信息 */
  enableContext: true,
  /** 启用彩色输出 */
  enableColors: true,
})

/** 设置日志上下文为应用级别 */
logger.setContext({ category: 'App' })

// ============================================
// 创建 Vue 应用实例
// ============================================

/** 创建 Vue 应用实例 */
const app = createApp(App)

// ============================================
// 配置 Pinia 状态管理
// ============================================

/**
 * 创建 Pinia 实例
 * Pinia 是 Vue 3 推荐的状态管理库
 */
const pinia = createPinia()

/**
 * 使用持久化插件
 * 自动将状态保存到 localStorage，实现状态持久化
 */
pinia.use(piniaPluginPersistedstate)

// ============================================
// 注册应用插件
// ============================================

/** 注册 Pinia 状态管理 */
app.use(pinia)

/** 注册 Vue Router 路由 */
app.use(router)

/** 注册 vue-i18n 国际化 */
app.use(i18n)

/**
 * 注册图片预加载插件
 * 在浏览器空闲时预加载关键图片，提升用户体验
 */
app.use(imagePreloadPlugin, {
  /** 启用预加载功能 */
  enabled: true,
  /** 预加载优先级（low: 低优先级，不影响主要资源加载） */
  priority: 'low',
  /** 最大并发预加载数量 */
  maxConcurrent: 3,
  /** 是否仅在 WiFi 环境下预加载（false: 所有网络环境） */
  wifiOnly: false,
  /** 延迟预加载时间（毫秒） */
  delay: 1000,
  /** 关键图片选择器列表 */
  criticalSelectors: ['.hero-image', '.featured-image', '[data-critical="true"] img'],
})

// ============================================
// 注册全局指令
// ============================================

/**
 * 注册图片懒加载指令
 * 使用方式：<img v-lazy="imageUrl" />
 */
app.directive('lazy', lazyLoad)

// ============================================
// 全局错误处理
// ============================================

/**
 * Vue 全局错误处理器
 * 捕获所有 Vue 组件中未被捕获的错误
 *
 * @param err - 错误对象
 * @param instance - 发生错误的组件实例
 * @param info - Vue 特定的错误信息
 */
app.config.errorHandler = (err, instance, info) => {
  const errorMessage = (err as Error)?.message || ''

  /** 过滤 Cloudflare Insights CORS 错误（部署环境常见的第三方服务错误） */
  if (errorMessage.includes('cloudflareinsights.com') || errorMessage.includes('cdn-cgi/rum')) {
    return
  }

  logger.error('全局错误处理器捕获到错误 (DEV)', {
    component: instance?.$options?.name || '未知组件',
    info,
    error: err instanceof Error ? err.message : String(err),
  })

  /** 记录错误日志（可扩展为错误上报服务） */
  logger.critical(`Vue 错误: ${info}`, {
    component: instance?.$options?.name || '未知',
    error: err instanceof Error ? err.message : String(err),
  })
}

// ============================================
// 开发环境：控制台噪音过滤
// ============================================

/**
 * 开发环境下过滤控制台中的无关错误和警告
 * 主要过滤浏览器扩展和第三方服务产生的噪音
 */
if (import.meta.env.DEV) {
  /** 保存原始的 console.error 方法 */
  const originalError = console.error
  /** 保存原始的 console.warn 方法 */
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
        /** 过滤 Twitter 图片加载错误 */
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
   * 重写 console.error 方法
   * 过滤无关的错误信息，保持控制台清洁
   */
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || ''
    const stack = (args[0] as Error)?.stack?.toString() || ''

    /** 过滤 Cloudflare Insights CORS 错误 */
    if (
      message.includes('cloudflareinsights.com') ||
      message.includes('cdn-cgi/rum') ||
      message.includes('ERR_BLOCKED_BY_CLIENT')
    ) {
      return
    }

    /** 过滤浏览器扩展相关错误 */
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

    /** 调用原始的 console.error 方法 */
    originalError.apply(console, args)
  }

  /**
   * 重写 console.warn 方法
   * 过滤无关的警告信息
   */
  console.warn = (...args: unknown[]) => {
    const warningText = args.join(' ')

    /** 过滤 Vue 的属性和事件警告 */
    if (
      warningText.includes('Extraneous non-props attributes') ||
      warningText.includes('Extraneous non-emits event listeners')
    ) {
      return
    }

    /** 调用原始的 console.warn 方法 */
    originalWarn.apply(console, args)
  }
}

/**
 * 全局 Promise Rejection 处理器
 * 捕获所有未处理的 Promise 错误
 */
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason
  const errorMessage = error?.message || String(error)

  /** 过滤 Cloudflare Insights CORS 错误 */
  if (
    errorMessage.includes('cloudflareinsights.com') ||
    errorMessage.includes('cdn-cgi/rum') ||
    errorMessage.includes('ERR_BLOCKED_BY_CLIENT')
  ) {
    event.preventDefault()
    return
  }

  logger.error('未处理的 Promise 错误 (DEV)', {
    error: error instanceof Error ? error.message : String(error),
  })
})

// ============================================
// 挂载 Vue 应用
// ============================================

/**
 * 将 Vue 应用挂载到 DOM 元素 #app
 * 这是应用启动的关键步骤
 */
app.mount('#app')

// ============================================
// 初始化状态管理
// ============================================
/**
 * 状态管理初始化说明
 *
 * 主题和设置状态的实际初始化逻辑
 * 由根组件 App.vue 中的 initAppState 负责执行
 */
// ============================================
// 开发环境：初始化开发工具
// ============================================

/**
 * 开发环境下初始化开发辅助工具
 */
if (import.meta.env.DEV) {
  /**
   * 动态导入国际化开发工具
   * 用于检查翻译缺失和翻译质量
   */
  import('./utils/i18nDevTools').then(({ initI18nDevTools }) => {
    initI18nDevTools()
  })

  /**
   * 初始化性能监控工具
   * 在页面加载完成后生成性能报告
   */
  window.addEventListener('load', () => {
    setTimeout(() => {
      /** 生成性能报告 */
      const report = performanceMonitor.generateReport()
      logger.info('Performance report (DEV)', {
        report,
      })

      /**
       * 将性能监控工具暴露到全局对象
       * 方便在控制台中调试和查看性能数据
       */
      ;(
        window as Window & { __performanceMonitor__?: typeof performanceMonitor }
      ).__performanceMonitor__ = performanceMonitor

      /** 在控制台输出性能监控工具的使用提示 */
      logger.info('💡 性能监控工具 (DEV)', {
        usage:
          '访问: window.__performanceMonitor__ ; 生成报告: window.__performanceMonitor__.generateReport()',
      })
    }, 2000)
  })
}

// ============================================
// 初始化缓存系统
// ============================================

/**
 * 初始化 IndexedDB 数据库
 * 用于离线存储帖子数据，提供离线访问能力
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
 * 注册 Service Worker（仅生产环境）
 * 用于缓存静态资源和 API 响应，实现离线访问和加速加载
 */
if (!import.meta.env.DEV) {
  swManager
    .register()
    .then((registration) => {
      if (registration) {
        logger.info('Service Worker 注册成功', { category: 'Cache' })

        /**
         * 监听 Service Worker 更新事件
         * 当有新版本可用时通知用户
         */
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
 * 定期清理旧数据
 * 每 24 小时自动清理过期的缓存数据，避免占用过多存储空间
 */
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      /**
       * 清理 7 天前的帖子数据
       * 保持数据库大小在合理范围内
       */
      indexedDB.clearOldPosts(7).then((count) => {
        logger.info('清理旧帖子', { category: 'Cache', count })
      })

      /**
       * 清理旧媒体文件（仅生产环境）
       * 删除 Service Worker 缓存中的过期媒体资源
       */
      if (!import.meta.env.DEV) {
        swManager.clearOldMedia()
      }
    },
    /** 清理间隔：24 小时 */
    24 * 60 * 60 * 1000,
  )
}
