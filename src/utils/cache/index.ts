/**
 * 四层缓存架构入口
 *
 * 层级说明：
 * 1. HTTP Cache - 浏览器原生缓存，由响应头控制（Cache-Control/ETag）
 * 2. Service Worker + Cache API - 拦截请求，实现离线访问和资源缓存
 * 3. IndexedDB - 结构化数据持久存储（帖子列表/详情）
 * 4. Memory Cache - 运行时内存缓存（最快，但刷新丢失）
 */

import { memoryCache } from './memoryCache'
import { idbClear, STORES } from './idb'

export { registerServiceWorker, unregisterServiceWorker } from './swRegister'
export { postCache, type CachedPost, type CachedPostList } from './postCache'
export { authorCache, type CachedAuthor, type CachedAuthorList } from './authorCache'
export { memoryCache }
export { idbClear, STORES }
export {
  CACHE_TTL,
  CACHE_LIMITS,
  CACHE_VERSION,
  CACHE_NAMES,
  CACHE_STRATEGIES,
  isCacheExpired,
  getCacheRemainingTTL,
  generateCacheKey,
  type CacheStrategy,
} from './config'

/**
 * 清理所有缓存数据
 * 包括：内存缓存、IndexedDB、Service Worker 缓存
 */
export async function clearAllCaches(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 清理内存缓存
    memoryCache.clear()

    // 2. 清理 IndexedDB
    await idbClear(STORES.POSTS)
    await idbClear(STORES.POST_LISTS)
    await idbClear(STORES.META)

    // 3. 清理 Service Worker 缓存
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }

    // 4. 清理 localStorage 中的缓存相关数据
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('cache_') || key.startsWith('post_'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))

    return { success: true, message: '缓存已清理完成' }
  } catch (error) {
    console.error('[Cache] Failed to clear caches:', error)
    return { success: false, message: '清理缓存失败' }
  }
}
