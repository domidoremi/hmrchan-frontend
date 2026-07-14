import type { HomeAggregateResponse, HomeCommunityHighlight, HomeScheduleHighlight } from '@/api'
import { normalizeText } from './homeModel'

export type HomeDataSource = 'aggregate' | 'support' | 'cached' | 'fallback'

export type HomeSupportRefreshTargets = {
  schedule: boolean
  community: boolean
}

export type HomeSupportRefreshKind = keyof HomeSupportRefreshTargets

export type HomeSupportRefreshResult =
  | { kind: 'schedule'; items: HomeScheduleHighlight[] }
  | { kind: 'community'; items: HomeCommunityHighlight[] }

export type HomeSupportRefreshUpdates = {
  scheduleItems: HomeScheduleHighlight[] | null
  communityItems: HomeCommunityHighlight[] | null
}

export type HomeSupportRefreshRunState = {
  shouldRefresh: boolean
  refreshTargets: HomeSupportRefreshTargets
  nextPendingTargets: HomeSupportRefreshTargets
}

export type HomeMediaFailureMarkState = {
  shouldUpdate: boolean
  failedSources: Set<string>
}

export type HomePublicPrewarmLimits = {
  mediaLimit: number
  listLimit: number
}

export type HomeTotalCountInput = {
  currentTotal?: number | null
  postCount?: number | null
  storyDeckTotal?: number | null
}

function resolveNonNegativeInteger(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(Math.round(value), 0) : 0
}

export function createEmptyHomeAggregate(): HomeAggregateResponse {
  return {
    version: 'empty',
    generated_at: '',
    ttl_seconds: 0,
    hero: {
      editorial_card: null,
      spotlight: null,
      stats: [],
      trending_tags: [],
    },
    portal: {
      items: [],
    },
    featured: {
      items: [],
    },
    trends: {
      authors: [],
      tags: [],
      schedules: [],
      community: [],
    },
    latest_text_posts: [],
    story_deck: {
      items: [],
      total: 0,
    },
  }
}

export function resolveHomeTotalCount({
  currentTotal,
  postCount,
  storyDeckTotal,
}: HomeTotalCountInput): number {
  return Math.max(
    resolveNonNegativeInteger(currentTotal),
    resolveNonNegativeInteger(postCount),
    resolveNonNegativeInteger(storyDeckTotal)
  )
}

export function isHomeMediaFailureRecorded(
  source: string | null | undefined,
  failedSources: ReadonlySet<string>
): boolean {
  const key = normalizeText(source)
  return key ? failedSources.has(key) : false
}

export function shouldRenderHomeMediaSource(
  source: string | null | undefined,
  failedSources: ReadonlySet<string>
): boolean {
  const key = normalizeText(source)
  return Boolean(key) && !failedSources.has(key)
}

export function resolveHomeMediaFailureMarkState(
  source: string | null | undefined,
  failedSources: ReadonlySet<string>
): HomeMediaFailureMarkState {
  const key = normalizeText(source)
  if (!key || failedSources.has(key)) {
    return {
      shouldUpdate: false,
      failedSources: new Set(failedSources),
    }
  }

  const nextFailedSources = new Set(failedSources)
  nextFailedSources.add(key)

  return {
    shouldUpdate: true,
    failedSources: nextFailedSources,
  }
}

export function collectHomePrewarmMedia(
  payload: HomeAggregateResponse
): Array<string | null | undefined> {
  return [
    payload.hero.spotlight?.image?.thumbnail_url,
    payload.hero.spotlight?.image?.url,
    ...payload.featured.items.flatMap((item) => [
      item.cover?.thumbnail_url,
      item.cover?.url,
      ...(item.related_posts ?? []).flatMap((post) => [
        post.thumbnail?.thumbnail_url,
        post.thumbnail?.url,
        post.image?.thumbnail_url,
        post.image?.url,
      ]),
    ]),
    ...payload.story_deck.items.flatMap((item) => [item.image?.thumbnail_url, item.image?.url]),
  ]
}

