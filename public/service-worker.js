/**
 * Service Worker - 离线访问支持（优化版）
 * 功能:
 * 1. 缓存静态资源 (HTML, CSS, JS, 字体)
 * 2. 缓存API响应（带TTL和后台更新）
 * 3. 离线降级策略
 * 4. 后台同步
 * 5. 智能缓存清理（LRU策略）
 * 6. Stale-While-Revalidate 策略
 */

const CACHE_VERSION = 'v1.5.0' // Platform-based differentiated media caching

// 🔒 CRITICAL: Override fetch in Service Worker context IMMEDIATELY
const originalFetch = self.fetch.bind(self)
self.fetch = function (input, init) {
  let url

  if (typeof input === 'string') {
    url = input
  } else if (input instanceof URL) {
    url = input.toString()
  } else if (input instanceof Request) {
    url = input.url
  } else {
    url = String(input)
  }

  // Force HTTPS if HTTP and points to api.momichan.xyz
  if (url.includes('api.momichan.xyz') && url.startsWith('http://')) {
    const httpsUrl = url.replace('http://', 'https://')
    console.error('[SW] 🚨🚨🚨 FORCED HTTP → HTTPS:', url, '→', httpsUrl)

    if (typeof input === 'string') {
      return originalFetch(httpsUrl, init)
    } else if (input instanceof Request) {
      // Create new request with HTTPS URL
      const newRequest = new Request(httpsUrl, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        mode: input.mode === 'no-cors' ? 'cors' : input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity,
      })
      return originalFetch(newRequest, init)
    } else {
      return originalFetch(httpsUrl, init)
    }
  }

  return originalFetch(input, init)
}

console.log('[SW] 🔒 Fetch interceptor installed in Service Worker context')
const STATIC_CACHE = `hmrchan-static-${CACHE_VERSION}`
const API_CACHE = `hmrchan-api-${CACHE_VERSION}`
const IMAGE_CACHE = `hmrchan-images-${CACHE_VERSION}`
const FONT_CACHE = `hmrchan-fonts-${CACHE_VERSION}`

// 缓存大小限制（LRU清理）
const CACHE_LIMITS = {
  [API_CACHE]: 100, // API 缓存最多100条
  [IMAGE_CACHE]: 500, // 图片和媒体缓存最多500个（优化）
  [STATIC_CACHE]: 50, // 静态资源最多50个
  [FONT_CACHE]: 20, // 字体最多20个
}

// 需要缓存的静态资源（关键资源）
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html', // 离线页面
  '/favicon.ico',
  // 预缓存关键路由（将在运行时缓存）
]

// API缓存策略配置（秒）
const API_CACHE_RULES = {
  '/api/posts': 60, // 1分钟（SWR 策略）
  '/api/authors': 600, // 10分钟
  '/api/media': 2592000, // 30天（媒体文件默认）
  '/api/posts/stats': 300, // 5分钟（统计数据）
}

// 基于平台的媒体缓存策略（秒）
const PLATFORM_MEDIA_CACHE_RULES = {
  youtube: 7 * 24 * 60 * 60, // 7天（YouTube视频较大，缓存时间短）
  tiktok: 14 * 24 * 60 * 60, // 14天（TikTok视频适中）
  twitter: 14 * 24 * 60 * 60, // 14天（Twitter媒体）
  instagram: 14 * 24 * 60 * 60, // 14天（Instagram媒体）
  default: 30 * 24 * 60 * 60, // 30天（其他平台默认）
}

// 缓存元数据存储（用于TTL和LRU）
const CACHE_METADATA = new Map() // key -> { timestamp, ttl, accessCount, lastAccess }

// ==================== 安装事件 ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        // 立即激活新的Service Worker
        return self.skipWaiting()
      }),
  )
})

// ==================== 激活事件 ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')

  event.waitUntil(
    // 清理旧缓存
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName.startsWith('hmrchan-') &&
                cacheName !== STATIC_CACHE &&
                cacheName !== API_CACHE &&
                cacheName !== IMAGE_CACHE &&
                cacheName !== FONT_CACHE
              )
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }),
        )
      })
      .then(() => {
        // 立即控制所有页面
        return self.clients.claim()
      }),
  )
})

