/**
 * 智能路由预加载工具
 * 基于用户行为和网络状况预加载关键路由
 */

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

  prefetchScheduled = false
  prefetchLoadListenerAttached = false
}

// Configuration constants
const DEFAULT_TIMEOUT_MS = 2000 // 2 seconds for requestIdleCallback
const IDLE_TIMEOUT_MS = 100 // Fallback timeout for browsers without requestIdleCallback
const PREFETCH_DELAY_MS = 1000 // Delay after page load before prefetching

// 已预加载的路由缓存
const prefetchedRoutes = new Set<string>()

// 网络状况检测
function getNetworkQuality(): 'slow' | 'fast' {
  if (typeof navigator === 'undefined') return 'fast'
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
    const effectiveType = conn?.effectiveType
    return effectiveType === '4g' || effectiveType === 'wifi' ? 'fast' : 'slow'
  }
  return 'fast' // 默认假设快速网络
}

// 检查是否在省电模式
function isSavingData(): boolean {
  if (typeof navigator === 'undefined') return false
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    return conn?.saveData ?? false
  }
  return false
}

/**
 * 预加载路由组件
 */
export async function prefetchRoute(
  routeName: string,
  importFn: () => Promise<unknown>,
  options: PrefetchOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') return

  // 避免重复预加载
  if (prefetchedRoutes.has(routeName)) {
    return
  }

  // 省电模式下不预加载
  if (isSavingData()) {
    return
  }

  // 慢速网络下只预加载高优先级路由
  if (getNetworkQuality() === 'slow' && options.priority !== 'high') {
    return
  }

  const { timeout = DEFAULT_TIMEOUT_MS } = options

  try {
    // 使用 requestIdleCallback 在空闲时预加载
    if ('requestIdleCallback' in window) {
      await new Promise<void>((resolve) => {
        requestIdleCallback(
          async () => {
            await importFn()
            prefetchedRoutes.add(routeName)
            resolve()
          },
          { timeout }
        )
      })
    } else {
      // 降级方案：使用 setTimeout
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          await importFn()
          prefetchedRoutes.add(routeName)
          resolve()
        }, IDLE_TIMEOUT_MS)
      })
    }
  } catch (error) {
    console.warn(`Failed to prefetch route: ${routeName}`, error)
  }
}

/**
 * 批量预加载路由
 */
export async function prefetchRoutes(
  routes: Array<{ name: string; importFn: () => Promise<unknown>; priority?: 'high' | 'low' }>
): Promise<void> {
  // 按优先级排序
  const sortedRoutes = routes.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1
    if (a.priority !== 'high' && b.priority === 'high') return 1
    return 0
  })

  // 串行预加载，避免同时加载过多资源
  for (const route of sortedRoutes) {
    const options: PrefetchOptions = route.priority ? { priority: route.priority } : {}
    await prefetchRoute(route.name, route.importFn, options)
  }
}

/**
 * 预加载关键路由（首页加载后立即执行）
 */
export function prefetchCriticalRoutes(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (prefetchScheduled) return

  // 在页面加载完成后预加载
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
  // 延迟后开始预加载，确保首屏已完全渲染
  prefetchStartTimer = window.setTimeout(() => {
    prefetchStartTimer = null
    // 预加载路由组件
    prefetchRoutes([
      // 高优先级：用户最可能访问的页面
      { name: 'explore', importFn: ROUTE_CONFIG.explore.importFn, priority: 'high' },
      { name: 'search', importFn: ROUTE_CONFIG.search.importFn, priority: 'high' },
      { name: 'post-detail', importFn: ROUTE_CONFIG['post-detail'].importFn, priority: 'high' },
      // 低优先级：次要页面
      { name: 'authors', importFn: ROUTE_CONFIG.authors.importFn, priority: 'low' },
      { name: 'community', importFn: ROUTE_CONFIG.community.importFn, priority: 'low' },
      { name: 'profile', importFn: ROUTE_CONFIG.profile.importFn, priority: 'low' },
    ])

    // 预加载关键数据（延迟更长，避免与首屏请求竞争）
    // 串行执行，避免并发请求过多
    prefetchDataTimer = window.setTimeout(async () => {
      prefetchDataTimer = null
      await prefetchExploreData()
      await prefetchAuthorsData()
    }, 4000)
  }, PREFETCH_DELAY_MS)
}

/**
 * 鼠标悬停预加载
 * 当用户鼠标悬停在链接上时预加载目标页面
 */
