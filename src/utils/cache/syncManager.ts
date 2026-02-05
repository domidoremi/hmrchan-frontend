/**
 * 后台同步管理器
 * 处理离线操作队列的同步
 */

import {
  getPendingActions,
  updateActionStatus,
  removeAction,
  cleanupFailedActions,
} from './offlineQueue'
import { favoriteService } from '@/api/favoriteService'
import { commentService } from '@/api/commentService'

/**
 * 同步所有待处理的离线操作
 */
export async function syncOfflineActions(): Promise<{
  success: number
  failed: number
  errors: Array<{ id: string; error: string }>
}> {
  const actions = await getPendingActions()
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  }

  for (const action of actions) {
    try {
      await updateActionStatus(action.id, 'syncing')

      // 根据操作类型执行相应的 API 调用
      switch (action.type) {
        case 'like':
          // TODO: 实现点赞 API（当前后端未提供）
          console.warn('[Sync] Like API not implemented yet')
          break
        case 'unlike':
          // TODO: 实现取消点赞 API（当前后端未提供）
          console.warn('[Sync] Unlike API not implemented yet')
          break
        case 'favorite':
          await favoriteService.create(action.resourceId)
          break
        case 'unfavorite':
          if (action.data?.['favoriteId']) {
            await favoriteService.remove(action.data['favoriteId'] as number)
          }
          break
        case 'comment':
          if (action.data?.['content']) {
            await commentService.createComment(action.resourceId, {
              content: action.data['content'] as string,
            })
          }
          break
      }

      // 成功后删除操作
      await removeAction(action.id)
      results.success++
    } catch (error) {
      // 失败后更新状态并增加重试计数
      await updateActionStatus(action.id, 'failed', true)
      results.failed++
      results.errors.push({
        id: action.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // 清理失败次数过多的操作
  await cleanupFailedActions()

  return results
}

/**
 * 手动触发同步
 */
export async function triggerSync(): Promise<void> {
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
      console.warn('[SyncManager] Background sync registration failed:', error)
      // Fallback to direct sync
      await syncOfflineActions()
    }
  } else {
    // 不支持后台同步，直接执行
    await syncOfflineActions()
  }
}

/**
 * 监听网络状态变化，自动触发同步
 */
export function setupAutoSync(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('online', () => {
    console.log('[Sync] Network restored, triggering sync...')
    triggerSync().catch((error: unknown) => {
      console.error('[Sync] Auto sync failed:', error)
    })
  })
}

// ==================== Service Worker -> Client sync bridge ====================
let swSyncListenerAttached = false

/**
 * 监听来自 Service Worker 的同步请求
 * 用于 SW 在后台同步时无法携带 auth 的场景
 */
export function setupSwSyncListener(): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (swSyncListenerAttached) return
  swSyncListenerAttached = true

  navigator.serviceWorker.addEventListener('message', async (event) => {
    const data = event.data as { type?: string } | undefined
    if (data?.type !== 'SYNC_OFFLINE_ACTIONS') return

    const replyPort = event.ports?.[0]

    try {
      const result = await syncOfflineActions()
      replyPort?.postMessage({ ok: true, result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      replyPort?.postMessage({ ok: false, error: message })
    }
  })
}
