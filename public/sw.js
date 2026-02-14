/**
 * Service Worker - 三层缓存策略
 *
 * CACHE_VERSION 由 Vite 构建时自动注入（vite-plugin-sw-version）
 * 格式: v{major}-{minor}-{patch}-{git-hash}-b{build-number}
 *
 * 缓存策略:
 * - 静态资源: Cache First
 * - 帖子详情: Stale-While-Revalidate（标准化缓存键）
 * - 帖子列表/API: Network First
 * - 媒体文件: Cache First + LRU 容量管理
 * - 视频流: Network Only
 */

// AbortSignal.timeout polyfill for compatibility
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function delay(ms) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), ms)
    return controller.signal
  }
}

const SW_DEBUG =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '::1'

function swLog(...args) {
  if (SW_DEBUG) {
    console.log(...args)
  }
}

function swWarn(...args) {
  if (SW_DEBUG) {
    console.warn(...args)
  }
}

async function getMediaMetaStats() {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_META_STORE, 'readonly')
      const store = tx.objectStore(MEDIA_META_STORE)
      let count = 0
      let totalSize = 0
      const request = store.openCursor()

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (!cursor) {
          resolve({ count, totalSize })
          return
        }
        const value = cursor.value
        count += 1
        totalSize += value?.size || 0
        cursor.continue()
      }

      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

const CACHE_VERSION = '__SW_CACHE_VERSION__'
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

// 运行时配置（由客户端注入）
const RUNTIME_CONFIG = {
  apiBase: null,
  apiHostnames: [...API_HOSTNAMES],
}

// 静态资源列表（预缓存）
const OFFLINE_FALLBACK = '/offline.html'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.ico', OFFLINE_FALLBACK]

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
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('hmrchan-') && !Object.values(CACHE_NAMES).includes(name)
          })
          .map((name) => caches.delete(name))
      )

      // 启用 Navigation Preload（如果支持）
      if (self.registration && 'navigationPreload' in self.registration) {
        try {
          await self.registration.navigationPreload.enable()
        } catch {
          // ignore
        }
      }

      // console.log('[SW] Activation complete')
      await self.clients.claim() // 立即控制所有页面
    })()
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

  // 导航请求：Network First + Navigation Preload + 离线兜底
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event))
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
  swLog('[SW] Background sync:', event.tag)

  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(triggerClientSync())
  }
})

