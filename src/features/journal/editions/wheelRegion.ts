type RegionOptions = {
  element: HTMLElement
  position: () => number
  maximum: () => number
  move: (value: number) => void
  stepped?: boolean
  enabled?: (event: WheelEvent) => boolean
}

// Only the central content area consumes a wheel gesture; its edges remain page exits.
export function createWheelRegion(options: RegionOptions) {
  let accumulated = 0
  let lastAt = 0
  let lastDirection = 0
  let lastStepAt = -Infinity
  return (event: WheelEvent) => {
    const { element, position, maximum, move, stepped = false } = options
    if (
      event.defaultPrevented ||
      !event.cancelable ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      document.hidden ||
      options.enabled?.(event) === false
    )
      return
    // Native horizontal gestures, zoom and form controls keep their normal behavior.
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
    if (
      (event.target as Element | null)?.closest(
        'input, textarea, select, [contenteditable="true"], [data-wheel-native]'
      )
    )
      return
    const rect = element.getBoundingClientRect()
    const insetX = Math.min(48, rect.width * 0.08)
    const insetY = Math.min(36, rect.height * 0.1)
    const visibleTop = Math.max(rect.top, 80)
    const visibleBottom = Math.min(rect.bottom, innerHeight - 24)
    if (
      rect.width < 1 ||
      visibleBottom - visibleTop < Math.min(180, rect.height * 0.6) ||
      event.clientX < rect.left + insetX ||
      event.clientX > rect.right - insetX ||
      event.clientY < visibleTop + insetY ||
      event.clientY > visibleBottom - insetY
    ) {
      accumulated = 0
      return
    }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1
    const delta = event.deltaY * unit
    if (!delta || Math.abs(delta) > innerHeight * 0.85) {
      accumulated = 0
      return
    }
    const current = position(),
      max = maximum(),
      direction = Math.sign(delta)
    if (max <= 0 || (direction < 0 ? current <= 0 : current >= max - (stepped ? 0 : 1))) {
      accumulated = 0
      return
    }
    const at = performance.now()
    if (at - lastAt > 240 || direction !== lastDirection) accumulated = 0
    lastAt = at
    lastDirection = direction
    if (stepped) {
      accumulated += delta
      event.preventDefault()
      if (Math.abs(accumulated) < 80 || at - lastStepAt < 420) return
      move(Math.max(0, Math.min(max, current + direction)))
      accumulated = 0
      lastStepAt = at
    } else {
      const next = Math.max(0, Math.min(max, current + delta))
      if (Math.abs(next - current) < 0.5) return
      event.preventDefault()
      move(next)
    }
  }
}
