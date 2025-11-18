# Design Document

## Overview

This design addresses 79 TypeScript compilation errors through systematic refactoring across six main areas: Logger API corrections, error type handling, missing type imports, generic type constraints, function signature fixes, and error response typing. The solution maintains backward compatibility while improving type safety and code quality.

## Architecture

### High-Level Approach

The fix strategy follows a layered approach:

1. **Foundation Layer**: Fix core utilities (Logger, type definitions)
2. **API Layer**: Resolve type imports and adapter issues
3. **Composables Layer**: Fix generic constraints and function signatures
4. **Component Layer**: Resolve component-specific type issues
5. **Configuration Layer**: Fix build configuration type issues

### Design Principles

- **Type Safety First**: All fixes must improve or maintain type safety
- **Minimal API Changes**: Preserve existing public APIs where possible
- **Backward Compatibility**: Ensure existing functionality remains intact
- **Explicit Over Implicit**: Use explicit type annotations where ambiguity exists

## Components and Interfaces

### 1. Logger System Refactoring

**Problem**: Code incorrectly calls private `logger.log()` method and non-existent `logger.criticalError()` method. Additionally, string values are passed where `LogContext` is expected.

**Solution Design**:

```typescript
// Current (incorrect usage):
logger.log('[CacheManager] Initialized', { ... })
logger.criticalError('[ErrorBoundary] Caught error:', err)
logger.info('[Media] Downloaded media successfully:', mediaId)

// Fixed usage:
logger.info('[CacheManager] Initialized', { ... })
logger.critical('[ErrorBoundary] Caught error:', { error: err })
logger.info('[Media] Downloaded media successfully', { mediaId })
```

**Implementation Strategy**:

- Replace all `logger.log()` calls with appropriate public methods (debug, info, warn, error, critical)
- Replace `logger.criticalError()` with `logger.critical()`
- Convert string parameters to LogContext objects where required
- Wrap primitive values in LogContext-compatible objects

**Affected Files**:

- `src/utils/cache/CacheManager.ts` (10 instances)
- `src/utils/media/preload.ts` (8 instances)
- `src/composables/media/useSmartPreload.ts` (1 instance)
- `src/composables/media/useImageUpload.ts` (1 instance)
- `src/components/ui/error/ErrorBoundary.vue` (2 instances)
- `src/api/services.ts` (6 instances)

### 2. Error Type Handling

**Problem**: Caught errors typed as `unknown` are passed directly to logger methods expecting `LogContext`, and error properties are accessed without type guards.

**Solution Design**:

```typescript
// Pattern 1: Error in catch blocks
try {
  // operation
} catch (error) {
  // Before:
  logger.error('[Context] Operation failed:', error)

  // After:
  logger.error('[Context] Operation failed', {
    error: error instanceof Error ? error.message : String(error),
  })
}

// Pattern 2: DOMException handling
// Before:
logger.error('[CacheManager] Persistence get error:', request.error)

// After:
logger.error('[CacheManager] Persistence get error', {
  error: request.error?.message || 'Unknown error',
})

// Pattern 3: Error response access
// Before:
const status = error.response.status

// After:
if (error && typeof error === 'object' && 'response' in error) {
  const axiosError = error as { response: { status: number } }
  const status = axiosError.response.status
}
```

**Type Guard Utilities**:

```typescript
// Add to src/utils/typeGuards.ts (new file)
export function isAxiosError(error: unknown): error is {
  response: { status: number; data?: { detail?: string } }
  message: string
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as any).response === 'object'
  )
}

export function toLogContext(error: unknown): LogContext {
  if (error instanceof Error) {
    return { error: error.message, stack: error.stack }
  }
  if (typeof error === 'string') {
    return { error }
  }
  return { error: String(error) }
}
```

**Affected Files**:

- `src/api/services.ts` (5 instances)
- `src/composables/business/useFavorites.ts` (1 instance)
- `src/composables/media/useImageUpload.ts` (1 instance)
- `src/stores/usePosts.ts` (1 instance)
- `src/utils/cache/CacheManager.ts` (6 instances)
- `src/views/ProfilePage.vue` (6 instances)

### 3. Missing Type Definitions

**Problem**: References to undefined types and missing exports.

**Solution Design**:

#### 3.1 AxiosRequestConfig Import

