import { reportClientError } from './clientReporter'
import { runWhenIdle } from './performance'

interface PrefetchOptions {
  priority?: 'high' | 'low'
  timeout?: number
}

let hoverPrefetchAttached = false
let hoverHandler: ((e: MouseEvent) => void) | null = null
let hoverTimer: number | null = null
let prefetchScheduled = false
let prefetchLoadHandler: (() => void) | null = null
let prefetchLoadListenerAttached = false
let prefetchStartTimer: number | null = null
let prefetchDataTimer: number | null = null
const pendingIdlePrefetchTasks = new Set<() => void>()
const DATA_PREFETCH_ENABLED = import.meta.env.VITE_ENABLE_DATA_PREFETCH !== 'false'

export function disposeHoverPrefetch(): void {
  if (!hoverPrefetchAttached) return
  if (hoverHandler) {
    document.removeEventListener('mouseover', hoverHandler)
    hoverHandler = null
  }
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  hoverPrefetchAttached = false
}
export function disposePrefetch(): void {
  disposeHoverPrefetch()

  if (prefetchLoadHandler) {
    window.removeEventListener('load', prefetchLoadHandler)
    prefetchLoadHandler = null
  }

  if (prefetchStartTimer) {
    clearTimeout(prefetchStartTimer)
    prefetchStartTimer = null
  }
  if (prefetchDataTimer) {
    clearTimeout(prefetchDataTimer)
    prefetchDataTimer = null
  }
  for (const cancelTask of pendingIdlePrefetchTasks) {
    cancelTask()
  }
  pendingIdlePrefetchTasks.clear()

  prefetchScheduled = false
  prefetchLoadListenerAttached = false
}

// Configuration constants
const DEFAULT_TIMEOUT_MS = 2000 // 2 seconds for requestIdleCallback
const PREFETCH_DELAY_MS = 1000 // Delay after page load before prefetching

const prefetchedRoutes = new Set<string>()

function getNetworkQuality(): 'slow' | 'fast' {
  if (typeof navigator === 'undefined') return 'fast'
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
    const effectiveType = conn?.effectiveType
    return effectiveType === '4g' || effectiveType === 'wifi' ? 'fast' : 'slow'
  }
  return 'fast'
}

function isSavingData(): boolean {
  if (typeof navigator === 'undefined') return false
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    return conn?.saveData ?? false
  }
  return false
}

function scheduleIdlePrefetchTask(
  task: () => Promise<void> | void,
  timeout = DEFAULT_TIMEOUT_MS
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    let cancelTask: (() => void) | null = null

    const settle = (callback: () => void) => {
      if (settled) return
      settled = true
      if (cancelTask) {
        pendingIdlePrefetchTasks.delete(cancelTask)
      }
      callback()
    }

    const idleCleanup = runWhenIdle(() => {
      void Promise.resolve(task()).then(
        () => settle(resolve),
        (error) => settle(() => reject(error))
      )
    }, timeout)

    cancelTask = () => {
      idleCleanup()
      settle(resolve)
    }

    pendingIdlePrefetchTasks.add(cancelTask)
  })
}

export async function prefetchRoute(
  routeName: string,
  importFn: () => Promise<unknown>,
  options: PrefetchOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') return

  if (prefetchedRoutes.has(routeName)) {
    return
  }

  if (isSavingData()) {
    return
  }

  if (getNetworkQuality() === 'slow' && options.priority !== 'high') {
    return
  }

  const { timeout = DEFAULT_TIMEOUT_MS } = options

  try {
    await scheduleIdlePrefetchTask(async () => {
      await importFn()
      prefetchedRoutes.add(routeName)
    }, timeout)
  } catch (error) {
    console.warn(`Failed to prefetch route: ${routeName}`, error)
    reportClientError(
      'prefetch.route_failed',
      error,
      {
        routeName,
      },
      { severity: 'warn' }
    )
  }
}

