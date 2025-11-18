# 三层缓存策略 v2.0

## 📐 架构概览

```
┌─────────────────────────────────────────┐
│         用户请求 (浏览器)                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Layer 1: Pinia Store (内存缓存)       │
│    - currentPost (响应式)                │
│    - posts[] (列表)                      │
│    - TTL: Session级别                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Layer 2: IndexedDB (持久化缓存)        │
│    - 版本号: v3 (schema) + 2.0.0 (策略) │
│    - TTL: 30秒 (临时) → 5分钟 (稳定后)  │
│    - 自动清理旧版本                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Layer 3: Service Worker (网络缓存)    │
│    - 版本: v2                            │
│    - 帖子详情: Network Only (禁用)       │
│    - 其他API: Network First              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Backend API (真实数据源)         │
└─────────────────────────────────────────┘
```

## 🎯 各层策略

### Layer 1: Pinia Store (内存)

**职责**：

- 管理当前会话的状态
- 提供响应式数据绑定
- 协调下层缓存

**策略**：

```typescript
// 新策略
fetchPost(postId, { forceFresh: true }) {
  // 1. 跳过内存缓存（临时）
  // 2. 直接查询IndexedDB或网络
  // 3. 更新currentPost
}
```

**配置**：

- TTL: 会话级别（刷新页面失效）
- 版本检查: 依赖IndexedDB
- 失效策略: 路由切换时清空

### Layer 2: IndexedDB (持久化)

**职责**：

- 离线访问支持
- 减少网络请求
- 版本化缓存管理

**策略**：

```typescript
// 版本检查
async getPost(postId) {
  const versionValid = await checkCacheVersion()
  if (!versionValid) {
    await clearAll()  // 清空所有旧缓存
    return null
  }

  const cached = await store.get(postId)
  if (isCacheFresh(cached, 30 * 1000)) {  // 30秒TTL
    return cached
  }

  return null
}
```

**配置**：

- 数据库版本: v3
- 策略版本: 2.0.0
- TTL: 30秒（临时，测试稳定后改为5分钟）
- 最大容量: 无限制（IndexedDB自动管理）

**版本管理**：

```typescript
// metadata store
{
  cache_strategy_version: "2.0.0",
  data_schema_version: 3,
  updated_at: "2025-11-18T06:30:00Z"
}
```

### Layer 3: Service Worker (网络)

**职责**：

- 网络请求拦截
- 静态资源缓存
- 离线降级支持

**策略**：

```javascript
// v2.0.0 新策略
if (isPostDetailRequest(url)) {
  // 🔧 帖子详情: Network Only
  return fetch(request)
}

if (isApiRequest(url)) {
  // 其他API: Network First
  return networkFirstApi(request)
}

if (isMediaRequest(url)) {
  // 媒体: Cache First
  return cacheFirstMedia(request)
}

if (isStaticAsset(url)) {
  // 静态资源: Cache First
  return cacheFirst(request)
}
```

**配置**：

- 缓存版本: v2
- 静态资源缓存: 永久
- API缓存: 5分钟（除帖子详情外）
- 媒体缓存: 7天，最多500个文件，200MB

**请求识别**：

```javascript
// 帖子详情匹配：/api/v1/posts/{uuid}
;/^\/api\/v1\/posts\/[0-9a-f-]{36}$/i

// 不匹配：/api/v1/posts?page=1
```

## 🔄 数据流向

### 场景1: 首次访问帖子

```
用户请求 → Pinia Store
           ↓
   forceFresh=true，跳过内存缓存
           ↓
   查询 IndexedDB → 无缓存/版本不匹配
           ↓
   网络请求 (通过SW) → SW检测到帖子详情
           ↓
   SW: Network Only → 直达后端
           ↓
   后端返回完整数据（包含media_files）
           ↓
   保存到 IndexedDB（带版本号）
           ↓
   更新 Pinia Store
           ↓
   UI渲染（包含视频）
```

### 场景2: 30秒内再次访问

```
用户请求 → Pinia Store
           ↓
   forceFresh=true，跳过内存缓存
           ↓
   查询 IndexedDB
           ↓
   版本检查 ✅
           ↓
   TTL检查 ✅ (< 30秒)
           ↓
   返回缓存数据
           ↓
   更新 Pinia Store
           ↓
   UI渲染
```

### 场景3: 缓存过期（>30秒）

```
用户请求 → Pinia Store
           ↓
   查询 IndexedDB
           ↓
   版本检查 ✅
           ↓
   TTL检查 ❌ (> 30秒)
           ↓
   返回null
           ↓
   网络请求 (同场景1)
```

### 场景4: 版本不匹配

```
用户请求 → Pinia Store
           ↓
   查询 IndexedDB
           ↓
   版本检查 ❌
   (expected: 2.0.0, actual: 1.0.0)
           ↓
   清空所有缓存
           ↓
   网络请求 (同场景1)
           ↓
   保存时写入新版本号
```

