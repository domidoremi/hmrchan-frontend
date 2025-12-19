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

const app = createApp(App)

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

app.mount('#app')

// 非关键任务：使用现代 Scheduler API 在空闲时执行
import { scheduleTask } from './utils/modernAPIs'

// Service Worker 注册延迟到空闲时（background 优先级）
scheduleTask(
  () => import('./utils/cache').then(({ registerServiceWorker }) => registerServiceWorker()),
  { priority: 'background' }
)
