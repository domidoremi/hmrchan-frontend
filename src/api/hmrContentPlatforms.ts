import type { HmrPlatformSummary, HmrPost } from './hmrContentTypes'

export const MOMICHAN_PLATFORMS = ['youtube', 'instagram', 'x', 'tiktok', 'showroom'] as const

export type MomiChanPlatform = (typeof MOMICHAN_PLATFORMS)[number]

export interface HmrExploreLoadOptions {
  query?: string
  platform?: string
  sortBy?: string
  cursor?: string | null
  limit?: number
}

const platformLabels: Record<MomiChanPlatform | 'all', string> = {
  all: '全部平台',
  instagram: 'Instagram',
  showroom: 'Showroom',
  tiktok: 'TikTok',
  x: 'X',
  youtube: 'YouTube',
}

export function buildExplorePostsEndpoint(options: HmrExploreLoadOptions): string {
  const query = options.query?.trim() ?? ''
  const params = new URLSearchParams()
  params.set('limit', String(options.limit ?? 12))
  if (options.cursor) params.set('cursor', options.cursor)
  if (options.platform && options.platform !== 'all') {
    params.set('platform', platformIdForApi(options.platform))
  }

  if (query) {
    params.set('q', query)
    return `/search/posts?${params.toString()}`
  }

  if (options.sortBy) {
    params.set('sort_by', options.sortBy)
  }

  return `/posts?${params.toString()}`
}

export function buildExploreSuggestionsEndpoint(query: string): string {
  return `/search/suggestions?q=${encodeURIComponent(query)}`
}

function platformLabel(platform: string): string {
  const normalized = normalizePlatformId(platform)
  if (!normalized) return 'MomiChan'

  return platformLabels[normalized as MomiChanPlatform | 'all'] ?? normalized.replace(/[-_]/g, ' ')
}

export function summarizePlatforms(posts: HmrPost[], activePlatform: string): HmrPlatformSummary[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    const key = normalizePlatformId(post.platform)
    if (!isMomiChanPlatform(key)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  for (const platform of MOMICHAN_PLATFORMS) {
    if (!counts.has(platform)) counts.set(platform, 0)
  }

  const normalizedActivePlatform = normalizePlatformId(activePlatform)
  if (
    normalizedActivePlatform &&
    normalizedActivePlatform !== 'all' &&
    isMomiChanPlatform(normalizedActivePlatform) &&
    !counts.has(normalizedActivePlatform)
  ) {
    counts.set(normalizedActivePlatform, 0)
  }

  const platformSummaries = MOMICHAN_PLATFORMS.map((id) => ({
    id,
    label: platformLabel(id),
    count: counts.get(id) ?? 0,
  }))

  return [
    {
      id: 'all',
      label: '全部平台',
      count: posts.length,
    },
    ...platformSummaries,
  ]
}

export function normalizePlatformId(value?: string): string {
  const normalized = value?.trim().toLowerCase() || ''
  return normalized === 'twitter' ? 'x' : normalized
}

function platformIdForApi(value: string): string {
  return normalizePlatformId(value) === 'x' ? 'twitter' : value
}

export function isMomiChanPlatform(value: string): value is MomiChanPlatform {
  return (MOMICHAN_PLATFORMS as readonly string[]).includes(value)
}
