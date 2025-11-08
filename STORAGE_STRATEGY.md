# 前端存储策略文档

本文档探讨 Service Worker、IndexedDB 和 localStorage 在项目中的应用实践。

## 📋 目录

1. [存储方案对比](#存储方案对比)
2. [当前项目应用](#当前项目应用)
3. [推荐实践方案](#推荐实践方案)
4. [实现示例](#实现示例)

---

## 存储方案对比

### localStorage

**特点:**
- ✅ 简单易用，同步API
- ✅ 持久化存储（除非用户清除）
- ✅ 所有浏览器支持
- ❌ 容量限制：5-10MB
- ❌ 只能存储字符串
- ❌ 同步操作，可能阻塞主线程
- ❌ 不支持 Web Worker

**适用场景:**
- 小型配置数据（主题、语言设置）
- 用户偏好设置
- 简单的临时数据
- Token 和认证信息

### IndexedDB

**特点:**
- ✅ 大容量存储（通常 >50MB，可达数GB）
- ✅ 异步API，不阻塞主线程
- ✅ 支持事务和索引
- ✅ 可存储复杂对象和二进制数据
- ✅ 支持 Web Worker
- ❌ API 相对复杂
- ❌ 需要兼容性处理

**适用场景:**
- 大量数据缓存（文章列表、媒体文件）
- 离线应用数据
- 复杂查询需求
- 二进制文件（图片、视频缓存）

### Service Worker + Cache API

**特点:**
- ✅ 网络请求拦截和缓存
- ✅ 离线支持
- ✅ 后台同步
- ✅ 推送通知
- ✅ 完全控制缓存策略
- ❌ 只在 HTTPS 下工作（localhost除外）
- ❌ 生命周期管理复杂
- ❌ 调试困难

**适用场景:**
- PWA（渐进式Web应用）
- 离线功能
- 静态资源缓存
- API 响应缓存
- 后台数据同步

---

## 当前项目应用

### ✅ 已实现

#### 1. **localStorage** - 认证和用户设置

**文件:** `src/stores/auth.ts`
```typescript
// Token 持久化
localStorage.setItem('access_token', response.access_token)
localStorage.setItem('user', JSON.stringify(response))

// 读取持久化数据
const savedToken = localStorage.getItem('access_token')
const savedUser = localStorage.getItem('user')
```

**文件:** `src/stores/settings.ts`
```typescript
// 主题设置
localStorage.setItem('theme', theme)

// 语言设置
localStorage.setItem('locale', locale)
```

#### 2. **Memory Cache** - 媒体文件缓存

**文件:** `src/utils/mediaCache.ts`
```typescript
class MediaCache {
  private cache = new Map<string, MediaCacheItem>()
  // 50MB 内存缓存，使用 Object URL
}
```

**优点:** 快速访问
**缺点:** 刷新页面后丢失

#### 3. **Request Cache** - API 请求去重

**文件:** `src/utils/requestCache.ts`
```typescript
class RequestCache {
  private cache = new Map<string, CacheItem>()
  // 5分钟 TTL 缓存
}
```

---

## 推荐实践方案

### 🎯 方案一：IndexedDB 媒体文件持久化

**目标:** 将当前的内存媒体缓存升级为 IndexedDB 持久化缓存

**优势:**
- ✅ 刷新页面后缓存仍然有效
- ✅ 大容量存储（可存储数百张图片）
- ✅ 减少网络请求
- ✅ 提升加载速度

**实现位置:** `src/utils/indexedDBCache.ts`

```typescript
// 核心功能
- 存储媒体文件 Blob
- 智能过期策略（30天）
- LRU 淘汰机制
- 容量限制管理
```

---

### 🎯 方案二：Service Worker 静态资源缓存

**目标:** 缓存应用的静态资源（JS、CSS、字体）

**优势:**
- ✅ 即时加载，无需网络
- ✅ 离线可用
- ✅ 减少服务器负载
- ✅ 提升性能评分

**实现位置:** `public/service-worker.js`

```javascript
// 缓存策略
- Precache: 核心资源（app.js, index.html）
- Cache First: 静态资源（CSS, 字体, 图标）
- Network First: API 请求
- Stale While Revalidate: 媒体文件
```

---

### 🎯 方案三：IndexedDB 离线文章缓存

**目标:** 缓存用户浏览过的文章详情，支持离线阅读

**优势:**
- ✅ 离线访问最近阅读的文章
- ✅ 即时加载，提升体验
- ✅ 减少 API 调用

**实现位置:** `src/utils/offlineCache.ts`

```typescript
// 功能
- 自动缓存访问过的文章
- 最多保存 50 篇最近文章
- 显示离线标识
- 支持手动清理
```

---

### 🎯 方案四：多层缓存策略

**架构设计:**

```
┌─────────────────────────────────────┐
│         用户请求媒体文件             │
└─────────────────┬───────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Memory Cache  │ ← 最快，但易失
         │   (Map对象)    │
         └────────┬───────┘
                  │ Miss
                  ▼
         ┌────────────────┐
         │  IndexedDB     │ ← 持久化，大容量
         │ (本地数据库)   │
         └────────┬───────┘
                  │ Miss
                  ▼
         ┌────────────────┐
         │ Service Worker │ ← 网络拦截
         │  Cache API     │
         └────────┬───────┘
                  │ Miss
                  ▼
         ┌────────────────┐
         │  网络请求      │
         │  (fetch API)   │
         └────────────────┘
```

---

## 实现示例

### 示例 1: IndexedDB 媒体缓存

**文件:** `src/utils/indexedDBMediaCache.ts`

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface MediaDB extends DBSchema {
  media: {
    key: string // URL
    value: {
      url: string
      blob: Blob
      timestamp: number
      size: number
      contentType: string
    }
    indexes: { 'by-timestamp': number }
  }
}

class IndexedDBMediaCache {
  private db: IDBPDatabase<MediaDB> | null = null
  private maxAge = 30 * 24 * 60 * 60 * 1000 // 30天
  private maxSize = 100 * 1024 * 1024 // 100MB

  async init() {
    this.db = await openDB<MediaDB>('media-cache', 1, {
      upgrade(db) {
        const store = db.createObjectStore('media', { keyPath: 'url' })
        store.createIndex('by-timestamp', 'timestamp')
      },
    })
  }

  async get(url: string): Promise<Blob | null> {
    if (!this.db) await this.init()
    
    const item = await this.db!.get('media', url)
    if (!item) return null

    // 检查是否过期
    if (Date.now() - item.timestamp > this.maxAge) {
      await this.delete(url)
      return null
    }

    return item.blob
  }

  async set(url: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init()

    // 检查容量
    await this.evictIfNeeded(blob.size)

    await this.db!.put('media', {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size,
      contentType: blob.type,
    })
  }

  async delete(url: string): Promise<void> {
    if (!this.db) await this.init()
    await this.db!.delete('media', url)
  }

  async evictIfNeeded(newSize: number): Promise<void> {
    const items = await this.db!.getAllFromIndex('media', 'by-timestamp')
    let totalSize = items.reduce((sum, item) => sum + item.size, 0)

    // 如果超过限制，删除最旧的
    let index = 0
    while (totalSize + newSize > this.maxSize && index < items.length) {
      await this.delete(items[index].url)
      totalSize -= items[index].size
      index++
    }
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()
    await this.db!.clear('media')
  }

  async getStats() {
    if (!this.db) await this.init()
    const items = await this.db!.getAll('media')
    
    const totalSize = items.reduce((sum, item) => sum + item.size, 0)
    
    return {
      count: items.length,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      utilization: ((totalSize / this.maxSize) * 100).toFixed(2) + '%',
    }
  }
}

export const indexedDBMediaCache = new IndexedDBMediaCache()
```

---

### 示例 2: Service Worker 基本配置

**文件:** `public/service-worker.js`

```javascript
const CACHE_NAME = 'hmrchan-v1'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'

// 预缓存资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting()
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch 事件 - 缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API 请求 - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // 媒体文件 - Cache First
  if (request.destination === 'image' || request.destination === 'video') {
    event.respondWith(cacheFirst(request))
    return
  }

  // 静态资源 - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request))
})

// 缓存优先策略
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  const cache = await caches.open(DYNAMIC_CACHE)
  cache.put(request, response.clone())
  
  return response
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(DYNAMIC_CACHE)
    cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached
    throw error
  }
}

