/**
 * 视频播放器设置管理
 * 使用 localStorage 持久化用户的播放偏好
 */

import { ref, watch } from 'vue'
import { safeJsonParse } from '@/utils/security'

export type SubtitleShadowPreset = 'none' | 'outline' | 'drop-shadow' | 'raised'
export type SubtitleAlign = 'left' | 'center' | 'right'

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
  /** 字幕字体大小倍率 (0.75-2, 默认 1) */
  subtitleFontSize: number
  /** 字幕字体颜色 */
  subtitleColor: string
  /** 字幕背景颜色 (不含透明度) */
  subtitleBgColor: string
  /** 字幕背景透明度 (0-1) */
  subtitleBgOpacity: number
  /** 字幕阴影预设 */
  subtitleShadow: SubtitleShadowPreset
  /** 字幕水平对齐 */
  subtitleAlign: SubtitleAlign
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
  subtitleFontSize: 1,
  subtitleColor: '#ffffff',
  subtitleBgColor: '#000000',
  subtitleBgOpacity: 0.75,
  subtitleShadow: 'none',
  subtitleAlign: 'center',
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
   * 更新字幕字体大小
   */
  function setSubtitleFontSize(size: number) {
    settings.value.subtitleFontSize = Math.max(0.75, Math.min(2, size))
  }

  /**
   * 更新字幕字体颜色
   */
  function setSubtitleColor(color: string) {
    settings.value.subtitleColor = color
  }

  /**
   * 更新字幕背景颜色
   */
  function setSubtitleBgColor(color: string) {
    settings.value.subtitleBgColor = color
  }

  /**
   * 更新字幕背景透明度
   */
  function setSubtitleBgOpacity(opacity: number) {
    settings.value.subtitleBgOpacity = Math.max(0, Math.min(1, opacity))
  }

  /**
   * 更新字幕阴影预设
   */
  function setSubtitleShadow(shadow: SubtitleShadowPreset) {
    settings.value.subtitleShadow = shadow
  }

  /**
   * 更新字幕水平对齐
   */
  function setSubtitleAlign(align: SubtitleAlign) {
    settings.value.subtitleAlign = align
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
    setSubtitleFontSize,
    setSubtitleColor,
    setSubtitleBgColor,
    setSubtitleBgOpacity,
    setSubtitleShadow,
    setSubtitleAlign,
    resetSettings,
  }
}
