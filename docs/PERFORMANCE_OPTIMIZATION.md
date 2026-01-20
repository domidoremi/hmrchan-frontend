# 性能优化指南

MomiChan 前端性能优化策略和最佳实践。

## 性能测试结果

### 当前指标 (momichan.xyz)

| 指标     | 值    | 目标   | 状态    |
| -------- | ----- | ------ | ------- |
| LCP      | 976ms | <2.5s  | ✅ 良好 |
| FID      | -     | <100ms | -       |
| CLS      | 0.00  | <0.1   | ✅ 优秀 |
| TTFB     | 450ms | <800ms | ✅ 良好 |
| 渲染延迟 | 525ms | <600ms | ✅ 良好 |

### 已识别的优化机会

1. **CSS 阻塞渲染** - 6 个 CSS 文件阻塞首屏渲染
2. **路由懒加载** - 可以进一步优化预加载策略
3. **组件缓存** - KeepAlive 可以更智能

## 已实施的优化

### 1. 智能路由预加载

**文件**: `src/utils/prefetch.ts`

**功能**:

- 基于网络状况的自适应预加载
- 省电模式检测
- 鼠标悬停预加载
- 优先级队列管理

**使用方法**:

```typescript
import { prefetchRoute, prefetchCriticalRoutes, setupHoverPrefetch } from '@/utils/prefetch'

// 自动预加载关键路由
prefetchCriticalRoutes()

// 启用鼠标悬停预加载
setupHoverPrefetch()

// 手动预加载特定路由
prefetchRoute('explore', () => import('@/views/ExplorePage.vue'), { priority: 'high' })
```

**配置**:

- 高优先级路由：explore, search, post-detail
- 低优先级路由：authors, community, profile
- 预加载延迟：1 秒（首屏渲染完成后）
- 悬停延迟：100ms

### 2. 智能组件缓存

**文件**: `src/App.vue`

**功能**:

- 动态 KeepAlive 缓存列表
- 基于访问频率的缓存策略
- 自动淘汰最少访问的页面
- 最大缓存数量：10 个组件

**工作原理**:

```typescript
// 访问超过 2 次的页面自动加入缓存
// 缓存满时移除访问次数最少的页面
const cachedPages = ref<string[]>(['HomePage', 'ExplorePage'])
```

### 3. 性能监控

**文件**: `src/utils/performanceMonitor.ts`

**监控指标**:

- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)
- TTI (Time to Interactive)
- Long Tasks (>50ms)
- 慢速资源 (>1s)

**使用方法**:

```typescript
import { getMetrics, getPerformanceScore } from '@/utils/performanceMonitor'

// 获取当前指标
const metrics = getMetrics()

// 获取性能评分
const { score, grade, details } = getPerformanceScore()
console.log(`Performance Score: ${score} (${grade})`)
```

### 4. 优化渲染性能

**文件**: `src/composables/useOptimizedRender.ts`

**提供的工具**:

#### RAF 防抖

```typescript
const debouncedFn = useRAFDebounce(() => {
  // 高频操作
}, 100)
```

#### RAF 节流

```typescript
const throttledFn = useRAFThrottle(() => {
  // 滚动处理
})
```

#### 延迟渲染

```typescript
const shouldRender = useDeferredRender(1000)

// 在模板中
<HeavyComponent v-if="shouldRender" />
```

#### 可见性检测

```typescript
const target = ref<HTMLElement | null>(null)
const isVisible = useIntersectionObserver(target, {
  rootMargin: '50px',
})
```

#### 批量更新

```typescript
const batchUpdate = useBatchUpdate((items) => {
  // 一次性处理所有更新
  updateList(items)
}, 16)

// 收集更新
items.forEach((item) => batchUpdate(item))
```

## 优化建议

### 1. CSS 优化

**问题**: 6 个 CSS 文件阻塞渲染

**解决方案**:

