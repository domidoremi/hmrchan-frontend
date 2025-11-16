# 图片优化指南 (Image Optimization Guide)

本指南介绍了项目中实现的图片优化功能，包括 WebP 支持、响应式图片、渐进式加载和智能预加载。

## 功能概览

### 1. 增强的 OptimizedImage 组件

`OptimizedImage` 组件提供了全面的图片优化功能：

#### 主要特性

- ✅ **WebP 格式支持** - 自动生成和使用 WebP 格式图片
- ✅ **响应式图片 (srcset)** - 根据设备尺寸加载合适大小的图片
- ✅ **渐进式加载 (Blur-up)** - 先显示模糊的低质量图片，再加载高清图片
- ✅ **懒加载优化** - 使用 Intersection Observer API 实现高性能懒加载
- ✅ **图片缓存** - 集成混合缓存系统
- ✅ **加载优先级** - 支持 fetchpriority 属性

#### 使用示例

```vue
<template>
  <!-- 基础使用 -->
  <OptimizedImage src="/path/to/image.jpg" alt="描述" />

  <!-- 完整配置 -->
  <OptimizedImage
    src="/path/to/image.jpg"
    alt="描述"
    :width="800"
    :height="600"
    :lazy="true"
    :webp="true"
    :responsive="true"
    :placeholder="true"
    :blur-amount="10"
    fetchpriority="high"
    object-fit="cover"
    :widths="[320, 640, 960, 1280, 1920]"
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    root-margin="50px"
    :threshold="0.01"
    :preload="true"
    :preload-distance="200"
  />

  <!-- 关键图片（立即加载） -->
  <OptimizedImage
    src="/hero-image.jpg"
    alt="Hero"
    :lazy="false"
    fetchpriority="high"
    :placeholder="false"
  />
</template>

<script setup lang="ts">
import OptimizedImage from '@/components/base/OptimizedImage.vue'
</script>
```

#### Props 说明

| Prop              | 类型                        | 默认值                        | 说明                       |
| ----------------- | --------------------------- | ----------------------------- | -------------------------- |
| `src`             | `string`                    | 必填                          | 图片源地址                 |
| `alt`             | `string`                    | `''`                          | 图片描述                   |
| `lazy`            | `boolean`                   | `true`                        | 是否启用懒加载             |
| `webp`            | `boolean`                   | `true`                        | 是否使用 WebP 格式         |
| `responsive`      | `boolean`                   | `true`                        | 是否生成响应式 srcset      |
| `placeholder`     | `boolean`                   | `true`                        | 是否显示模糊占位符         |
| `blurAmount`      | `number`                    | `10`                          | 模糊程度（像素）           |
| `width`           | `number`                    | -                             | 图片宽度                   |
| `height`          | `number`                    | -                             | 图片高度                   |
| `fetchpriority`   | `'high' \| 'low' \| 'auto'` | `'auto'`                      | 加载优先级                 |
| `objectFit`       | `string`                    | `'cover'`                     | CSS object-fit 属性        |
| `widths`          | `number[]`                  | `[320, 640, 960, 1280, 1920]` | 响应式图片尺寸             |
| `sizes`           | `string`                    | 自动生成                      | 响应式图片 sizes 属性      |
| `rootMargin`      | `string`                    | `'50px'`                      | Intersection Observer 边距 |
| `threshold`       | `number`                    | `0.01`                        | 可见度阈值                 |
| `preload`         | `boolean`                   | `true`                        | 是否启用预加载             |
| `preloadDistance` | `number`                    | `200`                         | 预加载距离（像素）         |

### 2. 图片懒加载 Composable

`useImageLazyLoad` 提供了基于 Intersection Observer 的高性能懒加载功能。

#### 使用示例

```vue
<template>
  <img
    ref="elementRef"
    :src="isLoaded ? actualSrc : placeholderSrc"
    :data-src="actualSrc"
    alt="描述"
  />
</template>

<script setup lang="ts">
import { useImageLazyLoad } from '@/composables/useImageLazyLoad'

const actualSrc = '/path/to/image.jpg'
const placeholderSrc = '/path/to/placeholder.jpg'

const { elementRef, isLoading, isLoaded, isInViewport, error, load, reset } = useImageLazyLoad({
  rootMargin: '50px',
  threshold: 0.01,
  preload: true,
  preloadDistance: 200,
  priority: 'auto',
})
</script>
```

#### 批量懒加载

