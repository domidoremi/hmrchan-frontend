// 基础组件 - 直接导出
export { default as Card } from './Card.vue'
export { default as Badge } from './Badge.vue'
export { default as Divider } from './Divider.vue'
export { default as StatCard } from './StatCard.vue'
export { default as StatCardGrid } from './StatCardGrid.vue'

// 重量级组件 - 懒加载导出
import { useLazyComponent } from '@/composables'

/**
 * MediaViewer - 媒体查看器（图片/视频）
 * 懒加载：包含视频播放器，体积较大
 */
export const MediaViewer = useLazyComponent(() => import('./MediaViewer.vue'), {
  loadingText: 'Loading media viewer...',
  delay: 100,
})

/**
 * MediaViewerPlyr - Plyr 视频播放器
 * 懒加载：依赖 Plyr 库，体积大
 */
export const MediaViewerPlyr = useLazyComponent(() => import('./MediaViewerPlyr.vue'), {
  loadingText: 'Loading video player...',
  delay: 100,
})

/**
 * ImageViewer - 图片查看器
 * 懒加载：仅在需要查看大图时加载
 */
export const ImageViewer = useLazyComponent(() => import('./ImageViewer.vue'), {
  loadingText: 'Loading image viewer...',
  delay: 100,
})
