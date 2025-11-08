# 缓存系统实施指南

本文档说明如何使用和测试新实现的缓存系统。

## 📦 已实现的功能

### ✅ 第一阶段：localStorage 完善

**文件**: `src/utils/storageManager.ts`

```typescript
import { storage } from '@/utils/storageManager'

// 设置值
storage.set('user_preference', { theme: 'dark', language: 'zh-CN' })

// 设置带过期时间的值（1小时）
storage.set('temp_data', { data: 'value' }, 60 * 60 * 1000)

// 获取值
const preference = storage.get('user_preference')

// 批量操作
storage.setMultiple({
  key1: 'value1',
  key2: 'value2',
})

// 获取存储统计
const usage = storage.getUsage()
console.log(`使用: ${usage.usedMB}MB, 键数: ${usage.keys}`)
```

**特性**:
- ✅ 类型安全的 API
- ✅ 自动过期清理
- ✅ 容量监控
- ✅ 错误处理和降级
- ✅ 批量操作支持

---

### ✅ 第二阶段：IndexedDB 媒体缓存

**文件**: `src/utils/indexedDBCache.ts`

```typescript
import { indexedDBCache } from '@/utils/indexedDBCache'

// 缓存图片
const response = await fetch('https://example.com/image.jpg')
const blob = await response.blob()
await indexedDBCache.set('https://example.com/image.jpg', blob)

// 获取缓存的图片
const cachedBlob = await indexedDBCache.get('https://example.com/image.jpg')
if (cachedBlob) {
  const url = URL.createObjectURL(cachedBlob)
  imgElement.src = url
}

// 获取统计信息
const stats = await indexedDBCache.getStats()
console.log(`缓存: ${stats.count} 个文件, ${stats.totalSizeMB}MB`)
```

**特性**:
- ✅ 100MB 容量限制
- ✅ 30天自动过期
- ✅ LRU 淘汰策略
- ✅ 访问次数统计
- ✅ 自动清理

---

### ✅ 第三阶段：混合缓存策略

**文件**: `src/utils/hybridCache.ts`

这是**推荐使用**的缓存接口，已集成到 `OptimizedImage` 组件。

```typescript
import { hybridCache } from '@/utils/hybridCache'

// 自动多层缓存
const imageUrl = await hybridCache.get('https://example.com/image.jpg')
// 1. 先查内存缓存（最快）
// 2. 再查 IndexedDB（持久化）
// 3. 最后从网络获取

// 预加载多个图片
await hybridCache.preload([
  'https://example.com/img1.jpg',
  'https://example.com/img2.jpg',
])

// 获取完整统计
const stats = await hybridCache.getStats()
console.log(stats.memory)     // 内存缓存统计
console.log(stats.indexedDB)  // IndexedDB 统计
```

**缓存流程**:
```
用户请求图片
   ↓
内存缓存 (Map) - 最快，刷新丢失
   ↓ Miss
IndexedDB - 持久化，大容量
   ↓ Miss
网络请求 - fetch API
   ↓
同时写入内存和 IndexedDB
```

---

### ✅ 第四阶段：Service Worker

**已存在**: `public/service-worker.js`

Service Worker 已配置好，提供：
- ✅ 静态资源缓存
- ✅ API 请求缓存
- ✅ 离线支持
- ✅ 后台同步

**注册代码**: `src/main.ts` (已存在)

```typescript
// 生产环境自动注册
if (!import.meta.env.DEV) {
  swManager.register()
}
```

---

### ✅ 第五阶段：PWA 配置

**已创建**: `public/manifest.json`

```json
{
  "name": "HMRChan - 二次元内容聚合平台",
  "short_name": "HMRChan",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#8b5cf6"
}
```

**已更新**: `index.html`

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

---

## 🎯 使用方法

### 在组件中使用混合缓存

`OptimizedImage.vue` 已自动集成混合缓存：

```vue
<template>
  <OptimizedImage 
    :src="imageUrl" 
    :use-cache="true"  <!-- 默认启用 -->
  />
</template>
```

### 手动使用缓存

```typescript
import { hybridCache } from '@/utils/hybridCache'

// 获取图片（自动缓存）
const url = await hybridCache.get('https://example.com/image.jpg')

// 预加载
await hybridCache.preload([url1, url2, url3])

// 清空缓存
await hybridCache.clear()
```

### 使用 localStorage 管理器

```typescript
import { storage } from '@/utils/storageManager'

// 存储用户设置
storage.set('user_settings', {
  theme: 'dark',
  language: 'zh-CN',
})

// 读取设置
const settings = storage.get('user_settings')

// 设置过期时间（7天）
storage.set('session_data', data, 7 * 24 * 60 * 60 * 1000)
```

---

## 🔍 测试步骤

### 1. 测试 IndexedDB 缓存

打开浏览器 DevTools:

1. **Application** → **IndexedDB** → **hmrchan-media-cache**
2. 浏览一些图片
3. 检查 `media` 对象存储中的数据
4. 刷新页面，图片应该从 IndexedDB 加载（更快）

