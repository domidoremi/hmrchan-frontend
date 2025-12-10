/**
 * Body Scroll Lock Composable
 * 提供统一的 body 滚动锁定功能
 */

import { ref, watch, onUnmounted } from 'vue'

// 跟踪锁定计数，支持多个组件同时锁定
let lockCount = 0
let originalOverflow = ''

/**
 * 锁定 body 滚动
 */
export function lockBodyScroll(): void {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount++
}

/**
 * 解锁 body 滚动
 */
export function unlockBodyScroll(): void {
  lockCount--
  if (lockCount <= 0) {
    lockCount = 0
    document.body.style.overflow = originalOverflow
  }
}

/**
 * 强制解锁所有滚动锁定
 */
export function forceUnlockBodyScroll(): void {
  lockCount = 0
  document.body.style.overflow = originalOverflow
}

/**
 * Body 滚动锁定 Composable
 * 响应式控制 body 滚动锁定状态
 *
 * @param initialLocked - 初始锁定状态
 * @returns 锁定状态和控制方法
 *
 * @example
 * ```ts
 * const { isLocked, lock, unlock } = useBodyScrollLock()
 *
 * // 或者响应式绑定
 * const { isLocked } = useBodyScrollLock()
 * watch(showModal, (show) => {
 *   isLocked.value = show
 * })
 * ```
 */
export function useBodyScrollLock(initialLocked = false) {
  const isLocked = ref(initialLocked)

  // 监听锁定状态变化
  watch(
    isLocked,
    (locked) => {
      if (locked) {
        lockBodyScroll()
      } else {
        unlockBodyScroll()
      }
    },
    { immediate: true },
  )

  // 组件卸载时自动解锁
  onUnmounted(() => {
    if (isLocked.value) {
      unlockBodyScroll()
    }
  })

  /**
   * 锁定滚动
   */
  function lock(): void {
    isLocked.value = true
  }

  /**
   * 解锁滚动
   */
  function unlock(): void {
    isLocked.value = false
  }

  /**
   * 切换锁定状态
   */
  function toggle(): void {
    isLocked.value = !isLocked.value
  }

  return {
    isLocked,
    lock,
    unlock,
    toggle,
  }
}
