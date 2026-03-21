import type { SubtitleAlign, SubtitleShadowPreset } from '@/composables/useVideoSettings'
import { normalizeToProxyPath } from '@/utils/url'

export interface SubtitleTrack {
  id?: string | null
  language: string
  format?: string | null
  label?: string | null
  url?: string | null
  subtitle_url?: string | null
  file_path?: string | null
  subtitle_path?: string | null
  path?: string | null
}

export interface NormalizedSubtitleTrack {
  language: string
  label: string
  src: string
  format?: string | null | undefined
}

export const SUBTITLE_COLORS = [
  { value: '#ffffff', label: 'white' },
  { value: '#ffff00', label: 'yellow' },
  { value: '#00ff00', label: 'green' },
  { value: '#00ffff', label: 'cyan' },
  { value: '#ff00ff', label: 'magenta' },
  { value: '#ff6b6b', label: 'red' },
] as const

export const SUBTITLE_BG_COLORS = [
  { value: '#000000', label: 'black' },
  { value: '#1a1a2e', label: 'navy' },
  { value: '#333333', label: 'gray' },
] as const

export const SUBTITLE_SHADOWS: { value: SubtitleShadowPreset; labelKey: string }[] = [
  { value: 'none', labelKey: 'video.subtitleShadowNone' },
  { value: 'outline', labelKey: 'video.subtitleShadowOutline' },
  { value: 'drop-shadow', labelKey: 'video.subtitleShadowDropShadow' },
  { value: 'raised', labelKey: 'video.subtitleShadowRaised' },
]

export function extractMediaIdFromSrc(src: string): string | null {
  if (!src?.trim()) return null
  const match = src.match(/\/media\/([0-9a-f-]+)\/stream/i)
  return match?.[1] ?? null
}

export function normalizeSubtitleSrc(options: {
  track: SubtitleTrack
  apiBaseUrl: string
  videoSrc: string
}): string | null {
  const { track, apiBaseUrl, videoSrc } = options
  const raw =
    track.url || track.subtitle_url || track.file_path || track.subtitle_path || track.path

  if (raw) {
    const normalized = normalizeToProxyPath(raw)
    if (normalized) {
      if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized
      if (normalized.startsWith('/')) return normalized
    }
    return raw.startsWith('/') ? `${apiBaseUrl}${raw}` : `${apiBaseUrl}/${raw}`
  }

  if (track.language && videoSrc?.trim()) {
    const mediaId = extractMediaIdFromSrc(videoSrc)
    if (mediaId) {
      return `${apiBaseUrl}/media/${mediaId}/subtitle?language=${track.language}`
    }
  }

  return null
}

export function normalizeSubtitleTracks(options: {
  tracks?: SubtitleTrack[] | null
  apiBaseUrl: string
  videoSrc: string
  overrides?: Record<string, string>
}): NormalizedSubtitleTrack[] {
  const { tracks, apiBaseUrl, videoSrc, overrides = {} } = options
  const inputTracks = tracks ?? []
  if (!inputTracks.length) return []

  return inputTracks.reduce<NormalizedSubtitleTrack[]>((acc, track) => {
    const src = normalizeSubtitleSrc({ track, apiBaseUrl, videoSrc })
    if (!src || !track.language) return acc
    acc.push({
      language: track.language,
      label: track.label || track.language.toUpperCase(),
      src: overrides[src] || src,
      format: track.format,
    })
    return acc
  }, [])
}

export function getSubtitleShadowCss(preset: SubtitleShadowPreset): string {
  switch (preset) {
    case 'outline':
      return '0 0 2px rgba(0, 0, 0, 0.95), 0 0 6px rgba(0, 0, 0, 0.5)'
    case 'drop-shadow':
      return '0 2px 4px rgba(0, 0, 0, 0.85)'
    case 'raised':
      return '0 1px 0 rgba(255, 255, 255, 0.25), 0 2px 4px rgba(0, 0, 0, 0.7)'
    default:
      return 'none'
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized

  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function buildSubtitleOverlayStyle(options: {
  offset: number
  fontSize: number
  color: string
  backgroundColor: string
  backgroundOpacity: number
  shadow: SubtitleShadowPreset
  align: SubtitleAlign
}): Record<string, string | undefined> {
  const bottom = 8 + options.offset * 4
  const shadowCss = getSubtitleShadowCss(options.shadow)

  return {
    bottom: `${bottom}%`,
    color: options.color,
    backgroundColor: hexToRgba(options.backgroundColor, options.backgroundOpacity),
    fontSize: `${options.fontSize}em`,
    textShadow: shadowCss === 'none' ? undefined : shadowCss,
    textAlign: options.align,
  }
}

export function buildSubtitlePreviewStyle(options: {
  color: string
  backgroundColor: string
  backgroundOpacity: number
  shadow: SubtitleShadowPreset
}): Record<string, string | undefined> {
  const shadowCss = getSubtitleShadowCss(options.shadow)

  return {
    color: options.color,
    backgroundColor: hexToRgba(options.backgroundColor, options.backgroundOpacity),
    textShadow: shadowCss === 'none' ? undefined : shadowCss,
  }
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
