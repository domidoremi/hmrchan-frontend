/**
 * Last pointer tracker
 * Used for click-origin animations (e.g. opening a modal from the clicked card position).
 */

type PointerPoint = {
  x: number
  y: number
  ts: number
}

let lastPointer: PointerPoint | null = null
let isInitialized = false
let pointerListener: ((e: PointerEvent) => void) | null = null

export function initLastPointerTracker(): void {
  if (typeof window === 'undefined') return
  if (isInitialized) return
  isInitialized = true

  pointerListener = (e: PointerEvent) => {
    // Ignore secondary pointers.
    if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return
    lastPointer = { x: e.clientX, y: e.clientY, ts: Date.now() }
  }

  window.addEventListener('pointerdown', pointerListener, { capture: true, passive: true })
}

export function getLastPointer(): PointerPoint | null {
  return lastPointer
}

export function disposeLastPointerTracker(): void {
  if (typeof window === 'undefined') return
  if (!isInitialized) return

  if (pointerListener) {
    window.removeEventListener('pointerdown', pointerListener, { capture: true })
    pointerListener = null
  }

  isInitialized = false
}
