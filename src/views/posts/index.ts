/**
 * Posts View Module Index
 * 帖子列表页面模块导出
 */

// 主视图组件
export { default as PostsView } from './PostsView.vue'

// 子组件
export * from './components'

// Composables (from main composables)
export { usePostsFilters, useMobileDrawer } from '@/composables'
export type { UsePostsFiltersReturn, UseMobileDrawerReturn } from '@/composables'

// 类型 (from main types)
export type {
  PlatformOption,
  SortOption,
  ViewMode,
  FiltersState,
  PostsPaginationState,
  PreviewState,
  DrawerDragState,
  DrawerConfig,
} from '@/types'
