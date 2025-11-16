# 缓存优化实施文档

## 概述

本文档描述了任务 13 "优化缓存策略" 的实施细节，包括多层缓存管理器、Service Worker 优化和 API 层集成。

## 实施内容

### 13.1 创建 CacheManager 类

**文件**: `src/utils/cache/CacheManager.ts`

实现了一个完整的多层缓存管理器，具有以下特性：

#### 核心功能

1. **多层缓存架构**
   - 第一层：内存缓存（Map 存储，快速访问）
   - 第二层：IndexedDB 持久化缓存（离线支持）
   - 自动提升：从 IndexedDB 读取的数据自动提升到内存缓存

2. **LRU 缓存清理**
   - 使用双向链表实现 LRU（Least Recently Used）算法
   - 自动驱逐最少使用的缓存条目
   - 可配置的最大缓存容量

3. **缓存预热**
   - 支持预加载指定的缓存键
   - 应用启动时自动从 IndexedDB 加载关键数据到内存

4. **TTL 管理**
   - 每个缓存条目都有独立的 TTL（Time To Live）
   - 自动清理过期缓存
   - 定时器每 5 分钟执行一次清理

5. **缓存统计**
   - 跟踪命中率、未命中率
   - 内存缓存和持久化缓存的独立统计
   - 驱逐次数统计

#### 使用示例

```typescript
import { cacheManager } from '@/utils/cache/CacheManager'

// 设置缓存
await cacheManager.set('user:123', userData, 5 * 60 * 1000) // 5分钟 TTL

// 获取缓存
const user = await cacheManager.get('user:123')

// 删除缓存
await cacheManager.delete('user:123')

// 获取统计
const stats = cacheManager.getStats()
console.log(`命中率: ${stats.hitRate}%`)
```

### 13.2 优化 Service Worker 缓存

**文件**: `public/service-worker.js`

对 Service Worker 进行了全面优化，实现了智能缓存策略：

#### 优化内容

1. **缓存大小限制**

   ```javascript
   const CACHE_LIMITS = {
     [API_CACHE]: 100, // API 缓存最多100条
     [IMAGE_CACHE]: 200, // 图片缓存最多200张
     [STATIC_CACHE]: 50, // 静态资源最多50个
     [FONT_CACHE]: 20, // 字体最多20个
   }
   ```

2. **缓存元数据管理**
   - 跟踪每个缓存条目的时间戳、TTL、访问次数
   - 支持基于 TTL 的过期检查
   - LRU 访问时间记录

3. **Stale-While-Revalidate 策略**
   - 立即返回缓存内容（即使过期）
   - 后台异步更新缓存
   - 提供最佳用户体验

4. **智能缓存清理**
   - LRU 算法自动清理最旧的缓存
   - 定期清理过期缓存（每 30 分钟）
   - 手动触发清理支持

5. **后台更新**
   - 不阻塞响应的后台缓存更新
   - 自动更新元数据
   - 失败静默处理

6. **增强的消息处理**
   ```javascript
   // 新增消息类型
   - CLEANUP_EXPIRED: 手动触发过期缓存清理
   - GET_CACHE_STATS: 获取详细的缓存统计信息
   ```

#### 缓存策略

**网络优先策略**（API 请求）：

- 优先从网络获取最新数据
- 网络失败时使用缓存
- 自动保存响应到缓存
- 检查并清理缓存大小

**缓存优先策略**（静态资源、图片）：

- 立即返回缓存内容
- 后台异步更新缓存
- 过期缓存仍然返回但触发后台更新

### 13.3 在 API 层集成缓存

#### 文件结构

```
src/utils/cache/
├── CacheManager.ts          # 多层缓存管理器
├── cacheInvalidation.ts     # 缓存失效策略
└── index.ts                 # 统一导出
```

#### API 客户端增强

**文件**: `src/api/client.ts`

1. **多层缓存支持**

   ```typescript
   api.get('/posts', {
     cache: true,
     ttl: 60 * 1000,
     useMultiLayerCache: true, // 启用多层缓存
   })
   ```

2. **缓存失效**

   ```typescript
   api.post('/favorites', data, {
     invalidatePatterns: ['/favorites', '/posts/123'],
   })
   ```

3. **缓存预加载**

   ```typescript
   await api.preloadCache([
     { url: '/posts', ttl: 60000 },
     { url: '/authors', ttl: 300000 },
   ])
   ```

4. **强制刷新**
   ```typescript
   api.get('/posts', {
     invalidateCache: true, // 强制刷新缓存
   })
   ```

#### 缓存失效策略

**文件**: `src/utils/cache/cacheInvalidation.ts`

定义了操作与缓存失效的映射关系：

```typescript
const CACHE_INVALIDATION_RULES = {
  'posts.create': ['/posts', '/posts/stats', '/authors'],
  'posts.update': ['/posts/', '/posts/stats'],
  'favorites.add': ['/favorites', '/posts/'],
  'favorites.remove': ['/favorites', '/posts/'],
  // ... 更多规则
}
```

