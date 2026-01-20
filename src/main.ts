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
import { initConsoleFilter } from './utils/consoleFilter'
initConsoleFilter()

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

// 初始化认证状态（同步，确保路由守卫正常工作）
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.initAuth()
authStore.setupAuthListener()

// 初始化设备指纹（异步，不阻塞应用启动）
import { initFingerprint } from './utils/fingerprint'
initFingerprint().catch(() => {
  // 指纹初始化失败不影响应用运行
})

app.mount('#app')

// 非关键任务：使用现代 Scheduler API 在空闲时执行
import { scheduleTask } from './utils/modernAPIs'

// Service Worker 注册：页面加载完成后尽快注册（user-visible 优先级）
// 这样可以更早地启用离线缓存和资源预缓存
scheduleTask(
  () => import('./utils/cache').then(({ registerServiceWorker }) => registerServiceWorker()),
  { priority: 'user-visible', delay: 1000 } // 延迟 1 秒，确保首屏渲染完成
)
