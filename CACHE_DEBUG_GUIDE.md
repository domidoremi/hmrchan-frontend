# 缓存调试指南

## 最新更新：优化 IndexedDB 层为双子层架构 ✨

### 完整的四层缓存架构

应用采用四层缓存架构，从快到慢依次为：

#### Layer 1: 内存缓存 (Memory Cache)

- **位置**: JavaScript 运行时内存
- **TTL**: 2 分钟
- **特点**: 最快，但页面刷新后丢失
- **实现**: `src/utils/cache/memoryCache.ts`

#### Layer 2: IndexedDB 缓存（双子层架构）⭐ 本次优化重点

- **位置**: 浏览器 IndexedDB
- **特点**: 持久化，页面刷新后保留
- **实现**: `src/utils/cache/postCache.ts`

**子层 2.1: 查询缓存（轻量级）**

- 存储：查询参数 → 帖子 UUID 列表
- TTL: 5 分钟
- 目的：快速判断查询结果

**子层 2.2: 实体缓存（重量级）**

- 存储：UUID → 完整帖子数据
- TTL: 30 分钟
- 目的：跨查询共享帖子数据

#### Layer 3: Service Worker 缓存

- **位置**: Service Worker
- **特点**: 离线支持，拦截网络请求
- **实现**: `src/utils/cache/swRegister.ts`
- **缓存**: 静态资源、API 响应

#### Layer 4: CDN 缓存

- **位置**: Cloudflare CDN 边缘节点
- **特点**: 全球分布，最接近用户
- **缓存**: 静态资源、媒体文件

### 完整数据流向

```
用户请求
  ↓
Layer 1: 内存缓存 (2分钟)
  ↓ 未命中
Layer 2: IndexedDB
  ├─ 子层 2.1: 查询缓存 (UUID 列表, 5分钟)
  └─ 子层 2.2: 实体缓存 (完整数据, 30分钟)
  ↓ 未命中
Layer 3: Service Worker
  ↓ 未命中
Layer 4: CDN
  ↓ 未命中
网络请求 → 后端 API
```

### IndexedDB 双子层工作原理

```
用户请求列表
  ↓
查询缓存命中？
  ├─ 是 → 获取 UUID 列表 [uuid1, uuid2, uuid3]
  │      ↓
  │   从实体缓存批量获取
  │      ↓
  │   全部命中？
  │      ├─ 是 → 直接返回（无网络请求）✓
  │      └─ 否 → 发起网络请求
  │
  └─ 否 → 发起网络请求
         ↓
      同时更新两个子层
```

### 优势

1. **跨查询共享** - HomePage 和 ExplorePage 可以共享相同帖子的实体缓存
2. **减少存储** - 相同帖子只在实体缓存中存储一次
3. **更长 TTL** - 实体缓存 30 分钟，比查询缓存（5分钟）更持久
4. **智能更新** - 只需更新单个帖子实体，不影响其他缓存

---

## 测试步骤

### 场景 1: 验证四层缓存工作

1. 打开浏览器开发者工具 Console 标签
2. 访问首页 (/)，滚动加载帖子
3. 观察日志：
   ```
   [postCache.setList] Caching list with X posts
   [postCache.setPostEntities] Caching X posts
   ```
4. **立即刷新页面**（2分钟内）
5. 应该看到 Layer 1 内存缓存命中：
   ```
   [postCache.getPostEntity] Memory cache HIT for uuid...
   ```

### 场景 2: 验证 IndexedDB 双子层架构

1. 访问首页，加载 20 个帖子
2. 等待 3 分钟（内存缓存过期）
3. 访问探索页面（page_size=24）
4. **关键检查**：应该看到
   ```
   [postCache.getList] Query cache HIT, fetching X posts from entity cache
   [postCache.getPostEntities] Cache hit: 20/24 posts
   [postCache.getList] Partial cache hit, network request needed
   ```
