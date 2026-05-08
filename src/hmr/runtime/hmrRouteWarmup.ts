import {
  loadCommunityContentResource,
  loadExploreContentResource,
  loadHomeContentResource,
  loadPostDetailContentResource,
  loadScheduleContentResource,
} from '@/api/hmrContent'
import type { HmrWarmRouteKey } from '@/hmr/types'
import { readOrCreatePublicSnapshot } from '@/utils/cache/publicSnapshotCache'

const initialExploreOptions = {
  query: '',
  platform: 'all',
  sortBy: 'published_at',
  cursor: null,
  limit: 12,
}
const initialExploreCacheKey = `hmr:explore:${JSON.stringify(initialExploreOptions)}:all:all`

const warmRouteLoaders: Record<HmrWarmRouteKey, (path: string) => Promise<unknown>> = {
  home: async () => {
    await Promise.all([
      import('@/views/HomePage.vue'),
      readOrCreatePublicSnapshot('hmr:home', loadHomeContentResource, 'short'),
    ])
  },
  explore: async () => {
    await Promise.all([
      import('@/views/ExplorePage.vue'),
      readOrCreatePublicSnapshot(
        initialExploreCacheKey,
        () => loadExploreContentResource(initialExploreOptions),
        'short'
      ),
    ])
  },
  community: async () => {
    await Promise.all([
      import('@/views/CommunityPage.vue'),
      readOrCreatePublicSnapshot('hmr:community', loadCommunityContentResource, 'short'),
    ])
  },
  schedule: async () => {
    await Promise.all([
      import('@/views/SchedulePage.vue'),
      readOrCreatePublicSnapshot('hmr:schedule', loadScheduleContentResource, 'short'),
    ])
  },
  post: async (path) => {
    const postId = path.split('/posts/').at(1)?.split('/').at(0)?.trim()
    if (!postId) {
      await import('@/views/PostDetailPage.vue')
      return
    }

    await Promise.all([
      import('@/views/PostDetailPage.vue'),
      readOrCreatePublicSnapshot(
        `hmr:post:${postId}`,
        () => loadPostDetailContentResource(postId),
        'short'
      ),
    ])
  },
}

function routeKeyFromPath(path: string): HmrWarmRouteKey | null {
  if (path === '/') return 'home'
  if (path.startsWith('/explore')) return 'explore'
  if (path.startsWith('/community')) return 'community'
  if (path.startsWith('/schedule')) return 'schedule'
  if (path.startsWith('/posts/')) return 'post'
  return null
}

export async function warmHmrRoute(routeKey: HmrWarmRouteKey, path = ''): Promise<void> {
  await warmRouteLoaders[routeKey](path)
}

export function warmHmrPriorityRoutes(currentPath: string): void {
  const currentRouteKey = routeKeyFromPath(currentPath)
  const routeKeys: HmrWarmRouteKey[] = ['home', 'explore', 'community', 'schedule']
  const priority = currentRouteKey
    ? [currentRouteKey, ...routeKeys.filter((item) => item !== currentRouteKey)]
    : routeKeys

  void priority.reduce<Promise<void>>(
    (chain, routeKey) =>
      chain.then(() => warmHmrRoute(routeKey, currentPath).catch(() => undefined)),
    Promise.resolve()
  )
}