export function setupHoverPrefetch(): void {
  if (typeof document === 'undefined') return
  if (hoverPrefetchAttached) return
  hoverPrefetchAttached = true

  const HOVER_DELAY = 100 // 延迟 100ms 后预加载，避免快速划过时触发

  hoverHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const link = target.closest('a[href]') as HTMLAnchorElement | null

    if (!link || !link.href) return

    // 只处理内部链接
    if (link.origin !== window.location.origin) return

    // 清除之前的定时器
    if (hoverTimer) {
      clearTimeout(hoverTimer)
    }

    // 延迟后预加载，避免快速划过时触发
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

// 路由配置映射 - 单一数据源
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
  'profile-devices': {
    path: '/profile/devices',
    importFn: () => import('@/views/ProfileDevicesPage.vue'),
  },
  favorites: { path: '/favorites', importFn: () => import('@/views/FavoritesPage.vue') },
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

// 路径到路由名称的映射
function getRouteNameFromPath(path: string): RouteName | null {
  // 先检查精确匹配
  for (const [name, config] of Object.entries(ROUTE_CONFIG)) {
    if ('path' in config && config.path === path) {
      return name as RouteName
    }
  }

  // 再检查模式匹配
  for (const [name, config] of Object.entries(ROUTE_CONFIG)) {
    if ('pathPattern' in config && config.pathPattern.test(path)) {
      return name as RouteName
    }
  }

  return null
}

// 路由名称到导入函数的映射
function getRouteImportFn(routeName: string): (() => Promise<unknown>) | null {
  const config = ROUTE_CONFIG[routeName as RouteName]
  return config?.importFn ?? null
}

/**
 * 通用数据预加载工具
 * 检查网络状况后执行预加载函数
 */
async function prefetchData(
  importFn: () => Promise<unknown>,
  options: { skipOnSlowNetwork?: boolean } = {}
): Promise<void> {
  if (typeof window === 'undefined') return

  const { skipOnSlowNetwork = true } = options

  // 省电模式下不预加载
  if (isSavingData()) {
    return
  }

  // 慢速网络下可选跳过
  if (skipOnSlowNetwork && getNetworkQuality() === 'slow') {
    return
  }

  try {
    if ('requestIdleCallback' in window) {
      await new Promise<void>((resolve) => {
        requestIdleCallback(
          async () => {
            try {
              await importFn()
            } catch {
              // 静默失败 - 预加载失败不应影响用户体验
              // 在开发模式下也不记录，避免控制台噪音
            }
            resolve()
          },
          { timeout: DEFAULT_TIMEOUT_MS }
        )
      })
    } else {
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            await importFn()
          } catch {
            // 静默失败 - 预加载失败不应影响用户体验
            // 在开发模式下也不记录，避免控制台噪音
          }
          resolve()
        }, IDLE_TIMEOUT_MS)
      })
    }
  } catch {
    // 外层错误捕获（requestIdleCallback 本身的错误）
    // 完全静默，避免控制台噪音
  }
}

/**
 * 预加载探索页数据
 * 在用户导航到探索页前预加载首页数据
 */
export async function prefetchExploreData(): Promise<void> {
  await prefetchData(async () => {
    const { postService } = await import('@/api/postService')
    // 只预加载第一页，避免并发请求过多触发 429
    await postService.listPosts({ page: 1, page_size: 20 }, { skipErrorToast: true })
  })
}

/**
 * 预加载作者列表数据
 * 在用户导航到作者页前预加载首页作者
 */
export async function prefetchAuthorsData(): Promise<void> {
  await prefetchData(async () => {
    const { authorService } = await import('@/api/authorService')
    // 只预加载第一页
    await authorService.listAuthors({ page: 1, page_size: 20 }, { skipErrorToast: true })
  })
}

/**
 * 预加载帖子详情数据
 * 在用户点击帖子前预加载详情和评论
 * @param postId - 帖子 UUID
 */
export async function prefetchPostDetail(
  postId: string,
  options: { includeComments?: boolean } = {}
): Promise<void> {
  if (!postId) {
    return
  }

  await prefetchData(async () => {
    const [{ postService }, { commentService }, { postCache }] = await Promise.all([
      import('@/api/postService'),
      import('@/api/commentService'),
      import('@/utils/cache'),
    ])

    // Avoid duplicate post requests if the entity is already cached (e.g. preview modal just loaded it).
    const cached = await postCache.getPostEntity(postId)

    const postPromise = cached
      ? Promise.resolve(cached)
      : postService.getPost(postId).then((p) => {
          // Write through to app-level caches so later reads are instant.
          void postCache.setPostEntity(postId, p)
          return p
        })

    if (options.includeComments) {
      await Promise.all([postPromise, commentService.getPostComments(postId, 1, 20)])
    } else {
      await postPromise
    }
  })
}
