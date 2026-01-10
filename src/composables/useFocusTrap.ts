/**
 * Focus Trap Composable - 焦点陷阱
 *
 * 用于 Modal、Dropdown 等组件，确保键盘焦点不会跳出弹窗
 * 符合 WCAG 2.1 无障碍标准
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'

// 可聚焦元素选择器
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ')

export interface UseFocusTrapOptions {
  /** 是否在激活时自动聚焦第一个元素 */
  autoFocus?: boolean
  /** 是否在关闭时恢复之前的焦点 */
  restoreFocus?: boolean
  /** 初始聚焦的元素选择器 */
  initialFocus?: string
  /** 是否允许 Escape 键关闭 */
  escapeDeactivates?: boolean
  /** Escape 键回调 */
  onEscape?: () => void
}

export function useFocusTrap(
  containerRef: Ref<HTMLElement | null>,
  isActive: Ref<boolean>,
  options: UseFocusTrapOptions = {}
) {
  const {
    autoFocus = true,
    restoreFocus = true,
    initialFocus,
    escapeDeactivates = true,
    onEscape,
  } = options

  const previousActiveElement = ref<HTMLElement | null>(null)

  /**
   * 获取容器内所有可聚焦元素
   */
  function getFocusableElements(): HTMLElement[] {
    if (!containerRef.value) return []
    return Array.from(containerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
      (el) => {
        // 过滤不可见元素
        return el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden'
      }
    )
  }

  /**
   * 聚焦第一个可聚焦元素
   */
  function focusFirst() {
    const elements = getFocusableElements()

    // 优先聚焦指定元素
    if (initialFocus && containerRef.value) {
      const initial = containerRef.value.querySelector<HTMLElement>(initialFocus)
      if (initial) {
        initial.focus()
        return
      }
    }

    // 聚焦第一个可聚焦元素
    const first = elements[0]
    if (first) {
      first.focus()
    } else {
      // 如果没有可聚焦元素，聚焦容器本身
      containerRef.value?.focus()
    }
  }

  /**
   * 聚焦最后一个可聚焦元素
   */
  function focusLast() {
    const elements = getFocusableElements()
    const last = elements[elements.length - 1]
    if (last) {
      last.focus()
    }
  }

  /**
   * 处理 Tab 键导航
   */
  function handleKeyDown(event: KeyboardEvent) {
    if (!isActive.value || !containerRef.value) return

    // 处理 Escape 键
    if (event.key === 'Escape' && escapeDeactivates) {
      event.preventDefault()
      event.stopPropagation()
      onEscape?.()
      return
    }

    // 只处理 Tab 键
    if (event.key !== 'Tab') return

    const elements = getFocusableElements()
    if (elements.length === 0) {
      event.preventDefault()
      return
    }

    const firstElement = elements[0]
    const lastElement = elements[elements.length - 1]
    const activeElement = document.activeElement as HTMLElement

    if (!firstElement || !lastElement) return

    // Shift + Tab：从第一个元素跳到最后一个
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
      return
    }

    // Tab：从最后一个元素跳到第一个
    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
      return
    }

    // 如果焦点不在容器内，强制聚焦到第一个元素
    if (!containerRef.value.contains(activeElement)) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  /**
   * 处理焦点离开容器的情况
   */
  function handleFocusOut(event: FocusEvent) {
    if (!isActive.value || !containerRef.value) return

    const relatedTarget = event.relatedTarget as HTMLElement | null

    // 如果焦点移出容器，强制拉回
    if (relatedTarget && !containerRef.value.contains(relatedTarget)) {
      // 使用 requestAnimationFrame 避免焦点闪烁
      requestAnimationFrame(() => {
        if (isActive.value) {
          focusFirst()
        }
      })
    }
  }

  /**
   * 激活焦点陷阱
   */
  function activate() {
    if (!containerRef.value) return

    // 保存当前焦点
    previousActiveElement.value = document.activeElement as HTMLElement

    // 添加事件监听
    document.addEventListener('keydown', handleKeyDown, true)
    containerRef.value.addEventListener('focusout', handleFocusOut)

    // 自动聚焦
    if (autoFocus) {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        focusFirst()
      })
    }
  }

  /**
   * 停用焦点陷阱
   */
  function deactivate() {
    // 移除事件监听
    document.removeEventListener('keydown', handleKeyDown, true)
    containerRef.value?.removeEventListener('focusout', handleFocusOut)

    // 恢复之前的焦点
    if (restoreFocus && previousActiveElement.value) {
      // 使用 requestAnimationFrame 避免焦点闪烁
      requestAnimationFrame(() => {
        previousActiveElement.value?.focus()
        previousActiveElement.value = null
      })
    }
  }

  // 监听激活状态
  watch(
    isActive,
    (active) => {
      if (active) {
        activate()
      } else {
        deactivate()
      }
    },
    { immediate: true }
  )

  // 组件卸载时清理
  onUnmounted(() => {
    deactivate()
  })

  return {
    focusFirst,
    focusLast,
    getFocusableElements,
  }
}
