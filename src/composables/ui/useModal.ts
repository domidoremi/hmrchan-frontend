/**
 * Modal composable
 * Provides modal state management and utilities
 */

import { ref, computed, watch } from 'vue'

export interface ModalOptions {
  /**
   * Close modal when clicking outside
   */
  closeOnClickOutside?: boolean

  /**
   * Close modal when pressing Escape key
   */
  closeOnEscape?: boolean

  /**
   * Prevent body scroll when modal is open
   */
  preventBodyScroll?: boolean

  /**
   * Callback when modal opens
   */
  onOpen?: () => void

  /**
   * Callback when modal closes
   */
  onClose?: () => void

  /**
   * Callback before modal closes (can prevent closing by returning false)
   */
  beforeClose?: () => boolean | Promise<boolean>
}

/**
 * Modal state management composable
 */
export function useModal(options: ModalOptions = {}) {
  const {
    closeOnClickOutside = true,
    closeOnEscape = true,
    preventBodyScroll = true,
    onOpen,
    onClose,
    beforeClose,
  } = options

  const isOpen = ref(false)
  const isClosing = ref(false)

  /**
   * Open the modal
   */
  async function open() {
    isOpen.value = true
    isClosing.value = false

    if (preventBodyScroll) {
      document.body.style.overflow = 'hidden'
    }

    onOpen?.()
  }

  /**
   * Close the modal
   */
  async function close() {
    // Check if closing is allowed
    if (beforeClose) {
      const canClose = await beforeClose()
      if (!canClose) return
    }

    isClosing.value = true

    // Wait for animation to complete
    setTimeout(() => {
      isOpen.value = false
      isClosing.value = false

      if (preventBodyScroll) {
        document.body.style.overflow = ''
      }

      onClose?.()
    }, 300) // Match animation duration
  }

  /**
   * Toggle modal state
   */
  function toggle() {
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }

  /**
   * Handle click outside modal
   */
  function handleClickOutside(event: MouseEvent) {
    if (!closeOnClickOutside || !isOpen.value) return

    const target = event.target as HTMLElement
    const modalContent = document.querySelector('[data-modal-content]')

    if (modalContent && !modalContent.contains(target)) {
      close()
    }
  }

  /**
   * Handle escape key press
   */
  function handleEscapeKey(event: KeyboardEvent) {
    if (!closeOnEscape || !isOpen.value) return

    if (event.key === 'Escape') {
      close()
    }
  }

  // Setup event listeners
  watch(isOpen, (newValue) => {
    if (newValue) {
      if (closeOnClickOutside) {
        document.addEventListener('click', handleClickOutside)
      }
      if (closeOnEscape) {
        document.addEventListener('keydown', handleEscapeKey)
      }
    } else {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  })

  // Computed state
  const isVisible = computed(() => isOpen.value || isClosing.value)

  return {
    isOpen,
    isClosing,
    isVisible,
    open,
    close,
    toggle,
  }
}

/**
 * Multiple modals manager
 * Useful for managing multiple modals in an application
 */
export function useModalManager() {
  const modals = new Map<string, ReturnType<typeof useModal>>()
  const activeModalId = ref<string | null>(null)

  /**
   * Register a modal
   */
  function register(id: string, modalInstance: ReturnType<typeof useModal>) {
    modals.set(id, modalInstance)
  }

  /**
   * Unregister a modal
   */
  function unregister(id: string) {
    modals.delete(id)
  }

  /**
   * Open a specific modal
   */
  function open(id: string) {
    const modal = modals.get(id)
    if (modal) {
      activeModalId.value = id
      modal.open()
    }
  }

  /**
   * Close a specific modal
   */
  function close(id: string) {
    const modal = modals.get(id)
    if (modal) {
      modal.close()
      if (activeModalId.value === id) {
        activeModalId.value = null
      }
    }
  }

  /**
   * Close all modals
   */
  function closeAll() {
    modals.forEach((modal) => modal.close())
    activeModalId.value = null
  }

  /**
   * Check if a modal is open
   */
  function isModalOpen(id: string): boolean {
    const modal = modals.get(id)
    return modal?.isOpen.value ?? false
  }

  return {
    modals,
    activeModalId,
    register,
    unregister,
    open,
    close,
    closeAll,
    isOpen: isModalOpen,
  }
}
