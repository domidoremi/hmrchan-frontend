import { onBeforeUnmount, onMounted, onUpdated, type Ref } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'

export function useReadingMasonry(grid: Ref<HTMLElement | undefined>) {
  const lifetime = new AbortController()
  const observed = new Set<HTMLElement>()
  let resize: ResizeObserver | null = null
  let preferences: MutationObserver | undefined
  let queued = false
  let observedWidth = 0

  function property(element: HTMLElement, name: string, value: number) {
    const next = `${value}px`
    if (element.style.getPropertyValue(name) !== next) element.style.setProperty(name, next)
  }

  function layout() {
    const element = grid.value
    if (!element || lifetime.signal.aborted) return
    const style = getComputedStyle(element)
    const widths = style.gridTemplateColumns
      .split(/\s+/)
      .map(Number.parseFloat)
      .filter((width) => Number.isFinite(width) && width > 0)
    if (widths.length < 2 || !element.childElementCount) {
      for (const card of observed) resize?.unobserve(card)
      observed.clear()
      delete element.dataset['masonry']
      element.style.removeProperty('--masonry-height')
      return
    }

    const cards = Array.from(element.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.matches('.post-card')
    )
    for (const card of observed) {
      if (cards.includes(card)) continue
      resize?.unobserve(card)
      observed.delete(card)
    }
    for (const card of cards) {
      if (observed.has(card)) continue
      resize?.observe(card)
      observed.add(card)
    }

    const columnGap = Number.parseFloat(style.columnGap) || 0
    const rowGap = Number.parseFloat(style.rowGap) || 0
    const starts = widths.map((_, index) =>
      widths.slice(0, index).reduce((total, width) => total + width + columnGap, 0)
    )
    const fullWidth =
      widths.reduce((total, width) => total + width, 0) + columnGap * (widths.length - 1)
    const spanning = cards.map((card) => {
      const placement = getComputedStyle(card)
      return placement.gridColumnStart === '1' && placement.gridColumnEnd === '-1'
    })
    const heights = widths.map(() => 0)
    element.dataset['masonry'] = 'true'
    const positions = cards.map((card, index) => {
      const full = spanning[index]
      const column = heights.indexOf(Math.min(...heights))
      const top = full ? Math.max(...heights) : heights[column]!
      property(card, '--masonry-width', full ? fullWidth : widths[column]!)
      // Computed block size excludes reveal and FLIP transforms while retaining fractional pixels.
      const height = Number.parseFloat(getComputedStyle(card).blockSize) || card.offsetHeight
      const bottom = top + height + rowGap
      if (full) heights.fill(bottom)
      else heights[column] = bottom
      return { card, top, start: full ? 0 : starts[column]! }
    })
    for (const { card, top, start } of positions) {
      property(card, '--masonry-top', top)
      property(card, '--masonry-start', start)
    }
    property(element, '--masonry-height', Math.max(0, Math.max(...heights) - rowGap))
  }

  function schedule() {
    if (queued || lifetime.signal.aborted) return
    queued = true
    queueMicrotask(() => {
      queued = false
      layout()
    })
  }

  onMounted(() => {
    const element = grid.value
    if (!element) return
    resize = createResizeObserver((entries) => {
      if (
        entries.some((entry) => {
          if (entry.target !== element) return true
          const changed = observedWidth !== entry.contentRect.width
          observedWidth = entry.contentRect.width
          return changed
        })
      )
        schedule()
    })
    resize?.observe(element)
    preferences = new MutationObserver(schedule)
    preferences.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-preset', 'data-locale'],
    })
    preferences.observe(document.body, { attributes: true, attributeFilter: ['data-text-size'] })
    const options = { passive: true, signal: lifetime.signal }
    window.addEventListener('resize', schedule, options)
    element.addEventListener('load', schedule, { ...options, capture: true })
    document.fonts?.addEventListener('loadingdone', schedule, options)
    void document.fonts?.ready.then(schedule)
    layout()
  })
  onUpdated(schedule)
  onBeforeUnmount(() => {
    lifetime.abort()
    resize?.disconnect()
    preferences?.disconnect()
  })

  return { layout }
}
