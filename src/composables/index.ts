/**
 * Composables
 * Reusable composition functions
 */

// Existing composables
export {
  useKeyboardNavigation,
  useFocusManagement,
  useAriaLive,
  useSkipLinks,
  useContrastCheck,
} from './useAccessibility'
export { useFavorites } from './useFavorites'
export { useFormValidation, validationRules } from './useFormValidation'
export type { ValidationRule, ValidationSchema, FieldState } from './useFormValidation'
export { useImageUpload } from './useImageUpload'
export { useInfiniteScroll } from './useInfiniteScroll'
export { useMediaErrorRecovery } from './useMediaErrorRecovery'
export { useSmartPreload } from './useSmartPreload'
export { useWaterfallLayout } from './useWaterfallLayout'
export { usePostCardData, usePostCardFormatters } from './usePostCard'
export type { PostCardData, PostCardFormatters } from './usePostCard'
export { usePostCardAnimation } from './usePostCardAnimation'
export type { PostCardAnimationHandlers } from './usePostCardAnimation'

// UI composables
export { useAnimation } from './useAnimation'
export type {
  AnimationOptions,
  FadeOptions,
  SlideOptions,
  ScaleOptions,
  RotateOptions,
} from './useAnimation'
export { useModal, useModalManager } from './useModal'
export type { ModalOptions } from './useModal'
export { useToast } from './useToast'
export type { ToastOptions } from './useToast'

// Data composables
export { usePagination, useCursorPagination } from './usePagination'
export type { PaginationOptions, CursorPaginationOptions } from './usePagination'
export { useSearch, useMultiFieldSearch } from './useSearch'
export type { SearchOptions, SearchField, MultiFieldSearchOptions } from './useSearch'
export { useOptimisticUpdate, useListOptimisticUpdate } from './useOptimisticUpdate'
export type { OptimisticUpdateOptions } from './useOptimisticUpdate'

// Layout and utility composables
export { useResponsive, useResponsiveValue, breakpoints } from './useResponsive'
export type { Breakpoint } from './useResponsive'
export { useDebounce, useDebouncedRef, useDebounceFn, useDebounceRef } from './useDebounce'
export { useAutoSave } from './useAutoSave'
export type { SaveStatus, AutoSaveOptions } from './useAutoSave'
export { useThrottle, useThrottledRef, useThrottleFn, useThrottleRef } from './useThrottle'
export type { ThrottleOptions } from './useThrottle'
export { useClipboard, copyToClipboard } from './useClipboard'
export type { ClipboardOptions } from './useClipboard'
export {
  useEventListener,
  useEventListeners,
  useClickOutside,
  useKeyboardShortcut,
  useKeyboardShortcuts,
  useMousePosition,
  useWindowScroll,
  useWindowSize,
  useDocumentVisibility,
  useOnlineStatus,
} from './useEventListener'
export type { KeyboardShortcut } from './useEventListener'
