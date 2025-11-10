# Plyr移动端控件 & 页面导航问题修复

## 问题总结

### 问题1: Plyr视频播放器移动端控件问题

**症状**：
- 移动端视图下控件位置不正常（叠加或覆盖）
- TikTok和其他视频没有全屏播放功能
- 控件在小屏幕上拥挤不堪

**根本原因**：
1. Plyr控件没有响应式布局优化
2. 移动端全屏配置不完整
3. 极小屏幕（<480px）控件布局需要换行

### 问题2: 返回首页/Explore页面后排序被打乱

**症状**：
- 从详情页返回列表页后，排序被打乱
- 只显示刚查看帖子的平台内容
- 列表顺序错误

**根本原因**：
- Pinia store使用`sessionStorage`持久化了**所有状态**，包括`posts`数组
- 返回页面时，旧的`posts`数组被恢复
- 但是filters被重置或更新，导致UI显示的数据和filters不匹配

## 解决方案

### 修复1: Plyr移动端控件优化

#### 文件修改：`src/components/ui/MediaViewerPlyr.vue`

**改进点**：

1. **明确启用全屏功能**：
```typescript
fullscreen: {
  enabled: true, // 明确启用全屏
  fallback: true, // 使用fallback确保所有浏览器支持
  iosNative: true, // iOS使用原生全屏
  container: undefined, // 使用默认容器
}
```

2. **移除不必要的控件**（移动端）：
```typescript
controls: [
  'play-large',
  'play',
  'progress',
  'current-time',
  'mute',
  'volume',
  'captions',
  'settings',
  'fullscreen', // 全屏按钮放在最后，移动端更易访问
]
// 移除了 'pip' 和 'airplay'，在移动端不常用
```

3. **响应式控件布局**：
```css
/* 基础：确保足够间距 */
:deep(.plyr__controls) {
  gap: 6px !important;
  padding: 12px 10px !important;
  min-height: 54px !important;
}

/* 中屏（768px）：略微缩小 */
@media (max-width: 768px) {
  :deep(.plyr__controls) {
    gap: 4px !important;
    padding: 10px 8px !important;
    min-height: 48px !important;
  }
  
  /* 全屏按钮 - 确保易于点击 */
  :deep([data-plyr='fullscreen']) {
    min-width: 44px !important;
    min-height: 44px !important;
  }
}

/* 小屏（480px）：换行布局 */
@media (max-width: 480px) {
  :deep(.plyr__controls) {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
  
  /* 第一行：进度条占满宽度 */
  :deep(.plyr__progress) {
    order: 1;
    flex: 1 1 100% !important;
    margin-bottom: 6px !important;
  }
  
  /* 第二行：其他控件 */
  :deep(.plyr__controls__item:not(.plyr__progress)) {
    order: 2;
  }
  
  /* 全屏按钮推到最右 */
  :deep([data-plyr='fullscreen']) {
    order: 3;
    margin-left: auto !important;
  }
  
  /* 隐藏次要功能释放空间 */
  :deep([data-plyr='pip']),
  :deep([data-plyr='airplay']) {
    display: none !important;
  }
}
```

### 修复2: 页面导航状态管理优化

#### 文件修改：

1. **`src/stores/posts.ts`** - 只持久化filters：
```typescript
{
  persist:
    typeof window !== 'undefined'
      ? {
          storage: sessionStorage,
          pick: ['filters', 'pagination'], // ✅ 只持久化filters和pagination
          // ❌ 不持久化 posts 和 currentPost
        }
      : false,
}
```

2. **`src/views/HomePage.vue`** - 挂载时清空旧数据：
```typescript
onMounted(async () => {
  try {
    // 清空旧的posts数组，避免显示缓存数据
    postsStore.posts = []
    
    // 加载新数据
    await postsStore.fetchPosts({
      page: currentPage.value,
      page_size: 6,
      sort_by: 'scraped_at',
      sort_order: 'desc',
    })
    // ...
  }
})
```

3. **`src/views/ExplorePage.vue`** - 同样清空旧数据：
```typescript
onMounted(async () => {
  // 清空旧的posts数组，避免显示缓存数据
  postsStore.posts = []
  
  // 重置筛选条件
  postsStore.resetFilters()
  
  // 从URL查询参数初始化筛选
  // ...
})
```

## 工作原理

### Plyr全屏修复