```typescript
// src/api/nativeFetchAdapter.ts
// Add to existing imports:
import type {
  AxiosAdapter,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosHeaders,
  AxiosRequestConfig, // Add this
} from 'axios'

// Update function signatures:
export function createRequestConfig(config?: AxiosRequestConfig): InternalAxiosRequestConfig {
  // implementation
}
```

#### 3.2 useI18nOptimized Export

```typescript
// src/composables/core/useI18nOptimized.ts
// Ensure changeLocale is exported:
export function changeLocale(locale: string): Promise<void> {
  // implementation
}

// Or if it doesn't exist, create it:
export async function changeLocale(locale: string): Promise<void> {
  const { locale: currentLocale } = useI18n()
  currentLocale.value = locale
  // Additional locale change logic
}
```

#### 3.3 RadioGroup Generic Constraint

```typescript
// src/components/ui/radio/RadioGroup.vue
// Before:
<script setup lang="ts" generic="T = string">

// After:
<script setup lang="ts" generic="T extends PropertyKey | undefined = string">
```

#### 3.4 Vitest Config Type

```typescript
// vitest.config.ts
// Before:
export default mergeConfig(
  viteConfig,
  defineConfig({ ... })
)

// After:
import type { UserConfig } from 'vite'

export default mergeConfig(
  viteConfig as UserConfig,
  defineConfig({ ... }) as UserConfig
)
```

**Affected Files**:

- `src/api/nativeFetchAdapter.ts` (2 instances)
- `src/composables/core/useI18nOptimized.ts` (1 instance)
- `src/components/ui/radio/RadioGroup.vue` (1 instance)
- `vitest.config.ts` (1 instance)

### 4. Generic Type Constraints

**Problem**: Generic type `T` used without proper constraints or type guards, leading to unsafe assignments.

**Solution Design**:

#### 4.1 useOptimisticUpdate Composable

```typescript
// src/composables/data/useOptimisticUpdate.ts

// Strategy: Add type guards and assertions

// Before:
list.value[index] = { ...list.value[index], ...updates }

// After:
const currentItem = list.value[index]
if (currentItem) {
  list.value[index] = { ...currentItem, ...updates } as T
}

// Before:
const originalValue = item[property]

// After:
const item = list.value.find((i) => getId(i) === id)
if (!item) return
const originalValue = item[property]

// Before:
list.value[currentIndex][property] = !originalValue

// After:
const currentItem = list.value[currentIndex]
if (currentItem) {
  ;(currentItem[property] as boolean) = !originalValue
}
```

#### 4.2 useAutoSave Composable

```typescript
// src/composables/form/useAutoSave.ts

// Before:
const { debounced: debouncedSave, cancel, flush } = useDebounceFn(save, delay)

// After:
const {
  debounced: debouncedSave,
  cancel,
  flush,
} = useDebounceFn((data: unknown) => save(data as T), delay)
```

**Affected Files**:

- `src/composables/data/useOptimisticUpdate.ts` (8 instances)
- `src/composables/form/useAutoSave.ts` (1 instance)

### 5. Function Signature Fixes

**Problem**: Functions called with incorrect number or types of parameters.

**Solution Design**:

#### 5.1 useInputMethod Event Listeners

```typescript
// src/composables/form/useInputMethod.ts

// Before (incorrect syntax):
;(window as Window).addEventListener('touchstart', handleTouchStart as (event: Event) => void, {
  passive: true,
})(window as Window)

// After:
;(window as Window).addEventListener('touchstart', handleTouchStart as (event: Event) => void, {
  passive: true,
})

// Similar fix for removeEventListener
```

#### 5.2 useImageUpload Error Property

```typescript
// src/composables/media/useImageUpload.ts

// Before:
error.value = errorMsg

// After:
// Ensure error is defined as Ref<string | null>
const error = ref<string | null>(null)
error.value = errorMsg
```

#### 5.3 useMediaPreload Parameter Count

```typescript
// src/views/PostDetailPage.vue

// Need to check actual function signature first
// If function expects 2 parameters:
// Before:
useMediaPreload(allMediaItems, currentThumbnailIndex, {
  lookahead: 2,
  enabled: true,
})

// After (Option 1 - merge parameters):
useMediaPreload(allMediaItems, {
  currentIndex: currentThumbnailIndex,
  lookahead: 2,
  enabled: true,
})

// After (Option 2 - if function doesn't exist, remove call):
// Remove the call if useMediaPreload doesn't exist
```

**Affected Files**:

