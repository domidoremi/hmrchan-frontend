/**
 * Keyboard Shortcuts Composable
 * Global keyboard shortcut management system
 */

import { onMounted, onUnmounted } from 'vue'

export interface ShortcutConfig {
  /** Keyboard shortcut key combination */
  key: string
  /** Callback function to execute */
  callback: () => void
  /** Description of the shortcut */
  description?: string
  /** Whether to prevent default behavior */
  preventDefault?: boolean
  /** Whether the shortcut is enabled */
  enabled?: boolean
}

export type KeyCombo = string // e.g., 'ctrl+k', 'shift+/', 'escape'

export function useKeyboardShortcuts() {
  const shortcuts = new Map<KeyCombo, ShortcutConfig>()

  /**
   * Register a keyboard shortcut
   */
  const register = (key: KeyCombo, config: Omit<ShortcutConfig, 'key'>) => {
    shortcuts.set(key.toLowerCase(), {
      key,
      ...config,
      enabled: config.enabled ?? true,
    })
  }

  /**
   * Unregister a keyboard shortcut
   */
  const unregister = (key: KeyCombo) => {
    shortcuts.delete(key.toLowerCase())
  }

  /**
   * Get all registered shortcuts
   */
  const getAll = () => {
    return Array.from(shortcuts.values())
  }

  /**
   * Enable a shortcut
   */
  const enable = (key: KeyCombo) => {
    const shortcut = shortcuts.get(key.toLowerCase())
    if (shortcut) {
      shortcut.enabled = true
    }
  }

  /**
   * Disable a shortcut
   */
  const disable = (key: KeyCombo) => {
    const shortcut = shortcuts.get(key.toLowerCase())
    if (shortcut) {
      shortcut.enabled = false
    }
  }

  /**
   * Convert keyboard event to key combo string
   */
  const getKeyCombo = (event: KeyboardEvent): KeyCombo => {
    const parts: string[] = []

    // Add modifiers
    if (event.ctrlKey || event.metaKey) parts.push('ctrl')
    if (event.shiftKey) parts.push('shift')
    if (event.altKey) parts.push('alt')

    // Add key
    const key = event.key.toLowerCase()

    // Handle special keys
    if (key === ' ') {
      parts.push('space')
    } else if (key === 'escape') {
      parts.push('escape')
    } else if (key === 'enter') {
      parts.push('enter')
    } else if (key === 'tab') {
      parts.push('tab')
    } else if (key === 'arrowup') {
      parts.push('up')
    } else if (key === 'arrowdown') {
      parts.push('down')
    } else if (key === 'arrowleft') {
      parts.push('left')
    } else if (key === 'arrowright') {
      parts.push('right')
    } else {
      parts.push(key)
    }

    return parts.join('+')
  }

  /**
   * Check if the event target is an input element
   */
  const isInputElement = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false

    const tagName = target.tagName.toLowerCase()
    const isEditable = target.isContentEditable

    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable
  }

  /**
   * Handle keydown event
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    const keyCombo = getKeyCombo(event)
    const shortcut = shortcuts.get(keyCombo)

    // Don't trigger shortcuts when typing in input fields
    // unless it's a special key like Escape
    if (isInputElement(event.target) && !['escape', 'enter'].includes(event.key.toLowerCase())) {
      return
    }

    if (shortcut && shortcut.enabled !== false) {
      if (shortcut.preventDefault !== false) {
        event.preventDefault()
      }
      shortcut.callback()
    }
  }

  /**
   * Initialize keyboard shortcuts
   */
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  /**
   * Cleanup
   */
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    shortcuts.clear()
  })

  return {
    register,
    unregister,
    enable,
    disable,
    getAll,
  }
}

/**
 * Common keyboard shortcuts helper
 */
export function useCommonShortcuts(router: { push: (path: string) => void }) {
  const { register } = useKeyboardShortcuts()

  // Navigation shortcuts
  register('ctrl+h', {
    callback: () => router.push('/'),
    description: 'Go to home page',
  })

  register('ctrl+e', {
    callback: () => router.push('/explore'),
    description: 'Go to explore page',
  })

  register('ctrl+f', {
    callback: () => router.push('/favorites'),
    description: 'Go to favorites page',
  })

  register('ctrl+,', {
    callback: () => router.push('/settings'),
    description: 'Go to settings page',
  })

  // Search shortcut
  register('ctrl+k', {
    callback: () => router.push('/search'),
    description: 'Open search',
  })

  register('/', {
    callback: () => router.push('/search'),
    description: 'Focus search',
    preventDefault: true,
  })

  // Help shortcut
  register('shift+/', {
    callback: () => {
      // Show keyboard shortcuts help modal
      console.log('Show keyboard shortcuts help')
    },
    description: 'Show keyboard shortcuts help',
  })

  return { register }
}