1. **配置层面**：
   - `enabled: true` - 启用全屏API
   - `fallback: true` - 对不支持Fullscreen API的浏览器提供后备方案
   - `iosNative: true` - iOS使用原生全屏体验

2. **布局层面**：
   - 大屏：横向排列所有控件
   - 中屏：减少间距但保留所有功能
   - 小屏：进度条换行，控件两行布局，隐藏次要功能

3. **交互层面**：
   - 全屏按钮最小点击区域44x44px（iOS Human Interface Guidelines）
   - 推到最右边，符合用户习惯
   - 移动端更大的触摸目标

### 导航状态修复

**之前的问题流程**：
```
1. 用户访问首页 → posts数组 [A, B, C, D, E]
2. filters = { sort_by: 'scraped_at', platform: '' }
3. sessionStorage 持久化：{ posts: [A,B,C,D,E], filters: {...} }

4. 用户点击详情页查看帖子B（twitter）
5. currentPost = B

6. 用户返回首页
7. onMounted执行：
   - postsStore.resetFilters() → filters = { platform: '' } ✅
   - 但posts数组从sessionStorage恢复 → [A,B,C,D,E] ❌
   - fetchPosts()返回新数据 → [F,G,H,I,J]
   - UI短暂显示旧数据，然后闪烁更新

8. 如果用户快速操作，旧数据和新filters不匹配
```

**修复后的流程**：
```
1. 用户访问首页 → posts数组 [A, B, C, D, E]
2. filters = { sort_by: 'scraped_at', platform: '' }
3. sessionStorage 持久化：{ filters: {...} } // ✅ 只持久化filters

4. 用户点击详情页查看帖子B（twitter）
5. currentPost = B

6. 用户返回首页
7. onMounted执行：
   - postsStore.posts = [] → 清空 ✅
   - filters从sessionStorage恢复 → { platform: '' } ✅
   - fetchPosts()返回新数据 → [F,G,H,I,J] ✅
   - UI直接显示正确数据，无闪烁 ✅
```

## 测试验证

### Plyr移动端测试

1. **桌面浏览器**（开发工具移动视图）：
   - 切换到iPhone/Android视图
   - 播放视频，检查控件布局
   - 点击全屏按钮，验证进入全屏

2. **真实移动设备**：
   - iOS Safari：验证原生全屏
   - Android Chrome：验证全屏按钮可见且可点击
   - 竖屏/横屏：验证控件换行布局

### 导航状态测试

1. **基础流程**：
   ```
   首页 → 点击帖子 → 详情页 → 返回 → 验证列表顺序正确
   ```

2. **过滤器测试**：
   ```
   Explore页 → 选择platform=twitter → 点击帖子 → 返回 → 验证filter保持
   ```

3. **跨页面测试**：
   ```
   首页 → Explore页 → 首页 → 验证每个页面数据独立
   ```

## 预期结果

✅ **移动端视频播放**：
- 所有控件清晰可见，不重叠
- 全屏按钮在所有设备上都可用
- 小屏幕自动换行布局

✅ **页面导航**：
- 返回列表页时显示正确的排序
- 不会只显示单一平台内容
- filters正确保存和恢复
- 无数据闪烁

## 注意事项

1. **Plyr TypeScript类型**：
   - Plyr的TypeScript类型定义可能有问题
   - 运行时正常工作
   - 可以忽略类型检查警告

2. **SessionStorage**：
   - 只在会话期间保存
   - 关闭标签页后自动清除
   - 不影响其他标签页

3. **性能考虑**：
   - 清空posts数组后立即加载新数据
   - 无额外网络请求
   - 内存占用更低（不缓存大量帖子数据）

## 部署步骤

```bash
# 1. 提交修复
git add src/components/ui/MediaViewerPlyr.vue src/stores/posts.ts src/views/HomePage.vue src/views/ExplorePage.vue PLYR_AND_NAVIGATION_FIXES.md
git commit -m "fix: optimize Plyr mobile controls and fix navigation state persistence"

# 2. 推送到远程
git push origin main

# 3. Cloudflare Pages自动部署

# 4. 验证修复
# - 访问生产环境
# - 测试移动端视频播放
# - 测试页面导航
```

## 参考资料

- [Plyr文档 - Fullscreen](https://github.com/sampotts/plyr#fullscreen)
- [Pinia Persist Plugin文档](https://prazdevs.github.io/pinia-plugin-persistedstate/)
- [iOS Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/inputs)
- [MDN - Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
