/**
 * Service Worker - 三层缓存策略
 * 版本: 3.0.1
 * 更新: 启用帖子详情智能缓存，使用 Stale-While-Revalidate 策略
 *       确保完整帖子数据（含 media_files）可离线访问
 *       优化域名配置，支持多环境部署
 */

// AbortSignal.timeout polyfill for compatibility
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function delay(ms) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), ms)
    return controller.signal
  }
}

const CACHE_VERSION = 'v3'
const CACHE_NAMES = {
  static: `hmrchan-static-${CACHE_VERSION}`,
  api: `hmrchan-api-${CACHE_VERSION}`,
  media: `hmrchan-media-${CACHE_VERSION}`,
  posts: `hmrchan-posts-${CACHE_VERSION}`, // 专用帖子缓存
}

// API 域名配置（支持多环境）
const API_HOSTNAMES = [
  'api.momichan.xyz', // 生产环境
  // 如需添加其他环境，在此处扩展
]

// 静态资源列表（预缓存）
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.ico']

// 媒体缓存配置
const MEDIA_CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
  maxItems: 500, // 最多500个媒体文件
  maxSize: 200 * 1024 * 1024, // 200MB
}

// 帖子缓存配置
const POST_CACHE_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24小时（帖子详情可缓存较长时间）
  staleWhileRevalidate: 5 * 60 * 1000, // 5分钟内使用缓存同时后台更新
  maxItems: 200, // 最多缓存200个帖子详情
}

// ============================================
// 安装阶段：预缓存静态资源
// ============================================
self.addEventListener('install', (event) => {
  // console.log('[SW] Installing...')

  event.waitUntil(
    caches
      .open(CACHE_NAMES.static)
      .then((cache) => {
        // console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        // console.log('[SW] Install complete')
        return self.skipWaiting() // 立即激活新的SW
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error)
      })
  )
})

// ============================================
// 激活阶段：清理旧缓存
// ============================================
self.addEventListener('activate', (event) => {
  // console.log('[SW] Activating...')

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // 删除旧版本缓存
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('hmrchan-') && !Object.values(CACHE_NAMES).includes(name)
            })
            .map((name) => {
              // console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        // console.log('[SW] Activation complete')
        return self.clients.claim() // 立即控制所有页面
      })
  )
})

// ============================================
// 请求拦截：智能缓存策略
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 只处理同源请求和指定的外部资源
  if (!shouldHandleRequest(url)) {
    return
  }

  // 根据请求类型选择策略
  if (isStaticAsset(url)) {
    // 静态资源: Cache First
    event.respondWith(cacheFirst(request, CACHE_NAMES.static))
  } else if (isVideoStreamRequest(url)) {
    // 视频流: Network Only（不缓存完整视频，太大）
    event.respondWith(fetch(request))
  } else if (isAvatarRequest(url)) {
    // 头像: Cache First with long TTL（头像很少变化）
    event.respondWith(cacheFirstMedia(request))
  } else if (isMediaRequest(url)) {
    // 媒体文件/缩略图: Cache First with Network Fallback
    event.respondWith(cacheFirstMedia(request))
  } else if (isPostDetailRequest(url)) {
    // 帖子详情: Stale-While-Revalidate（优先缓存，后台更新）
    // 确保完整帖子数据（含 media_files）可快速访问和离线使用
    event.respondWith(staleWhileRevalidatePost(request))
  } else if (isPostListRequest(url)) {
    // 帖子列表: Network First（列表需要最新数据）
    event.respondWith(networkFirstApi(request))
  } else if (isAuthorRequest(url)) {
    // 作者数据: Stale-While-Revalidate（作者信息变化不频繁）
    event.respondWith(staleWhileRevalidatePost(request))
  } else if (isApiRequest(url)) {
    // 其他API请求: Network First with Cache Fallback
    event.respondWith(networkFirstApi(request))
  } else {
    // 其他: Network Only
    event.respondWith(fetch(request))
  }
})

