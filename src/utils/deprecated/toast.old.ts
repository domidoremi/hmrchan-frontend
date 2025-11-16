/**
 * 简单的Toast通知系统
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

class ToastManager {
  private container: HTMLElement | null = null

  private createContainer() {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.className = 'toast-container'
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `
      document.body.appendChild(this.container)
    }
    return this.container
  }

  show(options: ToastOptions) {
    const { message, type = 'info', duration = 3000 } = options
    const container = this.createContainer()

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.style.cssText = `
      padding: 12px 20px;
      background: var(--glass-bg-strong);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-primary);
      font-size: 14px;
      box-shadow: var(--glass-shadow);
      pointer-events: all;
      animation: slideInRight 0.3s ease;
      min-width: 200px;
      max-width: 400px;
    `

    const colors: Record<ToastType, string> = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    }

    toast.style.borderLeftColor = colors[type]
    toast.style.borderLeftWidth = '4px'
    toast.textContent = message

    container.appendChild(toast)

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease'
      setTimeout(() => {
        container.removeChild(toast)
        if (container.children.length === 0) {
          document.body.removeChild(container)
          this.container = null
        }
      }, 300)
    }, duration)
  }

  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration })
  }

  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration })
  }

  warning(message: string, duration?: number) {
    this.show({ message, type: 'warning', duration })
  }

  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration })
  }
}

// 添加动画样式
const style = document.createElement('style')
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`
document.head.appendChild(style)

export const toast = new ToastManager()
export default toast
