# Prefetch Utility Code Review & Improvements

## Summary

Analyzed and improved `src/utils/prefetch.ts` after recent changes that added three data prefetching functions. Applied critical fixes and architectural improvements.

## Issues Fixed

### 1. **Missing Constants** (Critical - Build Breaking)

**Problem**: Referenced undefined constants causing TypeScript errors

- `DEFAULT_TIMEOUT_MS`
- `IDLE_TIMEOUT_MS`
- `PREFETCH_DELAY_MS`

**Solution**: Added constant definitions at the top of the file

```typescript
const DEFAULT_TIMEOUT_MS = 2000 // 2 seconds for requestIdleCallback
const IDLE_TIMEOUT_MS = 100 // Fallback timeout for browsers without requestIdleCallback
const PREFETCH_DELAY_MS = 1000 // Delay after page load before prefetching
```

### 2. **Incorrect API Method Names** (Runtime Errors)

**Problem**: Called non-existent methods on API services

- `postService.getPosts()` → should be `listPosts()`
- `postService.getPostById()` → should be `getPost()`
- `authorService.getAuthors()` → should be `listAuthors()`
- `commentService.getComments()` → should be `getPostComments()`

**Solution**: Updated all function calls to match actual API service signatures

### 3. **Unused Parameter** (Code Smell)

**Problem**: `postId` parameter in `prefetchPostDetail()` was defined but never used

**Solution**: Added validation and actual usage of the parameter

### 4. **Code Duplication** (Maintainability)

**Problem**: Each prefetch function repeated the same network/battery checks

**Solution**: Created reusable `prefetchData()` utility function

## Architectural Improvements

### New Utility Function: `prefetchData()`

Centralized prefetch logic with:

- Network quality checks (slow/fast)
- Battery saving mode detection
- `requestIdleCallback` with fallback
- Error handling with dev-mode logging
- Configurable options

```typescript
async function prefetchData(
  importFn: () => Promise<unknown>,
  options: { skipOnSlowNetwork?: boolean } = {}
): Promise<void>
```

**Benefits**:

- DRY principle - single source of truth
- Consistent behavior across all prefetch functions
- Easier to test and maintain
- Extensible for future requirements

### Enhanced Documentation

Added comprehensive JSDoc comments:

- Function purpose and use cases
- Parameter descriptions with types
- Implementation examples in comments
- Clear TODO markers for future work

## Performance Considerations

### Network-Aware Prefetching

- Detects connection type (4G/WiFi vs 3G/2G)
- Skips prefetch on slow networks (configurable)
- Respects `navigator.connection.saveData` flag

### Battery-Aware Prefetching

- Checks for battery saving mode
- Automatically disables prefetch when battery is low
- Reduces unnecessary network usage

### Idle-Time Execution

- Uses `requestIdleCallback` when available
- Falls back to `setTimeout` for older browsers
- Ensures prefetch doesn't block main thread

## Implementation Details

### 1. Explore Page Data Prefetch

```typescript
export async function prefetchExploreData(): Promise<void>
```

- Lazy-loads `postService`
- Fetches first 20 posts
- Respects network conditions

### 2. Authors Page Data Prefetch

```typescript
export async function prefetchAuthorsData(): Promise<void>
```

- Lazy-loads `authorService`
- Fetches first 20 authors
- Respects network conditions

### 3. Post Detail Data Prefetch

```typescript
export async function prefetchPostDetail(postId: string): Promise<void>
```

- Validates `postId` parameter
- Parallel loads post and comments
- Lazy-loads both services
- Fetches post details + first 20 comments

## Testing Recommendations

### Unit Tests

```typescript
describe('prefetchData', () => {
  it('should skip on slow network', async () => {
    // Mock slow network
    // Verify no API calls made
  })

  it('should skip on save data mode', async () => {
    // Mock saveData flag
    // Verify no API calls made
  })

  it('should use requestIdleCallback when available', async () => {
    // Verify requestIdleCallback called
  })
})
```

### Integration Tests

```typescript
describe('prefetchExploreData', () => {
  it('should prefetch posts on fast network', async () => {
    // Mock fast network
    // Verify postService.listPosts called
  })
})
```

## Usage Examples

### Automatic Prefetch on Page Load

```typescript
// Already implemented in prefetchCriticalRoutes()
prefetchCriticalRoutes() // Called after page load
```

### Manual Prefetch on User Action

```typescript
// On hover over explore link
<a @mouseenter="prefetchExploreData()" href="/explore">
  Explore
</a>

// On hover over post card
<PostCard @mouseenter="prefetchPostDetail(post.id)" />
```

### Conditional Prefetch

```typescript
// Only prefetch if user has fast connection
if (getNetworkQuality() === 'fast') {
  await prefetchExploreData()
}
```

## Future Enhancements

### 1. Priority Queue System

```typescript
interface PrefetchTask {
  fn: () => Promise<unknown>
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedSize: number // bytes
}
```

### 2. Cache Integration

```typescript
// Check cache before prefetching
async function prefetchData(importFn: () => Promise<unknown>) {
  const cached = await checkCache(key)
  if (cached) return
  // ... proceed with prefetch
}
```

### 3. Analytics Integration

```typescript
// Track prefetch effectiveness
function trackPrefetch(routeName: string, hit: boolean) {
  analytics.track('prefetch', { routeName, hit })
}
```

### 4. User Preference

```typescript
// Respect user settings
const settings = useSettingsStore()
if (!settings.enablePrefetch) return
```

## Best Practices Applied

✅ **TypeScript Strict Mode** - No `any` types, proper type annotations
✅ **Error Handling** - Try-catch with dev-mode logging
✅ **Performance** - Network-aware, battery-aware, idle-time execution
✅ **Maintainability** - DRY principle, single responsibility
✅ **Documentation** - Comprehensive JSDoc comments
✅ **Async/Await** - Modern promise handling
✅ **Tree Shaking** - Dynamic imports for code splitting

## Related Files

- `src/api/postService.ts` - Post API methods
- `src/api/authorService.ts` - Author API methods
- `src/api/commentService.ts` - Comment API methods
- `src/utils/cache/` - Cache system (future integration)
- `src/stores/settings.ts` - User preferences (future integration)

## Metrics Impact

### Before

- ❌ Build errors (missing constants)
- ❌ Runtime errors (wrong method names)
- ⚠️ Code duplication (3x network checks)
- ⚠️ No error handling

### After

- ✅ Clean build
- ✅ Correct API calls
- ✅ DRY utility function
- ✅ Comprehensive error handling
- ✅ Network/battery awareness
- ✅ Full documentation

## Conclusion

The improvements transform stub functions into production-ready, network-aware prefetching utilities that respect user constraints (battery, data usage) while maintaining code quality and maintainability.
