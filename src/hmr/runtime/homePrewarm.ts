import {
  loadExploreContentResource,
  loadHomeContentResource,
  loadPostDetailContentResource,
  type HmrHomeContent,
} from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import { readPublicContent } from '@/utils/cache/publicContentCache'
import { runWhenIdle, runWithConcurrency, type IdleTaskHandle } from '@/utils/performance'
import { collectHomeMedia } from './homeMedia'

export interface HmrHomeContentPrewarmOptions {
  includeExplore?: boolean
}

function getHomeWarmupConcurrency(): number {
  if (typeof window === 'undefined') return 1
  return window.matchMedia('(max-width: 767px)').matches ? 1 : 2
}

export function buildHomeContentWarmupTasks(
  data: HmrHomeContent,
  options: HmrHomeContentPrewarmOptions = {}
): Array<() => Promise<unknown>> {
  const featured = data.featured.slice(0, 2)
  const mediaUrls = collectHomeMedia(data.featured)
  const tasks: Array<() => Promise<unknown>> = []

  if (options.includeExplore) {
    tasks.push(() =>
      readPublicContent({
        key: 'hmr:explore:prewarm:first-page',
        scope: 'explore',
        strategy: 'network-first',
        loader: () => loadExploreContentResource({ limit: 12 }),
      })
    )
  }

  tasks.push(
    ...featured.map(
      (post) => () =>
        readPublicContent({
          key: `hmr:post-detail:${post.id}`,
          scope: 'post-detail',
          strategy: 'stale-while-revalidate',
          loader: () => loadPostDetailContentResource(post.id),
        })
    ),
    ...mediaUrls.map(
      (url) => () =>
        readPublicContent({
          key: `hmr:media:${url}`,
          scope: 'media',
          strategy: 'cache-first',
          loader: async () => {
            if (typeof fetch !== 'undefined') {
              await fetch(url, { cache: 'force-cache', credentials: 'omit' })
            }
            return { url, warmedAt: Date.now() }
          },
        })
    )
  )

  return tasks
}

export async function warmHomeContent(
  data: HmrHomeContent,
  options: HmrHomeContentPrewarmOptions = {}
): Promise<void> {
  await runWithConcurrency(buildHomeContentWarmupTasks(data, options), getHomeWarmupConcurrency())
}

export async function warmHomeBootstrap(): Promise<void> {
  const resource = await readPublicContent<HmrAsyncResource<HmrHomeContent>>({
    key: 'hmr:home',
    scope: 'home',
    strategy: 'network-first',
    loader: loadHomeContentResource,
  })

  await warmHomeContent(resource.data)
}

export function scheduleHomeContentPrewarm(
  data: HmrHomeContent,
  options: HmrHomeContentPrewarmOptions = {}
): IdleTaskHandle | undefined {
  return runWhenIdle(
    () => {
      void warmHomeContent(data, options)
    },
    { timeout: 2500, fallbackDelay: 1200 }
  )
}
