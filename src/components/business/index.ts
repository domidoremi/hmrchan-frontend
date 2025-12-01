/**
 * 业务组件模块
 *
 * 包含应用特定的业务逻辑组件，这些组件封装了具体的业务功能和交互逻辑。
 * 业务组件通常依赖于 UI 组件和布局组件，并与应用的数据层（API、Store）紧密集成。
 *
 * 组件分类：
 * - 核心业务组件：高频使用，直接导出
 * - 重量级业务组件：按需加载，使用懒加载优化性能
 */

/**
 * 核心业务组件 - 直接导出
 * 这些组件在应用中频繁使用，直接导出以提高加载速度
 */

/** 帖子卡片组件 - 展示社交媒体帖子的核心信息 */
export { default as PostCard } from './PostCard.vue'

/** 筛选栏组件 - 提供帖子列表的多维度筛选功能 */
export { default as FilterBar } from './FilterBar.vue'

/** 搜索栏组件 - 提供全局搜索和搜索建议功能 */
export { default as SearchBar } from './SearchBar.vue'

/** 无限滚动帖子网格 - 支持瀑布流、虚拟列表和 IntersectionObserver */
export { default as InfinitePostGrid } from './InfinitePostGrid.vue'

/**
 * 重量级业务组件 - 懒加载导出
 * 这些组件体积较大或使用频率较低，使用懒加载优化首屏加载性能
 */
import { useLazyComponent } from '@/composables'

/**
 * 帖子预览面板组件
 * 在侧边面板中预览帖子的完整内容，支持多媒体切换
 * 懒加载：仅在用户点击预览时加载
 */
export const PostPreviewPanel = useLazyComponent(() => import('./PostPreviewPanel.vue'), {
  loadingText: 'Loading preview...',
  delay: 100,
})

/**
 * 缓存管理组件
 * 提供应用缓存的可视化管理界面，支持查看和清空各类缓存
 * 懒加载：仅在设置页面使用
 */
export const CacheManagement = useLazyComponent(() => import('./CacheManagement.vue'), {
  loadingText: 'Loading cache management...',
  delay: 200,
})