export async function prefetchRoutes(
  routes: Array<{ name: string; importFn: () => Promise<unknown>; priority?: 'high' | 'low' }>
): Promise<void> {
  const sortedRoutes = routes.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1
    if (a.priority !== 'high' && b.priority === 'high') return 1
    return 0
  })

  for (const route of sortedRoutes) {
    const options: PrefetchOptions = route.priority ? { priority: route.priority } : {}
    await prefetchRoute(route.name, route.importFn, options)
  }
}

export function prefetchCriticalRoutes(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (prefetchScheduled) return

  if (document.readyState === 'complete') {
    executePrefetch()
  } else {
    if (prefetchLoadListenerAttached) return
    prefetchLoadHandler = executePrefetch
    window.addEventListener('load', prefetchLoadHandler, { once: true })
    prefetchLoadListenerAttached = true
  }
}

function executePrefetch(): void {
  if (prefetchScheduled) return
  prefetchScheduled = true

  prefetchStartTimer = window.setTimeout(() => {
    prefetchStartTimer = null

    prefetchRoutes([
      { name: 'explore', importFn: ROUTE_CONFIG.explore.importFn, priority: 'high' },
      { name: 'search', importFn: ROUTE_CONFIG.search.importFn, priority: 'high' },
      { name: 'post-detail', importFn: ROUTE_CONFIG['post-detail'].importFn, priority: 'high' },

      { name: 'authors', importFn: ROUTE_CONFIG.authors.importFn, priority: 'low' },
      { name: 'community', importFn: ROUTE_CONFIG.community.importFn, priority: 'low' },
      { name: 'profile', importFn: ROUTE_CONFIG.profile.importFn, priority: 'low' },
    ])

    prefetchDataTimer = window.setTimeout(async () => {
      prefetchDataTimer = null
      await prefetchExploreData()
      await prefetchAuthorsData()
    }, 4000)
  }, PREFETCH_DELAY_MS)
}

export function setupHoverPrefetch(): void {
  if (typeof document === 'undefined') return
  if (hoverPrefetchAttached) return
  hoverPrefetchAttached = true

  const HOVER_DELAY = 100

  hoverHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const link = target.closest('a[href]') as HTMLAnchorElement | null

    if (!link || !link.href) return

    if (link.origin !== window.location.origin) return

    if (hoverTimer) {
      clearTimeout(hoverTimer)
    }

    hoverTimer = window.setTimeout(() => {
      const path = new URL(link.href).pathname
      const routeName = getRouteNameFromPath(path)

      if (routeName) {
        const importFn = getRouteImportFn(routeName)
        if (importFn) {
          prefetchRoute(routeName, importFn, { priority: 'high' })
        }
      }
    }, HOVER_DELAY)
  }

  document.addEventListener('mouseover', hoverHandler, { passive: true })
}

