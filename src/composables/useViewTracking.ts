/**
 * 浏览量追踪 Composable
 *
 * 使用 IndexedDB 记录已浏览的帖子，避免重复计数
 * 同时调用后端 API 增加浏览量和记录浏览历史
 */

import { idbDelete, idbGet, idbSet, STORES } from '@/utils/cache/idb'
import { postService, historyService } from '@/api'

// 浏览记录在 IndexedDB 中的 TTL（7 天后允许重新计数）
const VIEW_RECORD_TTL = 7 * 24 * 60 * 60 * 1000

interface ViewRecord {
  key: string
  postId: string
  viewedAt: number
}

/**
 * 检查帖子是否已在本地记录为已浏览
 */
async function hasViewed(postId: string): Promise<boolean> {
  const key = `viewed:${postId}`
  const record = await idbGet<ViewRecord>(STORES.META, key)

  if (!record) return false

  // 检查是否过期
  if (Date.now() - record.viewedAt > VIEW_RECORD_TTL) {
    await idbDelete(STORES.META, key)
    return false
  }

  return true
}

/**
 * 记录帖子已浏览
 */
async function markAsViewed(postId: string): Promise<void> {
  const key = `viewed:${postId}`
  const record: ViewRecord = {
    key,
    postId,
    viewedAt: Date.now(),
  }
  await idbSet(STORES.META, record)
}

/**
 * 追踪帖子浏览
 *
 * - 检查本地是否已记录浏览
 * - 如果未记录，调用后端 API 增加浏览量
 * - 如果用户已登录，同时记录浏览历史
 * - 所有操作静默失败，不影响页面加载
 */
export async function trackPostView(postId: string, isAuthenticated: boolean): Promise<void> {
  try {
    const viewed = await hasViewed(postId)

    if (viewed) {
      // 已浏览过，跳过
      return
    }

    // 并行执行，不阻塞
    const tasks: Promise<void>[] = [
      // 1. 增加浏览量（无需认证）
      postService.incrementView(postId),
      // 2. 记录到本地 IndexedDB
      markAsViewed(postId),
    ]

    // 3. 如果已登录，记录浏览历史
    if (isAuthenticated) {
      tasks.push(historyService.recordBrowsing(postId))
    }

    await Promise.allSettled(tasks)
  } catch {
    // 静默失败，浏览追踪不应影响用户体验
  }
}

/**
 * 清理过期的浏览记录
 * 可在应用启动时或定期调用
 */
export async function cleanupViewRecords(): Promise<number> {
  try {
    const { idbGetAll: getAllRecords, idbDelete: deleteRecord } = await import(
      '@/utils/cache/idb'
    )
    const allRecords = await getAllRecords<ViewRecord>(STORES.META)
    const expireTime = Date.now() - VIEW_RECORD_TTL
    let cleaned = 0

    for (const record of allRecords) {
      if (record.key?.startsWith('viewed:') && record.viewedAt < expireTime) {
        await deleteRecord(STORES.META, record.key)
        cleaned++
      }
    }

    return cleaned
  } catch {
    return 0
  }
}
