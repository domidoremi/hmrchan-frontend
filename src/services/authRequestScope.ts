import type { Ref } from 'vue'
import { subscribeAuthSessionScope } from './authSessionScope'

export function createAuthRequestScope({
  isLoading,
  error,
}: {
  isLoading: Ref<boolean>
  error: Ref<string | null>
}) {
  let activeAuthRequest: AbortController | null = null

  function startAuthRequest(externalSignal?: AbortSignal, background = false) {
    const controller = new AbortController()
    if (!background) {
      activeAuthRequest = controller
      isLoading.value = true
      error.value = null
    }
    let stopSessionObservation = () => {}
    const cancel = () => {
      controller.abort()
      stopSessionObservation()
      externalSignal?.removeEventListener('abort', cancel)
      if (activeAuthRequest === controller) {
        activeAuthRequest = null
        isLoading.value = false
      }
    }
    externalSignal?.addEventListener('abort', cancel, { once: true })
    stopSessionObservation = subscribeAuthSessionScope(cancel)
    return {
      signal: controller.signal,
      isCurrent: () =>
        (background || activeAuthRequest === controller) && !controller.signal.aborted,
      acceptResponse<T>(accept: () => T): T {
        // Establishing this session changes the scope synchronously. Observe later
        // transitions again while the accepted session hydrates its user details.
        stopSessionObservation()
        try {
          return accept()
        } finally {
          if (activeAuthRequest === controller && !controller.signal.aborted) {
            stopSessionObservation = subscribeAuthSessionScope(cancel)
          }
        }
      },
      dispose() {
        stopSessionObservation()
        externalSignal?.removeEventListener('abort', cancel)
        if (activeAuthRequest === controller) {
          activeAuthRequest = null
          isLoading.value = false
        }
      },
    }
  }

  return startAuthRequest
}
