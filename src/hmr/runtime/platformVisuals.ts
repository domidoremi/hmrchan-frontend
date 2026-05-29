export interface HmrPlatformVisual {
  key: string
  label: string
  mark: string
  colors: readonly [string, string]
}

const PLATFORM_VISUALS: Record<string, HmrPlatformVisual> = {
  instagram: {
    key: 'instagram',
    label: 'Instagram',
    mark: 'IG',
    colors: ['#ff7722', '#ff3c34'],
  },
  showroom: {
    key: 'showroom',
    label: 'Showroom',
    mark: 'SR',
    colors: ['#3d2fa9', '#ffc765'],
  },
  tiktok: {
    key: 'tiktok',
    label: 'TikTok',
    mark: 'TT',
    colors: ['#171412', '#3d2fa9'],
  },
  twitter: {
    key: 'twitter',
    label: 'X',
    mark: 'X',
    colors: ['#171412', '#ff7722'],
  },
  x: {
    key: 'x',
    label: 'X',
    mark: 'X',
    colors: ['#171412', '#ff7722'],
  },
  youtube: {
    key: 'youtube',
    label: 'YouTube',
    mark: 'YT',
    colors: ['#ff3c34', '#ff7722'],
  },
  default: {
    key: 'default',
    label: 'MomiChan',
    mark: 'M',
    colors: ['#ff7722', '#3d2fa9'],
  },
}

export function resolveHmrPlatformKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || 'default'
}

export function resolveHmrPlatformVisual(value: string | null | undefined): HmrPlatformVisual {
  const key = resolveHmrPlatformKey(value)
  return PLATFORM_VISUALS[key] ?? PLATFORM_VISUALS.default
}