const ROUTE_CONFIG = {
  home: { path: '/', importFn: () => import('@/views/HomePage.vue') },
  explore: { path: '/explore', importFn: () => import('@/views/ExplorePage.vue') },
  search: { path: '/search', importFn: () => import('@/views/SearchPage.vue') },
  'post-detail': { pathPattern: /^\/post\//, importFn: () => import('@/views/PostDetailPage.vue') },
  authors: { path: '/authors', importFn: () => import('@/views/AuthorsPage.vue') },
  'author-detail': {
    pathPattern: /^\/author\//,
    importFn: () => import('@/views/AuthorDetailPage.vue'),
  },
  community: { path: '/community', importFn: () => import('@/views/CommunityPage.vue') },
  'discussion-detail': {
    pathPattern: /^\/community\/discussions\//,
    importFn: () => import('@/views/DiscussionDetailPage.vue'),
  },
  profile: { path: '/profile', importFn: () => import('@/views/ProfilePage.vue') },
  'profile-notifications': {
    path: '/profile/notifications',
    importFn: () => import('@/views/ProfileNotificationsPage.vue'),
  },
  'profile-security': {
    path: '/profile/security',
    importFn: () => import('@/views/ProfileSecurityPage.vue'),
  },
  'profile-favorites': {
    path: '/profile/favorites',
    importFn: () => import('@/views/profile/ProfileSectionPage.vue'),
  },
  'profile-settings': {
    path: '/profile/settings',
    importFn: () => import('@/views/ProfileSettingsPage.vue'),
  },
  login: { path: '/login', importFn: () => import('@/views/LoginPage.vue') },
  register: { path: '/register', importFn: () => import('@/views/RegisterPage.vue') },
  about: { path: '/about', importFn: () => import('@/views/AboutPage.vue') },
  contact: { path: '/contact', importFn: () => import('@/views/ContactPage.vue') },
} as const

type RouteName = keyof typeof ROUTE_CONFIG

function getRouteNameFromPath(path: string): RouteName | null {
  for (const [name, config] of Object.entries(ROUTE_CONFIG)) {
    if ('path' in config && config.path === path) {
      return name as RouteName
    }
  }

  for (const [name, config] of Object.entries(ROUTE_CONFIG)) {
    if ('pathPattern' in config && config.pathPattern.test(path)) {
      return name as RouteName
    }
  }

  return null
}

function getRouteImportFn(routeName: string): (() => Promise<unknown>) | null {
  const config = ROUTE_CONFIG[routeName as RouteName]
  return config?.importFn ?? null
}

async function prefetchData(
  importFn: () => Promise<unknown>,
  options: { skipOnSlowNetwork?: boolean } = {}
): Promise<void> {
  if (typeof window === 'undefined') return

  const { skipOnSlowNetwork = true } = options

  if (isSavingData()) {
    return
  }

  if (skipOnSlowNetwork && getNetworkQuality() === 'slow') {
    return
  }

  try {
    await scheduleIdlePrefetchTask(async () => {
      try {
        await importFn()
      } catch {
        // Data prefetch is best-effort and must not affect route availability.
      }
    }, DEFAULT_TIMEOUT_MS)
  } catch {
    // Idle scheduler failures are also non-blocking for navigation.
  }
}

export async function prefetchExploreData(): Promise<void> {
  if (!DATA_PREFETCH_ENABLED) {
    return
  }

  await prefetchData(async () => {
    const { postService } = await import('@/api/postService')
    const { getPublicPostList } = await import('@/utils/cache')

    await getPublicPostList({ limit: 20, cursor: null }, (params, config) =>
      postService.listPosts(params, { ...config, skipErrorToast: true })
    )
  }).catch((error) => {
    reportClientError('prefetch.explore_data_failed', error, undefined, { severity: 'warn' })
  })
}

export async function prefetchAuthorsData(): Promise<void> {
  if (!DATA_PREFETCH_ENABLED) {
    return
  }

  await prefetchData(async () => {
    const { authorService } = await import('@/api/authorService')
    const { getPublicAuthorList } = await import('@/utils/cache')

    await getPublicAuthorList({ cursor: null, limit: 20 }, (params, config) =>
      authorService.listAuthors(params, { ...config, skipErrorToast: true })
    )
  }).catch((error) => {
    reportClientError('prefetch.authors_data_failed', error, undefined, { severity: 'warn' })
  })
}

export async function prefetchPostDetail(
  postId: string,
  options: { includeComments?: boolean } = {}
): Promise<void> {
  if (!postId) {
    return
  }

  await prefetchData(async () => {
    const [{ postService }, { commentService }, { getPublicPostDetail }] = await Promise.all([
      import('@/api/postService'),
      import('@/api/commentService'),
      import('@/utils/cache'),
    ])

    const postPromise = getPublicPostDetail(postId, (id, config) =>
      postService.getPost(id, { ...config, skipErrorToast: true })
    )

    if (options.includeComments) {
      await Promise.all([postPromise, commentService.getPostComments(postId, { limit: 20 })])
    } else {
      await postPromise
    }
  }).catch((error) => {
    reportClientError(
      'prefetch.post_detail_failed',
      error,
      {
        postId,
        includeComments: options.includeComments === true,
      },
      { severity: 'warn' }
    )
  })
}