export function resolveHomePublicPrewarmLimits(
  viewportWidth: number | null | undefined
): HomePublicPrewarmLimits {
  const compactViewport =
    typeof viewportWidth === 'number' && Number.isFinite(viewportWidth) && viewportWidth < 768

  return compactViewport ? { mediaLimit: 2, listLimit: 8 } : { mediaLimit: 6, listLimit: 20 }
}

export function createEmptyHomeSupportRefreshTargets(): HomeSupportRefreshTargets {
  return {
    schedule: false,
    community: false,
  }
}

export function hasPendingHomeSupportRefresh(targets: HomeSupportRefreshTargets): boolean {
  return targets.schedule || targets.community
}

export function resolveHomeSupportRefreshKinds(
  targets: HomeSupportRefreshTargets
): HomeSupportRefreshKind[] {
  const kinds: readonly HomeSupportRefreshKind[] = ['schedule', 'community']
  return kinds.filter((kind) => targets[kind])
}

export function resolveScheduleHighlightListClasses(hasCompanion: boolean): string[] {
  return hasCompanion ? ['schedule-highlight-list--paired'] : []
}

export function resolveScheduleHighlightCompanionClasses(kind: string): string[] {
  return [`schedule-highlight--${kind}`]
}

export function resolveScheduleHighlightRoute(
  deepLink: string | null | undefined,
  fallback = '/schedule'
): string {
  return deepLink || fallback
}

export function resolveScheduleHighlightLabel(
  badge: string | null | undefined,
  fallback: string
): string {
  return badge || fallback
}

export function resolveScheduleHighlightMetaText(
  primaryMeta: string | null | undefined,
  authorName: string | null | undefined,
  fallback: string
): string {
  return primaryMeta || authorName || fallback
}

export function resolvePostsToolbarStatsClasses(hasTags: boolean): string[] {
  return hasTags ? ['posts-toolbar__stats--with-tags'] : []
}

export function resolveHomeSupportRefreshRunState(
  targets: HomeSupportRefreshTargets
): HomeSupportRefreshRunState {
  if (!hasPendingHomeSupportRefresh(targets)) {
    return {
      shouldRefresh: false,
      refreshTargets: createEmptyHomeSupportRefreshTargets(),
      nextPendingTargets: createEmptyHomeSupportRefreshTargets(),
    }
  }

  return {
    shouldRefresh: true,
    refreshTargets: { ...targets },
    nextPendingTargets: createEmptyHomeSupportRefreshTargets(),
  }
}

export function resolveHomeSupportRefreshUpdates(
  results: readonly PromiseSettledResult<HomeSupportRefreshResult>[]
): HomeSupportRefreshUpdates {
  const updates: HomeSupportRefreshUpdates = {
    scheduleItems: null,
    communityItems: null,
  }

  for (const result of results) {
    if (result.status !== 'fulfilled') continue

    if (result.value.kind === 'schedule') {
      updates.scheduleItems = result.value.items
    } else {
      updates.communityItems = result.value.items
    }
  }

  return updates
}

export function resolveHomeSupportRefreshTargets(
  payload: HomeAggregateResponse,
  source: HomeDataSource
): HomeSupportRefreshTargets {
  if (source === 'support' || source === 'cached' || source === 'fallback') {
    return createEmptyHomeSupportRefreshTargets()
  }

  const scheduleCount = payload.portal.items.find((item) => item.key === 'schedule')?.count ?? 0
  const communityCount = payload.portal.items.find((item) => item.key === 'community')?.count ?? 0
  const hasScheduleDetails = (payload.trends.schedules ?? []).length > 0
  const hasCommunityDetails = (payload.trends.community ?? []).length > 0

  return {
    schedule: scheduleCount > 0 && !hasScheduleDetails,
    community: communityCount > 0 && !hasCommunityDetails,
  }
}
