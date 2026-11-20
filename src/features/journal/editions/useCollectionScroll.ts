import { inject, onBeforeUnmount, onMounted, type Ref } from 'vue'
import { createWheelRegion } from './wheelRegion'
import { chapterKey } from './chapterContext'

export function useCollectionScroll(
  root: Ref<HTMLElement | undefined>,
  index: Ref<number>,
  count: () => number,
  selectIndex: (index: number) => void
) {
  const chapter = inject(chapterKey, null)
  const lifetime = new AbortController()
  let pending = 0
  let pointerX = -1
  let pointerY = -1
  let wheel: ((event: WheelEvent) => void) | undefined
  let inspector: HTMLElement | null = null
  onMounted(() => {
    root.value?.addEventListener(
      'wheel',
      (event) => {
        const target = (event.target as Element).closest<HTMLElement>('.archive-inspector')
        if (target) {
          if (target !== inspector) {
            inspector = target
            wheel = createWheelRegion({
              element: target,
              position: () => index.value,
              maximum: () => count() - 1,
              stepped: true,
              enabled: () => !chapter?.enabled.value,
              move: selectIndex,
            })
          }
          wheel?.(event)
        } else {
          pointerX = event.clientX
          pointerY = event.clientY
        }
      },
      { passive: false, signal: lifetime.signal }
    )
    window.addEventListener(
      'scroll',
      () => {
        if (pending || document.hidden || !root.value?.isConnected) return
        pending = requestAnimationFrame(() => {
          pending = 0
          const list = root.value?.querySelector('.archive-result-list')
          if (!list) return
          const box = list.getBoundingClientRect()
          if (
            pointerX < box.left ||
            pointerX > box.right ||
            pointerY < 100 ||
            pointerY > innerHeight - 40
          )
            return
          const rows = [...list.querySelectorAll<HTMLElement>('[data-post]')]
          let closest = -1,
            distance = Infinity
          for (const [i, row] of rows.entries()) {
            const rect = row.getBoundingClientRect()
            if (rect.bottom < 100 || rect.top > innerHeight - 40) continue
            const offset = Math.abs(rect.top + rect.height / 2 - pointerY)
            if (offset < distance) {
              closest = i
              distance = offset
            }
          }
          if (closest >= 0 && closest !== index.value) selectIndex(closest)
        })
      },
      { passive: true, signal: lifetime.signal }
    )
    document.addEventListener(
      'pointermove',
      () => {
        pointerX = -1
        pointerY = -1
      },
      { passive: true, signal: lifetime.signal }
    )
    document.addEventListener(
      'keydown',
      () => {
        pointerX = -1
        pointerY = -1
      },
      { signal: lifetime.signal }
    )
  })
  onBeforeUnmount(() => {
    lifetime.abort()
    cancelAnimationFrame(pending)
  })
}