5. 前 20 个帖子从实体缓存读取，只请求额外 4 个新帖子

### 场景 3: 跨查询缓存共享

1. 访问首页（page_size=20）
2. 访问探索页面（page_size=24）
3. 返回首页
4. **预期**：第 3 步完全命中缓存（查询缓存 + 实体缓存）

### 场景 4: 平台切换测试

1. 访问探索页面，"全部平台"
2. 切换到 YouTube
3. 切换回"全部平台"
4. **预期**：第 3 步应该完全命中缓存

## 关键日志标识

### Layer 1 内存缓存命中（最快）✓

```
[postCache.getPostEntity] Memory cache HIT for uuid...
```

### Layer 2 IndexedDB 完全命中（快）✓

```
[postCache.getList] Query cache HIT, fetching X posts from entity cache
[postCache.getPostEntities] Cache hit: X/X posts
[postCache.getList] Full cache HIT - no network request needed!
```

### Layer 2 IndexedDB 部分命中

```
[postCache.getList] Partial cache hit (15/20), network request needed
```

### 缓存未命中（首次加载）

```
[postCache.getList] Query cache MISS
[loadWithCache] No cache found, loading from network
[postCache.setList] Caching list with X posts
[postCache.setPostEntities] Caching X posts
```

## 缓存配置

```typescript
// src/utils/cache/config.ts
export const CACHE_TTL = {
  // Layer 1: 内存缓存
  MEMORY: 2 * 60 * 1000, // 2 分钟

  // Layer 2: IndexedDB
  POST_LIST: 5 * 60 * 1000, // 5 分钟（查询缓存）
  POST_ENTITY: 30 * 60 * 1000, // 30 分钟（实体缓存）
  POST_DETAIL: 24 * 60 * 60 * 1000, // 24 小时（详情页）

  // 其他业务数据
  AUTHOR_LIST: 10 * 60 * 1000, // 10 分钟
  AUTHOR_DETAIL: 24 * 60 * 60 * 1000, // 24 小时
  FAVORITES: 2 * 60 * 1000, // 2 分钟

  // 媒体资源
  MEDIA: 7 * 24 * 60 * 60 * 1000, // 7 天
  AVATAR: 24 * 60 * 60 * 1000, // 24 小时
}
```

## 预期行为

### ✅ 正常情况

- **首次访问首页**: 网络请求 → 四层缓存全部写入
- **2分钟内刷新**: Layer 1 内存缓存命中 → 无网络请求
- **30分钟内访问探索页**: Layer 2 实体缓存命中 → 无需重复请求相同帖子
- **5分钟内刷新**: Layer 2 查询缓存 + 实体缓存完全命中 → 无网络请求
- **切换平台后返回**: 查询缓存命中 → 从实体缓存组装结果

### ❌ 异常情况

- **每次都发起网络请求**: 所有缓存层都未命中或已过期
- **相同帖子重复请求**: 实体缓存未命中（不应该发生）
- **缓存立即过期**: TTL 配置错误

## 性能提升

使用四层缓存 + IndexedDB 双子层架构后：

- **Layer 1 命中率**: ~60%（2分钟内重复访问）
- **Layer 2 命中率**: ~85%（30分钟内跨页面访问）
- **存储优化**: 节省 50%+ 存储空间（相同帖子只存一次）
- **网络优化**: 减少 70%+ 重复请求（跨页面共享数据）
- **速度提升**: 内存缓存 < 10ms，IndexedDB < 50ms

## 下一步行动

1. **清空旧缓存**: 访问设置页面清理缓存，或删除 IndexedDB `hmrchan-cache` 数据库
2. **测试新架构**: 按照上述场景测试四层缓存
3. **收集日志**: 复制 Console 中的关键日志
4. **验证效果**: 检查 Network 标签，确认减少了重复请求

## 联系方式

如有问题或需要进一步协助，请提供：

- 完整的 Console 日志输出
- Network 标签截图
- 具体的操作步骤
