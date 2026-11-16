import { onBeforeUnmount, ref } from 'vue'
import { subscribeAuthSessionScope } from '@/services/authSessionScope'

export type PasskeyKind = 'passwordless' | 'risk' | 'conditional'

export function useLoginPasskeyAttempt() {
  const busy = ref(false)
  let disposed = false
  let current: {
    kind: PasskeyKind
    controller: AbortController
    stopSessionObservation: () => void
  } | null = null

  function cancel() {
    const attempt = current
    current = null
    attempt?.controller.abort()
    attempt?.stopSessionObservation()
    busy.value = false
  }

  function begin(kind: PasskeyKind) {
    if (disposed) return null
    cancel()
    const attempt = { kind, controller: new AbortController(), stopSessionObservation: () => {} }
    current = attempt
    busy.value = kind !== 'conditional'
    const isCurrent = () => current === attempt && !attempt.controller.signal.aborted
    attempt.stopSessionObservation = subscribeAuthSessionScope(() => {
      if (isCurrent()) cancel()
    })
    return {
      signal: attempt.controller.signal,
      isCurrent,
      handoffToStore: attempt.stopSessionObservation,
      dispose() {
        attempt.stopSessionObservation()
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

  return {
    busy,
    begin,
    cancel,
    stopConditional() {
      if (current?.kind === 'conditional') cancel()
    },
  }
}
