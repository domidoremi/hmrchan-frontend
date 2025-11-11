# 🏗️ 缓存架构设计文档

## 📋 概述

基于应用特点（社交媒体聚合平台，媒体文件是核心），设计三层缓存架构，实现高性能、离线支持和优秀的用户体验。

---

## 🎯 核心目标

### 性能优化
- ⚡ **首屏加载**: < 2s (3G网络)
- 🚀 **后续加载**: < 500ms (使用缓存)
- 📦 **初始包大小**: < 200KB (gzip)
- 🖼️ **媒体加载**: 渐进式、懒加载、占位符

### 离线支持
- 📱 **离线浏览**: 已缓存的帖子和媒体
- 💾 **离线操作**: 收藏、点赞（队列同步）
- 🔄 **自动同步**: 网络恢复时自动上传

### 用户体验
- 🎨 **无感知加载**: 骨架屏、渐进式图片
- 🔍 **即时搜索**: 本地索引优先
- 📊 **智能预加载**: 预测用户行为

---

## 🗂️ 存储层架构

### 1. localStorage (5-10MB)
**职责**: 轻量配置和状态

```typescript
存储内容:
├── 用户设置 (theme, language, layout)
├── 认证令牌 (access_token, refresh_token)
├── 用户偏好 (filters, sorting)
├── 应用状态 (last_visit, onboarding_completed)
└── 临时数据 (draft_posts, form_state)

特点:
✅ 同步访问，速度最快
✅ 字符串存储，需序列化
❌ 容量小 (5-10MB)
❌ 不适合大数据

策略:
- 自动过期清理
- 配额管理
- 错误降级
```

### 2. IndexedDB (50MB-几百MB)
**职责**: 结构化数据和元信息

```typescript
数据库名称: hmrchan_db
版本: 1

ObjectStores:
├── posts (帖子元数据)
│   ├── id (主键)
│   ├── platform, author, content, stats
│   ├── media_urls (不存blob，只存URL)
│   ├── timestamp, cached_at
│   └── 索引: platform, author_id, created_at
│
├── authors (作者信息)
│   ├── id (主键)
│   ├── username, avatar, bio, stats
│   ├── platform, verified
│   └── 索引: platform, username
│
├── favorites (收藏)
│   ├── id (主键)
│   ├── post_id, user_id
│   ├── created_at
│   └── 索引: user_id, post_id
│
├── media_metadata (媒体元信息)
│   ├── url (主键)
│   ├── type, size, dimensions
│   ├── thumbnail_url
│   ├── cached (boolean)
│   └── 索引: type, cached
│
└── offline_queue (离线操作队列)
    ├── id (主键, auto-increment)
    ├── action (favorite, like, comment)
    ├── data (操作数据)
    ├── timestamp
    └── status (pending, syncing, failed)

特点:
✅ 大容量 (50MB-1GB+)
✅ 结构化查询和索引
✅ 支持事务
❌ 异步API
❌ 不适合存储大文件blob

策略:
- 分页查询
- 索引优化
- 定期清理过期数据
- 压缩存储
```

### 3. Cache API (Service Worker) (无限制)
**职责**: 静态资源和媒体文件

```typescript
缓存名称:
├── hmrchan-static-v1 (静态资源)
│   ├── /index.html
│   ├── /assets/js/*.js
│   ├── /assets/css/*.css
│   ├── /assets/fonts/*.woff2
│   └── manifest.json
│
├── hmrchan-api-v1 (API响应)
│   ├── /api/posts?*
│   ├── /api/authors/*
│   └── /api/user/favorites
│
└── hmrchan-media-v1 (媒体文件)
    ├── 图片 (jpg, png, webp)
    ├── 视频缩略图
    └── 头像

特点:
✅ 无限容量（受设备限制）
✅ HTTP缓存语义
✅ 支持大文件
✅ 离线访问
❌ 需要Service Worker
❌ 只能存储HTTP响应

策略:
- Cache First: 媒体文件
- Network First: API请求
- Stale While Revalidate: 用户数据
- 容量管理和LRU淘汰
```

### 4. Memory Cache (运行时)
**职责**: 运行时热数据

```typescript
内存缓存:
├── 当前页面帖子
├── 图片 ObjectURL
├── 用户会话数据
├── 路由缓存
└── 预加载数据

特点:
✅ 极快访问
✅ 无序列化开销
❌ 刷新丢失
❌ 内存有限 (50-100MB)

策略:
- LRU淘汰
- 自动释放
- 容量限制
```

---

## 🔄 缓存策略

### 首屏加载流程

```
用户访问 → Service Worker → Cache API (静态资源)
                ↓
            App Shell 立即显示
                ↓
            骨架屏 + 占位符
                ↓
        ┌───────┴───────┐
        ↓               ↓
   IndexedDB        Network API
   (离线数据)        (最新数据)
        ↓               ↓
    显示缓存     ←  合并并更新  → 显示最新
        ↓               ↓
    媒体占位符   Cache API (媒体)
        ↓               ↓
    渐进式加载   ←  懒加载显示

时间线:
0-200ms:   App Shell + 骨架屏
200-800ms: IndexedDB数据显示
800-2000ms: API数据加载完成
2000ms+:   媒体文件渐进式加载
```

### 媒体文件优化策略

