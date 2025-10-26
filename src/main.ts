import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

// 导入样式
import './styles/index.css'

// 创建应用
const app = createApp(App)

// 创建Pinia实例并配置持久化
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 使用插件
app.use(pinia)
app.use(router)
app.use(i18n)

// 挂载应用
app.mount('#app')
