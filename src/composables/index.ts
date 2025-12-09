/**
 * 组合式函数集合
 *
 * 功能描述：
 * - 提供可复用的组合式函数
 * - 按功能模块组织，便于维护和查找
 * - 统一导出接口，简化导入路径
 *
 * 目录结构：
 * - core/     核心功能（响应式、国际化、性能监控、防抖节流、事件监听）
 * - ui/       UI 交互（动画、模态框、Toast、无障碍、剪贴板、快捷键）
 * - form/     表单相关（验证、自动保存、输入法检测）
 * - data/     数据处理（分页、搜索、乐观更新、无限滚动）
 * - media/    媒体处理（图片上传、懒加载、预加载、虚拟滚动、瀑布流）
 * - business/ 业务逻辑（收藏管理、帖子卡片）
 */

// ==================== Core 核心功能 ====================
export { useResponsive, useResponsiveValue, breakpoints } from './core/useResponsive'
export type { Breakpoint } from './core/useResponsive'

export { useDebounce, useDebouncedRef, useDebounceFn, useDebounceRef } from './core/useDebounce'

export { useThrottle, useThrottledRef, useThrottleFn, useThrottleRef } from './core/useThrottle'
export type { ThrottleOptions } from './core/useThrottle'

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
} from './core/useEventListener'
export type { KeyboardShortcut } from './core/useEventListener'

export { useI18nFallback } from './core/useI18nFallback'
export { useI18nOptimized } from './core/useI18nOptimized'
export { usePerformanceMonitoring } from './core/usePerformanceMonitoring'
export { initAppState } from './core/useAppInit'

// ==================== UI 交互 ====================
export { useAnimation } from './ui/useAnimation'
export type {
  AnimationOptions,
  FadeOptions,
  SlideOptions,
  ScaleOptions,
  RotateOptions,
} from './ui/useAnimation'

export { useModal, useModalManager } from './ui/useModal'
export type { ModalOptions } from './ui/useModal'

export { useToast } from './ui/useToast'
export type { ToastOptions } from './ui/useToast'

export {
  useKeyboardNavigation,
  useFocusManagement,
  useAriaLive,
  useSkipLinks,
  useContrastCheck,
} from './ui/useAccessibility'

export { useFocusTrap } from './ui/useFocusTrap'
export { useKeyboardShortcuts } from './ui/useKeyboardShortcuts' // 使用独立的 useKeyboardShortcuts
export { useLongPress } from './ui/useLongPress'
export { useLazyComponent } from './ui/useLazyComponent'

export { usePopover, supportsPopover, usePopoverAnchor } from './ui/usePopover'
export type { UsePopoverOptions } from './ui/usePopover'

export { useClipboard, copyToClipboard } from './ui/useClipboard'
export type { ClipboardOptions } from './ui/useClipboard'

// ==================== Form 表单 ====================
export { useFormValidation, validationRules } from './form/useFormValidation'
export type { ValidationRule, ValidationSchema, FieldState } from './form/useFormValidation'

export { useAutoSave } from './form/useAutoSave'
export type { SaveStatus, AutoSaveOptions } from './form/useAutoSave'

export { useInputMethod } from './form/useInputMethod'

// ==================== Data 数据 ====================
export { usePagination, useCursorPagination } from './data/usePagination'
export type { PaginationOptions, CursorPaginationOptions } from './data/usePagination'

export { useSearch, useMultiFieldSearch } from './data/useSearch'
export type { SearchOptions, SearchField, MultiFieldSearchOptions } from './data/useSearch'

export { useOptimisticUpdate, useListOptimisticUpdate } from './data/useOptimisticUpdate'
export type { OptimisticUpdateOptions } from './data/useOptimisticUpdate'

export { useInfiniteScroll } from './data/useInfiniteScroll'

// ==================== Media 媒体 ====================
export { useImageUpload } from './media/useImageUpload'
export { useImageLazyLoad } from './media/useImageLazyLoad'
export { useImagePreload } from './media/useImagePreload'
export { useSmartPreload } from './media/useSmartPreload'
export { useMediaErrorRecovery } from './media/useMediaErrorRecovery'
export { useVirtualScroll } from './media/useVirtualScroll'
export { useWaterfallLayout } from './media/useWaterfallLayout'

// ==================== Business 业务 ====================
export { useFavorites } from './business/useFavorites'

export { usePostCardData, usePostCardFormatters } from './business/usePostCard'
export type { PostCardData, PostCardFormatters } from './business/usePostCard'

export { usePostCardAnimation } from './business/usePostCardAnimation'
export type { PostCardAnimationHandlers } from './business/usePostCardAnimation'

export { usePostsFilters } from './business/usePostsFilters'
export type { UsePostsFiltersReturn, UsePostsFiltersOptions } from './business/usePostsFilters'

// ==================== UI - Mobile ====================
export { useMobileDrawer } from './ui/useMobileDrawer'
export type { UseMobileDrawerReturn, UseMobileDrawerOptions } from './ui/useMobileDrawer'
