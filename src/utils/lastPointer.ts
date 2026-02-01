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

export function initLastPointerTracker(): void {
  if (typeof window === 'undefined') return
  if (isInitialized) return
  isInitialized = true

  window.addEventListener(
    'pointerdown',
    (e) => {
      // Ignore secondary pointers.
      if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return
      lastPointer = { x: e.clientX, y: e.clientY, ts: Date.now() }
    },
    { capture: true, passive: true }
  )
}

export function getLastPointer(): PointerPoint | null {
  return lastPointer
}
