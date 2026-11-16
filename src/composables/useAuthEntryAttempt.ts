import { onBeforeUnmount, ref } from 'vue'
import { subscribeAuthSessionScope } from '@/services/authSessionScope'
import type { AuthFlowResult } from '@/stores/auth'

export function isCancelledAuthResult(result: AuthFlowResult) {
  return result.status === 'error' && result.code === 'auth_flow_cancelled'
}

export function useAuthEntryAttempt(onSessionChange?: () => void) {
  const busy = ref(false)
  let disposed = false
  let current: { controller: AbortController; stop: () => void } | null = null
  function cancel() {
    const previous = current
    current = null
    previous?.controller.abort()
    previous?.stop()
    busy.value = false
  }
  function begin(initialBusy = true) {
    if (disposed) return null
    cancel()
    const attempt = { controller: new AbortController(), stop: () => {} }
    current = attempt
    busy.value = initialBusy
    const isCurrent = () => current === attempt && !attempt.controller.signal.aborted
    const observeSession = () => {
      attempt.stop()
      if (isCurrent())
        attempt.stop = subscribeAuthSessionScope(() => {
          if (!isCurrent()) return
          cancel()
          onSessionChange?.()
        })
    }
    observeSession()
    return {
      signal: attempt.controller.signal,
      isCurrent,
      observeSession,
      handoffToStore: () => attempt.stop(),
      setBusy(value: boolean) {
        if (isCurrent()) busy.value = value
      },
      dispose() {
        attempt.stop()
        if (current === attempt) {
          current = null
          busy.value = false
        }
      },
    }
  }
  onBeforeUnmount(() => {
    disposed = true
    cancel()
  })
  return { busy, begin, cancel }
}
