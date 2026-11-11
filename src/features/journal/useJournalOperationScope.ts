import { onBeforeUnmount, watch } from 'vue'
import { registerPrivateSessionReset } from '@/services/privateSessionState'

// Identity alone is insufficient when A signs out and signs back in before
// an old request settles. Each operation also belongs to one mounted scope
// and one monotonic session generation.
export function useJournalOperationScope(
  identity: () => string | undefined,
  onInvalidate?: () => void
) {
  let generation = 0
  let mounted = true
  function invalidate() {
    generation++
    onInvalidate?.()
  }
  watch(identity, invalidate, { flush: 'sync' })
  const unregister = registerPrivateSessionReset(invalidate)
  onBeforeUnmount(() => {
    unregister()
    mounted = false
    invalidate()
  })
  return {
    capture() {
      const user = identity()
      const version = generation
      return () => mounted && generation === version && identity() === user
    },
  }
}
