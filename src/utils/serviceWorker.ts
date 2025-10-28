/**
 * Service Worker 注册工具
 */

interface ServiceWorkerMessage {
  type: string
  data?: any
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null

  /**
   * 注册 Service Worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    // 检查浏览器支持
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker is not supported')
      return null
    }

    // 仅在生产环境启用
    if (import.meta.env.DEV) {
      console.log('Service Worker disabled in development mode')
      return null
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      })

      console.log('[SW] Registration successful:', this.registration.scope)

      // 监听更新
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新版本可用
              this.onUpdateAvailable()
            }
          })
        }
      })

      return this.registration
    } catch (error) {
      console.error('[SW] Registration failed:', error)
      return null
    }
  }

  /**
   * 注销 Service Worker
   */
  async unregister(): Promise<boolean> {
    if (this.registration) {
      return await this.registration.unregister()
    }
    return false
  }

  /**
   * 更新 Service Worker
   */
  async update(): Promise<void> {
    if (this.registration) {
      await this.registration.update()
    }
  }

  /**
   * 发送消息到 Service Worker
   */
  async sendMessage(message: ServiceWorkerMessage): Promise<any> {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker is not active')
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel()

      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(event.data.error)
        } else {
          resolve(event.data)
        }
      }

      this.registration!.active!.postMessage(message, [messageChannel.port2])
    })
  }

  /**
   * 清除所有缓存
   */
  async clearCache(): Promise<void> {
    await this.sendMessage({ type: 'CLEAR_CACHE' })
    console.log('[SW] Cache cleared')
  }

  /**
   * 获取缓存大小
   */
  async getCacheSize(): Promise<any> {
    return await this.sendMessage({ type: 'GET_CACHE_SIZE' })
  }

  /**
   * 跳过等待，立即激活新版本
   */
  async skipWaiting(): Promise<void> {
    await this.sendMessage({ type: 'SKIP_WAITING' })
  }

  /**
   * 新版本可用回调
   */
  private onUpdateAvailable(): void {
    console.log('[SW] New version available')

    // 提示用户更新
    if (confirm('发现新版本，是否立即更新？')) {
      this.skipWaiting().then(() => {
        window.location.reload()
      })
    }
  }
}

// 导出单例
export const swManager = new ServiceWorkerManager()

// 自动注册（仅生产环境）
if (!import.meta.env.DEV && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    swManager.register()
  })
}

export default swManager