```typescript
1. 响应式图片
   <img 
     src="thumbnail.jpg"           // 缩略图 (10-50KB)
     srcset="small.jpg 480w,       // 小屏 (50-100KB)
             medium.jpg 768w,      // 中屏 (100-200KB)
             large.jpg 1080w"      // 大屏 (200-500KB)
     sizes="(max-width: 480px) 100vw,
            (max-width: 768px) 50vw,
            33vw"
     loading="lazy"
     decoding="async"
   />

2. 渐进式加载
   - 先显示低质量占位符 (LQIP)
   - 逐步加载高清图片
   - 使用 Intersection Observer

3. 格式优化
   - WebP/AVIF 优先
   - 降级到 JPEG/PNG
   - 视频使用 HLS/DASH

4. 智能预加载
   - 预测用户滚动方向
   - 预加载可视区域周围 2 屏内容
   - 使用 requestIdleCallback
```

### 离线操作队列

```typescript
用户操作 (离线状态):
    收藏/点赞/评论
        ↓
    立即更新UI (乐观更新)
        ↓
    写入 IndexedDB offline_queue
        ↓
    显示离线提示图标
        ↓
    网络恢复检测
        ↓
    后台同步 (Background Sync API)
        ↓
    逐个处理队列
        ↓
    成功: 更新状态 | 失败: 重试/提示

重试策略:
- 指数退避: 1s, 2s, 4s, 8s, 16s
- 最大重试: 3次
- 失败后保留在队列，等待用户手动同步
```

---

## 📊 容量管理

### 自动清理策略

```typescript
触发条件:
1. 存储使用超过 80%
2. 每24小时定时清理
3. 用户手动触发清理

清理优先级:
├── 过期数据 (超过7天)
├── 未收藏的旧帖子 (超过3天)
├── 低分辨率媒体 (保留缩略图)
├── API缓存 (超过1天)
└── 静态资源旧版本

保留策略:
✅ 用户收藏内容 (永久)
✅ 最近访问 (3天内)
✅ 当前会话数据
✅ 关键静态资源
```

### 配额监控

```typescript
// 定期检查存储配额
async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage || 0
    const quota = estimate.quota || 0
    const percentUsed = (usage / quota) * 100

    console.log(`Storage: ${(usage / 1024 / 1024).toFixed(2)}MB / ${(quota / 1024 / 1024).toFixed(2)}MB (${percentUsed.toFixed(1)}%)`)

    // 警告用户
    if (percentUsed > 80) {
      showStorageWarning()
    }

    // 自动清理
    if (percentUsed > 90) {
      await autoCleanup()
    }
  }
}
```

---

## 🎨 用户体验优化

### 加载状态

```typescript
状态层次:
1. 骨架屏 (Skeleton)
   - 模拟真实布局
   - 动画效果
   - 持续 200-800ms

2. 占位符 (Placeholder)
   - LQIP 低质量图片
   - 模糊效果
   - 颜色提取

3. 渐进式加载 (Progressive)
   - 逐步清晰
   - 淡入动画
   - 无闪烁

4. 完全加载
   - 高清媒体
   - 所有功能可用
```

### 错误处理

```typescript
降级策略:
1. 缓存失败 → 显示错误占位符
2. 网络失败 → 显示离线提示 + 缓存内容
3. 解析失败 → 显示备用内容
4. 配额超限 → 提示清理 + 自动优化

用户提示:
- Toast通知
- 重试按钮
- 详细错误信息（开发模式）
- 帮助文档链接
```

---

## 🔧 实现优先级

### Phase 1: 基础架构 (1-2天)
- ✅ Service Worker 基础设置
- ✅ Cache API 静态资源缓存
- ✅ IndexedDB 数据库设计
- ✅ 存储管理器封装

### Phase 2: 核心功能 (2-3天)
- ✅ 媒体文件缓存策略
- ✅ API响应缓存
- ✅ 离线队列实现
- ✅ 数据同步逻辑

### Phase 3: 性能优化 (2-3天)
- ✅ 懒加载和预加载
- ✅ 图片优化（WebP、响应式）
- ✅ 容量管理和清理
- ✅ 性能监控

### Phase 4: 用户体验 (1-2天)
- ✅ 骨架屏和占位符
- ✅ 离线提示UI
- ✅ 错误处理和降级
- ✅ 同步状态显示

---

## 📈 性能指标

### 目标 Metrics

```
核心 Web Vitals:
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

自定义 Metrics:
- Time to Interactive: < 3s
- First Meaningful Paint: < 1.5s
- Cache Hit Rate: > 80%
- Offline Success Rate: > 95%
```

### 监控方案

```typescript
// Web Vitals 监控
import { getCLS, getFID, getLCP } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getLCP(console.log)

// 缓存命中率
let cacheHits = 0
let cacheMisses = 0
const cacheHitRate = () => (cacheHits / (cacheHits + cacheMisses)) * 100

// 上报到分析平台
reportMetrics({
  lcp,
  fid,
  cls,
  cacheHitRate,
  offlineQueueSize,
  storageUsage,
})
```

---

## 🚀 部署检查清单

- [ ] Service Worker 注册和更新
- [ ] 缓存版本管理
- [ ] 离线页面准备
- [ ] 错误边界设置
- [ ] 性能监控启用
- [ ] 用户反馈收集
- [ ] A/B测试准备

---

**下一步**: 开始实现 Service Worker 和 IndexedDB 模块
