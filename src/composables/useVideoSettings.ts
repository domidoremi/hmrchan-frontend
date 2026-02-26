/**
 * 视频播放器设置管理
 * 使用 localStorage 持久化用户的播放偏好
 */

import { ref, watch } from 'vue'
import { safeJsonParse } from '@/utils/security'

export interface VideoSettings {
  /** 音量 (0-1) */
  volume: number
  /** 是否静音 */
  muted: boolean
  /** 播放速度 */
  playbackRate: number
  /** 是否循环播放 */
  loop: boolean
  /** 亮度 (0-1) */
  brightness: number
  /** 字幕语言偏好 */
  subtitleLanguage: string | null
  /** 字幕垂直偏移 (0-5, 0=底部默认, 5=最高) */
  subtitleOffset: number
}

const STORAGE_KEY = 'video-player-settings'
const BRIGHTNESS_SESSION_KEY = 'video-player-brightness'

const defaultSettings: VideoSettings = {
  volume: 0.5,
  muted: false,
  playbackRate: 1,
  loop: false,
  brightness: 1,
  subtitleLanguage: null,
  subtitleOffset: 0,
}

// 从 localStorage 加载设置
function loadSettings(): VideoSettings {
  try {
    if (typeof localStorage === 'undefined') return { ...defaultSettings }
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? safeJsonParse<Partial<VideoSettings>>(stored) : null
    const sessionBrightness =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(BRIGHTNESS_SESSION_KEY) : null
    const brightness = sessionBrightness !== null ? Number(sessionBrightness) : Number.NaN

    return {
      ...defaultSettings,
      ...(parsed || {}),
      brightness: Number.isFinite(brightness) ? brightness : defaultSettings.brightness,
    }
  } catch (error) {
    console.error('Failed to load video settings:', error)
  }
  return { ...defaultSettings }
}

// 保存设置到 localStorage
function saveSettings(settings: VideoSettings) {
  try {
    const { brightness, ...rest } = settings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    sessionStorage.setItem(BRIGHTNESS_SESSION_KEY, String(brightness))
  } catch (error) {
    console.error('Failed to save video settings:', error)
  }
}

// 全局设置状态
const settings = ref<VideoSettings>(loadSettings())

// 监听设置变化并自动保存
const stopSaveWatcher = watch(
  settings,
  (newSettings) => {
    saveSettings(newSettings)
  },
  { deep: true }
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopSaveWatcher()
  })
}

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
   * 更新循环播放
   */
  function setLoop(loop: boolean) {
    settings.value.loop = loop
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
   * 更新字幕垂直偏移
   */
  function setSubtitleOffset(offset: number) {
    settings.value.subtitleOffset = Math.max(0, Math.min(5, Math.round(offset)))
  }

  /**
   * 重置所有设置为默认值
   */
  function resetSettings() {
    settings.value = { ...defaultSettings }
    try {
      sessionStorage.removeItem(BRIGHTNESS_SESSION_KEY)
    } catch (error) {
      console.error('Failed to reset brightness settings:', error)
    }
  }

  return {
    settings,
    setVolume,
    setMuted,
    setPlaybackRate,
    setLoop,
    setBrightness,
    setSubtitleLanguage,
    setSubtitleOffset,
    resetSettings,
  }
}
