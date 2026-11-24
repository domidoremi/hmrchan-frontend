type RegionOptions = {
  element: HTMLElement
  position: () => number
  maximum: () => number
  move: (value: number) => void
  stepped?: boolean
  wholeRegion?: boolean
  enabled?: (event: WheelEvent) => boolean
}

function withinWheelCenter(element: HTMLElement, event: WheelEvent) {
  const rect = element.getBoundingClientRect()
  const insetX = Math.min(48, rect.width * 0.08)
  const insetY = Math.min(36, rect.height * 0.1)
  const visibleTop = Math.max(rect.top, 80)
  const visibleBottom = Math.min(rect.bottom, innerHeight - 24)
  return (
    rect.width >= 1 &&
    visibleBottom - visibleTop >= Math.min(180, rect.height * 0.6) &&
    event.clientX >= rect.left + insetX &&
    event.clientX <= rect.right - insetX &&
    event.clientY >= visibleTop + insetY &&
    event.clientY <= visibleBottom - insetY
  )
}

export function verticalWheelDelta(event: WheelEvent) {
  if (
    event.defaultPrevented ||
    !event.cancelable ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey ||
    document.hidden ||
    Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
    (event.target instanceof Element &&
      event.target.closest(
        'dialog, input, textarea, select, [contenteditable="true"], [data-wheel-native]'
      ))
  )
    return 0
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1
  return event.deltaY * unit
}

export function createWheelRegion(options: RegionOptions) {
  let accumulated = 0
  let lastAt = -Infinity
  let lastDirection = 0
  let lastStepAt = -Infinity
  let heldBoundary = false
  const { element, position, maximum, move, stepped = false, wholeRegion = false } = options
  return (event: WheelEvent) => {
    const delta = verticalWheelDelta(event)
    if (!delta || options.enabled?.(event) === false) return
    if (!wholeRegion && !withinWheelCenter(element, event)) {
      accumulated = 0
      return
    }
    if (!wholeRegion && Math.abs(delta) > innerHeight * 0.85) {
      accumulated = 0
      return
    }
    const current = position(),
      max = maximum(),
      direction = Math.sign(delta)
    const at = performance.now()
    if (at - lastAt > 180 || direction !== lastDirection) heldBoundary = false
    if (at - lastAt > 240 || direction !== lastDirection) accumulated = 0
    lastAt = at
    lastDirection = direction
    if (max <= 0 || (direction < 0 ? current <= 0 : current >= max - (stepped ? 0 : 1))) {
      if (max > 0 && heldBoundary) event.preventDefault()
      accumulated = 0
      return
    }
    if (stepped) {
      accumulated += delta
      event.preventDefault()
      if (Math.abs(accumulated) < 80 || at - lastStepAt < 420) return
      const next = current + direction
      move(next)
      heldBoundary = wholeRegion && (next === 0 || next === max)
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