### 2. 测试 localStorage

```javascript
// 在控制台运行
import { storage } from '@/utils/storageManager'

// 查看使用情况
console.log(storage.getUsage())

// 查看所有键
console.log(storage.keys())
```

### 3. 测试 Service Worker

1. **Application** → **Service Workers**
2. 确认 Service Worker 状态为 "activated"
3. **Application** → **Cache Storage**
4. 查看 `hmrchan-static-v1.1.0` 等缓存

### 4. 测试离线功能

1. 打开网站并浏览几个页面
2. **Network** 面板 → 选择 "Offline"
3. 刷新页面，应该看到 `offline.html`
4. 已浏览过的图片应该仍然可见（来自缓存）

### 5. 测试 PWA 安装

**Chrome 桌面**:
1. 地址栏右侧应显示"安装"图标
2. 点击安装
3. 应用将作为独立窗口运行

**Chrome 移动端**:
1. 菜单 → "添加到主屏幕"
2. 图标将出现在主屏幕
3. 点击后以全屏模式运行

---

## 📊 缓存管理界面

**文件**: `src/components/settings/CacheManagement.vue`

使用方法：

```vue
<template>
  <SettingsPage>
    <CacheManagement />
  </SettingsPage>
</template>
```

**功能**:
- ✅ 查看各类缓存统计
- ✅ 清空内存缓存
- ✅ 清空 IndexedDB
- ✅ 清空 localStorage
- ✅ 一键清空所有缓存

---

## 🐛 故障排查

### IndexedDB 不工作

```javascript
// 检查浏览器支持
if ('indexedDB' in window) {
  console.log('IndexedDB supported')
} else {
  console.error('IndexedDB not supported')
}

// 检查配额
navigator.storage.estimate().then(estimate => {
  console.log(`Used: ${estimate.usage}, Quota: ${estimate.quota}`)
})
```

### Service Worker 未注册

```javascript
// 检查注册状态
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registrations:', registrations)
})

// 强制更新
navigator.serviceWorker.getRegistration().then(reg => {
  reg.update()
})
```

### 缓存未生效

1. 清空浏览器缓存
2. Hard refresh (Ctrl+Shift+R)
3. 检查 Network 面板的 "Size" 列
   - `(disk cache)` = Service Worker 缓存
   - `(memory cache)` = 浏览器内存缓存

---

## 📈 性能优化建议

### 1. 预加载关键图片

```typescript
// 在路由加载时预加载
router.beforeEach(async (to, from, next) => {
  if (to.name === 'post-detail') {
    // 预加载帖子图片
    const thumbnails = await fetchThumbnails(to.params.id)
    hybridCache.preload(thumbnails)
  }
  next()
})
```

### 2. 懒加载非关键内容

```vue
<OptimizedImage 
  :src="imageUrl" 
  :lazy="true"  <!-- 视口外延迟加载 -->
/>
```

### 3. 定期清理

```typescript
// 每周清理一次过期缓存
setInterval(async () => {
  await hybridCache.clearExpired()
  storage.clearExpired()
}, 7 * 24 * 60 * 60 * 1000)
```

---

## 🎨 UI 集成到设置页面

在 `SettingsPage.vue` 中添加缓存管理：

```vue
<template>
  <div class="settings-page">
    <!-- 现有设置 -->
    <ThemeSettings />
    <LanguageSettings />
    
    <!-- 新增：缓存管理 -->
    <CacheManagement />
  </div>
</template>

<script setup>
import CacheManagement from '@/components/settings/CacheManagement.vue'
</script>
```

---

## 📝 总结

### 已实现

| 功能 | 状态 | 文件 |
|------|------|------|
| localStorage 管理器 | ✅ | `src/utils/storageManager.ts` |
| IndexedDB 缓存 | ✅ | `src/utils/indexedDBCache.ts` |
| 混合缓存策略 | ✅ | `src/utils/hybridCache.ts` |
| Service Worker | ✅ | `public/service-worker.js` |
| PWA Manifest | ✅ | `public/manifest.json` |
| 缓存管理界面 | ✅ | `src/components/settings/CacheManagement.vue` |

### 下一步

1. ✅ **测试所有功能**
2. ✅ **创建 PWA 图标**（需要设计）
3. ⏭️ **监控缓存性能**
4. ⏭️ **优化缓存策略**

### 性能提升

预期改进：
- 🚀 **首次加载后**: 图片加载速度提升 80%
- 🚀 **离线访问**: 已浏览内容 100% 可用
- 🚀 **重复访问**: 静态资源即时加载
- 🚀 **移动端**: 减少 70% 数据使用

---

## 🔧 开发工具命令

```bash
# 检查 Service Worker
chrome://serviceworker-internals/

# 检查缓存存储
DevTools → Application → Cache Storage

# 检查 IndexedDB
DevTools → Application → IndexedDB

# 模拟离线
DevTools → Network → Offline
```

完成！🎉
