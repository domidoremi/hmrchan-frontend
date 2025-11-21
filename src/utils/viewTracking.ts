/**
 * 浏览跟踪工具
 * 使用 localStorage 跟踪用户已浏览的帖子，避免重复计数
 * v2.0 - UUID迁移：postId从number改为string
 */

import type { UUID } from '@/types'
import { logger } from './logger'

const STORAGE_KEY = 'viewed_posts'
const MAX_STORED_POSTS = 1000 // 最多存储1000条记录

interface ViewedPost {
  id: UUID
  timestamp: number
}

/**
 * 获取已浏览的帖子列表
 */
function getViewedPosts(): Map<UUID, number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Map()

    const data: ViewedPost[] = JSON.parse(stored)
    return new Map(data.map((item) => [item.id, item.timestamp]))
  } catch (error) {
    logger.error('Failed to load viewed posts', { category: 'ViewTracking' }, error)
    return new Map()
  }
}

/**
 * 保存已浏览的帖子列表
 */
function saveViewedPosts(viewedPosts: Map<UUID, number>) {
  try {
    // 限制存储数量，删除最旧的记录
    if (viewedPosts.size > MAX_STORED_POSTS) {
      const sorted = Array.from(viewedPosts.entries())
        .sort((a, b) => b[1] - a[1]) // 按时间戳降序
        .slice(0, MAX_STORED_POSTS)
      viewedPosts = new Map(sorted)
    }

    const data: ViewedPost[] = Array.from(viewedPosts.entries()).map(([id, timestamp]) => ({
      id,
      timestamp,
    }))

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    logger.error('Failed to save viewed posts', { category: 'ViewTracking' }, error)
  }
}

/**
 * 检查帖子是否已被浏览
 */
export function hasViewedPost(postId: UUID): boolean {
  const viewedPosts = getViewedPosts()
  return viewedPosts.has(postId)
}

/**
 * 标记帖子为已浏览
 */
export function markPostAsViewed(postId: UUID): void {
  const viewedPosts = getViewedPosts()
  viewedPosts.set(postId, Date.now())
  saveViewedPosts(viewedPosts)
}

/**
 * 清除所有浏览记录（用于测试或重置）
 */
export function clearViewedPosts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    logger.error('Failed to clear viewed posts', { category: 'ViewTracking' }, error)
  }
}

/**
 * 获取浏览记录统计
 */
export function getViewedPostsStats(): {
  total: number
  last24h: number
  last7d: number
} {
  const viewedPosts = getViewedPosts()
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const week = 7 * day

  let last24h = 0
  let last7d = 0

  for (const timestamp of viewedPosts.values()) {
    const age = now - timestamp
    if (age < day) last24h++
    if (age < week) last7d++
  }

  return {
    total: viewedPosts.size,
    last24h,
    last7d,
  }
}
