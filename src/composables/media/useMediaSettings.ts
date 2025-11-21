/**
 * 媒体设置 Composable
 *
 * 提供统一的媒体播放和显示设置
 */

import { computed } from 'vue'
import { useSettingsStore } from '@/stores'

export function useMediaSettings() {
  const settingsStore = useSettingsStore()

  /**
   * 是否自动播放视频
   */
  const shouldAutoPlayVideos = computed(() => {
    return settingsStore.settings.autoPlayVideos
  })

  /**
   * 是否显示图片预览
   */
  const shouldShowImagePreviews = computed(() => {
    return settingsStore.settings.showImagePreviews
  })

  /**
   * 获取视频播放器配置
   */
  const getVideoConfig = computed(() => ({
    autoplay: shouldAutoPlayVideos.value,
    controls: true,
    preload: shouldAutoPlayVideos.value ? 'auto' : 'metadata',
    muted: shouldAutoPlayVideos.value, // 自动播放时静音（浏览器要求）
  }))

  /**
   * 获取图片加载配置
   */
  const getImageConfig = computed(() => ({
    loading: shouldShowImagePreviews.value ? 'lazy' : 'lazy',
    decoding: 'async',
  }))

  return {
    shouldAutoPlayVideos,
    shouldShowImagePreviews,
    getVideoConfig,
    getImageConfig,
  }
}
