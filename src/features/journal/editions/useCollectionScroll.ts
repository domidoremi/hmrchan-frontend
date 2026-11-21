import { inject, onBeforeUnmount, onMounted, type Ref } from 'vue'
import { createWheelRegion } from './wheelRegion'
import { chapterKey } from './chapterContext'
import { cancelHomeFrame, queueHomeFrame } from './homeFrame'

export function useCollectionScroll(
  root: Ref<HTMLElement | undefined>,
  index: Ref<number>,
  count: () => number,
  selectIndex: (index: number, followingScroll?: boolean) => void
) {
  const chapter = inject(chapterKey, null)
  const lifetime = new AbortController()
  let pointer: { x: number; y: number; list: HTMLElement } | undefined
  let wheel: ((event: WheelEvent) => void) | undefined
  let inspector: HTMLElement | null = null
  function findRow(list: HTMLElement, y: number, top: number, bottom: number) {
    const hit = document.elementFromPoint?.(pointer!.x, y)?.closest<HTMLElement>('[data-index]')
    if (hit && list.contains(hit)) {
      const row = Number(hit.dataset['index'])
      if (Number.isInteger(row) && row >= 0) return row
    }

    // Rows are ordered by index, so a gap only needs a logarithmic geometry search.
    const rows = list.children
    let low = 0,
      high = rows.length - 1
    while (low <= high) {
      const middle = (low + high) >> 1
      const row = rows.item(middle) as HTMLElement | null
      if (!row) break
      const rect = row.getBoundingClientRect()
      if (rect.top + rect.height / 2 < y) low = middle + 1
      else high = middle - 1
    }

    let closest = -1,
      distance = Infinity
    for (const candidate of [high, low]) {
      const row = rows.item(candidate) as HTMLElement | null
      if (!row) continue
      const rect = row.getBoundingClientRect()
      if (rect.bottom < top || rect.top > bottom) continue
      const offset = Math.abs(rect.top + rect.height / 2 - y)
      if (offset < distance) {
        const rowIndex = Number(row.dataset['index'])
        if (!Number.isInteger(rowIndex) || rowIndex < 0) continue
        closest = rowIndex
        distance = offset
      }
    }
    return closest >= 0 ? closest : undefined
  }
  function resetPointer() {
    pointer = undefined
  }
  function readRow(): (() => void) | undefined {
    if (!pointer?.list.isConnected || document.hidden) return undefined
    const { x, y, list } = pointer
    const box = list.getBoundingClientRect()
    const top = Math.max(100, box.top)
    const bottom = Math.min(innerHeight - 40, box.bottom)
    if (x < box.left || x > box.right || y < top || y > bottom) return undefined
    const focused = document.activeElement?.closest('.archive-inspector')
    if (focused && root.value?.contains(focused)) return undefined
    const closest = findRow(list, y, top, bottom)
    return closest !== undefined && closest !== index.value
      ? () => selectIndex(closest, true)
      : undefined
  }
  function schedule() {
    if (pointer && !document.hidden) queueHomeFrame(readRow)
  }
  onMounted(() => {
    root.value?.addEventListener(
      'wheel',
      (event) => {
        resetPointer()
        if (!(event.target instanceof Element)) return
        const target = event.target.closest<HTMLElement>('.archive-inspector')
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
        } else if (
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          !event.metaKey &&
          Math.abs(event.deltaY) > Math.abs(event.deltaX)
        ) {
          const list = event.target.closest<HTMLElement>('.archive-result-list')
          if (list) pointer = { x: event.clientX, y: event.clientY, list }
        }
      },
      { passive: false, signal: lifetime.signal }
    )
    const options = { passive: true, signal: lifetime.signal }
    window.addEventListener('scroll', schedule, { ...options, capture: true })
    document.addEventListener('pointermove', resetPointer, options)
    document.addEventListener('keydown', resetPointer, options)
  })
  onBeforeUnmount(() => {
    lifetime.abort()
    cancelHomeFrame(readRow)
  })
}
