import { memoryCache } from './memoryCache'
import { idbClear, STORES } from './idb'

export { registerServiceWorker, unregisterServiceWorker } from './swRegister'
export { postCache, type CachedPost, type CachedPostList } from './postCache'
export { authorCache, type CachedAuthor, type CachedAuthorList } from './authorCache'
export {
  getPublicSnapshot,
  setPublicSnapshot,
  deletePublicSnapshot,
  type PublicSnapshotRecord,
} from './publicSnapshotCache'
export {
  getPublicAuthorDetail,
  getPublicAuthorList,
  getPublicPostDetail,
  getPublicPostList,
  isPublicCacheableUrl,
  loadPublicSnapshotWithFallback,
  prewarmPublicHomeContent,
  prewarmPublicMedia,
  shouldBypassPublicCache,
  PUBLIC_CACHE_SCOPES,
  type PublicCacheResult,
  type PublicCacheSource,
  type PublicCursorListCacheResult,
  type PublicListCacheResult,
} from './publicContentCache'
export { memoryCache }
export { idbClear, STORES }
export { cacheStats } from './cacheStats'
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

export async function clearAllCaches(): Promise<{ success: boolean; message: string }> {
  try {
    memoryCache.clear()

    await Promise.all(
      [STORES.POSTS, STORES.POST_LISTS, STORES.META, STORES.ACCESS_HISTORY, STORES.MEDIA_META].map(
        (store) => idbClear(store)
      )
    )

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }

    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key &&
        (key.startsWith('cache_') ||
          key.startsWith('post_') ||
          key.startsWith('public-content:') ||
          key.startsWith('desk-pet:'))
      ) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))

    return { success: true, message: '缓存已清理完成' }
  } catch {
    return { success: false, message: '清理缓存失败' }
  }
}