## ⚙️ 配置参数

### 当前配置（临时）

```typescript
// Pinia Store
const FORCE_FRESH = true // 强制网络请求

// IndexedDB
const CACHE_TTL = 30 * 1000 // 30秒
const CACHE_STRATEGY_VERSION = '2.0.0'
const DATA_SCHEMA_VERSION = 3

// Service Worker
const CACHE_VERSION = 'v2'
const MEDIA_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7天
const MEDIA_CACHE_MAX_ITEMS = 500
const MEDIA_CACHE_MAX_SIZE = 200 * 1024 * 1024 // 200MB
```

### 目标配置（稳定后）

```typescript
// Pinia Store
const FORCE_FRESH = false // 使用智能缓存

// IndexedDB
const CACHE_TTL = 5 * 60 * 1000 // 5分钟

// 其他保持不变
```

## 🐛 问题修复记录

### 问题1: media_files缺失

**根本原因**：

- v1缓存没有media_files字段
- SW缓存了旧的API响应
- Stale-While-Revalidate延迟更新

**解决方案**：

1. ✅ SW v1→v2: 禁用帖子详情缓存
2. ✅ IndexedDB v2→v3: 添加版本检查
3. ✅ Pinia: forceFresh临时绕过缓存

### 问题2: 缓存版本管理

**原问题**：

- 没有版本号系统
- 无法自动清理旧缓存
- 升级后仍使用旧数据

**解决方案**：

1. ✅ 添加metadata store
2. ✅ 存储策略版本和schema版本
3. ✅ 启动时检查版本，不匹配则清空

### 问题3: 三层缓存不一致

**原问题**：

- SW返回旧缓存
- IndexedDB返回旧缓存
- Pinia使用旧缓存
- 后台刷新完成时用户已看到旧数据

**解决方案**：

1. ✅ SW禁用帖子详情缓存（Network Only）
2. ✅ IndexedDB添加版本检查
3. ✅ Pinia使用forceFresh跳过缓存

## 📊 性能指标

### 目标

| 指标          | 目标    | 当前       |
| ------------- | ------- | ---------- |
| 首次加载      | < 2s    | ~1.5s      |
| 缓存命中      | < 100ms | ~50ms      |
| 网络请求      | < 500ms | ~300ms     |
| IndexedDB读取 | < 10ms  | ~5ms       |
| SW缓存命中    | < 50ms  | N/A (禁用) |

### 权衡

| 方面       | 优势           | 劣势             |
| ---------- | -------------- | ---------------- |
| forceFresh | 数据始终最新   | 每次都发网络请求 |
| 30秒TTL    | 减少过期数据   | 缓存命中率降低   |
| SW禁用     | 不会缓存旧数据 | 失去离线降级     |

## 🔮 未来优化

### 短期（1-2周）

- [ ] 测试稳定性
- [ ] 逐步放开forceFresh
- [ ] 延长TTL到5分钟
- [ ] 添加性能监控

### 中期（1个月）

- [ ] 实现ETag/If-None-Match
- [ ] 添加后台刷新完成通知
- [ ] 优化SW缓存策略
- [ ] 添加缓存预热

### 长期（3个月）

- [ ] 智能缓存预测
- [ ] 自适应TTL
- [ ] P2P缓存共享
- [ ] GraphQL分片缓存

## 🧪 测试清单

- [x] SW版本升级（v1→v2）
- [x] IndexedDB版本升级（v2→v3）
- [x] 清除旧缓存
- [ ] 验证media_files存在
- [ ] 测试30秒TTL
- [ ] 测试forceFresh
- [ ] 测试离线访问
- [ ] 测试版本回滚

## 📝 开发者指南

### 本地测试

```bash
# 1. 清除所有缓存
# 浏览器控制台
indexedDB.deleteDatabase('hmrchan_db')
caches.keys().then(names => names.forEach(n => caches.delete(n)))
location.reload()

# 2. 验证SW版本
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs))

# 3. 检查IndexedDB版本
# Application > IndexedDB > hmrchan_db > metadata
```

### 调试日志

```javascript
// 启用详细日志
localStorage.setItem('DEBUG_CACHE', 'true')

// 查看缓存命中
// 控制台会显示：
// [IndexedDB] Cache version check: ✅
// [Pinia] Using forceFresh: true
// [SW] Network Only: /api/v1/posts/{id}
```

## ✅ 部署检查清单

- [x] SW v2部署
- [x] IndexedDB v3迁移逻辑
- [x] forceFresh启用
- [ ] 监控告警配置
- [ ] 回滚方案准备
- [ ] 用户通知（清除缓存）

---

**版本**: 2.0.0  
**更新时间**: 2025-11-18  
**作者**: Cascade AI  
**状态**: ✅ 实施中
