/**
 * 无障碍功能增强
 * 提升 Lighthouse 无障碍评分
 */

import { onMounted, onUnmounted } from 'vue'

/**
 * 键盘导航支持
 */
export function useKeyboardNavigation() {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Escape 键关闭模态框
    if (e.key === 'Escape') {
      const event = new CustomEvent('close-modal')
      window.dispatchEvent(event)
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })
}

/**
 * 焦点管理
 */
export function useFocusManagement() {
  /**
   * 困住焦点在指定元素内（用于模态框）
   */
  const trapFocus = (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )

    if (focusableElements.length === 0) return

    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (!firstFocusable || !lastFocusable) return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable.focus()
        }
      }
    }

    element.addEventListener('keydown', handleTabKey)

    // 返回清理函数
    return () => {
      element.removeEventListener('keydown', handleTabKey)
    }
  }

  /**
   * 恢复焦点到之前的元素
   */
  const saveFocus = () => {
    return document.activeElement as HTMLElement
  }

  const restoreFocus = (element: HTMLElement | null) => {
    if (element && element.focus) {
      element.focus()
    }
  }

  return {
    trapFocus,
    saveFocus,
    restoreFocus,
  }
}

/**
 * ARIA 实时区域通知
 */
export function useAriaLive() {
  let liveRegion: HTMLElement | null = null

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.setAttribute('role', 'status')
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
    }

    // 更新 aria-live 属性
    liveRegion.setAttribute('aria-live', priority)

    // 清空后设置内容，确保屏幕阅读器会读取
    liveRegion.textContent = ''
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message
      }
    }, 100)
  }

  onUnmounted(() => {
    if (liveRegion && liveRegion.parentNode) {
      liveRegion.parentNode.removeChild(liveRegion)
    }
  })

  return {
    announce,
  }
}

/**
 * 跳过导航链接
 */
export function useSkipLinks() {
  onMounted(() => {
    // 检查是否已存在跳过链接
    if (document.getElementById('skip-to-content')) return

    const skipLink = document.createElement('a')
    skipLink.id = 'skip-to-content'
    skipLink.href = '#main-content'
    skipLink.textContent = '跳到主内容'
    skipLink.className = 'skip-link'

    // 添加样式
    skipLink.style.position = 'absolute'
    skipLink.style.top = '-40px'
    skipLink.style.left = '0'
    skipLink.style.padding = '8px'
    skipLink.style.background = 'var(--color-primary, #000)'
    skipLink.style.color = 'white'
    skipLink.style.zIndex = '9999'
    skipLink.style.transition = 'top 0.3s'

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0'
    })

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px'
    })

    document.body.insertBefore(skipLink, document.body.firstChild)
  })
}

/**
 * 颜色对比度检查（开发环境）
 */
export function useContrastCheck() {
  if (import.meta.env.DEV) {
    onMounted(() => {
      // 在开发环境中检查对比度
      const checkContrast = () => {
        const elements = document.querySelectorAll('[style*="color"]')
        elements.forEach(() => {
          // 这里可以添加对比度检查逻辑
          // 实际项目中可以使用 color-contrast API 或第三方库
        })
      }

      // 延迟检查，确保样式已应用
      setTimeout(checkContrast, 1000)
    })
  }
}