// 陈旧内容重新验证策略
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)
  
  const fetchPromise = fetch(request).then((response) => {
    const cache = caches.open(DYNAMIC_CACHE)
    cache.then((c) => c.put(request, response.clone()))
    return response
  })

  return cached || fetchPromise
}
```

**注册 Service Worker:**

**文件:** `src/main.ts`

```typescript
// 注册 Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration)
      })
      .catch((error) => {
        console.error('SW registration failed:', error)
      })
  })
}
```

---

### 示例 3: 混合缓存策略

**文件:** `src/utils/hybridCache.ts`

```typescript
import { indexedDBMediaCache } from './indexedDBMediaCache'
import { mediaCache } from './mediaCache'

/**
 * 混合缓存策略：Memory + IndexedDB
 */
export class HybridMediaCache {
  async get(url: string): Promise<string> {
    // 1. 先查内存缓存（最快）
    const memCached = await mediaCache.get(url)
    if (memCached) {
      console.log('[HybridCache] Memory hit:', url)
      return memCached
    }

    // 2. 查 IndexedDB（持久化）
    const idbCached = await indexedDBMediaCache.get(url)
    if (idbCached) {
      console.log('[HybridCache] IndexedDB hit:', url)
      // 写回内存缓存
      const objectUrl = await mediaCache.set(url, idbCached)
      return objectUrl
    }

    // 3. 从网络获取
    console.log('[HybridCache] Fetching from network:', url)
    const response = await fetch(url)
    const blob = await response.blob()

    // 同时写入两层缓存
    await Promise.all([
      mediaCache.set(url, blob),
      indexedDBMediaCache.set(url, blob),
    ])

    return URL.createObjectURL(blob)
  }

