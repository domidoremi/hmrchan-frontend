# 组件懒加载指南 (Component Lazy Loading Guide)

## 概述

本项目实现了智能的组件懒加载策略，以优化应用性能和加载速度。

## 懒加载的组件

### 数据展示组件 (Data Display)

#### MediaViewer

- **用途**: 媒体查看器（图片/视频）
- **原因**: 包含视频播放器，体积较大
- **使用方式**:

```vue
<script setup>
import { MediaViewer } from '@/components/data-display'
</script>

<template>
  <MediaViewer :show="showViewer" :media-items="mediaItems" @close="showViewer = false" />
</template>
```

#### MediaViewerPlyr

- **用途**: Plyr 视频播放器
- **原因**: 依赖 Plyr 库，体积大
- **使用方式**: 同 MediaViewer

#### ImageViewer

- **用途**: 图片查看器
- **原因**: 仅在需要查看大图时加载
- **使用方式**:

```vue
<script setup>
import { ImageViewer } from '@/components/data-display'
</script>

<template>
  <ImageViewer :show="showImageViewer" :images="images" @close="showImageViewer = false" />
</template>
```

### 反馈组件 (Feedback)

#### Modal

- **用途**: 模态框组件
- **原因**: 不是每个页面都需要，按需加载
- **使用方式**:

```vue
<script setup>
import { Modal } from '@/components/feedback'
</script>

<template>
  <Modal v-model="showModal" title="标题">
    <p>模态框内容</p>
  </Modal>
</template>
```

### 业务组件 (Business)

#### PostPreviewPanel

- **用途**: 帖子预览面板
- **原因**: 仅在需要预览时加载
- **使用方式**:

```vue
<script setup>
import { PostPreviewPanel } from '@/components/business'
</script>

<template>
  <PostPreviewPanel :post="selectedPost" @close="selectedPost = null" />
</template>
```

#### CacheManagement

- **用途**: 缓存管理组件
- **原因**: 仅在设置页面使用
- **使用方式**:

```vue
<script setup>
import { CacheManagement } from '@/components/business'
</script>

<template>
  <CacheManagement />
</template>
```

## 创建自定义懒加载组件

使用 `useLazyComponent` composable:

```typescript
import { useLazyComponent } from '@/composables/useLazyComponent'

export const MyHeavyComponent = useLazyComponent(() => import('./MyHeavyComponent.vue'), {
  loadingText: 'Loading component...',
  delay: 200, // 延迟显示加载状态（毫秒）
  timeout: 10000, // 超时时间（毫秒）
})
```

## 预加载组件

对于可能很快需要的组件，可以预加载：

```typescript
import { preloadComponent } from '@/composables/useLazyComponent'

// 在用户可能需要之前预加载
onMounted(() => {
  setTimeout(() => {
    preloadComponent(() => import('@/components/data-display/MediaViewer.vue'))
  }, 2000)
})
```

## 最佳实践

### 何时使用懒加载

✅ **应该懒加载的组件**:

- 体积大的组件（> 50KB）
- 依赖大型第三方库的组件
- 不是每个页面都需要的组件
- 用户交互触发的组件（模态框、查看器等）

❌ **不应该懒加载的组件**:

- 核心 UI 组件（Button、Input 等）
- 首屏必需的组件
- 体积小的组件（< 10KB）
- 高频使用的组件

### 性能优化技巧

1. **减少加载延迟**: 对于需要快速响应的组件（如 Modal），设置较小的 `delay`
2. **预加载策略**: 在用户可能需要之前预加载组件
3. **分组加载**: 相关的组件可以打包在一起
4. **监控性能**: 使用浏览器开发工具监控组件加载时间

## 加载状态

所有懒加载组件在加载时会显示 `AsyncComponentLoader` 组件，提供友好的加载反馈。

## 错误处理

懒加载组件会自动重试失败的加载（最多 2 次），如果仍然失败，会在控制台记录错误。

## 代码分割

懒加载的组件会自动被 Vite 分割到独立的 chunk 中，配合 `vite.config.ts` 中的 `manualChunks` 配置，实现最优的代码分割策略。
