# Store 使用指南

## 快速参考

### 可用的 Stores

| Store              | 用途           | 持久化      | 存储位置       |
| ------------------ | -------------- | ----------- | -------------- |
| `useAuthStore`     | 用户认证和授权 | ✅          | sessionStorage |
| `usePostsStore`    | 内容列表和详情 | ✅ (仅筛选) | sessionStorage |
| `useSettingsStore` | 用户设置       | ✅          | localStorage   |
| `useThemeStore`    | 主题管理       | ✅          | localStorage   |
| `useToastStore`    | 通知消息       | ❌          | -              |
| `useNetworkStore`  | 网络状态       | ❌          | -              |
| `useCounterStore`  | 示例 Store     | ❌          | -              |

## 基本使用

### 1. 在组件中使用 Store

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'

// 获取 store 实例
const authStore = useAuthStore()

// 使用 storeToRefs 保持响应式
const { user, isAuthenticated, loading } = storeToRefs(authStore)

// 直接调用 actions
async function handleLogin() {
  await authStore.login({ username: 'user', password: 'pass' })
}
</script>
```

### 2. 在其他 Store 中使用

```typescript
import { useAuthStore } from './auth'

export const usePostsStore = defineStore('posts', () => {
  async function fetchPosts() {
    const authStore = useAuthStore()

    if (!authStore.isAuthenticated) {
      console.warn('User not authenticated')
      return
    }

    // 继续获取数据...
  }

  return { fetchPosts }
})
```

### 3. 在路由守卫中使用

```typescript
import { useAuthStore } from '@/stores/auth'

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})
```

## Store API 参考

### useAuthStore

**状态**

- `user: User | null` - 当前用户信息
- `token: string | null` - 认证令牌
- `loading: boolean` - 加载状态
- `error: string | null` - 错误信息

**计算属性**

- `isAuthenticated: boolean` - 是否已认证
- `isAdmin: boolean` - 是否为管理员

**方法**

- `register(data)` - 注册新用户
- `login(credentials)` - 用户登录
- `logout()` - 用户登出
- `fetchCurrentUser()` - 获取当前用户信息
- `restoreAuth()` - 从存储恢复认证状态

**示例**

```typescript
const authStore = useAuthStore()

// 登录
await authStore.login({
  username: 'user@example.com',
  password: 'password123',
})

// 检查认证状态
if (authStore.isAuthenticated) {
  console.log('User:', authStore.user)
}

// 登出
authStore.logout()
```

### usePostsStore

**状态**

- `posts: Post[]` - 内容列表
- `currentPost: PostDetail | null` - 当前内容详情
- `loading: boolean` - 加载状态
- `error: string | null` - 错误信息
- `pagination` - 分页信息
- `filters` - 筛选参数

**方法**

- `fetchPosts(params?)` - 获取内容列表
- `fetchPost(postId)` - 获取单个内容详情
- `fetchPostsByPlatform(platform, params?)` - 按平台获取内容
- `searchPosts(query, params?)` - 搜索内容
- `updateFilters(newFilters)` - 更新筛选
- `resetFilters()` - 重置筛选
- `nextPage()` - 下一页
- `prevPage()` - 上一页
- `goToPage(page)` - 跳转到指定页
- `clearStore()` - 清空所有状态

**示例**

```typescript
const postsStore = usePostsStore()

// 获取内容列表
await postsStore.fetchPosts({
  page: 1,
  page_size: 20,
  platform: 'xiaohongshu',
})

// 搜索内容
await postsStore.searchPosts('关键词')

// 更新筛选
postsStore.updateFilters({
  sort_by: 'likes_count',
  sort_order: 'desc',
})

// 分页
await postsStore.nextPage()
```

### useSettingsStore

**状态**

- `settings: UserSettings` - 用户设置对象
- `syncing: boolean` - 同步状态
- `lastSyncedAt: Date | null` - 最后同步时间
- `error: string | null` - 错误信息

**方法**

- `initSettings()` - 初始化设置
- `updateSetting(key, value)` - 更新单个设置
- `toggleSetting(key)` - 切换布尔值设置
- `resetSettings()` - 重置所有设置
- `exportSettings()` - 导出设置
- `importSettings(json)` - 导入设置
- `syncToServer()` - 同步到服务器
- `loadFromServer()` - 从服务器加载

**示例**

```typescript
const settingsStore = useSettingsStore()

// 初始化（应用启动时调用）
settingsStore.initSettings()

// 更新设置
await settingsStore.updateSetting('enableAnimations', false)

// 切换设置
await settingsStore.toggleSetting('showHeroSection')

// 同步到服务器
await settingsStore.syncToServer()
```

### useThemeStore

**状态**

- `theme: Theme` - 主题模式 ('light' | 'dark' | 'auto')
- `isDark: boolean` - 是否为暗色主题

**方法**

- `initTheme()` - 初始化主题
- `setTheme(newTheme)` - 设置主题
- `toggleTheme()` - 切换主题

**示例**

```typescript
const themeStore = useThemeStore()

// 初始化（应用启动时调用）
themeStore.initTheme()