// ==================== 获取事件 ====================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Note: HTTPS enforcement is now done at the fetch override level above
  // No need to duplicate it here

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return
  }

  // 跳过不支持的scheme (chrome-extension, devtools, etc.)
  if (!url.protocol.startsWith('http')) {
    return
  }

  // 跳过跨域请求（只缓存同源资源）
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api/')) {
    return
  }

  // API请求 - 网络优先，失败时使用缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // 图片请求 - 缓存优先
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE))
    return
  }

  // 字体请求 - 缓存优先（字体基本不变）
  if (request.destination === 'font' || url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)) {
    event.respondWith(cacheFirstStrategy(request, FONT_CACHE))
    return
  }

  // 媒体文件（流式传输）- 缓存优先，长期缓存
  if (url.pathname.includes('/api/media/') && url.pathname.includes('/stream')) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE))
    return
  }

  // 静态资源 - 缓存优先，失败时使用网络
  event.respondWith(cacheFirstStrategy(request, STATIC_CACHE))
})

// ==================== 缓存策略 ====================

/**
 * 网络优先策略（带后台更新）
 * 适用于: API请求
 */
async function networkFirstStrategy(request) {
  const cacheName = API_CACHE
  const url = new URL(request.url)
  const cacheKey = request.url

  try {
    // 尝试从网络获取
    const response = await fetch(request)

    // 缓存成功的响应
    if (response.ok) {
      const cache = await caches.open(cacheName)

      // 保存缓存元数据
      const ttl = getCacheTTL(url.pathname, request.url)
      CACHE_METADATA.set(cacheKey, {
        timestamp: Date.now(),
        ttl: ttl * 1000,
        accessCount: 1,
        lastAccess: Date.now(),
      })

      // 存储响应
      cache.put(request, response.clone())

      // 检查并清理缓存
      await trimCache(cacheName, CACHE_LIMITS[cacheName])
    }

    return response
  } catch {
    console.log('[SW] Network failed, trying cache:', request.url)

    // 网络失败，尝试从缓存获取
    const cached = await caches.match(request)

    if (cached) {
      // 检查缓存是否过期
      const metadata = CACHE_METADATA.get(cacheKey)
      if (metadata && isCacheExpired(metadata)) {
        console.log('[SW] Cache expired but returning stale:', request.url)
      }

      // 更新访问信息
      if (metadata) {
        metadata.accessCount++
        metadata.lastAccess = Date.now()
      }

      return cached
    }

    // 缓存也没有，返回离线页面
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }

    // 返回离线响应
    return new Response(JSON.stringify({ error: 'Offline', message: '网络连接失败，请稍后重试' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * 缓存优先策略（Stale-While-Revalidate）
 * 适用于: 静态资源、图片
 */
async function cacheFirstStrategy(request, cacheName) {
  const cacheKey = request.url

  // 先从缓存查找
  const cached = await caches.match(request)

  if (cached) {
    // 更新访问信息
    const metadata = CACHE_METADATA.get(cacheKey)
    if (metadata) {
      metadata.accessCount++
      metadata.lastAccess = Date.now()
    }

    // 检查是否过期
    if (metadata && isCacheExpired(metadata)) {
      // 过期但返回缓存，同时后台更新
      console.log('[SW] Cache expired, revalidating in background:', request.url)
      updateCacheInBackground(request, cacheName)
    } else {
      // 未过期，仍然后台更新（SWR策略）
      updateCacheInBackground(request, cacheName)
    }

    return cached
  }

  // 缓存中没有，从网络获取
  try {
    const response = await fetch(request)

    // 缓存响应
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    console.log('[SW] Failed to fetch:', request.url, error)

    // 返回离线页面
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }

    // 返回默认图片或错误响应
    return new Response('', { status: 503 })
  }
}

/**
 * 后台更新缓存（不阻塞响应）
 */
async function updateCacheInBackground(request, cacheName) {
  try {
    const response = await fetch(request)

    if (response.ok) {
      const cache = await caches.open(cacheName)
      const cacheKey = request.url

      // 更新缓存元数据
      const url = new URL(request.url)
      const ttl = getCacheTTL(url.pathname, request.url)
      CACHE_METADATA.set(cacheKey, {
        timestamp: Date.now(),
        ttl: ttl * 1000,
        accessCount: 1,
        lastAccess: Date.now(),
      })

      cache.put(request, response)

      // 检查并清理缓存
      await trimCache(cacheName, CACHE_LIMITS[cacheName])
    }
  } catch {
    // 静默失败
  }
}

/**
 * 从URL中提取平台信息
 * 支持的URL格式:
 * - /api/media/{id}/stream?platform=youtube
 * - /api/posts/{id}?platform=tiktok
 */
function extractPlatform(url) {
  try {
    const urlObj = new URL(url)

    // 1. 从query参数获取
    const platformParam = urlObj.searchParams.get('platform')
    if (platformParam) {
      return platformParam.toLowerCase()
    }

    // 2. 从路径中提取 (e.g., /api/youtube/media/...)
    const pathMatch = urlObj.pathname.match(/\/api\/(youtube|tiktok|twitter|instagram)\//)
    if (pathMatch) {
      return pathMatch[1]
    }

    return 'default'
  } catch {
    return 'default'
  }
}

/**
 * 获取缓存TTL（秒）
 * 对于媒体文件，根据平台返回不同的TTL
 */
function getCacheTTL(pathname, url) {
  // 媒体文件：根据平台决定TTL
  if (pathname.includes('/api/media')) {
    const platform = extractPlatform(url)
    const ttl = PLATFORM_MEDIA_CACHE_RULES[platform] || PLATFORM_MEDIA_CACHE_RULES.default
    console.log(`[SW] Media cache TTL for ${platform}: ${ttl}s (${Math.round(ttl / 86400)}d)`)
    return ttl
  }

  // 其他API：使用通用规则
  for (const [pattern, ttl] of Object.entries(API_CACHE_RULES)) {
    if (pathname.includes(pattern)) {
      return ttl
    }
  }

  return 300 // 默认5分钟
}

/**
 * 检查缓存是否过期
 */
function isCacheExpired(metadata) {
  const now = Date.now()
  return now - metadata.timestamp > metadata.ttl
}

/**
 * LRU缓存清理
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  if (keys.length <= maxItems) {
    return
  }

  // 按访问时间排序（LRU）
  const keysWithMetadata = keys.map((request) => {
    const metadata = CACHE_METADATA.get(request.url)
    return {
      request,
      lastAccess: metadata ? metadata.lastAccess : 0,
      accessCount: metadata ? metadata.accessCount : 0,
    }
  })

  // 按最后访问时间排序
  keysWithMetadata.sort((a, b) => a.lastAccess - b.lastAccess)

  // 删除最旧的条目
  const toDelete = keysWithMetadata.slice(0, keys.length - maxItems)

  for (const item of toDelete) {
    await cache.delete(item.request)
    CACHE_METADATA.delete(item.request.url)
  }

  console.log(`[SW] Trimmed ${toDelete.length} items from ${cacheName}`)
}

/**
 * 清理过期缓存
 */
async function cleanupExpiredCache() {
  const cacheNames = [STATIC_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE]

  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()

      let cleaned = 0
      for (const request of keys) {
        const metadata = CACHE_METADATA.get(request.url)
        if (metadata && isCacheExpired(metadata)) {
          await cache.delete(request)
          CACHE_METADATA.delete(request.url)
          cleaned++
        }
      }

      if (cleaned > 0) {
        console.log(`[SW] Cleaned ${cleaned} expired items from ${cacheName}`)
      }
    } catch (error) {
      console.error(`[SW] Error cleaning cache ${cacheName}:`, error)
    }
  }
}

// ==================== 定期清理 ====================
// 每30分钟清理一次过期缓存
setInterval(
  () => {
    cleanupExpiredCache()
  },
  30 * 60 * 1000,
)

// ==================== 消息处理 ====================
self.addEventListener('message', (event) => {
  const { type } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        CACHE_METADATA.clear()
        event.ports[0].postMessage({ success: true })
      })
      break

    case 'CLEANUP_EXPIRED':
      cleanupExpiredCache().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break

    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size })
      })
      break

    case 'GET_CACHE_STATS':
      getCacheStats().then((stats) => {
        event.ports[0].postMessage({ stats })
      })
      break

    default:
      console.log('[SW] Unknown message:', type)
  }
})

/**
 * 清除所有缓存
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
  console.log('[SW] All caches cleared')
}

/**
 * 获取缓存大小
 */
async function getCacheSize() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2),
    }
  }
  return null
}

/**
 * 获取缓存统计信息
 */
async function getCacheStats() {
  const cacheNames = [STATIC_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE]
  const stats = {}

  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()

      let expired = 0
      let valid = 0

      for (const request of keys) {
        const metadata = CACHE_METADATA.get(request.url)
        if (metadata && isCacheExpired(metadata)) {
          expired++
        } else {
          valid++
        }
      }

      stats[cacheName] = {
        total: keys.length,
        valid,
        expired,
        limit: CACHE_LIMITS[cacheName] || 0,
      }
    } catch (error) {
      stats[cacheName] = { error: error.message }
    }
  }

  return stats
}

// ==================== 后台同步 ====================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites())
  }
})

/**
 * 同步收藏数据
 */
async function syncFavorites() {
  // TODO: 实现离线收藏同步逻辑
  console.log('[SW] Syncing favorites...')
}

console.log('[SW] Service Worker loaded')
