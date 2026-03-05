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
// ==================== Listener state ====================
let autoSyncAttached = false
let autoSyncHandler: (() => void) | null = null
let swSyncListenerAttached = false
let swSyncHandler: ((event: MessageEvent) => void) | null = null

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
        case 'unlike': {
          // 后端尚未提供点赞相关 API：避免把离线操作当作同步成功
          await updateActionStatus(action.id, 'failed', true)
          results.failed++
          results.errors.push({
            id: action.id,
            error: `[${action.type}] API not implemented yet`,
          })
          await removeAction(action.id)
          continue
        }
        case 'favorite':
          await favoriteService.create(action.resourceId)
          break
        case 'unfavorite':
          await favoriteService.removeByPostId(action.resourceId)
          break
        case 'comment':
          {
            const rawContent = action.data?.['content']
            const content = typeof rawContent === 'string' ? rawContent.trim() : ''
            if (!content) {
              await updateActionStatus(action.id, 'failed', true)
              results.failed++
              results.errors.push({
                id: action.id,
                error: '[comment] Missing content',
              })
              await removeAction(action.id)
              continue
            }
            await commentService.createComment(action.resourceId, { content })
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

export function disposeAutoSync(): void {
  if (typeof window === 'undefined') return
  if (!autoSyncAttached) return

  if (autoSyncHandler) {
    window.removeEventListener('online', autoSyncHandler)
    autoSyncHandler = null
  }

  autoSyncAttached = false
}

export function disposeSwSyncListener(): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (!swSyncListenerAttached) return

  if (swSyncHandler) {
    navigator.serviceWorker.removeEventListener('message', swSyncHandler)
    swSyncHandler = null
  }

  swSyncListenerAttached = false
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

export function setupAutoSync(): void {
  if (typeof window === 'undefined') return
  if (autoSyncAttached) return

  autoSyncHandler = () => {
    console.log('[Sync] Network restored, triggering sync...')
    triggerSync().catch((error: unknown) => {
      console.error('[Sync] Auto sync failed:', error)
    })
  }

  window.addEventListener('online', autoSyncHandler)
  autoSyncAttached = true
}

/**
 * 监听来自 Service Worker 的同步请求
 * 用于 SW 在后台同步时无法携带 auth 的场景
 */
export function setupSwSyncListener(): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (swSyncListenerAttached) return
  swSyncListenerAttached = true
  swSyncHandler = async (event: MessageEvent) => {
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
  }

  navigator.serviceWorker.addEventListener('message', swSyncHandler)
}
