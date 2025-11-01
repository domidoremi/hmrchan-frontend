/**
 * Service Worker - 离线访问支持
 * 功能:
 * 1. 缓存静态资源 (HTML, CSS, JS, 字体)
 * 2. 缓存API响应
 * 3. 离线降级策略
 * 4. 后台同步
 */

const CACHE_VERSION = 'v1.1.0' // 更新版本
const STATIC_CACHE = `hmrchan-static-${CACHE_VERSION}`
const API_CACHE = `hmrchan-api-${CACHE_VERSION}`
const IMAGE_CACHE = `hmrchan-images-${CACHE_VERSION}`
const FONT_CACHE = `hmrchan-fonts-${CACHE_VERSION}`

// 需要缓存的静态资源（关键资源）
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html', // 离线页面
  '/favicon.ico',
  // 预缓存关键路由（将在运行时缓存）
]

// API缓存策略配置
const API_CACHE_RULES = {
  // 缓存时间(秒)
  '/api/posts': 60,         // 1分钟（SWR 策略）
  '/api/authors': 600,      // 10分钟
  '/api/media': 2592000,    // 30天（媒体文件）
  '/api/posts/stats': 300,  // 5分钟（统计数据）
}

// ==================== 安装事件 ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }).then(() => {
      // 立即激活新的Service Worker
      return self.skipWaiting()
    })
  )
})

// ==================== 激活事件 ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    // 清理旧缓存
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith('hmrchan-') && 
                   cacheName !== STATIC_CACHE &&
                   cacheName !== API_CACHE &&
                   cacheName !== IMAGE_CACHE &&
                   cacheName !== FONT_CACHE
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    }).then(() => {
      // 立即控制所有页面
      return self.clients.claim()
    })
  )
})

// ==================== 获取事件 ====================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非GET请求
  if (request.method !== 'GET') {
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
 * 网络优先策略
 * 适用于: API请求
 */
async function networkFirstStrategy(request) {
  const cacheName = API_CACHE
  
  try {
    // 尝试从网络获取
    const response = await fetch(request)
    
    // 缓存成功的响应
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    // 网络失败，尝试从缓存获取
    const cached = await caches.match(request)
    
    if (cached) {
      return cached
    }
    
    // 缓存也没有，返回离线页面
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }
    
    // 返回离线响应
    return new Response(
      JSON.stringify({ error: 'Offline', message: '网络连接失败，请稍后重试' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * 缓存优先策略
 * 适用于: 静态资源、图片
 */
async function cacheFirstStrategy(request, cacheName) {
  // 先从缓存查找
  const cached = await caches.match(request)
  
  if (cached) {
    // 返回缓存，同时在后台更新
    updateCache(request, cacheName)
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
 * 后台更新缓存
 */
async function updateCache(request, cacheName) {
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response)
    }
  } catch (error) {
    // 静默失败
  }
}

// ==================== 消息处理 ====================
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CLEAR_CACHE':
      clearAllCaches()
      event.ports[0].postMessage({ success: true })
      break
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size })
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
  await Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  )
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
      percentage: (estimate.usage / estimate.quota * 100).toFixed(2)
    }
  }
  return null
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
