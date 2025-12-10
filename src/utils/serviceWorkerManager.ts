/**
 * Service Worker 管理器
 * 负责注册、更新和与SW通信
 */

import { logger } from './logger'

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private updateCheckInterval: number | null = null

  /**
   * 注册 Service Worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    // 仅在生产环境和支持SW的浏览器中注册
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
      logger.debug('Service Worker not available', { category: 'SW Manager' })
      return null
    }

    try {
      logger.info('Registering Service Worker...', { category: 'SW Manager' })

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // 总是检查更新
      })

      logger.info('Registered successfully', { category: 'SW Manager' })

      // 监听更新
      this.setupUpdateListener()

      // 定期检查更新（每小时）
      this.startUpdateCheck()

      // 监听controller变化
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        logger.info('Controller changed, reloading...', { category: 'SW Manager' })
        window.location.reload()
      })

      return this.registration
    } catch (error) {
      logger.error('Registration failed', { category: 'SW Manager' }, error)
      return null
    }
  }

  /**
   * 设置更新监听器
   */
  private setupUpdateListener(): void {
    if (!this.registration) return

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing

      if (!newWorker) return

      logger.info('Update found', { category: 'SW Manager' })

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 新的SW已安装，提示用户更新
          logger.info('New version available', { category: 'SW Manager' })
          this.notifyUpdate()
        }
      })
    })
  }

  /**
   * 通知用户有更新
   */
  private notifyUpdate(): void {
    // 触发自定义事件，让UI组件显示更新提示
    const event = new CustomEvent('sw-update-available')
    window.dispatchEvent(event)
  }

  /**
   * 应用更新
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      logger.warn('No waiting worker to activate', { category: 'SW Manager' })
      return
    }

    // 发送消息让waiting worker跳过等待
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  /**
   * 启动定期更新检查
   */
  private startUpdateCheck(): void {
    // 每小时检查一次更新
    this.updateCheckInterval = window.setInterval(
      () => {
        this.checkForUpdates()
      },
      60 * 60 * 1000,
    )
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) return

    try {
      await this.registration.update()
      logger.debug('Update check complete', { category: 'SW Manager' })
    } catch (error) {
      logger.error('Update check failed', { category: 'SW Manager' }, error)
    }
  }

  /**
   * 获取缓存大小
   */
  async getCacheSize(): Promise<number> {
    if (!this.registration || !this.registration.active) {
      return 0
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.size || 0)
      }

      this.registration!.active!.postMessage({ type: 'GET_CACHE_SIZE' }, [messageChannel.port2])

      // 超时保护
      setTimeout(() => resolve(0), 5000)
    })
  }

  /**
   * 清空缓存
   */
  async clearCache(): Promise<void> {
    if (!this.registration || !this.registration.active) {
      logger.warn('No active worker', { category: 'SW Manager' })
      return
    }

    this.registration.active.postMessage({ type: 'CLEAR_CACHE' })
    logger.debug('Cache clear requested', { category: 'SW Manager' })
  }

  /**
   * 清理旧媒体
   */
  async clearOldMedia(): Promise<void> {
    if (!this.registration || !this.registration.active) {
      logger.warn('No active worker', { category: 'SW Manager' })
      return
    }

    this.registration.active.postMessage({ type: 'CLEAR_OLD_MEDIA' })
    logger.debug('Old media cleanup requested', { category: 'SW Manager' })
  }

  /**
   * 预缓存资源
   */
  async precacheResources(urls: string[]): Promise<void> {
    if (!this.registration || !this.registration.active) {
      logger.warn('No active worker', { category: 'SW Manager' })
      return
    }

    this.registration.active.postMessage({
      type: 'PRECACHE_RESOURCES',
      payload: { urls },
    })
  }

  /**
   * 注销 Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      // 停止更新检查
      if (this.updateCheckInterval) {
        clearInterval(this.updateCheckInterval)
        this.updateCheckInterval = null
      }

      const success = await this.registration.unregister()
      logger.info('Unregistered', { category: 'SW Manager', success })
      this.registration = null
      return success
    } catch (error) {
      logger.error('Unregister failed', { category: 'SW Manager' }, error)
      return false
    }
  }

  /**
   * 获取注册状态
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }

  /**
   * 检查是否已注册
   */
  isRegistered(): boolean {
    return !!this.registration
  }

  /**
   * 获取SW状态
   */
  getState(): string {
    if (!this.registration) return 'unregistered'

    if (this.registration.active) return 'active'
    if (this.registration.installing) return 'installing'
    if (this.registration.waiting) return 'waiting'

    return 'unknown'
  }
}

// 导出单例
export const swManager = new ServiceWorkerManager()
