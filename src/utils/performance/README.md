# Performance Monitoring Utilities

This directory contains utilities for monitoring and analyzing application performance.

## Files

### `performanceMonitor.ts`

Core performance monitoring utility that tracks:

- Core Web Vitals (FCP, LCP, FID, CLS, TTFB)
- Navigation timing metrics
- Route transition times
- Scroll performance (FPS, dropped frames)

**Usage:**

```typescript
import { performanceMonitor } from '@/utils/performance/performanceMonitor'

// Get current metrics
const metrics = performanceMonitor.getMetrics()

// Generate performance report
const report = performanceMonitor.generateReport()
console.log(report)

// Check if targets are met
const { passed, results } = performanceMonitor.checkPerformanceTargets()
```

## Related Files

- **Composable:** `src/composables/usePerformanceMonitoring.ts` - Vue-integrated performance monitoring
- **Component:** `src/components/feedback/PerformanceDashboard.vue` - Visual performance dashboard
- **Script:** `scripts/analyze-bundle.js` - Bundle size analysis tool
- **Docs:** `docs/performance-testing-guide.md` - Comprehensive testing guide

## Performance Targets

| Metric           | Target   |
| ---------------- | -------- |
| FCP              | < 1.5s   |
| LCP              | < 2.5s   |
| FID              | < 100ms  |
| CLS              | < 0.1    |
| TTFB             | < 600ms  |
| Route Transition | < 500ms  |
| Scroll FPS       | ≥ 55 FPS |

## Development Mode

In development mode, the performance monitor is automatically initialized and exposed globally:

```javascript
// Access in browser console
window.__performanceMonitor__.generateReport()
```

## Production Mode

In production, metrics are collected but not logged. You can integrate with analytics services to track real user metrics (RUM).