使用示例：

```typescript
import { cacheInvalidation } from '@/utils/cache'

// 添加收藏后自动失效相关缓存
await cacheInvalidation.invalidateByAction('favorites.add', postId)

// 批量失效
await cacheInvalidation.invalidateMany([
  { action: 'posts.update', resourceId: '123' },
  { action: 'favorites.add', resourceId: '456' },
])
```

#### API 服务集成

**文件**: `src/api/services.ts`

为所有 API 服务添加了缓存支持：

1. **GET 请求缓存**

   ```typescript
   // 帖子列表 - 1分钟缓存
   getPosts(params) {
     return api.get('/posts/', {
       params,
       cache: true,
       ttl: 60 * 1000,
       useMultiLayerCache: true,
     })
   }

   // 作者信息 - 10分钟缓存
   getAuthorById(authorId) {
     return api.get(`/authors/${authorId}`, {
       cache: true,
       ttl: 10 * 60 * 1000,
       useMultiLayerCache: true,
     })
   }
   ```

2. **写操作缓存失效**
   ```typescript
   async addFavorite(data) {
     const result = await api.post('/favorites', data, {
       invalidatePatterns: ['/favorites', `/posts/${data.post_id}`]
     })

     await cacheInvalidation.invalidateByAction('favorites.add', data.post_id)

     return result
   }
   ```

## 性能优化效果

### 预期改进

1. **响应速度**
   - 内存缓存命中：< 1ms
   - IndexedDB 缓存命中：< 10ms
   - 网络请求：100-500ms

2. **网络流量**
   - 减少 60-80% 的重复 API 请求
   - 降低服务器负载

3. **离线支持**
   - 完整的离线浏览能力
   - 自动后台同步

4. **用户体验**
   - 即时响应（缓存命中）
   - 无感知的后台更新
   - 流畅的页面切换

## 配置选项

### CacheManager 配置

```typescript
const cacheManager = new CacheManager({
  maxMemorySize: 100, // 内存缓存最大条目数
  maxAge: 5 * 60 * 1000, // 默认 TTL (5分钟)
  enablePersistence: true, // 启用 IndexedDB
  preloadKeys: ['key1', 'key2'], // 预加载的键
})
```

### Service Worker 配置

```javascript
// 缓存大小限制
const CACHE_LIMITS = {
  [API_CACHE]: 100,
  [IMAGE_CACHE]: 200,
  [STATIC_CACHE]: 50,
  [FONT_CACHE]: 20,
}

// API 缓存 TTL（秒）
const API_CACHE_RULES = {
  '/api/posts': 60,
  '/api/authors': 600,
  '/api/media': 2592000,
}
```

## 监控和调试

### 获取缓存统计

```typescript
// CacheManager 统计
const stats = cacheManager.getStats()
console.log('缓存统计:', stats)

// API 缓存统计
const apiStats = api.getCacheStats()
console.log('API 缓存:', apiStats)
```

### Service Worker 消息

```javascript
// 获取 Service Worker 缓存统计
navigator.serviceWorker.controller?.postMessage({
  type: 'GET_CACHE_STATS',
})

// 手动清理过期缓存
navigator.serviceWorker.controller?.postMessage({
  type: 'CLEANUP_EXPIRED',
})
```

## 最佳实践

1. **合理设置 TTL**
   - 静态内容：长 TTL（10分钟+）
   - 动态内容：短 TTL（1-2分钟）
   - 实时数据：不缓存或极短 TTL

2. **及时失效缓存**
   - 写操作后立即失效相关缓存
   - 使用缓存失效规则自动化

3. **监控缓存性能**
   - 定期检查命中率
   - 调整 TTL 和缓存大小

4. **处理缓存失败**
   - 缓存操作失败不应影响主流程
   - 使用 try-catch 保护

## 未来改进

1. **缓存压缩**
   - 使用 LZ-string 压缩大型缓存数据
   - 减少内存占用

2. **智能预加载**
   - 基于用户行为预测
   - 自动预加载可能访问的数据

3. **缓存同步**
   - 多标签页缓存同步
   - 使用 BroadcastChannel

4. **缓存分析**
   - 详细的缓存使用报告
   - 优化建议

## 总结

本次缓存优化实现了完整的多层缓存架构，包括：

- ✅ 内存 + IndexedDB 多层缓存
- ✅ LRU 缓存清理策略
- ✅ 缓存预热机制
- ✅ Service Worker 智能缓存
- ✅ Stale-While-Revalidate 策略
- ✅ API 层缓存集成
- ✅ 自动缓存失效
- ✅ 完整的 TypeScript 类型支持

这些优化将显著提升应用的响应速度、减少网络流量，并提供更好的离线体验。
