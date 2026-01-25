# Service Worker 缓存管理最佳实践

## 问题背景

Service Worker 缓存可能导致以下问题：

- 用户看到旧版本的应用
- 新的 CSP 策略、安全更新无法及时生效
- 调试困难，需要手动清除缓存

## 解决方案

### 1. 自动化版本管理

**实现**：`scripts/update-sw-version.js`

每次构建前自动更新 Service Worker 缓存版本，确保：

- 版本号与 `package.json` 同步
- 使用时间戳确保唯一性
- 自动更新版本注释

**使用**：

```bash
# 构建时自动运行
bun run build

# 手动运行
node scripts/update-sw-version.js
```

### 2. 客户端更新检测

**实现**：`src/utils/sw-update-checker.ts`

功能：

- 定期检查 SW 更新（默认 30 分钟）
- 页面可见时检查更新
- 检测到更新时显示 Toast 提示
- 用户可选择立即更新或稍后

**集成**：已在 `src/main.ts` 中自动初始化

**配置选项**：

```typescript
initSwUpdateChecker({
  checkInterval: 30 * 60 * 1000, // 检查间隔
  autoRefresh: false, // 是否自动刷新
  showToast: true, // 是否显示提示
})
```

### 3. 开发者调试面板

**实现**：`src/components/dev/SwDebugPanel.vue`

功能（仅开发环境）：

- 查看 SW 状态和缓存版本
- 手动检查更新
- 强制更新 SW
- 清除所有缓存
- 注销 SW
- 刷新页面

**使用**：在 `App.vue` 中添加：

```vue
<template>
  <div id="app">
    <!-- 其他内容 -->
    <SwDebugPanel />
  </div>
</template>

<script setup lang="ts">
import SwDebugPanel from '@/components/dev/SwDebugPanel.vue'
</script>
```

### 4. Service Worker 更新策略

**关键配置**：

```javascript
// public/sw.js

// 安装时立即激活
self.addEventListener('install', (event) => {
  event.waitUntil(
    // ... 缓存资源
    self.skipWaiting() // 立即激活新 SW
  )
})

// 激活时清理旧缓存并接管所有页面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // ... 清理旧缓存
    self.clients.claim() // 立即控制所有页面
  )
})

// 支持 SKIP_WAITING 消息
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
```

## 工作流程

### 开发阶段

1. **修改代码**
2. **运行构建**：`bun run build`
   - 自动更新 SW 版本
   - 生成新的缓存标识
3. **部署到 Cloudflare Pages**
4. **用户访问**：
   - SW 检测到新版本
   - 显示更新提示
   - 用户点击"立即更新"
   - 页面刷新，加载新版本

### 调试阶段

**方法 1：使用调试面板**（推荐）

1. 开发环境下右下角显示"🔧 SW Debug"按钮
2. 点击打开调试面板
3. 使用各种调试功能

**方法 2：浏览器开发者工具**

1. F12 → Application → Service Workers
2. 勾选"Update on reload"
3. 点击"Unregister"注销 SW

**方法 3：编程方式**

```typescript
import { clearAllCaches, unregisterServiceWorker } from '@/utils/sw-update-checker'

// 清除所有缓存
await clearAllCaches()

// 注销 Service Worker
await unregisterServiceWorker()
```

## 版本管理策略

### 缓存版本格式

```
v{major}-{minor}-{patch}-{timestamp}
```

示例：`v1-0-0-1706198400000`

### 版本更新触发条件

1. **主版本更新**（major）：破坏性变更
2. **次版本更新**（minor）：新功能
3. **补丁版本更新**（patch）：Bug 修复
4. **每次构建**：时间戳变化

### 缓存清理策略

```javascript
// 激活时自动清理旧版本缓存
cacheNames
  .filter((name) => {
    return name.startsWith('hmrchan-') && !Object.values(CACHE_NAMES).includes(name)
  })
  .map((name) => caches.delete(name))
```

## 用户体验优化

### 更新提示设计

```typescript
// Toast 提示
toastStore.info('发现新版本', {
  duration: 0, // 不自动关闭
  action: {
    label: '立即更新',
    onClick: () => {
      // 激活新 SW 并刷新
    },
  },
})
```

### 更新时机选择

- ✅ **推荐**：用户主动触发（点击"立即更新"）
- ⚠️ **谨慎**：页面可见时自动更新
- ❌ **不推荐**：检测到更新立即刷新

## 常见问题

### Q1: 为什么用户看到的还是旧版本？

**原因**：

1. Service Worker 缓存了旧版本
2. 浏览器缓存了 HTML
3. CDN 缓存了静态资源

**解决**：

1. 更新 SW 版本号（自动）
2. 用户强制刷新（Ctrl+Shift+R）
3. 清除浏览器缓存

### Q2: 如何确保关键更新立即生效？

**方案 1**：增加检查频率

```typescript
initSwUpdateChecker({
  checkInterval: 5 * 60 * 1000, // 5 分钟
})
```

**方案 2**：关键更新时自动刷新

```typescript
initSwUpdateChecker({
  autoRefresh: true, // 仅用于紧急安全更新
})
```

### Q3: 开发时如何禁用 SW 缓存？

**方法 1**：浏览器设置

- F12 → Application → Service Workers
- 勾选"Bypass for network"

**方法 2**：条件注册

```typescript
// src/utils/cache.ts
if (import.meta.env.PROD) {
  registerServiceWorker()
}
```

## 监控和日志

### 关键指标

1. **SW 激活率**：成功激活的用户比例
2. **更新延迟**：从发布到用户更新的时间
3. **缓存命中率**：缓存有效性
4. **更新失败率**：更新过程中的错误

### 日志记录

```typescript
// 记录 SW 生命周期事件
navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('[SW] New version activated')
  // 上报到监控服务
})
```

## 最佳实践总结

### ✅ 应该做的

1. **每次构建自动更新版本**
2. **定期检查更新**（30 分钟）
3. **提供用户友好的更新提示**
4. **支持手动强制更新**
5. **开发环境提供调试工具**
6. **监控 SW 更新状态**

### ❌ 不应该做的

1. **手动管理版本号**
2. **强制用户立即更新**
3. **缓存关键安全资源**（如 CSP 头部）
4. **忽略更新失败**
5. **在生产环境禁用 SW**

## 相关文件

- `scripts/update-sw-version.js` - 版本自动更新脚本
- `src/utils/sw-update-checker.ts` - 客户端更新检测器
- `src/components/dev/SwDebugPanel.vue` - 开发者调试面板
- `public/sw.js` - Service Worker 主文件
- `src/main.ts` - SW 初始化入口

## 参考资源

- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
- [Workbox - Google](https://developers.google.com/web/tools/workbox)