```vue
<script setup lang="ts">
import { useBatchImageLazyLoad } from '@/composables/useImageLazyLoad'

const { elements, loadedCount, totalCount, addElement, initBatchObserver } = useBatchImageLazyLoad({
  rootMargin: '100px',
  threshold: 0.01,
})

// 添加图片元素到批量加载队列
onMounted(() => {
  const images = document.querySelectorAll('img[data-src]')
  images.forEach((img) => addElement(img as HTMLElement))
  initBatchObserver()
})
</script>
```

### 3. 图片预加载 Composable

`useImagePreload` 提供了智能图片预加载功能，支持优先级、网络检测和进度跟踪。

#### 基础使用

```vue
<script setup lang="ts">
import { useImagePreload } from '@/composables/useImagePreload'

const {
  isPreloading,
  preloadedCount,
  totalCount,
  progress,
  errors,
  preload,
  preloadBatch,
  cancel,
} = useImagePreload({
  priority: 'high',
  delay: 0,
  onIdle: true,
  maxConcurrent: 3,
  wifiOnly: false,
})

// 预加载单张图片
await preload('/path/to/image.jpg')

// 批量预加载
await preloadBatch(['/image1.jpg', '/image2.jpg', '/image3.jpg'])

// 监听进度
watch(progress, (value) => {
  console.log(`预加载进度: ${value}%`)
})
</script>
```

#### 智能预加载

自动识别和预加载关键图片：

```vue
<script setup lang="ts">
import { useSmartImagePreload } from '@/composables/useImagePreload'

const { isPreloading, progress, identifyCriticalImages, autoPreload } = useSmartImagePreload()

// 自动识别并预加载关键图片
onMounted(() => {
  autoPreload()
})

// 手动识别关键图片
const criticalImages = identifyCriticalImages()
console.log('关键图片:', criticalImages)
</script>
```

#### 预加载下一页

用于分页或无限滚动场景：

```vue
<script setup lang="ts">
import { useNextPagePreload } from '@/composables/useImagePreload'

const { preloadNextPage, progress } = useNextPagePreload(async () => {
  // 获取下一页的图片 URL
  const nextPageData = await fetchNextPage()
  return nextPageData.images.map((img) => img.url)
})

// 在用户接近页面底部时预加载
onMounted(() => {
  window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY + window.innerHeight
    const pageHeight = document.documentElement.scrollHeight

    if (scrollPosition > pageHeight * 0.8) {
      preloadNextPage()
    }
  })
})
</script>
```

### 4. 图片预加载插件

全局图片预加载插件会自动识别和预加载关键图片。

#### 配置

在 `main.ts` 中配置：

```typescript
import { imagePreloadPlugin } from './plugins/imagePreload'

app.use(imagePreloadPlugin, {
  enabled: true, // 是否启用
  priority: 'low', // 预加载优先级
  maxConcurrent: 3, // 最大并发数
  wifiOnly: false, // 是否仅在 WiFi 下预加载
  delay: 1000, // 延迟时间（毫秒）
  criticalSelectors: [
    // 自定义关键图片选择器
    '.hero-image',
    '.featured-image',
    '[data-critical="true"] img',
  ],
})
```

#### 标记关键图片

在 HTML 中标记需要预加载的图片：

```vue
<template>
  <!-- 使用 fetchpriority 属性 -->
  <img src="/hero.jpg" alt="Hero" fetchpriority="high" />

  <!-- 使用特定类名 -->
  <img src="/featured.jpg" alt="Featured" class="hero-image" />

  <!-- 使用 data 属性 -->
  <div data-preload="true">
    <img src="/important.jpg" alt="Important" />
  </div>
</template>
```

#### 全局方法

插件提供了全局方法用于手动预加载：

```typescript
// 在组件中使用
this.$preloadImages(['/image1.jpg', '/image2.jpg', '/image3.jpg'])
```

### 5. 图片优化工具函数

`imageOptimizer.ts` 提供了一系列图片优化工具函数。

#### 主要函数

