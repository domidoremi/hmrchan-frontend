/**
 * 离线操作队列管理器
 * 处理离线时的用户操作，网络恢复后自动同步
 */

import { indexedDB, type OfflineAction } from './indexedDB'
import type { AxiosInstance } from 'axios'

interface QueueConfig {
  maxRetries: number
  retryDelay: number
  onSync?: (action: OfflineAction) => void
  onError?: (action: OfflineAction, error: Error) => void
}

class OfflineQueueManager {
  private config: QueueConfig
  private isSyncing = false
  private apiClient: AxiosInstance | null = null

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000, // 初始延迟1秒，指数退避
      ...config,
    }

    // 监听网络状态
    this.setupNetworkListeners()
  }

  /**
   * 设置API客户端
   */
  setApiClient(client: AxiosInstance): void {
    this.apiClient = client
  }

  /**
   * 监听网络状态变化
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[Offline Queue] Network online, starting sync...')
      this.syncAll()
    })

    window.addEventListener('offline', () => {
      console.log('[Offline Queue] Network offline')
    })
  }

  /**
   * 添加操作到队列
   */
  async addAction(
    action: 'favorite' | 'unfavorite' | 'like' | 'comment',
    data: Record<string, unknown>
  ): Promise<number> {
    const offlineAction: Omit<OfflineAction, 'id'> = {
      action,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retry_count: 0,
    }

    const id = await indexedDB.addToOfflineQueue(offlineAction)
    console.log(`[Offline Queue] Added ${action} action:`, id)

    // 如果在线，立即尝试同步
    if (navigator.onLine) {
      this.sync(id)
    }

    return id
  }

  /**
   * 同步单个操作
   */
  private async sync(actionId: number): Promise<boolean> {
    if (!this.apiClient) {
      console.warn('[Offline Queue] No API client set')
      return false
    }

    try {
      // 获取操作
      const actions = await indexedDB.getPendingActions()
      const action = actions.find(a => a.id === actionId)
      
      if (!action) {
        console.warn(`[Offline Queue] Action ${actionId} not found`)
        return false
      }

      // 更新状态为同步中
      await indexedDB.updateActionStatus(actionId, 'syncing')

      // 执行实际API请求
      const success = await this.executeAction(action)

      if (success) {
        // 成功：更新状态
        await indexedDB.updateActionStatus(actionId, 'synced')
        console.log(`[Offline Queue] Synced action ${actionId}`)
        
        // 触发回调
        if (this.config.onSync) {
          this.config.onSync(action)
        }

        return true
      } else {
        // 失败：检查重试次数
        if (action.retry_count < this.config.maxRetries) {
          // 重置为pending，等待重试
          await indexedDB.updateActionStatus(actionId, 'pending')
          
          // 延迟后重试（指数退避）
          const delay = this.config.retryDelay * Math.pow(2, action.retry_count)
          setTimeout(() => this.sync(actionId), delay)
          
          console.log(`[Offline Queue] Will retry action ${actionId} after ${delay}ms`)
        } else {
          // 超过重试次数，标记为失败
          await indexedDB.updateActionStatus(actionId, 'failed', 'Max retries exceeded')
          console.error(`[Offline Queue] Action ${actionId} failed after ${this.config.maxRetries} retries`)
          
          if (this.config.onError) {
            this.config.onError(action, new Error('Max retries exceeded'))
          }
        }

        return false
      }
    } catch (error) {
      console.error('[Offline Queue] Sync error:', error)
      await indexedDB.updateActionStatus(
        actionId, 
        'failed', 
        error instanceof Error ? error.message : 'Unknown error'
      )
      return false
    }
  }

  /**
   * 执行具体的API操作
   */
  private async executeAction(action: OfflineAction): Promise<boolean> {
    if (!this.apiClient) return false

    try {
      switch (action.action) {
        case 'favorite':
          await this.apiClient.post('/api/favorites', {
            post_id: action.data.post_id,
          })
          break

        case 'unfavorite':
          await this.apiClient.delete(`/api/favorites/${action.data.post_id}`)
          break

        case 'like':
          await this.apiClient.post(`/api/posts/${action.data.post_id}/like`)
          break

        case 'comment':
          await this.apiClient.post(`/api/posts/${action.data.post_id}/comments`, {
            content: action.data.content,
          })
          break

        default:
          console.warn(`[Offline Queue] Unknown action: ${action.action}`)
          return false
      }

      return true
    } catch (error) {
      console.error(`[Offline Queue] Execute action failed:`, error)
      return false
    }
  }

  /**
   * 同步所有待处理操作
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('[Offline Queue] Sync already in progress')
      return
    }

    if (!navigator.onLine) {
      console.log('[Offline Queue] Cannot sync while offline')
      return
    }

    this.isSyncing = true
    console.log('[Offline Queue] Starting sync all...')

    try {
      const actions = await indexedDB.getPendingActions()
      console.log(`[Offline Queue] Found ${actions.length} pending actions`)

      // 顺序同步（避免并发冲突）
      for (const action of actions) {
        if (action.id) {
          await this.sync(action.id)
          // 短暂延迟，避免API限流
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      // 清理已同步的操作
      const cleared = await indexedDB.clearSyncedActions()
      console.log(`[Offline Queue] Cleared ${cleared} synced actions`)
    } finally {
      this.isSyncing = false
      console.log('[Offline Queue] Sync complete')
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus(): Promise<{
    pending: number
    syncing: number
    failed: number
  }> {
    const actions = await indexedDB.getPendingActions()
    
    return {
      pending: actions.filter(a => a.status === 'pending').length,
      syncing: actions.filter(a => a.status === 'syncing').length,
      failed: actions.filter(a => a.status === 'failed').length,
    }
  }

  /**
   * 清空队列
   */
  async clearQueue(): Promise<void> {
    await indexedDB.clearSyncedActions()
    console.log('[Offline Queue] Queue cleared')
  }

  /**
   * 手动触发同步
   */
  async manualSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline')
    }

    await this.syncAll()
  }

  /**
   * 检查是否正在同步
   */
  isSyncingNow(): boolean {
    return this.isSyncing
  }
}

// 导出单例
export const offlineQueue = new OfflineQueueManager()
export default offlineQueue
