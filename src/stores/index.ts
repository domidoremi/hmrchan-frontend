/**
 * Pinia 状态管理统一导出
 *
 * 功能说明：
 * - 统一导出所有状态管理 store
 * - 导出相关类型定义
 */

/** 认证状态管理 */
export { useAuthStore } from './useAuth'

/** 网络状态管理 */
export { useNetworkStore } from './useNetwork'

/** 内容状态管理 */
export { usePostsStore } from './usePosts'

/** 作者状态管理 */
export { useAuthorsStore } from './useAuthors'

/** 统计状态管理 */
export { useStatsStore } from './useStats'

/** 搜索状态管理 */
export { useSearchStore } from './useSearch'

/** 用户相关操作 */
export { useUsersStore } from './useUsers'

/** 上传相关操作 */
export { useUploadStore } from './useUpload'

/** 反馈相关操作 */
export { useFeedbackStore } from './useFeedback'

/** 收藏相关操作 */
export { useFavoritesStore } from './useFavoritesStore'

/** 媒体相关操作 */
export { useMediaStore } from './useMedia'

/** 用户设置状态管理 */
export { useSettingsStore } from './useSettings'

/** 主题状态管理 */
export { useThemeStore } from './useTheme'

/** Toast 通知状态管理 */
export { useToastStore } from './useToast'

/** 用户设置类型定义 */
export type { UserSettings } from './useSettings'

/** Toast 通知类型定义 */
export type { Toast, ToastType } from './useToast'