- `src/composables/form/useInputMethod.ts` (2 instances)
- `src/composables/media/useImageUpload.ts` (1 instance)
- `src/views/PostDetailPage.vue` (1 instance)

### 6. Error Response Type Guards

**Problem**: Accessing properties on `unknown` error types without type narrowing.

**Solution Design**:

```typescript
// src/views/ProfilePage.vue

// Before:
favoritesCount.value = response.favorites_count || 0
const status = error.response.status
const errorMsg = error.response.data?.detail

// After:
// For response:
if (response && typeof response === 'object' && 'favorites_count' in response) {
  favoritesCount.value = (response as { favorites_count: number }).favorites_count || 0
}

// For errors:
if (isAxiosError(error)) {
  const status = error.response.status
  if (error.response.data?.detail) {
    errorMsg = error.response.data.detail
  }
} else if (error && typeof error === 'object' && 'message' in error) {
  const err = error as { message: string }
  if (err.message === 'Network Error') {
    // handle network error
  }
}
```

**Affected Files**:

- `src/views/ProfilePage.vue` (5 instances)

## Data Models

### Type Guard Utilities

```typescript
// src/utils/typeGuards.ts (new file)

export interface AxiosErrorLike {
  response: {
    status: number
    data?: {
      detail?: string
      [key: string]: unknown
    }
  }
  message: string
}

export function isAxiosError(error: unknown): error is AxiosErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as any).response === 'object' &&
    'status' in (error as any).response
  )
}

export function toLogContext(value: unknown): LogContext {
  if (value instanceof Error) {
    return {
      error: value.message,
      stack: value.stack,
      name: value.name,
    }
  }
  if (typeof value === 'string') {
    return { message: value }
  }
  if (typeof value === 'object' && value !== null) {
    return { data: JSON.stringify(value) }
  }
  return { value: String(value) }
}

export function isDOMException(error: unknown): error is DOMException {
  return error instanceof DOMException
}
```

## Error Handling

### Compilation Error Categories

1. **Logger API Errors (35 instances)**: Replace with correct public methods
2. **Type Parameter Errors (15 instances)**: Add LogContext wrappers or type guards
3. **Generic Type Errors (10 instances)**: Add constraints and null checks
4. **Missing Import Errors (5 instances)**: Add imports or exports
5. **Function Signature Errors (4 instances)**: Fix parameter counts and types
6. **Property Access Errors (10 instances)**: Add type guards

### Error Prevention Strategy

- Add ESLint rule to prevent direct `logger.log()` calls
- Create type guard utilities for common patterns
- Document proper error handling patterns in code comments
- Add unit tests for type guard functions

## Testing Strategy

### Unit Tests

1. **Type Guard Tests** (`src/utils/__tests__/typeGuards.test.ts`):
   - Test `isAxiosError()` with various error shapes
   - Test `toLogContext()` with different input types
   - Test `isDOMException()` with DOM and non-DOM errors

2. **Logger Integration Tests** (`src/utils/__tests__/logger.test.ts`):
   - Verify all public methods accept correct parameters
   - Verify LogContext parameter handling
   - Verify error logging with various error types

### Type Checking

1. **Pre-commit Hook**: Run `bun run type-check` before commits
2. **CI Pipeline**: Ensure type-check passes in CI
3. **IDE Integration**: Verify errors disappear in IDE after fixes

### Manual Testing

1. **Logger Functionality**: Verify logs still appear correctly in console
2. **Error Handling**: Trigger errors and verify proper logging
3. **API Calls**: Test API error scenarios
4. **Component Rendering**: Verify RadioGroup and other components render correctly

### Validation Criteria

- Zero TypeScript compilation errors
- All existing tests pass
- No runtime errors introduced
- Console logs maintain same format and information
- Application functionality unchanged

## Implementation Notes

### Fix Order

1. Create type guard utilities first (foundation)
2. Fix Logger API calls (most numerous, affects many files)
3. Fix error type handling (uses type guards from step 1)
4. Add missing imports and exports
5. Fix generic type constraints
6. Fix function signatures
7. Fix error response handling (uses type guards from step 1)

### Risk Mitigation

- Test each category of fixes independently
- Run type-check after each major change
- Keep git commits granular for easy rollback
- Verify no runtime behavior changes through manual testing

### Performance Considerations

- Type guards add minimal runtime overhead
- LogContext object creation is lightweight
- No impact on production bundle size (types are compile-time only)