// ============================================
// Push 通知处理
// ============================================
self.addEventListener('push', (event) => {
  swLog('[SW] Push notification received')

  let data = { title: '新消息', body: '您有新的内容更新' }

  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { title: '新消息', body: event.data.text() }
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: data.url || '/',
    actions: [
      { action: 'open', title: '查看' },
      { action: 'close', title: '关闭' },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// ============================================
// 通知点击处理
// ============================================
self.addEventListener('notificationclick', (event) => {
  swLog('[SW] Notification clicked:', event.action)

  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // 打开或聚焦到应用
  const urlToOpen = event.notification.data || '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 查找已打开的窗口
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // 打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// ============================================
// 消息通信
// ============================================
self.addEventListener('message', (event) => {
  const { type } = event.data

  switch (type) {
    case 'CONFIG': {
      const payload = event.data?.payload || {}
      if (typeof payload.apiBase === 'string') {
        RUNTIME_CONFIG.apiBase = payload.apiBase
      }
      if (Array.isArray(payload.apiHostnames) && payload.apiHostnames.length > 0) {
        const merged = new Set([...API_HOSTNAMES, ...payload.apiHostnames])
        RUNTIME_CONFIG.apiHostnames = Array.from(merged)
      }
      break
    }
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
 * 导航请求处理（SPA 入口）
 */
async function handleNavigationRequest(event) {
  const { request } = event

  try {
    // 优先使用 navigation preload（如果可用）
    const preload = await event.preloadResponse
    if (preload) {
      return preload
    }

    const networkResponse = await fetch(request)
    if (networkResponse && networkResponse.ok) {
      return networkResponse
    }
  } catch {
    // ignore
  }

  // 离线兜底：优先 index.html，其次 offline.html
  const cache = await caches.open(CACHE_NAMES.static)
  const cached = await cache.match('/index.html')
  if (cached) return cached

  const offline = await cache.match(OFFLINE_FALLBACK)
  if (offline) return offline

  return new Response('Offline', { status: 503 })
}
/**
 * 为缓存响应添加时间戳
 */
function withCacheTimestamp(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Cached-At', new Date().toISOString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

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
    if (isCacheableResponse(response)) {
      const cachedResponse = withCacheTimestamp(response.clone())
      cache.put(request, cachedResponse)
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
  // Cache API 只支持 GET 请求，非 GET 直接走网络
  if (request.method !== 'GET') {
    return fetch(request)
  }

  const cache = await caches.open(CACHE_NAMES.media)
  const cached = await cache.match(request)

  if (cached) {
    // 更新访问时间（用于LRU）
    updateMediaAccessTime(request.url)
    return cached
  }

  try {
    const response = await fetch(request)

    if (response.ok && response.status === 200 && isCacheableResponse(response)) {
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

      if (isCacheableResponse(response)) {
        // 克隆响应并缓存（使用标准化的键）
        const cachedResponse = withCacheTimestamp(response.clone())

        await cache.put(normalizedRequest, cachedResponse)

        // 管理缓存容量
        await managePostCache()

        return response
      }
      return response
    } catch (error) {
      swLog('[SW] Post fetch failed:', error.message)
      return null
    }
  }

  if (cached) {
    // 检查缓存是否过期（超过 staleWhileRevalidate 时间）
    const cachedAt = cached.headers.get('X-Cached-At')
    const cacheAge = cachedAt ? Date.now() - new Date(cachedAt).getTime() : Infinity

    if (cacheAge < POST_CACHE_CONFIG.staleWhileRevalidate) {
      // 缓存新鲜，直接返回
      swLog('[SW] Post cache hit (fresh):', request.url)
      return cached
    }

    // 缓存过期但可用，返回缓存同时后台更新
    swLog('[SW] Post cache hit (stale), revalidating:', request.url)
    fetchAndUpdate() // 不等待，后台执行
    return addCacheHeader(cached, true)
  }

  // 无缓存，等待网络
  swLog('[SW] Post cache miss:', request.url)
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
    swLog(`[SW] Post cache cleanup: removed ${toDelete.length} items`)
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

    if (isCacheableResponse(response) && isCacheableApiRequest(url, request)) {
      // 缓存API响应（带过期时间）
      const cachedResponse = withCacheTimestamp(response.clone())
      cache.put(request, cachedResponse)
    }

    return response
  } catch {
    swLog('[SW] Network failed, using cache:', request.url)

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
function isCacheableResponse(response) {
  if (!response || !response.ok) return false
  if (response.type === 'opaque') return false
  const cacheControl = response.headers.get('Cache-Control') || ''
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false
  }
  if (response.headers.has('Set-Cookie')) return false
  return true
}

function isCacheableApiRequest(url, request) {
  const hasAuth = request.headers.has('Authorization')
  if (!hasAuth) return true

  // 允许缓存公开资源（即使携带 Authorization）
  if (isPostDetailRequest(url) || isPostListRequest(url) || isAuthorRequest(url)) {
    return true
  }

  return false
}

function shouldHandleRequest(url) {
  // 只处理 http/https 请求
  if (!url.protocol.startsWith('http')) return false

  // 同源请求
  if (url.origin === self.location.origin) return true

  // API 域名（使用运行时配置，便于多环境扩展）
  const apiHosts = RUNTIME_CONFIG.apiHostnames.length
    ? RUNTIME_CONFIG.apiHostnames
    : API_HOSTNAMES
  if (apiHosts.includes(url.hostname)) return true

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
// IndexedDB store for media metadata (LRU + size tracking)
const MEDIA_META_STORE = 'media-meta'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hmrchan-cache', 3)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('offline-queue')) {
        const queueStore = db.createObjectStore('offline-queue', { keyPath: 'id' })
        queueStore.createIndex('status', 'status', { unique: false })
        queueStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains(MEDIA_META_STORE)) {
        const mediaStore = db.createObjectStore(MEDIA_META_STORE, { keyPath: 'url' })
        mediaStore.createIndex('lastAccess', 'lastAccess', { unique: false })
        mediaStore.createIndex('cachedAt', 'cachedAt', { unique: false })
        mediaStore.createIndex('size', 'size', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      swWarn('[SW] IDB upgrade blocked')
    }
  })
}

function idbGet(store, key) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(store, 'readonly')
        const request = tx.objectStore(store).get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      .catch(reject)
  })
}

function idbPut(store, value) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(store, 'readwrite')
        const request = tx.objectStore(store).put(value)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      .catch(reject)
  })
}

function idbDelete(store, key) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(store, 'readwrite')
        const request = tx.objectStore(store).delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      .catch(reject)
  })
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(store, 'readonly')
        const request = tx.objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
      .catch(reject)
  })
}

