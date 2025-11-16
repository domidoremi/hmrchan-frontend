# 代码分割快速参考

## 路由懒加载

### 添加新路由

```typescript
// src/router/index.ts
{
  path: '/new-page',
  name: 'new-page',
  component: () => import(/* webpackChunkName: "pages-other" */ '@/views/NewPage.vue'),
  meta: {
    title: 'New Page',
    preload: false, // 是否预加载
    priority: 'low', // 优先级: high, medium, low
  },
}
```

### 配置预加载策略

```typescript
// src/router/index.ts - getRoutesToPreload()
const preloadMap: Record<string, string[]> = {
  'new-page': ['home', 'explore'], // 从 new-page 预加载 home 和 explore
}
```

## 组件懒加载

### 使用懒加载组件

```vue
<script setup>
// 从组件索引导入（已配置懒加载）
import { MediaViewer, Modal } from '@/components'

// 或者直接从子目录导入
import { MediaViewer } from '@/components/data-display'
import { Modal } from '@/components/feedback'
</script>

<template>
  <MediaViewer :show="showViewer" @close="showViewer = false" />
  <Modal v-model="showModal" title="标题">内容</Modal>
</template>
```

### 创建新的懒加载组件

```typescript
// src/components/your-category/index.ts
import { useLazyComponent } from '@/composables/useLazyComponent'

export const YourHeavyComponent = useLazyComponent(() => import('./YourHeavyComponent.vue'), {
  loadingText: 'Loading...',
  delay: 200,
  timeout: 10000,
})
```

### 预加载组件

```typescript
import { preloadComponent } from '@/composables/useLazyComponent'

// 在适当的时机预加载
onMounted(() => {
  setTimeout(() => {
    preloadComponent(() => import('@/components/data-display/MediaViewer.vue'))
  }, 2000)
})
```

## Vite 配置

### 添加新的 chunk 分组

```typescript
// vite.config.ts - manualChunks()
if (id.includes('your-library')) {
  return 'your-chunk-name'
}
```

### 按功能分组组件

```typescript
// 业务组件示例
if (id.includes('/src/components/your-category/')) {
  return 'components-your-category'
}
```

## 已懒加载的组件

### 数据展示 (Data Display)

- `MediaViewer` - 媒体查看器
- `MediaViewerPlyr` - Plyr 播放器
- `ImageViewer` - 图片查看器

### 反馈 (Feedback)

- `Modal` - 模态框

### 业务 (Business)

- `PostPreviewPanel` - 帖子预览
- `CacheManagement` - 缓存管理

## 性能检查

### 查看 chunk 分割

```bash
npm run build
# 查看 dist/assets/js/ 目录
```

### 分析 bundle 大小

```bash
npm run build -- --mode analyze
```

### 测试懒加载

1. 打开 Chrome DevTools
2. 切换到 Network 面板
3. 过滤 JS 文件
4. 触发懒加载组件
5. 观察动态加载的 chunk

## 常见问题

### Q: 组件加载失败怎么办？

A: 懒加载组件会自动重试 2 次，失败后会在控制台记录错误。

### Q: 如何调整加载延迟？

A: 修改 `useLazyComponent` 的 `delay` 参数。

### Q: 如何禁用某个组件的懒加载？

A: 直接导出组件而不使用 `useLazyComponent`。

### Q: 预加载会影响性能吗？

A: 预加载在 1 秒后执行，且在空闲时进行，不会影响当前页面性能。

## 调试技巧

### 查看懒加载日志

```javascript
// 浏览器控制台
// 过滤 "[Router]" 或 "[LazyComponent]"
```

### 禁用预加载（调试用）

```typescript
// src/router/index.ts
// 注释掉 preloadCriticalRoutes(to) 调用
```

### 查看 chunk 加载顺序

```javascript
// Chrome DevTools -> Network -> JS
// 按时间排序查看加载顺序
```