```html
<!-- 关键 CSS 内联 -->
<style>
  /* 首屏关键样式 */
</style>

<!-- 非关键 CSS 异步加载 -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
```

**Vite 配置**:

```typescript
// vite.config.ts
export default {
  build: {
    cssCodeSplit: true, // CSS 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'critical-css': ['src/styles/critical.css'],
        },
      },
    },
  },
}
```

### 2. 图片优化

**使用 ProgressiveImage 组件**:

```vue
<ProgressiveImage :src="imageUrl" :thumbnail="thumbnailUrl" alt="Description" />
```

**特性**:

- 渐进式加载（缩略图 → 完整图）
- 懒加载（IntersectionObserver）
- 自动 WebP 支持
- 加载状态和错误处理

### 3. 代码分割

**路由级别**:

```typescript
// 已实现 - 所有路由都是懒加载
{
  path: '/explore',
  component: () => import('@/views/ExplorePage.vue')
}
```

**组件级别**:

```typescript
// 重型组件异步加载
const HeavyComponent = defineAsyncComponent(() => import('@/components/HeavyComponent.vue'))
```

**库级别**:

```typescript
// GSAP 懒加载
const gsap = await import('gsap')
```

### 4. Service Worker 优化

**文件**: `src/utils/cache/swRegister.ts`

**策略**:

- 静态资源：Cache First
- API 请求：Network First
- 图片：Cache First with expiration
- 预缓存关键资源

### 5. 网络优化

**DNS 预解析**:

```html
<link rel="dns-prefetch" href="https://api.momichan.xyz" />
```

**资源预连接**:

```html
<link rel="preconnect" href="https://api.momichan.xyz" />
```

**资源预加载**:

```html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
```

## 性能检查清单

### 开发阶段

- [ ] 使用 `useOptimizedRender` 优化高频操作
- [ ] 大列表使用虚拟滚动
- [ ] 图片使用 `ProgressiveImage`
- [ ] 重型组件使用 `defineAsyncComponent`
- [ ] 避免不必要的响应式数据
- [ ] 使用 `v-once` 和 `v-memo` 优化静态内容

### 构建阶段

- [ ] 启用代码分割
- [ ] 压缩图片和资源
- [ ] Tree-shaking 移除未使用代码
- [ ] 生成 source map（仅开发环境）
- [ ] 启用 Brotli 压缩

### 部署阶段

- [ ] 配置 CDN
- [ ] 启用 HTTP/2
- [ ] 设置合理的缓存策略
- [ ] 配置 Service Worker
- [ ] 监控 Core Web Vitals

## 性能测试工具

### 本地测试

```bash
# Lighthouse
bun run build
npx serve dist
# 在 Chrome DevTools 中运行 Lighthouse

# Bundle 分析
bun run build --report
```

### 线上测试

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)

## 监控和分析

### 开发环境

性能指标自动打印到控制台：

```
LCP: 976 ms
FID: 45 ms
CLS: 0.0012
FCP: 523 ms
TTFB: 450 ms
```

### 生产环境

可以集成第三方分析服务：

```typescript
// src/utils/performanceMonitor.ts
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const metrics = getMetrics()
    // 发送到分析服务
    sendToAnalytics(metrics)
  }
})
```

## 最佳实践

### 1. 首屏优化

- 内联关键 CSS
- 延迟加载非关键资源
- 使用骨架屏
- 优化字体加载

### 2. 运行时优化

- 使用 RAF 处理动画
- 避免强制同步布局
- 使用 Web Workers 处理复杂计算
- 实施虚拟滚动

### 3. 网络优化

- 启用 HTTP/2
- 使用 CDN
- 压缩资源
- 实施缓存策略

### 4. 用户体验

- 显示加载状态
- 实施乐观更新
- 提供离线支持
- 优雅降级

## 参考资源

- [Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Vue Performance Guide](https://vuejs.org/guide/best-practices/performance.html)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
