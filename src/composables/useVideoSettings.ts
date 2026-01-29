/**
 * 视频播放器设置管理
 * 使用 localStorage 持久化用户的播放偏好
 */

import { ref, watch } from 'vue'

export interface VideoSettings {
  /** 音量 (0-1) */
  volume: number
  /** 是否静音 */
  muted: boolean
  /** 播放速度 */
  playbackRate: number
  /** 亮度 (0-1) */
  brightness: number
  /** 字幕语言偏好 */
  subtitleLanguage: string | null
}

const STORAGE_KEY = 'video-player-settings'

const defaultSettings: VideoSettings = {
  volume: 1,
  muted: false,
  playbackRate: 1,
  brightness: 1,
  subtitleLanguage: null,
}

// 从 localStorage 加载设置
function loadSettings(): VideoSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...defaultSettings,
        ...parsed,
      }
    }
  } catch (error) {
    console.error('Failed to load video settings:', error)
  }
  return { ...defaultSettings }
}

// 保存设置到 localStorage
function saveSettings(settings: VideoSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save video settings:', error)
  }
}

// 全局设置状态
const settings = ref<VideoSettings>(loadSettings())

// 监听设置变化并自动保存
watch(
  settings,
  (newSettings) => {
    saveSettings(newSettings)
  },
  { deep: true }
)

/**
 * 视频设置 Composable
 */
export function useVideoSettings() {
  /**
   * 更新音量
   */
  function setVolume(volume: number) {
    settings.value.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * 更新静音状态
   */
  function setMuted(muted: boolean) {
    settings.value.muted = muted
  }

  /**
   * 更新播放速度
   */
  function setPlaybackRate(rate: number) {
    settings.value.playbackRate = rate
  }

  /**
   * 更新亮度
   */
  function setBrightness(brightness: number) {
    settings.value.brightness = Math.max(0, Math.min(1, brightness))
  }

  /**
   * 更新字幕语言偏好
   */
  function setSubtitleLanguage(language: string | null) {
    settings.value.subtitleLanguage = language
  }

  /**
   * 重置所有设置为默认值
   */
  function resetSettings() {
    settings.value = { ...defaultSettings }
  }

  return {
    settings,
    setVolume,
    setMuted,
    setPlaybackRate,
    setBrightness,
    setSubtitleLanguage,
    resetSettings,
  }
}
