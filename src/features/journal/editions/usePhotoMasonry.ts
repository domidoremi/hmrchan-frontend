import { watch, type Ref, type WatchSource } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'

export function usePhotoMasonry(gallery: Readonly<Ref<HTMLElement | null>>, items: WatchSource) {
  watch(
    [gallery, items],
    ([grid], _, onCleanup) => {
      if (!grid) return

      const cards = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .next-gallery-card'))
      let frame = 0
      function pack() {
        frame = 0
        if (!grid?.isConnected || !cards.length) return
        const style = getComputedStyle(grid)
        const row =
          Number.parseFloat(getComputedStyle(document.documentElement).fontSize) *
          Number.parseFloat(style.getPropertyValue('--gallery-unit'))
        const gap = Number.parseFloat(style.columnGap)
        const columns = style.gridTemplateColumns.trim().split(/\s+/).length
        const packed = columns > 1 && Number.isFinite(row) && row > 0 && Number.isFinite(gap)
        const spans = packed
          ? cards.map((card) => String(Math.ceil((card.offsetHeight + gap) / row)))
          : []

        grid.toggleAttribute('data-packed', packed)
        cards.forEach((card, index) => {
          const span = spans[index] ?? ''
          if (card.style.getPropertyValue('--gallery-rows') !== span)
            card.style.setProperty('--gallery-rows', span)
        })
      }
      const observer = createResizeObserver(() => {
        if (!frame) frame = requestAnimationFrame(pack)
      })
      if (!observer) return
      observer.observe(grid)
      cards.forEach((card) => observer.observe(card))
      pack()
      onCleanup(() => {
        observer.disconnect()
        cancelAnimationFrame(frame)
      })
    },
    { flush: 'post' }
  )
}
