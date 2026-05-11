import {
  loadCommunityContentResource,
  loadExploreContentResource,
  loadHomeContentResource,
  loadPostDetailContentResource,
  loadScheduleContentResource,
  type HmrHomeContent,
  type HmrPost,
} from '@/api/hmrContent'
import type { HmrAsyncResource, HmrWarmRouteKey } from '@/hmr/types'
import { readPublicContent } from '@/utils/cache/publicContentCache'
import { registerPublicCacheServiceWorker } from '@/utils/cache/serviceWorkerRegistration'

export interface HmrSessionEntryWarmupOptions {
  path: string
  resolveSession?: () => Promise<void>
  timeoutMs?: number
}

export interface HmrSessionEntryWarmupResult {
  tasks: string[]
  settled: PromiseSettledResult<void>[]
  timedOut: boolean
}

interface HmrWarmupTask {
  name: string
  run: () => Promise<void>
}

const DEFAULT_SESSION_ENTRY_TIMEOUT_MS = 4500

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

export async function warmHmrPriorityRoutes(currentPath: string): Promise<void> {
  const currentRouteKey = routeKeyFromPath(currentPath)
  const routeKeys: HmrWarmRouteKey[] = ['home', 'explore', 'community', 'schedule']
  const priority = currentRouteKey
    ? [currentRouteKey, ...routeKeys.filter((item) => item !== currentRouteKey)]
    : routeKeys

  await priority.reduce<Promise<void>>(
    (chain, routeKey) =>
      chain.then(() => warmHmrRoute(routeKey, currentPath).catch(() => undefined)),
    Promise.resolve()
  )
}

function normalizePath(path: string): string {
  return path.split('#')[0]?.split('?')[0] || '/'
}

function postIdFromPath(path: string): string | null {
  const normalized = normalizePath(path)
  if (!normalized.startsWith('/posts/')) return null
  return decodeURIComponent(normalized.split('/')[2] ?? '').trim() || null
}

function collectHomeMedia(posts: HmrPost[]): string[] {
  return posts
    .map((post) => post.mediaUrl)
    .filter((url): url is string => Boolean(url?.trim()))
    .slice(0, 4)
}

async function runWithConcurrency(tasks: Array<() => Promise<unknown>>, concurrency: number) {
  let index = 0
  const workers = Array.from({ length: Math.max(concurrency, 1) }, async () => {
    while (index < tasks.length) {
      const task = tasks[index]
      index += 1
      await task?.().catch(() => undefined)
    }
  })
  await Promise.all(workers)
}

function getWarmupConcurrency(): number {
  if (typeof window === 'undefined') return 1
  return window.matchMedia('(max-width: 767px)').matches ? 1 : 2
}

async function warmHomeBootstrap(): Promise<void> {
  const resource = await readPublicContent<HmrAsyncResource<HmrHomeContent>>({
    key: 'hmr:home',
    scope: 'home',
    strategy: 'network-first',
    loader: loadHomeContentResource,
  })
  const featured = resource.data.featured.slice(0, 2)
  const mediaUrls = collectHomeMedia(resource.data.featured)
  const tasks: Array<() => Promise<unknown>> = [
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
            return { warmedAt: Date.now(), url }
          },
        })
    ),
  ]

  await runWithConcurrency(tasks, getWarmupConcurrency())
}

function makeCurrentRouteContentTask(path: string): HmrWarmupTask | null {
  const normalized = normalizePath(path)
  if (normalized === '/') {
    return {
      name: 'public-home-bootstrap',
      run: warmHomeBootstrap,
    }
  }
  if (normalized.startsWith('/explore')) {
    return {
      name: 'public-explore',
      run: async () => {
        await readPublicContent({
          key: 'hmr:explore:first-page',
          scope: 'explore',
          strategy: 'network-first',
          loader: () => loadExploreContentResource({ limit: 12 }),
        })
      },
    }
  }
  if (normalized.startsWith('/community')) {
    return {
      name: 'public-community',
      run: async () => {
        await readPublicContent({
          key: 'hmr:community',
          scope: 'community',
          strategy: 'network-first',
          loader: loadCommunityContentResource,
        })
      },
    }
  }
  if (normalized.startsWith('/schedule')) {
    return {
      name: 'public-schedule',
      run: async () => {
        await readPublicContent({
          key: 'hmr:schedule',
          scope: 'schedule',
          strategy: 'network-first',
          loader: loadScheduleContentResource,
        })
      },
    }
  }

  const postId = postIdFromPath(normalized)
  if (!postId) return null

  return {
    name: 'public-post-detail',
    run: async () => {
      await readPublicContent({
        key: `hmr:post-detail:${postId}`,
        scope: 'post-detail',
        strategy: 'stale-while-revalidate',
        loader: () => loadPostDetailContentResource(postId),
      })
    },
  }
}

function buildSessionWarmupTasks(options: HmrSessionEntryWarmupOptions): HmrWarmupTask[] {
  const tasks: HmrWarmupTask[] = [
    {
      name: 'service-worker',
      run: async () => registerPublicCacheServiceWorker(),
    },
    {
      name: 'route-chunks',
      run: () => warmHmrPriorityRoutes(options.path),
    },
    {
      name: 'public-home-bootstrap',
      run: warmHomeBootstrap,
    },
  ]
  const currentRouteTask = makeCurrentRouteContentTask(options.path)
  if (currentRouteTask && currentRouteTask.name !== 'public-home-bootstrap') {
    tasks.push(currentRouteTask)
  }
  if (options.resolveSession) {
    tasks.push({
      name: 'auth-session',
      run: options.resolveSession,
    })
  }

  return tasks
}

function wait(ms: number): Promise<'timeout'> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve('timeout'), ms)
  })
}

export async function warmHmrSessionEntry(
  options: HmrSessionEntryWarmupOptions
): Promise<HmrSessionEntryWarmupResult> {
  const tasks = buildSessionWarmupTasks(options)
  const taskNames = tasks.map((task) => task.name)
  const settledPromise = Promise.allSettled(tasks.map((task) => task.run()))
  const timeoutMs = Math.max(options.timeoutMs ?? DEFAULT_SESSION_ENTRY_TIMEOUT_MS, 0)

  const result = await Promise.race([settledPromise, wait(timeoutMs)])
  if (result === 'timeout') {
    void settledPromise.catch(() => undefined)
    return {
      tasks: taskNames,
      settled: [],
      timedOut: true,
    }
  }

  return {
    tasks: taskNames,
    settled: result,
    timedOut: false,
  }
}
