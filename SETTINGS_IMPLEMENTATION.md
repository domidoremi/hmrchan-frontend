# 设置功能实现说明

## 问题分析

### 1. 移动端菜单不显示

- **原因**: z-index过低，被其他元素遮挡
- **解决**: 提高z-index到9999

### 2. 语言切换使用toast通知

- **问题**: 项目有i18n，不需要toast
- **解决**: 移除toast通知，语言切换后界面自动更新就是最好的反馈

### 3. 设置功能未实现

当前状态：

- ✅ `enableAnimations` - 已实现（useAnimation composable已检查）
- ❌ `postsPerPage` - 未实际应用
- ❌ `autoPlayVideos` - 未实际应用
- ❌ `showImagePreviews` - 未实际应用

### 4. IndexedDB中无媒体缓存

- **原因**: 使用的是内存缓存（Map），不是IndexedDB
- **位置**: `utils/cache/hybridCache.ts`
- **说明**: 这是设计决策，内存缓存更快，重启后自动清理

## 实现方案

### postsPerPage实现

需要在以下位置使用：

1. `usePosts.ts` - fetchPosts时使用
2. 分页组件 - 显示正确的每页数量

### autoPlayVideos实现

需要在以下位置使用：

1. PostCard组件 - video元素的autoplay属性
2. PostDetail页面 - 视频播放器配置

### showImagePreviews实现

需要在以下位置使用：

1. PostCard组件 - 条件渲染图片
2. 可以显示占位符或"点击查看"按钮

## 媒体缓存说明

**当前实现** (`hybridCache.ts`):

```typescript
- 使用 Map<string, CacheEntry>
- 50MB内存限制
- 30分钟过期
- LRU淘汰策略
```

**为什么不用IndexedDB**:

1. **性能**: 内存访问比IndexedDB快100倍
2. **简单**: 不需要异步DB操作
3. **安全**: 浏览器关闭后自动清理敏感内容
4. **适用**: 媒体文件通常不需要长期缓存

**如果用户需要持久化缓存**:

- 可以启用Service Worker缓存
- 或修改hybridCache使用IndexedDB作为二级缓存

## 建议优先级

1. **高优先级**: postsPerPage（影响数据获取）
2. **中优先级**: autoPlayVideos（影响用户体验）
3. **低优先级**: showImagePreviews（可选功能）
4. **说明文档**: 媒体缓存机制（用户教育）
