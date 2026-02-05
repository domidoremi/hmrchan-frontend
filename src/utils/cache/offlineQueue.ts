/**
 * 离线操作队列管理
 * 用于存储离线时的点赞、收藏等操作，在网络恢复后同步
 */

import { openDB } from './idb'

interface OfflineAction {
  id: string
  type: 'like' | 'unlike' | 'favorite' | 'unfavorite' | 'comment'
  resourceId: string
  data?: Record<string, unknown>
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
}

const QUEUE_STORE = 'offline-queue'
const MAX_RETRY = 3

/**
 * 添加离线操作到队列
 */
export async function addOfflineAction(
  type: OfflineAction['type'],
  resourceId: string,
  data?: Record<string, unknown>
): Promise<string> {
  const db = await openDB()
  const id = `${type}-${resourceId}-${Date.now()}`

  const action: OfflineAction = {
    id,
    type,
    resourceId,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  }

  await db.put(QUEUE_STORE, action)

  // 触发后台同步（如果支持）
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register('sync-offline-actions')
  }

  return id
}

/**
 * 获取所有待同步的操作
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await openDB()
  const actions = await db.getAll(QUEUE_STORE)
  return actions.filter((a) => a.status === 'pending' || a.status === 'failed')
}

/**
 * 更新操作状态
 */
export async function updateActionStatus(
  id: string,
  status: OfflineAction['status'],
  incrementRetry = false
): Promise<void> {
  const db = await openDB()
  const action = await db.get(QUEUE_STORE, id)

  if (action) {
    action.status = status
    if (incrementRetry) {
      action.retryCount++
    }
    await db.put(QUEUE_STORE, action)
  }
}

/**
 * 删除已完成的操作
 */
export async function removeAction(id: string): Promise<void> {
  const db = await openDB()
  await db.delete(QUEUE_STORE, id)
}

/**
 * 清理失败次数过多的操作
 */
export async function cleanupFailedActions(): Promise<number> {
  const db = await openDB()
  const actions = await db.getAll(QUEUE_STORE)
  let cleaned = 0

  for (const action of actions) {
    if (action.retryCount >= MAX_RETRY) {
      await db.delete(QUEUE_STORE, action.id)
      cleaned++
    }
  }

  return cleaned
}

/**
 * 获取队列统计
 */
export async function getQueueStats(): Promise<{
  total: number
  pending: number
  failed: number
}> {
  const db = await openDB()
  const actions = await db.getAll(QUEUE_STORE)

  return {
    total: actions.length,
    pending: actions.filter((a) => a.status === 'pending').length,
    failed: actions.filter((a) => a.status === 'failed').length,
  }
}

/**
 * 检查是否有待同步的操作
 */
export async function hasPendingActions(): Promise<boolean> {
  const stats = await getQueueStats()
  return stats.pending > 0 || stats.failed > 0
}