```typescript
import {
  supportsWebP,
  getOptimizedImageUrl,
  generateSrcSet,
  generateSizes,
  generatePlaceholder,
  preloadImage,
  preloadImages,
  smartPreloadImages,
  getImageDimensions,
  isInViewport,
} from '@/utils/imageOptimizer'

// 检测 WebP 支持
if (supportsWebP) {
  console.log('浏览器支持 WebP')
}

// 获取优化后的图片 URL
const optimizedUrl = getOptimizedImageUrl('/image.jpg', {
  width: 800,
  quality: 80,
  format: 'webp',
})

// 生成响应式 srcset
const srcset = generateSrcSet('/image.jpg', [320, 640, 960, 1280])
// 输出: "/image.jpg?w=320 320w, /image.jpg?w=640 640w, ..."

// 生成 sizes 属性
const sizes = generateSizes({
  '(max-width: 640px)': '100vw',
  '(max-width: 1024px)': '50vw',
})

// 生成占位符（低质量图片）
const placeholder = generatePlaceholder('/image.jpg')

// 预加载单张图片
preloadImage('/critical-image.jpg')

// 批量预加载
await preloadImages(['/img1.jpg', '/img2.jpg'], (loaded, total) => {
  console.log(`进度: ${loaded}/${total}`)
})

// 智能预加载（考虑网络状况）
await smartPreloadImages(['/img1.jpg', '/img2.jpg'], {
  priority: 'high',
  maxConcurrent: 3,
  onProgress: (loaded, total) => {
    console.log(`${loaded}/${total}`)
  },
})

// 获取图片尺寸
const { width, height } = await getImageDimensions('/image.jpg')

// 检测元素是否在视口内
const isVisible = isInViewport(element, 100) // 100px 缓冲区
```

## 最佳实践

### 1. 关键图片优化

对于首屏关键图片（Hero 图、Logo 等）：

```vue
<OptimizedImage
  src="/hero.jpg"
  alt="Hero"
  :lazy="false"
  fetchpriority="high"
  :placeholder="false"
  :webp="true"
  :responsive="true"
/>
```

### 2. 列表图片优化

对于列表中的大量图片：

```vue
<OptimizedImage
  v-for="item in items"
  :key="item.id"
  :src="item.image"
  :alt="item.title"
  :lazy="true"
  :placeholder="true"
  :preload="true"
  preload-distance="200"
/>
```

### 3. 背景图片优化

对于 CSS 背景图片，使用预加载：

```vue
<script setup lang="ts">
import { useImagePreload } from '@/composables/useImagePreload'

const { preload } = useImagePreload({ priority: 'high' })

onMounted(() => {
  preload('/background.jpg')
})
</script>

<style>
.hero {
  background-image: url('/background.jpg');
}
</style>
```

### 4. 响应式图片配置

根据设计稿配置合适的断点：

```vue
<OptimizedImage
  src="/image.jpg"
  alt="Responsive"
  :widths="[375, 768, 1024, 1440, 1920]"
  sizes="(max-width: 375px) 100vw,
         (max-width: 768px) 50vw,
         (max-width: 1024px) 33vw,
         25vw"
/>
```

### 5. 网络优化

考虑用户的网络状况：

```typescript
// 仅在 WiFi 下预加载大图
const { preloadBatch } = useImagePreload({
  wifiOnly: true,
  priority: 'low',
})

// 检测慢速网络时降低图片质量
if (getConnectionType() === '2g' || getConnectionType() === 'slow-2g') {
  // 使用低质量图片
}
```

## 性能指标

实施这些优化后，预期的性能改进：

- **首屏加载时间 (FCP)**: 减少 20-30%
- **最大内容绘制 (LCP)**: 减少 30-40%
- **带宽使用**: 减少 40-60%（WebP + 响应式图片）
- **用户体验**: 更流畅的图片加载体验

## 浏览器兼容性

- **WebP**: Chrome 23+, Firefox 65+, Safari 14+, Edge 18+
- **Intersection Observer**: Chrome 51+, Firefox 55+, Safari 12.1+, Edge 15+
- **fetchpriority**: Chrome 101+, Edge 101+ (其他浏览器会忽略)
- **requestIdleCallback**: Chrome 47+, Firefox 55+, Edge 79+ (有 polyfill)

对于不支持的浏览器，会自动降级到标准的图片加载方式。

## 故障排除

### 图片不显示

1. 检查图片路径是否正确
2. 检查 WebP 格式是否存在（如果启用了 webp）
3. 查看浏览器控制台的错误信息

### 懒加载不工作

1. 确认 `lazy` prop 设置为 `true`
2. 检查 Intersection Observer 是否支持
3. 调整 `rootMargin` 和 `threshold` 参数

### 预加载不生效

1. 检查网络连接（可能被数据节省模式阻止）
2. 查看控制台日志了解预加载状态
3. 确认图片选择器是否正确

## 总结

通过这套完整的图片优化方案，我们实现了：

1. ✅ **WebP 格式支持** - 自动转换和使用 WebP
2. ✅ **响应式图片** - 根据设备加载合适尺寸
3. ✅ **渐进式加载** - Blur-up 效果提升体验
4. ✅ **智能懒加载** - Intersection Observer 高性能实现
5. ✅ **智能预加载** - 自动识别关键图片
6. ✅ **网络感知** - 根据网络状况调整策略

这些优化将显著提升应用的加载速度和用户体验。
