/**
 * Pinia Stores Export
 */

export { useThemeStore } from './theme'
export {
  useSettingsStore,
  type Settings,
  type AnimationIntensity,
  type ParticleEffectType,
  type ParticleEffectConfig,
} from './settings'
export { useAuthStore } from './auth'
export { useToastStore, type Toast } from './toast'
export { useCommentsStore } from './comments'
export { useLoadingStore, type LoadingTask } from './loading'
export { useScheduleStore } from './schedule'
export { useNotificationsStore } from './notifications'
export { useFavoritesStore } from './favorites'
export { useDiscussionsStore } from './discussions'
