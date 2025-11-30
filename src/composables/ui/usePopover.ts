import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

/**
 * Popover API 功能检测
 */
export function supportsPopover(): boolean {
  return typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype
}

/**
 * Popover 配置选项
 */
export interface UsePopoverOptions {
  /**
   * Popover 类型
   * - 'auto': 点击外部自动关闭（默认）
   * - 'manual': 需要手动控制关闭
   */
  popoverType?: 'auto' | 'manual'

  /**
   * 打开时的回调
   */
  onOpen?: () => void

  /**
   * 关闭时的回调
   */
  onClose?: () => void
}

/**
 * Popover API composable
 *
 * 封装原生 Popover API，提供响应式状态管理和自动降级
 *
 * @example
 * ```vue
 * <template>
 *   <button ref="triggerRef" @click="toggle">Toggle</button>
 *   <div ref="popoverRef" :popover="popoverAttr">
 *     Popover content
 *   </div>
 * </template>
 *
 * <script setup>
 * const { triggerRef, popoverRef, isOpen, toggle, popoverAttr } = usePopover()
 * </script>
 * ```
 */
export function usePopover(options: UsePopoverOptions = {}) {
  const { popoverType = 'auto', onOpen, onClose } = options

  const triggerRef = ref<HTMLElement | null>(null)
  const popoverRef = ref<HTMLElement | null>(null)
  const isOpen = ref(false)

  // 是否使用原生 Popover API
  const useNativePopover = supportsPopover()

  // Popover 属性值
  const popoverAttr = useNativePopover ? popoverType : undefined

  /**
   * 打开 popover
   */
  function open() {
    if (isOpen.value) return

    if (useNativePopover && popoverRef.value) {
      popoverRef.value.showPopover()
    } else {
      isOpen.value = true
      onOpen?.()
    }
  }

  /**
   * 关闭 popover
   */
  function close() {
    if (!isOpen.value) return

    if (useNativePopover && popoverRef.value) {
      popoverRef.value.hidePopover()
    } else {
      isOpen.value = false
      onClose?.()
    }
  }

  /**
   * 切换 popover
   */
  function toggle() {
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }

  // 原生 Popover 的 toggle 事件处理
  function handleToggle(event: Event) {
    const toggleEvent = event as PopoverToggleEvent
    const newState = toggleEvent.newState === 'open'
    isOpen.value = newState

    if (newState) {
      onOpen?.()
    } else {
      onClose?.()
    }
  }

  // 降级方案：点击外部关闭
  function handleClickOutside(event: MouseEvent) {
    if (!isOpen.value) return
    if (!popoverRef.value || !triggerRef.value) return

    const target = event.target as Node
    if (!popoverRef.value.contains(target) && !triggerRef.value.contains(target)) {
      isOpen.value = false
      onClose?.()
    }
  }

  // 降级方案：ESC 键关闭
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen.value) {
      isOpen.value = false
      onClose?.()
    }
  }

  onMounted(() => {
    if (useNativePopover && popoverRef.value) {
      // 使用原生 Popover API
      popoverRef.value.addEventListener('toggle', handleToggle)
    } else if (popoverType === 'auto') {
      // 降级方案
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleKeydown)
    }
  })

  onBeforeUnmount(() => {
    if (useNativePopover && popoverRef.value) {
      popoverRef.value.removeEventListener('toggle', handleToggle)
    } else {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeydown)
    }
  })

  return {
    /** 触发按钮的 ref */
    triggerRef,
    /** Popover 元素的 ref */
    popoverRef,
    /** 是否打开 */
    isOpen,
    /** 打开 popover */
    open,
    /** 关闭 popover */
    close,
    /** 切换 popover */
    toggle,
    /** popover 属性值（用于原生 API） */
    popoverAttr,
    /** 是否使用原生 Popover API */
    useNativePopover,
  }
}

/**
 * Popover 锚点定位 composable（CSS Anchor Positioning）
 *
 * 注意：CSS Anchor Positioning 目前支持有限（Chrome 125+）
 * 这是一个前瞻性实现，当前可能需要 JS 降级
 */
export function usePopoverAnchor(
  triggerRef: Ref<HTMLElement | null>,
  popoverRef: Ref<HTMLElement | null>,
) {
  const supportsAnchor =
    typeof CSS !== 'undefined' && CSS.supports && CSS.supports('anchor-name', '--trigger')

  onMounted(() => {
    if (!supportsAnchor || !triggerRef.value || !popoverRef.value) return

    // 设置锚点名称
    const anchorName = `--popover-anchor-${Math.random().toString(36).substr(2, 9)}`
    // 使用 setProperty 避免 TypeScript 报错（新 CSS 属性）
    triggerRef.value.style.setProperty('anchor-name', anchorName)
    popoverRef.value.style.setProperty('position-anchor', anchorName)
  })

  return {
    supportsAnchor,
  }
}

// ToggleEvent 类型（原生 Popover API）
// 注意：现代浏览器已内置 ToggleEvent，此处仅用于类型断言
type PopoverToggleEvent = Event & {
  readonly newState: 'open' | 'closed'
  readonly oldState: 'open' | 'closed'
}
