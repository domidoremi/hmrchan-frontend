import { ref, watch } from 'vue'
import { safeJsonParse } from '@/utils/security'

export type SubtitleShadowPreset = 'none' | 'outline' | 'drop-shadow' | 'raised'
export type SubtitleAlign = 'left' | 'center' | 'right'

export interface VideoSettings {
  volume: number

  muted: boolean

  playbackRate: number

  loop: boolean

  brightness: number

  subtitleLanguage: string | null

  subtitleOffset: number

  subtitleFontSize: number

  subtitleColor: string

  subtitleBgColor: string

  subtitleBgOpacity: number

  subtitleShadow: SubtitleShadowPreset

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

function saveSettings(settings: VideoSettings) {
  try {
    const { brightness, ...rest } = settings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    sessionStorage.setItem(BRIGHTNESS_SESSION_KEY, String(brightness))
  } catch (error) {
    console.error('Failed to save video settings:', error)
  }
}

const settings = ref<VideoSettings>(loadSettings())

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

export function useVideoSettings() {
  function setVolume(volume: number) {
    settings.value.volume = Math.max(0, Math.min(1, volume))
  }

  function setMuted(muted: boolean) {
    settings.value.muted = muted
  }

  function setPlaybackRate(rate: number) {
    settings.value.playbackRate = rate
  }

  function setLoop(loop: boolean) {
    settings.value.loop = loop
  }

  function setBrightness(brightness: number) {
    settings.value.brightness = Math.max(0, Math.min(1, brightness))
  }

  function setSubtitleLanguage(language: string | null) {
    settings.value.subtitleLanguage = language
  }

  function setSubtitleOffset(offset: number) {
    settings.value.subtitleOffset = Math.max(0, Math.min(5, Math.round(offset)))
  }

  function setSubtitleFontSize(size: number) {
    settings.value.subtitleFontSize = Math.max(0.75, Math.min(2, size))
  }

  function setSubtitleColor(color: string) {
    settings.value.subtitleColor = color
  }

  function setSubtitleBgColor(color: string) {
    settings.value.subtitleBgColor = color
  }

  function setSubtitleBgOpacity(opacity: number) {
    settings.value.subtitleBgOpacity = Math.max(0, Math.min(1, opacity))
  }

  function setSubtitleShadow(shadow: SubtitleShadowPreset) {
    settings.value.subtitleShadow = shadow
  }

  function setSubtitleAlign(align: SubtitleAlign) {
    settings.value.subtitleAlign = align
  }

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