  async preload(url: string): Promise<void> {
    // 预加载到 IndexedDB
    const blob = await fetch(url).then((r) => r.blob())
    await indexedDBMediaCache.set(url, blob)
  }

  async clear(): Promise<void> {
    mediaCache.clear()
    await indexedDBMediaCache.clear()
  }

  async getStats() {
    const memStats = mediaCache.getStats()
    const idbStats = await indexedDBMediaCache.getStats()
    
    return {
      memory: memStats,
      indexedDB: idbStats,
    }
  }
}

export const hybridCache = new HybridMediaCache()
```

---

## 🎯 实施建议

### 第一阶段：基础优化（1-2天）

1. ✅ **完善 localStorage 使用**
   - 统一的 key 命名规范
   - 错误处理和降级方案
   - 容量监控

2. ✅ **添加 autocomplete 属性**
   - 所有密码输入框
   - 提升用户体验和安全性

### 第二阶段：IndexedDB 集成（3-5天）

1. **实现 IndexedDB 媒体缓存**
   - 集成 `idb` 库
   - 替换现有内存缓存
   - 添加缓存管理界面

2. **测试和优化**
   - 边界情况测试
   - 性能监控
   - 错误恢复

### 第三阶段：Service Worker（5-7天）

1. **实现基础 Service Worker**
   - 静态资源缓存
   - 离线支持
   - 版本管理

2. **PWA 功能**
   - manifest.json
   - 安装提示
   - 离线页面

### 第四阶段：高级功能（可选）

1. **后台同步**
   - 离线操作队列
   - 网络恢复后同步

2. **推送通知**
   - 新内容提醒
   - 用户交互

---

## 📊 性能对比

| 存储方式 | 读取速度 | 容量 | 持久化 | 复杂度 |
|---------|---------|------|--------|--------|
| Memory Cache | ⭐⭐⭐⭐⭐ | 小 | ❌ | ⭐ |
| localStorage | ⭐⭐⭐⭐ | 5-10MB | ✅ | ⭐ |
| IndexedDB | ⭐⭐⭐ | >50MB | ✅ | ⭐⭐⭐ |
| Service Worker | ⭐⭐⭐⭐ | 无限制* | ✅ | ⭐⭐⭐⭐ |

*受浏览器配额限制

---

## 🔧 开发工具

### Chrome DevTools

- **Application Tab** → Storage
  - localStorage 查看和编辑
  - IndexedDB 浏览器
  - Cache Storage 管理
  - Service Worker 调试

### 推荐库

```json
{
  "idb": "^7.1.1",                    // IndexedDB 包装器
  "workbox-webpack-plugin": "^6.5.4", // Service Worker 工具
  "localforage": "^1.10.0"            // 统一存储 API
}
```

---

## 📝 总结

**当前项目最适合的方案：**

1. **保留 localStorage** - 用于小型配置和 Token
2. **升级到 IndexedDB** - 用于媒体文件持久化缓存
3. **渐进式引入 Service Worker** - 实现 PWA 离线功能

**优先级：**
```
高：IndexedDB 媒体缓存 > autocomplete 修复
中：Service Worker 静态资源
低：推送通知、后台同步
```

这种分层架构能够在性能、复杂度和用户体验之间取得最佳平衡。
