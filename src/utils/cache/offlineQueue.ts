/**
 * 离线操作队列管理
 * 用于存储离线时的点赞、收藏等操作，在网络恢复后同步
 */

import { idbGet, idbSet, idbDelete, idbGetAll, STORES } from './idb'

interface OfflineAction {
  id: string
  type: 'like' | 'unlike' | 'favorite' | 'unfavorite' | 'comment'
  resourceId: string
  data?: Record<string, unknown>
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
}

const QUEUE_STORE = STORES.OFFLINE_QUEUE
const MAX_RETRY = 3
let fallbackIdSequence = 0

function createOfflineActionId(type: OfflineAction['type'], resourceId: string): string {
  const timestamp = Date.now()
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${timestamp}-${(fallbackIdSequence = (fallbackIdSequence + 1) % Number.MAX_SAFE_INTEGER)}`

  return `${type}-${resourceId}-${timestamp}-${suffix}`
}

/**
 * 添加离线操作到队列
 */
export async function addOfflineAction(
  type: OfflineAction['type'],
  resourceId: string,
  data?: Record<string, unknown>
): Promise<string> {
  const id = createOfflineActionId(type, resourceId)

  const action: OfflineAction = {
    id,
    type,
    resourceId,
    ...(data && { data }), // Only include data if defined
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  }

  await idbSet(QUEUE_STORE, action)

  // 触发后台同步（如果支持）
  if (
    'serviceWorker' in navigator &&
    'sync' in ServiceWorkerRegistration.prototype &&
    navigator.serviceWorker.controller
  ) {
    try {
      const registration = await navigator.serviceWorker.ready
      // @ts-expect-error - Background Sync API not fully typed
      await registration.sync.register('sync-offline-actions')
    } catch (error) {
      console.warn('[OfflineQueue] Background sync registration failed:', error)
    }
  }

  return id
}

/**
 * 获取所有待同步的操作
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  const actions = await idbGetAll<OfflineAction>(QUEUE_STORE)
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
  const action = await idbGet<OfflineAction>(QUEUE_STORE, id)

  if (action) {
    action.status = status
    if (incrementRetry) {
      action.retryCount++
    }
    await idbSet(QUEUE_STORE, action)
  }
}

/**
 * 删除已完成的操作
 */
export async function removeAction(id: string): Promise<void> {
  await idbDelete(QUEUE_STORE, id)
}

/**
 * 清理失败次数过多的操作
 */
export async function cleanupFailedActions(): Promise<number> {
  const actions = await idbGetAll<OfflineAction>(QUEUE_STORE)
  let cleaned = 0

  const deletePromises = actions
    .filter((action) => action.retryCount >= MAX_RETRY)
    .map((action) => idbDelete(QUEUE_STORE, action.id))

  await Promise.all(deletePromises)
  cleaned = deletePromises.length

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
  const actions = await idbGetAll<OfflineAction>(QUEUE_STORE)

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