/**
 * 管理媒体缓存容量
 */
async function manageMediaCache(request, response) {
  const cache = await caches.open(CACHE_NAMES.media)
  const size = await getResponseSize(response)
  const now = Date.now()

  // 缓存新的媒体文件
  await cache.put(request, response)

  // 记录元数据
  await idbPut(MEDIA_META_STORE, {
    url: request.url,
    size,
    cachedAt: now,
    lastAccess: now,
  })

  // 执行 LRU/容量清理
  await enforceMediaLimits(cache)
}

/**
 * 获取响应体大小
 */
async function getResponseSize(response) {
  try {
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const parsed = Number(contentLength)
      if (!Number.isNaN(parsed) && parsed > 0) return parsed
    }
    const blob = await response.clone().blob()
    return blob.size || 0
  } catch {
    return 0
  }
}

/**
 * 媒体缓存 LRU + 容量限制
 */
async function enforceMediaLimits(cache) {
  const stats = await getMediaMetaStats()
  if (!stats) return

  let currentSize = stats.totalSize
  let currentCount = stats.count
  const maxEvictions = 50
  let evicted = 0
  if (
    currentCount <= MEDIA_CACHE_CONFIG.maxItems &&
    currentSize <= MEDIA_CACHE_CONFIG.maxSize
  ) {
    return
  }

  const db = await openDatabase()

  await new Promise((resolve, reject) => {
    const deletePromises = []
    const tx = db.transaction(MEDIA_META_STORE, 'readwrite')
    const store = tx.objectStore(MEDIA_META_STORE)
    const cursorRequest = store.indexNames.contains('lastAccess')
      ? store.index('lastAccess').openCursor()
      : store.openCursor()

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result
      if (!cursor) return
      if (
        currentCount <= MEDIA_CACHE_CONFIG.maxItems &&
        currentSize <= MEDIA_CACHE_CONFIG.maxSize
      ) {
        return
      }
      if (evicted >= maxEvictions) return

      const value = cursor.value
      const url = value?.url
      if (url) {
        deletePromises.push(cache.delete(url))
        store.delete(cursor.primaryKey)
        currentCount -= 1
        currentSize -= value?.size || 0
        evicted += 1
      }

      cursor.continue()
    }

    cursorRequest.onerror = () => reject(cursorRequest.error)
    tx.oncomplete = () => {
      Promise.all(deletePromises)
        .then(() => resolve())
        .catch(() => resolve())
    }
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 清理旧媒体文件
 */
async function clearOldMedia() {
  const cache = await caches.open(CACHE_NAMES.media)
  const metas = await idbGetAll(MEDIA_META_STORE)
  const cutoff = Date.now() - MEDIA_CACHE_CONFIG.maxAge
  let deleted = 0

  for (const meta of metas) {
    const cachedAt = meta?.cachedAt || 0
    if (cachedAt && cachedAt < cutoff) {
      await cache.delete(meta.url)
      await idbDelete(MEDIA_META_STORE, meta.url)
      deleted++
    }
  }

  swLog(`[SW] Cleared ${deleted} old media files`)
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
  try {
    const metas = await idbGetAll(MEDIA_META_STORE)
    await Promise.all(metas.map((meta) => idbDelete(MEDIA_META_STORE, meta.url)))
  } catch {
    // ignore
  }
  swLog('[SW] All caches cleared')
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
const mediaAccessWriteBuffer = new Map()
async function updateMediaAccessTime(url) {
  try {
    const now = Date.now()
    const last = mediaAccessWriteBuffer.get(url) || 0
    if (now - last < 5000) return
    mediaAccessWriteBuffer.set(url, now)
    const meta = await idbGet(MEDIA_META_STORE, url)
    if (meta) {
      meta.lastAccess = now
      await idbPut(MEDIA_META_STORE, meta)
    }
  } catch {
    // ignore
  }
}

/**
 * 触发客户端执行离线同步（带认证）
 */
async function triggerClientSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (!clients.length) return true

  const results = await Promise.all(
    clients.map((client) => {
      return new Promise((resolve) => {
        const channel = new MessageChannel()
        const timeout = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 15000)

        channel.port1.onmessage = (event) => {
          clearTimeout(timeout)
          resolve(event.data || { ok: true })
        }

        client.postMessage({ type: 'SYNC_OFFLINE_ACTIONS' }, [channel.port2])
      })
    })
  )

  return results.some((r) => r && r.ok)
}

swLog('[SW] Service Worker loaded')
