/**
 * 路由/数据预取工具
 * 配合 apiClient 的 cacheTtl 实现数据预热
 */

import { postService } from '@/api/postService'
import { authorService } from '@/api/authorService'
import { postCache } from '@/utils/cache'

// 预取状态标记
const prefetchedData = new Set<string>()
const MAX_PREFETCH_ENTRIES = 200 // 限制预取记录数量，防止内存无限增长

/**
 * 检查网络条件是否适合预取
 */
export function shouldPrefetch(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.onLine) return false

  const connection = (
    navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType && ['slow-2g', '2g', '3g'].includes(connection.effectiveType))
    return false
  return true
}

/**
 * 预取 Explore 页首屏数据
 */
export function prefetchExploreData(): void {
  if (prefetchedData.has('explore') || !shouldPrefetch()) return
  prefetchedData.add('explore')

  postService
    .listPosts({
      page: 1,
      page_size: 24,
      sort_by: 'published_at',
      sort_order: 'desc',
    })
    .catch(() => {})
}

/**
 * 预取 Authors 页首屏数据
 */
export function prefetchAuthorsData(): void {
  if (prefetchedData.has('authors') || !shouldPrefetch()) return
  prefetchedData.add('authors')

  authorService
    .listAuthors({
      page: 1,
      page_size: 20,
      sort_by: 'post_count',
      sort_order: 'desc',
    })
    .catch(() => {})
}

/**
 * 预取帖子详情数据
 */
export function prefetchPostDetail(postId: string): void {
  const key = `post:${postId}`
  if (prefetchedData.has(key) || !shouldPrefetch()) return

  // 防止 Set 无限增长
  if (prefetchedData.size >= MAX_PREFETCH_ENTRIES) {
    // 清除一半旧记录（保留 explore/authors 等页面级标记）
    const entries = Array.from(prefetchedData)
    const postEntries = entries.filter((k) => k.startsWith('post:'))
    const toRemove = postEntries.slice(0, Math.floor(postEntries.length / 2))
    toRemove.forEach((k) => prefetchedData.delete(k))
  }

  prefetchedData.add(key)

  postCache
    .getPost(postId)
    .then((cached) => {
      if (cached) return
      return postService.getPost(postId).then((data) => {
        postCache.setPost(postId, data).catch(() => {})
      })
    })
    .catch(() => {
      postService
        .getPost(postId)
        .then((data) => {
          postCache.setPost(postId, data).catch(() => {})
        })
        .catch(() => {})
    })
}

/**
 * 重置预取状态（用于登出后重新预取）
 */
export function resetPrefetchState(): void {
  prefetchedData.clear()
}
