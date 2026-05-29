import type { HomeAggregateResponse } from '@/api'

export type HomeDataSource = 'aggregate' | 'support' | 'cached' | 'fallback'

export type HomeSupportRefreshTargets = {
  schedule: boolean
  community: boolean
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

export function createEmptyHomeSupportRefreshTargets(): HomeSupportRefreshTargets {
  return {
    schedule: false,
    community: false,
  }
}

export function hasPendingHomeSupportRefresh(targets: HomeSupportRefreshTargets): boolean {
  return targets.schedule || targets.community
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
