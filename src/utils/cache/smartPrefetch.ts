/**
 * 智能预缓存管理器
 * 基于用户行为预加载常访问内容
 */

import { idbGet, idbSet, idbGetAll, idbClear, idbDelete, idbCount, STORES } from './idb'
import { prefetchPostDetail } from '../prefetch'

interface AccessRecord {
  id: string
  type: 'post' | 'author' | 'tag'
  resourceId: string
  accessCount: number
  lastAccess: number
  avgTimeSpent: number // 平均停留时间（毫秒）
}

const ACCESS_STORE = STORES.ACCESS_HISTORY
const MAX_RECORDS = 500
const PREFETCH_THRESHOLD = 3 // 访问3次以上才预缓存
const RECENT_DAYS = 7 // 只考虑最近7天的访问

/**
 * 记录资源访问
 */
export async function recordAccess(
  type: AccessRecord['type'],
  resourceId: string,
  timeSpent: number = 0
): Promise<void> {
  const id = `${type}-${resourceId}`

  const existing = await idbGet<AccessRecord>(ACCESS_STORE, id)

  if (existing) {
    // 更新现有记录
    existing.accessCount++
    existing.lastAccess = Date.now()
    existing.avgTimeSpent =
      (existing.avgTimeSpent * (existing.accessCount - 1) + timeSpent) / existing.accessCount
    await idbSet(ACCESS_STORE, existing)
  } else {
    // 创建新记录
    const record: AccessRecord = {
      id,
      type,
      resourceId,
      accessCount: 1,
      lastAccess: Date.now(),
      avgTimeSpent: timeSpent,
    }
    await idbSet(ACCESS_STORE, record)
  }

  // 清理旧记录
  await cleanupOldRecords()
}

/**
 * 获取热门资源（最常访问）
 */
export async function getPopularResources(
  type?: AccessRecord['type'],
  limit: number = 10
): Promise<AccessRecord[]> {
  let records = await idbGetAll<AccessRecord>(ACCESS_STORE)

  // 过滤类型
  if (type) {
    records = records.filter((r) => r.type === type)
  }

  // 只考虑最近的访问
  const cutoffTime = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
  records = records.filter((r) => r.lastAccess > cutoffTime)

  // 按访问次数和最近访问时间排序
  records.sort((a, b) => {
    const scoreA = a.accessCount * 0.7 + (a.lastAccess / Date.now()) * 0.3
    const scoreB = b.accessCount * 0.7 + (b.lastAccess / Date.now()) * 0.3
    return scoreB - scoreA
  })

  return records.slice(0, limit)
}

/**
 * 智能预缓存热门内容
 */
export async function prefetchPopularContent(): Promise<{
  prefetched: number
  skipped: number
}> {
  const popularPosts = await getPopularResources('post', 20)
  let prefetched = 0
  let skipped = 0

  for (const record of popularPosts) {
    // 只预缓存访问次数达到阈值的内容
    if (record.accessCount >= PREFETCH_THRESHOLD) {
      try {
        await prefetchPostDetail(record.resourceId)
        prefetched++
        // 避免同时发起太多请求
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch {
        skipped++
      }
    } else {
      skipped++
    }
  }

  return { prefetched, skipped }
}

/**
 * 基于当前内容推荐相关内容预缓存
 */
export async function prefetchRelatedContent(
  currentResourceId: string,
  type: AccessRecord['type'] = 'post'
): Promise<void> {
  // 获取用户的访问历史
  const history = await getPopularResources(type, 50)

  // 找到与当前内容相关的其他内容
  const related = history.filter((r) => r.resourceId !== currentResourceId).slice(0, 5)

  // 预缓存相关内容
  for (const record of related) {
    if (record.type === 'post') {
      try {
        await prefetchPostDetail(record.resourceId)
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch {
        // 忽略错误
      }
    }
  }
}

/**
 * 清理旧的访问记录
 */
async function cleanupOldRecords(): Promise<void> {
  // 先检查记录数量，避免不必要的全量读取
  const count = await idbCount(ACCESS_STORE)
  if (count <= MAX_RECORDS) {
    return
  }

  const records = await idbGetAll<AccessRecord>(ACCESS_STORE)

  // 按最后访问时间排序，删除最旧的
  records.sort((a, b) => a.lastAccess - b.lastAccess)
  const toDelete = records.slice(0, count - MAX_RECORDS)

  await Promise.all(toDelete.map((record) => idbDelete(ACCESS_STORE, record.id)))
}

/**
 * 获取访问统计
 */
export async function getAccessStats(): Promise<{
  totalRecords: number
  postAccess: number
  authorAccess: number
  avgAccessCount: number
}> {
  const records = await idbGetAll<AccessRecord>(ACCESS_STORE)

  const postRecords = records.filter((r) => r.type === 'post')
  const authorRecords = records.filter((r) => r.type === 'author')
  const totalAccessCount = records.reduce((sum, r) => sum + r.accessCount, 0)

  return {
    totalRecords: records.length,
    postAccess: postRecords.reduce((sum, r) => sum + r.accessCount, 0),
    authorAccess: authorRecords.reduce((sum, r) => sum + r.accessCount, 0),
    avgAccessCount: records.length > 0 ? totalAccessCount / records.length : 0,
  }
}

/**
 * 清除所有访问历史
 */
export async function clearAccessHistory(): Promise<void> {
  await idbClear(ACCESS_STORE)
}
