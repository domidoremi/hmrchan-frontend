export type HmrThumbnailQuality = 'medium' | 'large' | 'xlarge'

export function withThumbnailQuality(value: string, size: HmrThumbnailQuality): string {
  try {
    const origin = typeof window === 'undefined' ? 'https://momichan.local' : window.location.origin
    const url = new URL(value, origin)
    if (url.pathname.includes('/thumbnail')) {
      url.searchParams.set('size', size)
      return url.toString()
    }
  } catch {
    return value
  }

  return value
}

export function buildThumbnailSrcset(value: string): string {
  return [
    `${withThumbnailQuality(value, 'medium')} 640w`,
    `${withThumbnailQuality(value, 'large')} 960w`,
    `${withThumbnailQuality(value, 'xlarge')} 1440w`,
  ].join(', ')
}
