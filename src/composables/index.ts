/**
 * Composables - Flat Structure
 */

// Core
export { useResponsive, useResponsiveValue, breakpoints } from './useResponsive'
export type { Breakpoint } from './useResponsive'
export { useDebounce, useDebouncedRef, useDebounceFn, useDebounceRef } from './useDebounce'
export { useThrottle, useThrottledRef, useThrottleFn, useThrottleRef } from './useThrottle'
export type { ThrottleOptions } from './useThrottle'
export {
  useEventListener,
  useEventListeners,
  useClickOutside,
  useKeyboardShortcut,
  useMousePosition,
  useWindowScroll,
  useWindowSize,
  useDocumentVisibility,
  useOnlineStatus,
} from './useEventListener'
export type { KeyboardShortcut } from './useEventListener'
export { useI18nOptimized } from './useI18nOptimized'
export { usePerformanceMonitoring } from './usePerformanceMonitoring'
export { initAppState } from './useAppInit'

// UI
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
export {
  useBodyScrollLock,
  lockBodyScroll,
  unlockBodyScroll,
  forceUnlockBodyScroll,
} from './useBodyScrollLock'
export {
  useKeyboardNavigation,
  useFocusManagement,
  useAriaLive,
  useSkipLinks,
  useContrastCheck,
} from './useAccessibility'
export { useFocusTrap } from './useFocusTrap'
export { useKeyboardShortcuts } from './useKeyboardShortcuts'
export { useLazyComponent } from './useLazyComponent'
export { usePopover, supportsPopover, usePopoverAnchor } from './usePopover'
export type { UsePopoverOptions } from './usePopover'
export { useClipboard, copyToClipboard } from './useClipboard'
export type { ClipboardOptions } from './useClipboard'
export { useMobileDrawer } from './useMobileDrawer'
export type { UseMobileDrawerReturn, UseMobileDrawerOptions } from './useMobileDrawer'

// Form
export { useFormValidation, validationRules } from './useFormValidation'
export type { ValidationRule, ValidationSchema, FieldState } from './useFormValidation'
export { useAutoSave } from './useAutoSave'
export type { SaveStatus, AutoSaveOptions } from './useAutoSave'

// Data
export { useInfiniteScroll } from './useInfiniteScroll'

// Media
export { useImageUpload } from './useImageUpload'
export { useImageLazyLoad } from './useImageLazyLoad'
export { useSmartPreload } from './useSmartPreload'
export { useWaterfallLayout } from './useWaterfallLayout'

// Business
export { useFavorites } from './useFavorites'
export { usePostCardData, usePostCardFormatters } from './usePostCard'
export type { PostCardData, PostCardFormatters } from './usePostCard'
export { usePostCardAnimation } from './usePostCardAnimation'
export type { PostCardAnimationHandlers } from './usePostCardAnimation'
export { usePostsFilters } from './usePostsFilters'
export type { UsePostsFiltersReturn, UsePostsFiltersOptions } from './usePostsFilters'
export { useHomePageAnimation } from './useHomePageAnimation'
