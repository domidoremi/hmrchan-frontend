import { onScopeDispose, watch, type WatchSource } from 'vue'

export function useAppearanceColorSync(sources: WatchSource[]) {
  let pendingFrame: number | undefined

  function clearPendingFrame() {
    if (pendingFrame !== undefined) {
      cancelAnimationFrame(pendingFrame)
      pendingFrame = undefined
    }
  }

  watch(
    sources,
    () => {
      if (typeof document === 'undefined') return

      clearPendingFrame()
      const root = document.documentElement
      root.setAttribute('data-appearance-changing', '')
      // Paint the new palette together before restoring control transitions.
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = requestAnimationFrame(() => {
          pendingFrame = undefined
          root.removeAttribute('data-appearance-changing')
        })
      })
    },
    { flush: 'sync' }
  )

  onScopeDispose(() => {
    clearPendingFrame()
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-appearance-changing')
    }
  })
}
