/**
 * Application Entry Point
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

// 初始化认证状态
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.initAuth()
authStore.setupAuthListener()

app.mount('#app')

// 注册 Service Worker（生产环境）
import { registerServiceWorker } from './utils/cache'
registerServiceWorker()