// ============================================
// 后台同步：离线操作队列
// ============================================
self.addEventListener('sync', (event) => {
  // console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions())
  }
})

// ============================================
// 消息通信
// ============================================
self.addEventListener('message', (event) => {
  const { type } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches())
      break

    case 'CLEAR_OLD_MEDIA':
      event.waitUntil(clearOldMedia())
      break

    case 'GET_CACHE_SIZE':
      event.waitUntil(
        getCacheSize().then((size) => {
          event.ports[0].postMessage({ size })
        })
      )
      break

    default:
      // console.log('[SW] Unknown message:', type)
      break
  }
})

// ============================================
// 缓存策略实现
// ============================================

/**
 * Cache First - 优先使用缓存
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    // console.log('[SW] Cache hit:', request.url)
    return cached
  }

  // console.log('[SW] Cache miss, fetching:', request.url)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.error('[SW] Fetch failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

/**
 * Cache First (Media) - 媒体文件专用，带容量管理
 */
async function cacheFirstMedia(request) {
  const cache = await caches.open(CACHE_NAMES.media)
  const cached = await cache.match(request)

  if (cached) {
    // 更新访问时间（用于LRU）
    updateMediaAccessTime(request.url)
    return cached
  }

  try {
    const response = await fetch(request)

    if (response.ok && response.status === 200) {
      const clonedResponse = response.clone()

      // 检查容量并缓存
      await manageMediaCache(request, clonedResponse)
    }

    return response
  } catch (error) {
    console.error('[SW] Media fetch failed:', error)
    // 返回占位符图片
    return getPlaceholderImage()
  }
}

/**
 * Stale-While-Revalidate - 帖子详情专用
 * 优先返回缓存，同时后台更新
 * 确保完整帖子数据（含 media_files）可快速访问
 *
 * 优化：标准化缓存键，忽略查询参数差异
 */
