/**
 * 缓存失效策略管理
 * 定义不同操作对应的缓存失效规则
 */

import { api } from '@/api/client'
import logger from '@/utils/logger'

/**
 * 缓存失效规则映射
 */
export const CACHE_INVALIDATION_RULES = {
  // 帖子相关
  'posts.create': ['/posts', '/posts/stats', '/authors'],
  'posts.update': ['/posts/', '/posts/stats'],
  'posts.delete': ['/posts/', '/posts/stats', '/authors'],

  // 收藏相关
  'favorites.add': ['/favorites', '/posts/'],
  'favorites.remove': ['/favorites', '/posts/'],

  // 用户相关
  'user.update': ['/users/', '/authors/'],
  'user.follow': ['/users/', '/authors/'],
  'user.unfollow': ['/users/', '/authors/'],

  // 评论相关
  'comments.create': ['/posts/', '/comments'],
  'comments.delete': ['/posts/', '/comments'],

  // 点赞相关
  'likes.add': ['/posts/'],
  'likes.remove': ['/posts/'],
} as const

export type InvalidationAction = keyof typeof CACHE_INVALIDATION_RULES

/**
 * 缓存失效管理器
 */
export class CacheInvalidationManager {
  /**
   * 根据操作类型失效缓存
   */
  async invalidateByAction(action: InvalidationAction, resourceId?: string): Promise<void> {
    const patterns = CACHE_INVALIDATION_RULES[action]

    if (!patterns) {
      logger.warn(`[CacheInvalidation] No invalidation rules for action: ${action}`)
      return
    }

    logger.debug(`[CacheInvalidation] Invalidating cache for action: ${action}`, {
      patterns,
      resourceId,
    })

    // 构建完整的失效模式
    const fullPatterns = patterns.map((pattern) => {
      if (resourceId && pattern.endsWith('/')) {
        return `${pattern}${resourceId}`
      }
      return pattern
    })

    // 执行失效
    await api.invalidateCacheByPatterns(fullPatterns)
  }

  /**
   * 批量失效
   */
  async invalidateMany(actions: Array<{ action: InvalidationAction; resourceId?: string }>) {
    await Promise.all(
      actions.map(({ action, resourceId }) => this.invalidateByAction(action, resourceId)),
    )
  }

  /**
   * 失效特定资源的所有缓存
   */
  async invalidateResource(resourceType: 'posts' | 'users' | 'authors', resourceId: string) {
    const patterns = [`/${resourceType}/${resourceId}`]
    await api.invalidateCacheByPatterns(patterns)
  }

  /**
   * 失效列表缓存
   */
  async invalidateList(resourceType: 'posts' | 'favorites' | 'comments') {
    const patterns = [`/${resourceType}`]
    await api.invalidateCacheByPatterns(patterns)
  }
}

// 导出单例
export const cacheInvalidation = new CacheInvalidationManager()

/**
 * 便捷方法：在操作后自动失效缓存
 */
export function withCacheInvalidation<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  action: InvalidationAction,
  getResourceId?: (...args: Parameters<T>) => string | undefined,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args)

      // 操作成功后失效缓存
      const resourceId = getResourceId ? getResourceId(...args) : undefined
      await cacheInvalidation.invalidateByAction(action, resourceId)

      return result
    } catch (error) {
      // 操作失败不失效缓存
      throw error
    }
  }) as T
}

export default cacheInvalidation