// 设置主题
themeStore.setTheme('dark')

// 切换主题
themeStore.toggleTheme()

// 检查当前主题
if (themeStore.isDark) {
  console.log('Dark mode is active')
}
```

### useToastStore

**状态**

- `toasts: Toast[]` - 当前显示的通知列表

**方法**

- `addToast(toast)` - 添加通知
- `removeToast(id)` - 移除通知
- `clearAll()` - 清除所有通知
- `success(message, title?, duration?)` - 成功提示
- `error(message, title?, duration?)` - 错误提示
- `warning(message, title?, duration?)` - 警告提示
- `info(message, title?, duration?)` - 信息提示

**示例**

```typescript
const toastStore = useToastStore()

// 显示成功提示
toastStore.success('操作成功！')

// 显示错误提示（持续时间更长）
toastStore.error('操作失败，请重试', '错误')

// 显示警告
toastStore.warning('请注意数据安全', '警告', 6000)

// 自定义通知
toastStore.addToast({
  type: 'info',
  message: '自定义消息',
  title: '提示',
  duration: 3000,
})
```

### useNetworkStore

**状态**

- `isOnline: boolean` - 是否在线
- `lastChangeAt: Date | null` - 最后状态变化时间

**方法**

- `init()` - 初始化网络状态监听
- `updateStatus(status)` - 手动更新状态（用于测试）

**示例**

```typescript
const networkStore = useNetworkStore()

// 初始化（应用启动时调用）
networkStore.init()

// 检查网络状态
if (!networkStore.isOnline) {
  console.warn('当前离线')
}

// 监听状态变化
watch(
  () => networkStore.isOnline,
  (isOnline) => {
    if (isOnline) {
      console.log('网络已恢复')
    } else {
      console.log('网络已断开')
    }
  },
)
```

## 最佳实践

### 1. 使用 storeToRefs 保持响应式

❌ **错误**

```typescript
const authStore = useAuthStore()
const { user } = authStore // 失去响应式
```

✅ **正确**

```typescript
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore) // 保持响应式
```

### 2. 在 setup 中初始化 Store

```typescript
// App.vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useNetworkStore } from '@/stores/network'
import { useSettingsStore } from '@/stores/settings'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const networkStore = useNetworkStore()
const settingsStore = useSettingsStore()

onMounted(() => {
  // 初始化各个 stores
  authStore.restoreAuth()
  themeStore.initTheme()
  networkStore.init()
  settingsStore.initSettings()
})
</script>
```

### 3. 错误处理

所有 store actions 都会自动处理错误并显示 toast 通知。如果需要自定义错误处理：

```typescript
try {
  await authStore.login(credentials)
  // 登录成功后的逻辑
  router.push('/dashboard')
} catch (error) {
  // 自定义错误处理
  console.error('Login failed:', error)
}
```

### 4. 清理状态

在用户登出时，记得清理相关状态：

```typescript
function handleLogout() {
  authStore.logout() // 会自动清理 sessionStorage
  postsStore.clearStore()
  router.push('/login')
}
```

### 5. 性能优化

对于频繁访问的计算属性，使用 computed：

```typescript
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 缓存计算结果
const userDisplayName = computed(() => {
  return authStore.user?.full_name || authStore.user?.username || 'Guest'
})
```

## 调试技巧

### 1. 使用 Vue DevTools

安装 Vue DevTools 浏览器扩展，可以实时查看和修改 store 状态。

### 2. 查看日志

所有 stores 都集成了 logger，在开发环境中会输出详细日志：

```typescript
// 在浏览器控制台中过滤日志
// 例如：只看 AuthStore 的日志
// 搜索：[AuthStore]
```

### 3. 检查持久化数据

```javascript
// 在浏览器控制台中查看持久化数据
console.log('Auth:', sessionStorage.getItem('auth'))
console.log('Posts:', sessionStorage.getItem('posts'))
console.log('Theme:', localStorage.getItem('theme'))
console.log('Settings:', localStorage.getItem('user-settings'))
```

## 常见问题

### Q: Store 状态没有持久化？

A: 检查以下几点：

1. 确保安装了 `pinia-plugin-persistedstate`
2. 确保在 main.ts 中注册了插件
3. 检查浏览器是否禁用了 localStorage/sessionStorage

### Q: 为什么 theme 不需要手动保存到 localStorage？

A: theme store 使用了 Pinia persist 插件，会自动保存和恢复状态。

### Q: 如何在 Composition API 外使用 Store？

A: 在 setup 外使用 store 需要先创建 pinia 实例：

```typescript
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const pinia = createPinia()
const authStore = useAuthStore(pinia)
```

### Q: Store 之间如何通信？

A: 直接在一个 store 中导入和使用另一个 store：

```typescript
import { useAuthStore } from './auth'

export const usePostsStore = defineStore('posts', () => {
  function someAction() {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      // ...
    }
  }
})
```

## 相关文档

- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Store 优化总结](./store-optimization-summary.md)
- [错误处理指南](../src/utils/errorHandler.ts)
- [日志系统指南](../src/utils/logger.ts)
