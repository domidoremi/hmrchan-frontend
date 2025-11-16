# Performance Testing Guide

# 性能测试指南

This guide provides comprehensive instructions for testing and optimizing the application's performance.

## Table of Contents

1. [First Screen Loading Performance (FCP & LCP)](#first-screen-loading-performance)
2. [Route Transition Performance](#route-transition-performance)
3. [Scroll Performance](#scroll-performance)
4. [Bundle Size Optimization](#bundle-size-optimization)
5. [Performance Targets](#performance-targets)
6. [Tools and Utilities](#tools-and-utilities)

---

## First Screen Loading Performance

### Metrics to Measure

- **FCP (First Contentful Paint)**: Time until first content is rendered
  - Target: < 1.5s
- **LCP (Largest Contentful Paint)**: Time until largest content element is rendered
  - Target: < 2.5s
- **TTFB (Time to First Byte)**: Time until first byte received from server
  - Target: < 600ms
- **TTI (Time to Interactive)**: Time until page is fully interactive
  - Target: < 3.5s

### Testing Methods

#### 1. Using Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to **Lighthouse** tab
3. Select:
   - Mode: Navigation
   - Device: Desktop/Mobile
   - Categories: Performance
4. Click "Analyze page load"
5. Review the report for FCP, LCP, TTI, and CLS scores

#### 2. Using Performance Monitor (Built-in)

The application includes a built-in performance monitor that automatically tracks metrics:

```javascript
// Access in browser console (development mode)
window.__performanceMonitor__.generateReport()
```

Or use the Performance Dashboard component:

```vue
<template>
  <PerformanceDashboard />
</template>

<script setup>
import PerformanceDashboard from '@/components/feedback/PerformanceDashboard.vue'
</script>
```

#### 3. Using WebPageTest

1. Visit https://www.webpagetest.org/
2. Enter your application URL
3. Select test location and browser
4. Run test and analyze results

### Optimization Strategies

#### Improve FCP

- ✅ Inline critical CSS (implemented via `vite-plugin-critical-css`)
- ✅ Preconnect to required origins
- ✅ Minimize render-blocking resources
- ✅ Use font-display: swap for web fonts
- ✅ Optimize server response time (TTFB)

#### Improve LCP

- ✅ Optimize images (WebP, lazy loading, responsive images)
- ✅ Preload critical resources
- ✅ Remove render-blocking JavaScript
- ✅ Optimize CSS delivery
- ✅ Use CDN for static assets

#### Code Implementation

```typescript
// Example: Preload critical resources
// In index.html
<link rel="preload" href="/assets/critical.css" as="style">
<link rel="preload" href="/assets/hero-image.webp" as="image">

// Example: Lazy load images
<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  lazy
  blur
  responsive
/>
```

---

## Route Transition Performance

### Metrics to Measure

- **Route Transition Time**: Time from navigation start to route fully rendered
  - Target: < 500ms

### Testing Methods

#### 1. Using Performance Monitor

The built-in performance monitor automatically tracks route transitions:

```typescript
import { usePerformanceMonitoring } from '@/composables/usePerformanceMonitoring'

const { getRouteTransitions, getAverageRouteTime } = usePerformanceMonitoring()

// Get all transitions
const transitions = getRouteTransitions()

// Get average time
const avgTime = getAverageRouteTime()
console.log(`Average route transition: ${avgTime.toFixed(2)}ms`)
```

#### 2. Manual Testing

1. Open Chrome DevTools Performance tab
2. Start recording
3. Navigate between routes
4. Stop recording
5. Analyze the timeline for:
   - JavaScript execution time
   - Rendering time
   - Layout shifts

### Optimization Strategies

#### Route-Level Code Splitting

```typescript
// router/index.ts
const routes = [
  {
    path: '/explore',
    component: () => import('@/views/ExplorePage.vue'),
    meta: { preload: true }, // Preload on hover
  },
]
```

#### Optimize Route Transitions

```typescript
// Reduce transition animation duration
// In router configuration
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0, behavior: 'instant' } // Instant scroll for faster transitions
  },
})
```

#### Prefetch Next Routes

```typescript
// composables/useSmartPreload.ts
// Already implemented - automatically prefetches likely next routes
import { useSmartPreload } from '@/composables/useSmartPreload'

const { preloadRoute } = useSmartPreload()

// Preload on hover
<RouterLink
  to="/explore"
  @mouseenter="preloadRoute('/explore')"
>
  Explore
</RouterLink>
```

---

## Scroll Performance

### Metrics to Measure

- **Frame Rate (FPS)**: Frames per second during scrolling
  - Target: ≥ 55 FPS (ideally 60 FPS)
- **Dropped Frames**: Number of frames below 60 FPS
  - Target: < 5% of total frames

### Testing Methods

#### 1. Using Performance Monitor

```typescript
import { usePerformanceMonitoring } from '@/composables/usePerformanceMonitoring'

const { startScrollMonitoring, stopScrollMonitoring, getScrollMetrics } = usePerformanceMonitoring()

// Start monitoring
startScrollMonitoring()

// Scroll the page for a few seconds

// Stop and get results
stopScrollMonitoring()
const metrics = getScrollMetrics()
console.log('Scroll Performance:', metrics)
```

#### 2. Using Chrome DevTools

1. Open DevTools Performance tab
2. Enable "Screenshots" and "Memory"
3. Start recording
4. Scroll the page
5. Stop recording
6. Check the FPS chart (green bars should be at 60 FPS)

#### 3. Using Performance Dashboard

Click "Test Scroll" button in the Performance Dashboard component to run a 5-second scroll test.

### Optimization Strategies

#### Use CSS Transform for Animations

```css
/* ✅ Good - Uses GPU acceleration */
.element {
  transform: translateY(10px);
  transition: transform 0.3s;
}

/* ❌ Bad - Triggers layout */
.element {
  top: 10px;
  transition: top 0.3s;
}
```

#### Implement Virtual Scrolling

```typescript
// For long lists (>100 items)
import { useVirtualScroll } from '@/composables/useVirtualScroll'

const { visibleItems, containerProps, wrapperProps } = useVirtualScroll({
  items: allItems,
  itemHeight: 100,
  buffer: 5,
})
```

#### Optimize Images in Viewport

```typescript
// Use Intersection Observer for lazy loading
import { useIntersectionObserver } from '@vueuse/core'

const { stop } = useIntersectionObserver(target, ([{ isIntersecting }]) => {
  if (isIntersecting) {
    // Load image
    stop()
  }
})
```

#### Debounce Expensive Operations

```typescript
import { useDebounceFn } from '@vueuse/core'

const debouncedSearch = useDebounceFn((query) => {
  // Expensive search operation
}, 300)
```

---

## Bundle Size Optimization

### Metrics to Measure

- **Total JavaScript Size**: All JS files combined
  - Target: < 500 KB (gzipped)
- **Initial Bundle Size**: Main entry point
  - Target: < 200 KB (gzipped)
- **Largest Chunk Size**: Biggest individual chunk
  - Target: < 150 KB (gzipped)

### Testing Methods

#### 1. Using Bundle Analyzer Script

```bash
# Build and analyze
npm run build:analyze
```

This will:

- Build the production bundle
- Analyze all chunks
- Identify large files
- Provide optimization recommendations

#### 2. Using Vite Build Output

```bash
npm run build
```

Check the console output for chunk sizes:

```
dist/assets/index-abc123.js    120.45 kB │ gzip: 45.23 kB
dist/assets/vendor-def456.js   250.30 kB │ gzip: 85.67 kB
```

#### 3. Using Rollup Visualizer (Optional)

Install and configure:

```bash
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
})
```

### Optimization Strategies

#### 1. Code Splitting

Already implemented in `vite.config.ts`:

```typescript
manualChunks(id) {
  // Core libraries
  if (id.includes('vue-router')) return 'vue-router'
  if (id.includes('pinia')) return 'pinia'

  // UI libraries
  if (id.includes('lucide-vue-next')) return 'icons'
  if (id.includes('gsap')) return 'animations'

  // Pages
  if (id.includes('/views/HomePage')) return 'page-home'
  if (id.includes('/views/ExplorePage')) return 'page-explore'
}
```

#### 2. Tree Shaking

Ensure proper imports:

```typescript
// ✅ Good - Tree-shakeable
import { ref, computed } from 'vue'

// ❌ Bad - Imports everything
import * as Vue from 'vue'
```

#### 3. Remove Unused Dependencies

```bash
# Analyze dependencies
npx depcheck

# Remove unused packages
npm uninstall <package-name>
```

#### 4. Use Lighter Alternatives

| Heavy Package | Lighter Alternative | Size Reduction |
| ------------- | ------------------- | -------------- |
| moment.js     | dayjs               | ~70%           |
| lodash        | lodash-es           | ~50%           |
| axios         | fetch API           | 100%           |

#### 5. Dynamic Imports

```typescript
// Lazy load heavy components
const MediaViewer = defineAsyncComponent(() => import('@/components/ui/MediaViewer.vue'))

// Lazy load heavy libraries
const loadGSAP = () => import('gsap')
```

#### 6. Optimize Images

```bash
# Use WebP format
# Compress images
# Use responsive images with srcset
```

---

## Performance Targets

### Core Web Vitals

| Metric | Good    | Needs Improvement | Poor     |
| ------ | ------- | ----------------- | -------- |
| FCP    | < 1.5s  | 1.5s - 3.0s       | > 3.0s   |
| LCP    | < 2.5s  | 2.5s - 4.0s       | > 4.0s   |
| FID    | < 100ms | 100ms - 300ms     | > 300ms  |
| CLS    | < 0.1   | 0.1 - 0.25        | > 0.25   |
| TTFB   | < 600ms | 600ms - 1200ms    | > 1200ms |

### Custom Metrics

| Metric              | Target   |
| ------------------- | -------- |
| Route Transition    | < 500ms  |
| Scroll FPS          | ≥ 55 FPS |
| Total JS Size       | < 500 KB |
| Initial Bundle      | < 200 KB |
| Time to Interactive | < 3.5s   |

---

## Tools and Utilities

### Built-in Tools

1. **Performance Monitor** (`src/utils/performance/performanceMonitor.ts`)
   - Tracks Core Web Vitals
   - Measures route transitions
   - Monitors scroll performance

2. **Performance Dashboard** (`src/components/feedback/PerformanceDashboard.vue`)
   - Visual performance metrics
   - Real-time monitoring
   - Interactive testing

3. **Bundle Analyzer** (`scripts/analyze-bundle.js`)
   - Analyzes build output
   - Identifies large chunks
   - Provides recommendations

### External Tools

1. **Chrome DevTools**
   - Lighthouse
   - Performance tab
   - Network tab
   - Coverage tab

2. **WebPageTest** (https://www.webpagetest.org/)
   - Real-world performance testing
   - Multiple locations and devices
   - Detailed waterfall charts

3. **PageSpeed Insights** (https://pagespeed.web.dev/)
   - Google's performance analysis
   - Mobile and desktop scores
   - Optimization suggestions

---

## Testing Checklist

### Before Release

- [ ] Run Lighthouse audit (score > 90)
- [ ] Check Core Web Vitals (all green)
- [ ] Test route transitions (< 500ms)
- [ ] Test scroll performance (≥ 55 FPS)
- [ ] Analyze bundle size (< 500 KB)
- [ ] Test on slow 3G network
- [ ] Test on low-end devices
- [ ] Verify image optimization
- [ ] Check for console errors
- [ ] Verify accessibility (a11y score > 90)

### Continuous Monitoring

- [ ] Set up performance monitoring in production
- [ ] Track Core Web Vitals with analytics
- [ ] Monitor bundle size in CI/CD
- [ ] Set up performance budgets
- [ ] Regular performance audits (monthly)

---

## Common Issues and Solutions

### Issue: High FCP/LCP

**Causes:**

- Large CSS files
- Render-blocking JavaScript
- Slow server response
- Large images above the fold

**Solutions:**

- Inline critical CSS
- Defer non-critical JavaScript
- Optimize server response time
- Optimize and preload hero images

### Issue: High CLS

**Causes:**

- Images without dimensions
- Dynamic content insertion
- Web fonts causing layout shift

**Solutions:**

- Set explicit width/height on images
- Reserve space for dynamic content
- Use font-display: swap

### Issue: Slow Route Transitions

**Causes:**

- Large route components
- Synchronous data fetching
- Heavy animations

**Solutions:**

- Implement code splitting
- Use async data fetching
- Optimize transition animations

### Issue: Poor Scroll Performance

**Causes:**

- Heavy DOM operations during scroll
- Expensive event handlers
- Large images in viewport

**Solutions:**

- Use virtual scrolling for long lists
- Debounce scroll handlers
- Implement lazy loading

### Issue: Large Bundle Size

**Causes:**

- Unused dependencies
- Duplicate code
- Large libraries

**Solutions:**

- Remove unused dependencies
- Implement tree shaking
- Use lighter alternatives
- Implement code splitting

---

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [Vue Performance Guide](https://vuejs.org/guide/best-practices/performance.html)
- [MDN Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)

---

## Conclusion

Regular performance testing and optimization are crucial for maintaining a fast and responsive application. Use the tools and strategies outlined in this guide to ensure your application meets performance targets and provides an excellent user experience.

For questions or issues, refer to the project documentation or contact the development team.
