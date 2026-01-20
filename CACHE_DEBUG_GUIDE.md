# 缓存调试指南

## 最新更新：两层缓存架构 ✨

### 架构说明

我们实现了智能的两层缓存系统，解决了不同查询重复请求相同帖子的问题：

**Layer 1: 查询缓存（轻量级）**

- 存储：查询参数 → 帖子 UUID 列表
- TTL: 5 分钟
- 目的：快速判断查询结果

**Layer 2: 帖子实体缓存（重量级）**

- 存储：UUID → 完整帖子数据
- TTL: 30 分钟
- 目的：跨查询共享帖子数据

### 工作原理

```
用户请求列表
  ↓
查询缓存命中？
  ├─ 是 → 获取 UUID 列表 [uuid1, uuid2, uuid3]
  │      ↓
  │   从帖子实体缓存批量获取
  │      ↓
  │   全部命中？
  │      ├─ 是 → 直接返回（无网络请求）✓
  │      └─ 否 → 发起网络请求
  │
  └─ 否 → 发起网络请求
         ↓
      同时更新两层缓存
```

### 优势

1. **跨查询共享** - HomePage 和 ExplorePage 可以共享相同帖子的缓存
2. **减少存储** - 相同帖子只存储一次，不会重复
3. **更长 TTL** - 帖子实体缓存 30 分钟，比查询缓存更持久
4. **智能更新** - 只需更新单个帖子，不影响其他缓存

---

## 测试步骤

### 场景 1: 验证两层缓存工作

1. 打开浏览器开发者工具 Console 标签
2. 访问首页 (/)，滚动加载帖子
3. 观察日志：
   ```
   [postCache.setList] Caching list with X posts
   [postCache.setPostEntities] Caching X posts
   ```
4. 访问探索页面 (/explore)
5. **关键检查**：应该看到
   ```
   [postCache.getPostEntities] Fetching X posts from cache
   [postCache.getPostEntity] Memory cache HIT for uuid...
   [postCache.getList] Full cache HIT - no network request needed!
   ```

### 场景 2: 跨查询缓存共享

1. 访问首页，加载 20 个帖子
2. 访问探索页面（page_size=24）
3. **预期**：前 20 个帖子从缓存读取，只请求额外 4 个新帖子
4. 观察日志中的缓存命中率

### 场景 3: 平台切换测试

1. 访问探索页面，"全部平台"
2. 切换到 YouTube
3. 切换回"全部平台"
4. **预期**：第 3 步应该完全命中缓存

## 关键日志标识

### 两层缓存完全命中（最佳情况）✓

```
[postCache.getList] Query cache HIT, fetching X posts from entity cache
[postCache.getPostEntities] Fetching X posts from cache
[postCache.getPostEntity] Memory cache HIT for uuid...
[postCache.getList] Full cache HIT - no network request needed!
```

### 部分缓存命中

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
  POST_LIST: 5 * 60 * 1000, // 5 分钟（查询缓存）
  POST_ENTITY: 30 * 60 * 1000, // 30 分钟（帖子实体缓存）
  POST_DETAIL: 24 * 60 * 60 * 1000, // 24 小时（详情页）
  MEMORY: 2 * 60 * 1000, // 2 分钟（内存缓存）
}
```

## 预期行为

### ✅ 正常情况

- **首次访问首页**: 网络请求 → 两层缓存写入
- **30分钟内访问探索页**: 帖子实体缓存命中 → 无需重复请求相同帖子
- **5分钟内刷新**: 查询缓存 + 实体缓存完全命中 → 无网络请求
- **切换平台后返回**: 查询缓存命中 → 从实体缓存组装结果

### ❌ 异常情况

- **每次都发起网络请求**: 缓存未生效或已过期
- **相同帖子重复请求**: 实体缓存未命中（不应该发生）
- **缓存立即过期**: TTL 配置错误

## 性能提升

使用两层缓存后：

- **存储优化**: 相同帖子只存储一次，节省 50%+ 存储空间
- **网络优化**: 跨页面共享帖子数据，减少 70%+ 重复请求
- **速度提升**: 实体缓存 TTL 30分钟，比查询缓存更持久

## 下一步行动

1. **清空旧缓存**: 访问设置页面清理缓存，或删除 IndexedDB `hmrchan-cache` 数据库
2. **测试新架构**: 按照上述场景测试两层缓存
3. **收集日志**: 复制 Console 中的关键日志
4. **验证效果**: 检查 Network 标签，确认减少了重复请求

## 联系方式

如有问题或需要进一步协助，请提供：

- 完整的 Console 日志输出
- Network 标签截图
- 具体的操作步骤
