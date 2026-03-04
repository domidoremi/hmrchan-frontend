/**
 * Focus Trap Composable - 焦点陷阱
 *
 * 用于 Modal、Dropdown 等组件，确保键盘焦点不会跳出弹窗
 * 符合 WCAG 2.1 无障碍标准
 */

import { ref, toValue, watch, onUnmounted, type MaybeRefOrGetter } from 'vue'

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
  containerRef: MaybeRefOrGetter<HTMLElement | null>,
  isActive: MaybeRefOrGetter<boolean>,
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
  // 追踪当前是否已激活，避免重复添加/移除事件监听器
  const isCurrentlyActive = ref(false)
  // 保存当前绑定 focusout 的容器元素引用
  let boundContainer: HTMLElement | null = null
  let focusOutRaf: number | null = null
  let autoFocusRaf: number | null = null
  let restoreFocusRaf: number | null = null
  let activationRaf: number | null = null
  const getContainer = () => toValue(containerRef)
  const getActive = () => toValue(isActive)

  function clearRaf(id: number | null) {
    if (id !== null) {
      cancelAnimationFrame(id)
    }
  }

  function clearAllRafs() {
    clearRaf(focusOutRaf)
    clearRaf(autoFocusRaf)
    clearRaf(restoreFocusRaf)
    clearRaf(activationRaf)
    focusOutRaf = null
    autoFocusRaf = null
    restoreFocusRaf = null
    activationRaf = null
  }

  /**
   * 获取容器内所有可聚焦元素
   */
  function getFocusableElements(): HTMLElement[] {
    const container = getContainer()
    if (!container) return []
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter((el) => {
      // 过滤不可见元素
      return el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden'
    })
  }

  /**
   * 聚焦第一个可聚焦元素
   */
  function focusFirst() {
    const container = getContainer()
    if (!container || !isCurrentlyActive.value) return

    const elements = getFocusableElements()

    // 优先聚焦指定元素
    if (initialFocus) {
      const initial = container.querySelector<HTMLElement>(initialFocus)
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
      container.focus()
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
    // 严格检查：必须是激活状态且容器存在
    const container = getContainer()
    if (!isCurrentlyActive.value || !container) return

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
    if (!container.contains(activeElement)) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  /**
   * 处理焦点离开容器的情况
   */
  function handleFocusOut(event: FocusEvent) {
    // 严格检查：必须是激活状态且容器存在
    const container = getContainer()
    if (!isCurrentlyActive.value || !container) return

    const relatedTarget = event.relatedTarget as HTMLElement | null

    // 如果焦点移出容器，强制拉回
    if (relatedTarget && !container.contains(relatedTarget)) {
      // 使用 requestAnimationFrame 避免焦点闪烁
      if (focusOutRaf !== null) {
        cancelAnimationFrame(focusOutRaf)
      }
      focusOutRaf = requestAnimationFrame(() => {
        focusOutRaf = null
        // 再次检查状态，因为可能在 RAF 期间状态已改变
        if (isCurrentlyActive.value && getContainer()) {
          focusFirst()
        }
      })
    }
  }

  /**
   * 激活焦点陷阱
   */
  function activate() {
    // 如果已经激活或容器不存在，直接返回
    const container = getContainer()
    if (isCurrentlyActive.value || !container) return

    isCurrentlyActive.value = true
    boundContainer = container

    // 保存当前焦点
    previousActiveElement.value = document.activeElement as HTMLElement

    // 添加事件监听
    document.addEventListener('keydown', handleKeyDown, true)
    boundContainer.addEventListener('focusout', handleFocusOut)

    // 自动聚焦
    if (autoFocus) {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      if (autoFocusRaf !== null) {
        cancelAnimationFrame(autoFocusRaf)
      }
      autoFocusRaf = requestAnimationFrame(() => {
        autoFocusRaf = null
        if (isCurrentlyActive.value) {
          focusFirst()
        }
      })
    }
  }

  /**
   * 停用焦点陷阱
   */
  function deactivate() {
    // 如果未激活，直接返回
    if (!isCurrentlyActive.value) return

    isCurrentlyActive.value = false

    // 移除事件监听 - 使用保存的容器引用
    document.removeEventListener('keydown', handleKeyDown, true)
    if (boundContainer) {
      boundContainer.removeEventListener('focusout', handleFocusOut)
      boundContainer = null
    }

    // 恢复之前的焦点
    if (restoreFocus && previousActiveElement.value) {
      const elementToFocus = previousActiveElement.value
      previousActiveElement.value = null
      // 使用 requestAnimationFrame 避免焦点闪烁
      if (restoreFocusRaf !== null) {
        cancelAnimationFrame(restoreFocusRaf)
      }
      restoreFocusRaf = requestAnimationFrame(() => {
        restoreFocusRaf = null
        elementToFocus?.focus()
      })
    }
  }

  // 监听激活状态 - 移除 immediate: true，避免初始化时的问题
  watch(
    () => getActive(),
    (active) => {
      if (active) {
        // 延迟激活，确保 DOM 已渲染
        if (activationRaf !== null) {
          cancelAnimationFrame(activationRaf)
        }
        activationRaf = requestAnimationFrame(() => {
          activationRaf = null
          if (getActive() && getContainer()) {
            activate()
          }
        })
      } else {
        if (activationRaf !== null) {
          cancelAnimationFrame(activationRaf)
          activationRaf = null
        }
        deactivate()
      }
    }
  )

  // 组件卸载时清理
  onUnmounted(() => {
    deactivate()
    clearAllRafs()
  })

  return {
    focusFirst,
    focusLast,
    getFocusableElements,
  }
}
