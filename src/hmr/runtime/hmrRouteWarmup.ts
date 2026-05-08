import type { HmrWarmRouteKey } from '@/hmr/types'

const warmRouteLoaders: Record<HmrWarmRouteKey, (path: string) => Promise<unknown>> = {
  home: () => import('@/views/HomePage.vue'),
  explore: () => import('@/views/ExplorePage.vue'),
  community: () => import('@/views/CommunityPage.vue'),
  schedule: () => import('@/views/SchedulePage.vue'),
  post: () => import('@/views/PostDetailPage.vue'),
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
