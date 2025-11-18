/**
 * Event listener composable
 * Provides automatic cleanup for event listeners
 */

import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'

export type EventTarget = Window | Document | HTMLElement | null

/**
 * Add event listener with automatic cleanup
 */
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window,
  event: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  event: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: Ref<HTMLElement | null> | HTMLElement | null,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListener(
  target: EventTarget | Ref<EventTarget>,
  event: string,
  handler: (event: Event) => void,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListener(
  target: EventTarget | Ref<EventTarget>,
  event: string,
  handler: (event: Event) => void,
  options?: boolean | AddEventListenerOptions,
): void {
  let cleanup: (() => void) | null = null

  const addEventListener = () => {
    // Remove previous listener if exists
    if (cleanup) {
      cleanup()
    }

    // Get the actual target
    const element = target && 'value' in target ? target.value : target

    if (!element) return

    // Add event listener
    element.addEventListener(event, handler, options)

    // Store cleanup function
    cleanup = () => {
      element.removeEventListener(event, handler, options)
    }
  }

  // If target is a ref, watch for changes
  if (target && 'value' in target) {
    watch(
      () => target.value,
      () => {
        addEventListener()
      },
      { immediate: true },
    )
  } else {
    // Static target
    onMounted(() => {
      addEventListener()
    })
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (cleanup) {
      cleanup()
    }
  })
}

/**
 * Multiple event listeners composable
 */
export function useEventListeners<K extends keyof WindowEventMap>(
  target: Window,
  events: Record<K, (event: WindowEventMap[K]) => void>,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListeners<K extends keyof DocumentEventMap>(
  target: Document,
  events: Record<K, (event: DocumentEventMap[K]) => void>,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListeners<K extends keyof HTMLElementEventMap>(
  target: Ref<HTMLElement | null> | HTMLElement | null,
  events: Record<K, (event: HTMLElementEventMap[K]) => void>,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListeners(
  target: EventTarget | Ref<EventTarget>,
  events: Record<string, (event: Event) => void>,
  options?: boolean | AddEventListenerOptions,
): void {
  for (const [event, handler] of Object.entries(events)) {
    useEventListener(target as Window, event, handler, options)
  }
}

/**
 * Click outside composable
 */
export function useClickOutside(
  target: Ref<HTMLElement | null> | HTMLElement | null,
  handler: (event: MouseEvent) => void,
) {
  const listener = (event: MouseEvent) => {
    const element = target && 'value' in target ? target.value : target

    if (!element) return

    const clickedElement = event.target as Node

    // Check if click is outside the element
    if (!element.contains(clickedElement)) {
      handler(event)
    }
  }

  useEventListener(document, 'click', listener)
}

/**
 * Keyboard shortcut composable
 */
export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  handler: (event: KeyboardEvent) => void
  preventDefault?: boolean
}

export function useKeyboardShortcut(shortcut: KeyboardShortcut) {
  const {
    key,
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
    handler,
    preventDefault = true,
  } = shortcut

  const listener = (event: KeyboardEvent) => {
    // Check if all modifiers match
    if (
      event.key.toLowerCase() === key.toLowerCase() &&
      event.ctrlKey === ctrl &&
      event.shiftKey === shift &&
      event.altKey === alt &&
      event.metaKey === meta
    ) {
      if (preventDefault) {
        event.preventDefault()
      }
      handler(event)
    }
  }

  useEventListener(window, 'keydown', listener)
}

/**
 * Multiple keyboard shortcuts composable
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  shortcuts.forEach((shortcut) => {
    useKeyboardShortcut(shortcut)
  })
}

/**
 * Mouse position composable
 */
export function useMousePosition() {
  const x = ref(0)
  const y = ref(0)

  const update = (event: MouseEvent) => {
    x.value = event.clientX
    y.value = event.clientY
  }

  useEventListener(window, 'mousemove', update)

  return { x, y }
}

/**
 * Window scroll composable
 */
export function useWindowScroll() {
  const x = ref(0)
  const y = ref(0)

  const update = () => {
    x.value = window.scrollX
    y.value = window.scrollY
  }

  useEventListener(window, 'scroll', update)

  // Initialize
  onMounted(() => {
    update()
  })

  return { x, y }
}

/**
 * Window size composable
 */
export function useWindowSize() {
  const width = ref(0)
  const height = ref(0)

  const update = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  useEventListener(window, 'resize', update)

  // Initialize
  onMounted(() => {
    update()
  })

  return { width, height }
}

/**
 * Document visibility composable
 */
export function useDocumentVisibility() {
  const isVisible = ref(!document.hidden)

  const update = () => {
    isVisible.value = !document.hidden
  }

  useEventListener(document, 'visibilitychange', update)

  return { isVisible }
}

/**
 * Online/Offline status composable
 */
export function useOnlineStatus() {
  const isOnline = ref(navigator.onLine)

  useEventListener(window, 'online', () => {
    isOnline.value = true
  })

  useEventListener(window, 'offline', () => {
    isOnline.value = false
  })

  return { isOnline }
}
