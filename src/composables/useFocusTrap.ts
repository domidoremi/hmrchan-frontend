import {
  ref,
  shallowReadonly,
  toValue,
  watch,
  onMounted,
  getCurrentScope,
  onScopeDispose,
  type MaybeRefOrGetter,
} from 'vue'

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
  autoFocus?: boolean

  restoreFocus?: boolean

  initialFocus?: string

  escapeDeactivates?: boolean

  onEscape?: () => void
}

export function useFocusTrap(
  containerRef: MaybeRefOrGetter<HTMLElement | null>,
  isActive: MaybeRefOrGetter<boolean>,
  options: UseFocusTrapOptions = {}
) {
  const trapOptions = shallowReadonly({
    autoFocus: options.autoFocus ?? true,
    restoreFocus: options.restoreFocus ?? true,
    initialFocus: options.initialFocus,
    escapeDeactivates: options.escapeDeactivates ?? true,
    onEscape: options.onEscape,
  })

  const previousActiveElement = ref<HTMLElement | null>(null)

  const isCurrentlyActive = ref(false)

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

  function clearAllRafs(preserveRestoreFocus = false) {
    clearRaf(focusOutRaf)
    clearRaf(autoFocusRaf)
    if (!preserveRestoreFocus) {
      clearRaf(restoreFocusRaf)
      restoreFocusRaf = null
    }
    clearRaf(activationRaf)
    focusOutRaf = null
    autoFocusRaf = null
    activationRaf = null
  }

  function getFocusableElements(): HTMLElement[] {
    const container = getContainer()
    if (!container) return []
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter((el) => {
      return el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden'
    })
  }

  function focusFirst() {
    const container = getContainer()
    if (!container || !isCurrentlyActive.value) return

    const elements = getFocusableElements()

    if (trapOptions.initialFocus) {
      const initial = container.querySelector<HTMLElement>(trapOptions.initialFocus)
      if (initial) {
        initial.focus()
        return
      }
    }

    const first = elements[0]
    if (first) {
      first.focus()
    } else {
      container.focus()
    }
  }

  function focusLast() {
    const elements = getFocusableElements()
    const last = elements[elements.length - 1]
    if (last) {
      last.focus()
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    const container = getContainer()
    if (!isCurrentlyActive.value || !container) return

    if (event.key === 'Escape' && trapOptions.escapeDeactivates) {
      event.preventDefault()
      event.stopPropagation()
      trapOptions.onEscape?.()
      return
    }

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

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
      return
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
      return
    }

    if (!container.contains(activeElement)) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  function handleFocusOut(event: FocusEvent) {
    const container = getContainer()
    if (!isCurrentlyActive.value || !container) return

    const relatedTarget = event.relatedTarget as HTMLElement | null

    if (relatedTarget && !container.contains(relatedTarget)) {
      if (focusOutRaf !== null) {
        cancelAnimationFrame(focusOutRaf)
      }
      focusOutRaf = requestAnimationFrame(() => {
        focusOutRaf = null

        if (isCurrentlyActive.value && getContainer()) {
          focusFirst()
        }
      })
    }
  }

  function activate() {
    const container = getContainer()
    if (isCurrentlyActive.value || !container) return

    isCurrentlyActive.value = true
    boundContainer = container

    previousActiveElement.value = document.activeElement as HTMLElement

    document.addEventListener('keydown', handleKeyDown, true)
    boundContainer.addEventListener('focusout', handleFocusOut)

    if (trapOptions.autoFocus) {
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

  function deactivate() {
    if (!isCurrentlyActive.value) return

    isCurrentlyActive.value = false

    document.removeEventListener('keydown', handleKeyDown, true)
    if (boundContainer) {
      boundContainer.removeEventListener('focusout', handleFocusOut)
      boundContainer = null
    }

    if (trapOptions.restoreFocus && previousActiveElement.value) {
      const elementToFocus = previousActiveElement.value
      previousActiveElement.value = null

      if (restoreFocusRaf !== null) {
        cancelAnimationFrame(restoreFocusRaf)
      }
      restoreFocusRaf = requestAnimationFrame(() => {
        restoreFocusRaf = null
        elementToFocus?.focus()
      })
    }
  }

  function scheduleActivate() {
    if (activationRaf !== null) {
      cancelAnimationFrame(activationRaf)
    }
    activationRaf = requestAnimationFrame(() => {
      activationRaf = null
      if (getActive() && getContainer()) {
        activate()
      }
    })
  }

  watch(
    () => getActive(),
    (active) => {
      if (active) {
        scheduleActivate()
      } else {
        if (activationRaf !== null) {
          cancelAnimationFrame(activationRaf)
          activationRaf = null
        }
        deactivate()
      }
    }
  )

  onMounted(() => {
    if (getActive() && getContainer()) {
      scheduleActivate()
    }
  })

  const dispose = () => {
    deactivate()
    // Focus restoration intentionally runs on the next frame after the trap DOM is removed.
    clearAllRafs(true)
  }

  if (getCurrentScope()) {
    onScopeDispose(dispose)
  }

  return {
    focusFirst,
    focusLast,
    getFocusableElements,
    dispose,
  }
}
