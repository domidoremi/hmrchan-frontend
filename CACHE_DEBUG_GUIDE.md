# 缓存调试指南

## 问题描述

用户报告：访问页面后，再次访问该页面时会重复请求和加载帖子数据，即使已经有缓存。

## 已完成的工作

### 1. 修改页面使用缓存感知加载 (Commits: b180f960, 338f80b2)

- `HomePage.vue` 和 `ExplorePage.vue` 现在使用 `useCachedPostList` composable
- 设置 `revalidate: false` 以禁用自动后台更新
- 添加适配器函数将 API 返回格式转换为缓存期望格式

### 2. 添加详细调试日志 (Commits: 82b95319, 2ad190d9, 3a3de3e4)

- `useCachedPosts.ts`: 追踪加载流程和缓存命中情况
- `postCache.ts`: 追踪缓存键生成、内存缓存、IndexedDB 缓存查找和过期状态

## 测试步骤

### 场景 1: 首页缓存测试

1. 打开浏览器开发者工具 (F12)
2. 切换到 Console 标签
3. 访问首页 (/)
4. 滚动到底部加载所有帖子
5. 观察 Console 输出的缓存日志
6. 刷新页面或导航到其他页面后返回
7. 检查是否使用了缓存（应该看到 "Cache HIT" 日志）

### 场景 2: 探索页面平台切换测试

1. 访问探索页面 (/explore)
2. 等待帖子加载完成
3. 观察 Console 日志中的缓存键
4. 切换到 YouTube 平台
5. 观察新的缓存键（应该包含 `platform=youtube`）
6. 切换回 "全部平台"
7. **关键检查**: 应该命中缓存，不应该发起网络请求

### 场景 3: 跨页面导航测试

1. 访问首页并加载帖子
2. 导航到探索页面
3. **预期行为**: 会发起网络请求（因为查询参数不同）
4. 返回首页
5. **预期行为**: 应该命中缓存

## 关键日志标识

### 缓存命中 (正常)

```
[postCache] buildListKey: { params: {...}, key: "post_list:..." }
[postCache.getList] Looking up cache with key: post_list:...
[postCache.getList] Memory cache HIT
[loadWithCache] Cached result: HIT revalidate: false
[loadWithCache] Returning cached data without revalidation
```

### 缓存未命中 (首次加载)

```
[postCache] buildListKey: { params: {...}, key: "post_list:..." }
[postCache.getList] Looking up cache with key: post_list:...
[postCache.getList] Memory cache MISS
[postCache.getList] IDB cache MISS
[loadWithCache] Cached result: MISS revalidate: false
[loadWithCache] No cache found, loading from network
[loadWithCache] Starting network request
```

### 缓存过期

```
[postCache.getList] IDB cache found: { age: "350s", ttl: "300s", expired: true }
[postCache.getList] IDB cache EXPIRED, deleting
```

## 可能的问题原因

### 1. 缓存键不匹配

- **症状**: 每次请求生成不同的缓存键
- **检查**: 对比 Console 中的 `buildListKey` 输出，确认相同查询的缓存键是否一致
- **原因**: 参数顺序、undefined vs null、额外参数等

### 2. 缓存过期

- **症状**: IDB 缓存找到但已过期
- **检查**: 查看 `age` 和 `ttl` 的值
- **配置**: POST_LIST TTL = 5分钟 (300秒)

### 3. 内存缓存被清除

- **症状**: IDB 缓存命中但内存缓存未命中
- **检查**: 内存缓存 TTL = 2分钟
- **原因**: 页面停留时间过长

### 4. 参数差异导致不同查询

- **症状**: HomePage 和 ExplorePage 使用不同缓存键
- **原因**:
  - HomePage: 固定 `sort_by: 'published_at'`
  - ExplorePage: 可变排序 + 平台筛选
  - 不同的 `thumbnail_quality` (基于屏幕宽度)

## 预期行为

### ✅ 正常情况

- **首次访问**: 网络请求 → 缓存写入
- **5分钟内再次访问**: 缓存命中 → 无网络请求
- **切换平台**: 新查询 → 网络请求 → 新缓存
- **切换回原平台**: 缓存命中 → 无网络请求

### ❌ 异常情况

- **每次访问都发起网络请求**: 缓存未生效
- **相同查询使用不同缓存键**: 参数序列化问题
- **缓存立即过期**: TTL 配置错误

## 下一步行动

1. **收集日志**: 在浏览器 Console 中执行测试场景，复制所有相关日志
2. **分析缓存键**: 检查相同查询是否生成相同的缓存键
3. **检查 Network 标签**: 确认是否真的发起了网络请求（不是从缓存读取）
4. **报告结果**: 提供具体的日志输出和 Network 截图

## 调试完成后

一旦确认问题根源，我们将：

1. 修复根本问题
2. 移除所有调试日志
3. 提交最终修复

## 缓存配置参考

```typescript
// src/utils/cache/config.ts
export const CACHE_TTL = {
  POST_LIST: 5 * 60 * 1000, // 5 分钟
  POST_DETAIL: 24 * 60 * 60 * 1000, // 24 小时
  MEMORY: 2 * 60 * 1000, // 2 分钟
}
```

## 联系方式

如有问题或需要进一步协助，请提供：

- 完整的 Console 日志输出
- Network 标签截图
- 具体的操作步骤
