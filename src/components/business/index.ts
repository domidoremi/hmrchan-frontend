/**
 * Business Components
 * Application-specific business logic components
 */

// 核心业务组件 - 直接导出（高频使用）
export { default as PostCard } from './PostCard.vue'
export { default as FilterBar } from './FilterBar.vue'
export { default as SearchBar } from './SearchBar.vue'
export { default as Pagination } from './Pagination.vue'

// 重量级业务组件 - 懒加载导出
import { useLazyComponent } from '@/composables/useLazyComponent'

/**
 * PostPreviewPanel - 帖子预览面板
 * 懒加载：仅在需要预览时加载
 */
export const PostPreviewPanel = useLazyComponent(() => import('./PostPreviewPanel.vue'), {
  loadingText: 'Loading preview...',
  delay: 100,
})

/**
 * CacheManagement - 缓存管理组件
 * 懒加载：仅在设置页面使用
 */
export const CacheManagement = useLazyComponent(() => import('./CacheManagement.vue'), {
  loadingText: 'Loading cache management...',
  delay: 200,
})
