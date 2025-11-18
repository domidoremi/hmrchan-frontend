# Implementation Plan

- [x] 1. Create type guard utilities foundation
  - Create new file `src/utils/typeGuards.ts` with `isAxiosError`, `toLogContext`, and `isDOMException` functions
  - Export all type guard functions and related interfaces
  - _Requirements: 2.2, 2.3, 6.2, 6.3_

- [x] 2. Fix Logger API misuse in utility files
  - [x] 2.1 Fix CacheManager.ts logger calls
    - Replace all `logger.log()` calls with `logger.info()` or `logger.debug()`
    - Convert string parameters to LogContext objects where needed
    - Handle DOMException errors with proper type conversion
    - _Requirements: 1.1, 1.3, 1.4, 2.5_

  - [x] 2.2 Fix preload.ts logger calls
    - Replace all `logger.log()` calls with `logger.info()` or `logger.debug()`
    - Ensure all logger calls use correct public API
    - _Requirements: 1.1, 1.3, 1.4_

- [x] 3. Fix Logger API misuse in composables
  - [x] 3.1 Fix useSmartPreload.ts logger calls
    - Replace `logger.log()` with `logger.info()` or `logger.debug()`
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 3.2 Fix useImageUpload.ts logger and error handling
    - Replace `logger.log()` with appropriate public method
    - Fix error type handling using `toLogContext` utility
    - Fix error.value assignment by ensuring error ref is properly typed
    - _Requirements: 1.1, 1.3, 1.4, 2.2, 2.3, 5.3_

  - [x] 3.3 Fix useFavorites.ts error handling
    - Convert caught errors to LogContext using `toLogContext` utility
    - _Requirements: 2.2, 2.3_

- [x] 4. Fix Logger API misuse in components
  - Replace `logger.criticalError()` with `logger.critical()` in ErrorBoundary.vue
  - Convert error parameters to LogContext objects
  - _Requirements: 1.3, 2.2, 2.3_

- [x] 5. Fix API services error handling
  - [x] 5.1 Fix services.ts logger calls
    - Convert string parameters to LogContext objects for all logger.info() calls
    - Convert caught errors to LogContext using `toLogContext` utility for all logger.warn() and logger.error() calls
    - _Requirements: 1.5, 2.2, 2.3_

  - [x] 5.2 Fix nativeFetchAdapter.ts type imports
    - Add `AxiosRequestConfig` to type imports from axios
    - Ensure all type references are properly imported
    - _Requirements: 3.1, 3.4_

- [x] 6. Fix stores error handling
  - Fix usePosts.ts error handling by converting caught errors to LogContext
  - _Requirements: 2.2, 2.3_

- [x] 7. Fix generic type constraints
  - [x] 7.1 Fix useOptimisticUpdate.ts generic type safety
    - Add null/undefined checks before accessing array items
    - Add type assertions for generic assignments
    - Ensure all item property accesses are guarded
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.2 Fix useAutoSave.ts generic type compatibility
    - Fix debounced function type signature to properly handle generic type T
    - _Requirements: 4.3_

- [x] 8. Fix component type issues
  - [x] 8.1 Fix RadioGroup.vue generic constraint
    - Add `extends PropertyKey | undefined` constraint to generic type T
    - _Requirements: 3.3_

  - [x] 8.2 Fix AppNavbar.vue import
    - Verify `changeLocale` is exported from useI18nOptimized composable
    - Add export if missing
    - _Requirements: 3.2_

- [x] 9. Fix composable function signatures
  - [x] 9.1 Fix useInputMethod.ts event listener syntax
    - Correct addEventListener and removeEventListener call syntax
    - Remove incorrect function invocation pattern
    - _Requirements: 5.2_

  - [x] 9.2 Fix PostDetailPage.vue useMediaPreload call
    - Investigate if useMediaPreload function exists
    - Either fix parameter count to match function signature or remove the call if function doesn't exist
    - _Requirements: 5.1, 5.4_

-

- [x] 10. Fix view error handling
  - Fix ProfilePage.vue error response handling by adding type guards for response and error objects using `isAxiosError` utility
  - Add proper type narrowing before accessing error.response properties
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Fix configuration type issues
  - Fix vitest.config.ts type compatibility by adding proper type assertions for mergeConfig parameters
  - _Requirements: 3.4_

-

- [x] 12. Verify all TypeScript errors are resolved
  - Run `bun run type-check` to verify zero compilation errors
  - Document any remaining errors and their resolution strategy
  - _Requirements: All_
  - ✅ **Verification Complete**: TypeScript compilation passes with zero errors
