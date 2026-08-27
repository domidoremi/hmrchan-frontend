export type HmrThumbnailQuality = 'medium' | 'large' | 'xlarge'

function preserveUrlStyle(input: string, url: URL): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(input)) return url.toString()
  return `${url.pathname}${url.search}${url.hash}`
}

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

export function withOriginalQuality(value: string): string {
  try {
    const origin = typeof window === 'undefined' ? 'https://momichan.local' : window.location.origin
    const url = new URL(value, origin)
    if (!url.pathname.endsWith('/thumbnail')) return value

    url.pathname = url.pathname.replace(/\/thumbnail$/, '/stream')
    url.search = ''
    return preserveUrlStyle(value, url)
  } catch {
    return value
  }
}

export function buildThumbnailSrcset(value: string): string {
  return [
    `${withThumbnailQuality(value, 'medium')} 640w`,
    `${withThumbnailQuality(value, 'large')} 960w`,
    `${withThumbnailQuality(value, 'xlarge')} 1440w`,
  ].join(', ')
}
