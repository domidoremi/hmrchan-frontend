export const PLATFORM_ANIMATIONS: Record<string, string> = {
  youtube: 'sparkle',
  twitter: 'explore',
  tiktok: 'explore',
  instagram: 'heart',
  bilibili: 'sparkle',
  pixiv: 'heart',
  weibo: 'explore',
}

export const PLATFORM_LABELS: Record<string, string> = {
  bilibili: 'Bilibili',
  youtube: 'YouTube',
  twitter: 'X',
  instagram: 'Instagram',
  pixiv: 'Pixiv',
  weibo: 'Weibo',
  tiktok: 'TikTok',
}

export function normalizeText(input: string | null | undefined): string {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeTag(input: string | null | undefined): string {
  return String(input ?? '')
    .replace(/^#/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolveDisplayAuthorName(options: {
  authorName?: string | null
  authorUsername?: string | null
}): string {
  const name = normalizeText(options.authorName)
  if (name) return name
  const username = normalizeText(options.authorUsername)
  return username ? `@${username}` : ''
}

export function isTitleDerivedFromContent(options: {
  title?: string | null
  description?: string | null
}): boolean {
  const title = normalizeText(options.title)
  const content = normalizeText(options.description)
  if (!title && content) return true
  if (title && content && title === content) return true
  if (title.length > 0 && title.length <= 3 && content) return true
  return false
}

export function resolveDisplayTitle(options: {
  title?: string | null
  description?: string | null
  titleFromContent: boolean
}): string {
  const title = normalizeText(options.title)
  const content = normalizeText(options.description)

  if (!options.titleFromContent) return title || ''

  const source = content || title
  if (!source) return ''

  const firstLine = source.split(/\n/)[0] || source
  if (firstLine.length <= 30) return firstLine

  const cutoff = firstLine.lastIndexOf(' ', 30)
  const end = cutoff > 10 ? cutoff : 30
  return `${firstLine.slice(0, end)}…`
}

export function resolveDisplayExcerpt(options: {
  description?: string | null
  titleFromContent: boolean
}): string {
  const content = normalizeText(options.description)
  if (!content) return ''
  if (options.titleFromContent) return ''
  return content
}

export function resolvePlatformAnimation(platform?: string | null): string {
  const normalized = platform?.toLowerCase()
  return normalized ? (PLATFORM_ANIMATIONS[normalized] ?? 'explore') : 'explore'
}

export function resolvePlatformLabel(platform?: string | null): string {
  if (!platform) return ''
  return (
    PLATFORM_LABELS[platform] ??
    platform.replace(/[_-]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  )
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(value)
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
