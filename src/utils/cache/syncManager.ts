/**
 * 后台同步管理器
 * 处理离线操作队列的同步
 */

import {
  claimNextOfflineAction,
  completeClaimedAction,
  failClaimedAction,
  releaseClaimedAction,
  cleanupFailedActions,
} from './offlineQueue'
import { favoriteService } from '@/api/favoriteService'
import { commentService } from '@/api/commentService'
import {
  createAuthSessionOperation,
  subscribeAuthSessionScope,
  type AuthSessionOperation,
} from '@/services/authSessionScope'
// ==================== Listener state ====================
let autoSyncAttached = false
let autoSyncHandler: (() => void) | null = null
let authSessionUnsubscribe: (() => void) | null = null
let swSyncListenerAttached = false
let swSyncHandler: ((event: MessageEvent) => void) | null = null

/**
 * 同步所有待处理的离线操作
 */
export async function syncOfflineActions(ownerId: string | null | undefined): Promise<{
  success: number
  failed: number
  errors: Array<{ id: string; error: string }>
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>,
  }
  if (!ownerId) return results

  const operation = createAuthSessionOperation(ownerId)
  const recordSessionChange = () => {
    results.failed++
    results.errors.push({ id: 'session', error: 'Authentication session changed during sync' })
  }
  const releaseAction = async (
    activeOperation: AuthSessionOperation,
    id: string,
    leaseId: string
  ) => {
    await releaseClaimedAction(id, leaseId)
    if (!activeOperation.isCurrent()) recordSessionChange()
  }

  if (!operation.isCurrent()) {
    recordSessionChange()
    operation.dispose()
    return results
  }

  try {
    const attemptedIds = new Set<string>()
    let action = await claimNextOfflineAction(ownerId, { excludeIds: attemptedIds })

    while (action) {
      if (!operation.isCurrent()) {
        if (action.leaseId) await releaseAction(operation, action.id, action.leaseId)
        break
      }
      attemptedIds.add(action.id)
      try {
        const leaseId = action.leaseId
        if (!leaseId) throw new Error('Offline action claim is missing its lease')
        let handledAsFailure = false

        // 根据操作类型执行相应的 API 调用
        switch (action.type) {
          case 'like':
          case 'unlike': {
            // 后端尚未提供点赞相关 API：避免把离线操作当作同步成功
            await failClaimedAction(action.id, leaseId)
            results.failed++
            results.errors.push({
              id: action.id,
              error: `[${action.type}] API not implemented yet`,
            })
            break
          }
          case 'favorite':
            await favoriteService.create(
              action.resourceId,
              {},
              { idempotencyKey: action.idempotencyKey, signal: operation.signal }
            )
            break
          case 'unfavorite':
            await favoriteService.removeByPostId(action.resourceId, { signal: operation.signal })
            break
          case 'comment':
            {
              const rawContent = action.data?.['content']
              const content = typeof rawContent === 'string' ? rawContent.trim() : ''
              if (!content) {
                await failClaimedAction(action.id, leaseId)
                handledAsFailure = true
                results.failed++
                results.errors.push({
                  id: action.id,
                  error: '[comment] Missing content',
                })
                break
              }
              await commentService.createComment(
                action.resourceId,
                { content },
                { idempotencyKey: action.idempotencyKey, signal: operation.signal }
              )
            }
            break
        }

        if (!handledAsFailure && action.type !== 'like' && action.type !== 'unlike') {
          if (!operation.isCurrent()) {
            await releaseAction(operation, action.id, leaseId)
            break
          }
          const completed = await completeClaimedAction(action.id, leaseId)
          if (!completed) throw new Error('Offline action lease was lost before completion')
          results.success++
        }
      } catch (error) {
        if (!operation.isCurrent()) {
          if (action.leaseId) await releaseAction(operation, action.id, action.leaseId)
          break
        }
        // 失败后更新状态并增加重试计数
        if (action.leaseId) {
          await failClaimedAction(action.id, action.leaseId)
        }
        results.failed++
        results.errors.push({
          id: action.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      action = await claimNextOfflineAction(ownerId, { excludeIds: attemptedIds })
    }

    if (operation.isCurrent()) {
      await cleanupFailedActions(ownerId)
    }

    return results
  } finally {
    operation.dispose()
  }
}

export function disposeAutoSync(): void {
  if (typeof window === 'undefined') return
  if (!autoSyncAttached) return

  if (autoSyncHandler) {
    window.removeEventListener('online', autoSyncHandler)
    autoSyncHandler = null
  }
  authSessionUnsubscribe?.()
  authSessionUnsubscribe = null

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
export async function triggerSync(ownerId: string | null | undefined): Promise<void> {
  if (!ownerId) return

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
      await syncOfflineActions(ownerId)
    }
  } else {
    // 不支持后台同步，直接执行
    await syncOfflineActions(ownerId)
  }
}

export function setupAutoSync(getOwnerId: () => string | null | undefined): void {
  if (typeof window === 'undefined') return
  if (autoSyncAttached) return

  autoSyncHandler = () => {
    console.log('[Sync] Network restored, triggering sync...')
    triggerSync(getOwnerId()).catch((error: unknown) => {
      console.error('[Sync] Auto sync failed:', error)
    })
  }

  window.addEventListener('online', autoSyncHandler)
  authSessionUnsubscribe = subscribeAuthSessionScope((snapshot) => {
    if (!snapshot.principalId || navigator.onLine === false) return
    void triggerSync(snapshot.principalId).catch((error: unknown) => {
      console.error('[Sync] Session startup sync failed:', error)
    })
  })
  autoSyncAttached = true

  if (navigator.onLine !== false && getOwnerId()) {
    autoSyncHandler()
  }
}

/**
 * 监听来自 Service Worker 的同步请求
 * 用于 SW 在后台同步时无法携带 auth 的场景
 */
export function setupSwSyncListener(getOwnerId: () => string | null | undefined): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (swSyncListenerAttached) return
  swSyncListenerAttached = true
  swSyncHandler = async (event: MessageEvent) => {
    const data = event.data as { type?: string } | undefined
    if (data?.type !== 'SYNC_OFFLINE_ACTIONS') return

    const replyPort = event.ports?.[0]

    try {
      const ownerId = getOwnerId()
      const result = await syncOfflineActions(ownerId)
      replyPort?.postMessage({ ok: Boolean(ownerId) && result.failed === 0, result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      replyPort?.postMessage({ ok: false, error: message })
    }
  }

  navigator.serviceWorker.addEventListener('message', swSyncHandler)
}
