import { watch, type Ref, type WatchSource } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'

export function usePhotoMasonry(gallery: Readonly<Ref<HTMLElement | null>>, items: WatchSource) {
  watch(
    [gallery, items],
    ([grid], _, onCleanup) => {
      if (!grid) return

      const cards = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .next-gallery-card'))
      let queued = false
      let disposed = false
      let observingCards = false
      const lifetime = new AbortController()
      function pack() {
        queued = false
        if (disposed || !grid?.isConnected || !cards.length) return
        const style = getComputedStyle(grid)
        const unit = Number.parseFloat(style.getPropertyValue('--gallery-unit'))
        const columns = style.gridTemplateColumns.trim().split(/\s+/).length
        const packed = unit > 0 && columns > 1
        if (packed !== observingCards) {
          cards.forEach((card) => (packed ? observer?.observe(card) : observer?.unobserve(card)))
          observingCards = packed
        }

        grid.toggleAttribute('data-packed', packed)
        const row = packed
          ? Number.parseFloat(getComputedStyle(document.documentElement).fontSize) * unit
          : 0
        const gap = packed ? Number.parseFloat(style.columnGap) || 0 : 0
        const spans =
          row > 0 ? cards.map((card) => String(Math.ceil((card.offsetHeight + gap) / row))) : []
        cards.forEach((card, index) => {
          const span = spans[index] ?? ''
          if (card.style.getPropertyValue('--gallery-rows') === span) return
          if (span) card.style.setProperty('--gallery-rows', span)
          else card.style.removeProperty('--gallery-rows')
        })
      }
      function schedule() {
        if (queued || disposed) return
        queued = true
        queueMicrotask(pack)
      }
      const observer = createResizeObserver(schedule)
      if (!observer) return
      observer.observe(grid)
      const preferences = new MutationObserver(schedule)
      preferences.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-preset', 'data-locale'],
      })
      preferences.observe(document.body, { attributes: true, attributeFilter: ['data-text-size'] })
      const options = { passive: true, signal: lifetime.signal }
      window.addEventListener('resize', schedule, options)
      grid.addEventListener('load', schedule, { ...options, capture: true })
      document.fonts?.addEventListener('loadingdone', schedule, options)
      void document.fonts?.ready.then(schedule)
      pack()
      onCleanup(() => {
        disposed = true
        lifetime.abort()
        preferences.disconnect()
        observer.disconnect()
      })
    },
    { flush: 'post' }
  )
}