async function staleWhileRevalidatePost(request) {
  // Cache API 只支持 GET 请求
  if (request.method !== 'GET') {
    return fetch(request)
  }

  const cache = await caches.open(CACHE_NAMES.posts)

  // 标准化缓存键：提取核心路径，忽略查询参数
  // 例如：/api/v1/posts/123?include=media_files 和 /api/v1/posts/123 使用同一个缓存
  const url = new URL(request.url)
  const normalizedUrl = `${url.origin}${url.pathname}`
  const normalizedRequest = new Request(normalizedUrl, {
    method: request.method,
    headers: request.headers,
  })

  const cached = await cache.match(normalizedRequest)

  // 后台更新函数
  const fetchAndUpdate = async () => {
    try {
      const response = await fetch(request, {
        signal: AbortSignal.timeout(10000), // 10秒超时
      })

      if (response.ok) {
        // 克隆响应并缓存（使用标准化的键）
        const clonedResponse = response.clone()

        // 添加缓存时间戳
        const headers = new Headers(clonedResponse.headers)
        headers.set('X-Cached-At', new Date().toISOString())

        const cachedResponse = new Response(clonedResponse.body, {
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers,
        })

        await cache.put(normalizedRequest, cachedResponse)

        // 管理缓存容量
        await managePostCache()

        return response
      }
      return response
    } catch (error) {
      console.log('[SW] Post fetch failed:', error.message)
      return null
    }
  }

  if (cached) {
    // 检查缓存是否过期（超过 staleWhileRevalidate 时间）
    const cachedAt = cached.headers.get('X-Cached-At')
    const cacheAge = cachedAt ? Date.now() - new Date(cachedAt).getTime() : Infinity

    if (cacheAge < POST_CACHE_CONFIG.staleWhileRevalidate) {
      // 缓存新鲜，直接返回
      console.log('[SW] Post cache hit (fresh):', request.url)
      return cached
    }

    // 缓存过期但可用，返回缓存同时后台更新
    console.log('[SW] Post cache hit (stale), revalidating:', request.url)
    fetchAndUpdate() // 不等待，后台执行
    return addCacheHeader(cached, true)
  }

  // 无缓存，等待网络
  console.log('[SW] Post cache miss:', request.url)
  const networkResponse = await fetchAndUpdate()

  if (networkResponse) {
    return networkResponse
  }

  // 网络失败，返回离线错误
  return new Response(JSON.stringify({ error: 'Offline', message: '帖子数据不可用' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * 添加缓存标识 header
 */
function addCacheHeader(response, isStale = false) {
  const headers = new Headers(response.headers)
  headers.set('X-From-Cache', 'true')
  if (isStale) {
    headers.set('X-Cache-Stale', 'true')
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * 管理帖子缓存容量
 */
async function managePostCache() {
  const cache = await caches.open(CACHE_NAMES.posts)
  const keys = await cache.keys()

  if (keys.length > POST_CACHE_CONFIG.maxItems) {
    // 删除最旧的条目（简单 FIFO）
    const toDelete = keys.slice(0, keys.length - POST_CACHE_CONFIG.maxItems)
    await Promise.all(toDelete.map((key) => cache.delete(key)))
    console.log(`[SW] Post cache cleanup: removed ${toDelete.length} items`)
  }
}

/**
 * Network First - 优先网络，缓存降级
 */
async function networkFirstApi(request) {
  // Cache API 只支持 GET 请求，非 GET 请求直接走网络
  if (request.method !== 'GET') {
    return fetch(request)
  }

  // 不缓存认证相关的 API 响应（安全考虑）
  const url = new URL(request.url)
  if (url.pathname.includes('/auth/')) {
    return fetch(request)
  }

  const cache = await caches.open(CACHE_NAMES.api)

  try {
    const response = await fetch(request, {
      // API请求超时5秒
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      // 缓存API响应（带过期时间）
      const clonedResponse = response.clone()
      cache.put(request, clonedResponse)
    }

    return response
  } catch {
    console.log('[SW] Network failed, using cache:', request.url)

    const cached = await cache.match(request)
    if (cached) {
      // 添加自定义header标识是缓存数据
      const headers = new Headers(cached.headers)
      headers.set('X-From-Cache', 'true')

      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      })
    }

    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ============================================
// 工具函数
// ============================================

function shouldHandleRequest(url) {
  // 只处理 http/https 请求
  if (!url.protocol.startsWith('http')) return false

  // 同源请求
  if (url.origin === self.location.origin) return true

  // API 域名（使用配置数组，便于多环境扩展）
  if (API_HOSTNAMES.includes(url.hostname)) return true

  // 允许的外部CDN
  const allowedOrigins = ['pbs.twimg.com', 'i.ytimg.com', 'source.unsplash.com']

  return allowedOrigins.some((origin) => url.hostname.includes(origin))
}

function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot']
  return staticExtensions.some((ext) => url.pathname.endsWith(ext))
}

function isMediaRequest(url) {
  const mediaExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.avif',
    '.svg',
    '.mp4',
    '.webm',
  ]

  // 文件扩展名匹配
  if (mediaExtensions.some((ext) => url.pathname.endsWith(ext))) {
    return true
  }

  // 外部 CDN
  if (
    url.hostname.includes('pbs.twimg.com') ||
    url.hostname.includes('i.ytimg.com') ||
    url.hostname.includes('unsplash.com')
  ) {
    return true
  }

  // 媒体 API 端点（缩略图）
  // /api/v1/media/{media_id}/thumbnail
  if (/^\/api\/v1\/media\/[0-9a-f-]+\/thumbnail$/i.test(url.pathname)) {
    return true
  }

  return false
}

/**
 * 检查是否为视频流请求（不缓存完整视频）
 */
function isVideoStreamRequest(url) {
  // /api/v1/media/{media_id}/stream
  return /^\/api\/v1\/media\/[0-9a-f-]+\/stream$/i.test(url.pathname)
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isPostDetailRequest(url) {
  // 匹配 /api/v1/posts/{uuid} 格式
  // 不包括 /api/v1/posts?... （列表查询）
  const postDetailPattern = /^\/api\/v1\/posts\/[0-9a-f-]{36}$/i
  return postDetailPattern.test(url.pathname)
}

function isPostListRequest(url) {
  // 匹配 /api/v1/posts 或 /api/v1/posts?... 格式（帖子列表查询）
  return url.pathname === '/api/v1/posts' || url.pathname === '/api/v1/posts/'
}

function isAuthorRequest(url) {
  // 匹配 /api/v1/authors 或 /api/v1/authors/{id} 格式
  return /^\/api\/v1\/authors(\/[0-9a-f-]+)?$/i.test(url.pathname)
}

function isAvatarRequest(url) {
  // 匹配头像 URL 模式
  if (url.pathname.includes('avatar') || url.pathname.includes('profile')) {
    return true
  }
  // Twitter/外部头像 CDN
  if (url.hostname.includes('pbs.twimg.com') && url.pathname.includes('profile')) {
    return true
  }
  return false
}

/**
 * 管理媒体缓存容量
 */
async function manageMediaCache(request, response) {
  const cache = await caches.open(CACHE_NAMES.media)

  // 检查当前缓存大小
  const keys = await cache.keys()

  // 如果超过限制，删除最旧的
  if (keys.length >= MEDIA_CACHE_CONFIG.maxItems) {
    console.log('[SW] Media cache full, removing oldest items')

    // 删除前10个（LRU）
    const toDelete = keys.slice(0, 10)
    await Promise.all(toDelete.map((key) => cache.delete(key)))
  }

  // 缓存新的媒体文件
  await cache.put(request, response)
}

/**
 * 清理旧媒体文件
 */
async function clearOldMedia() {
  const cache = await caches.open(CACHE_NAMES.media)
  const keys = await cache.keys()
  const now = Date.now()

  let deleted = 0

  for (const request of keys) {
    const response = await cache.match(request)
    if (!response) continue

    const dateHeader = response.headers.get('date')
    if (!dateHeader) continue

    const age = now - new Date(dateHeader).getTime()

    if (age > MEDIA_CACHE_CONFIG.maxAge) {
      await cache.delete(request)
      deleted++
    }
  }

  console.log(`[SW] Cleared ${deleted} old media files`)
  return deleted
}

/**
 * 清空所有缓存
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.filter((name) => name.startsWith('hmrchan-')).map((name) => caches.delete(name))
  )
  console.log('[SW] All caches cleared')
}

/**
 * 获取缓存总大小
 */
async function getCacheSize() {
  const cacheNames = await caches.keys()
  let totalSize = 0

  for (const name of cacheNames) {
    if (!name.startsWith('hmrchan-')) continue

    const cache = await caches.open(name)
    const keys = await cache.keys()

    for (const request of keys) {
      const response = await cache.match(request)
      if (response && response.body) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }
  }

  return totalSize
}

/**
 * 获取占位符图片
 */
function getPlaceholderImage() {
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="20">
        Image unavailable
      </text>
    </svg>
  `

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    },
  })
}

/**
 * 更新媒体访问时间（简化版LRU）
 */
function updateMediaAccessTime() {
  // 在实际实现中，可以使用 IndexedDB 存储访问时间
  // 这里简化处理
}

/**
 * 同步离线操作
 */
async function syncOfflineActions() {
  // 从 IndexedDB 读取离线队列
  // 这部分需要配合 IndexedDB 管理器实现
  console.log('[SW] Syncing offline actions...')

  try {
    // TODO: 实现实际的同步逻辑
    return true
  } catch (error) {
    console.error('[SW] Sync failed:', error)
    throw error
  }
}

console.log('[SW] Service Worker loaded')
