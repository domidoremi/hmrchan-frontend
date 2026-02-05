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
import { postService } from '@/api'

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
          await postService.likePost(action.resourceId)
          break
        case 'unlike':
          await postService.unlikePost(action.resourceId)
          break
        case 'favorite':
          await postService.favoritePost(action.resourceId)
          break
        case 'unfavorite':
          await postService.unfavoritePost(action.resourceId)
          break
        case 'comment':
          if (action.data?.content) {
            // 评论同步需要特殊处理
            // await commentService.createComment(action.resourceId, action.data.content as string)
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
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register('sync-offline-actions')
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
    triggerSync().catch((error) => {
      console.error('[Sync] Auto sync failed:', error)
    })
  })
}
