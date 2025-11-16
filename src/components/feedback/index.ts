// 基础反馈组件 - 直接导出（常用，需要立即可用）
export { default as LoadingSpinner } from './LoadingSpinner.vue'
export { default as LoadingProgress } from './LoadingProgress.vue'
export { default as Skeleton } from './Skeleton.vue'
export { default as Toast } from './Toast.vue'
export { default as EmptyState } from './EmptyState.vue'
export { default as ErrorBoundary } from './ErrorBoundary.vue'
export { default as AsyncComponentLoader } from './AsyncComponentLoader.vue'
export { default as BufferIndicator } from './BufferIndicator.vue'
export { default as AccessLimitBanner } from './AccessLimitBanner.vue'
export { default as ApiUnavailableNotice } from './ApiUnavailableNotice.vue'
export { default as CookieBanner } from './CookieBanner.vue'

// 重量级组件 - 懒加载导出
import { useLazyComponent } from '@/composables'

/**
 * Modal - 模态框组件
 * 懒加载：不是每个页面都需要，按需加载
 */
export const Modal = useLazyComponent(() => import('./Modal.vue'), {
  loadingText: 'Loading modal...',
  delay: 50, // Modal 需要快速响应，减少延迟
})
