import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import {
  resolveGoogleAuthSecurityError,
  type GooglePopupFlowResult,
  type GooglePopupMessage,
  type GooglePopupState,
} from '@/services/googleAuthService'
import type { TurnstileWidgetStatus } from '@/utils/turnstileWidgetStatus'
import { useAuthEntryAttempt } from './useAuthEntryAttempt'

export function useGooglePopupState(
  widget: Readonly<Ref<{ reset: () => void } | null>>,
  query: () => unknown
) {
  const googlePopupState = ref<GooglePopupState>('idle')
  const googlePopupErrorKey = ref('')
  const pendingGoogleHandoffCode = ref('')
  const googleClientChallengeSiteKey = ref('')
  const googleClientChallengeError = ref('')
  const googleClientChallengeDetail = ref('')
  const googleClientChallengeStatus = ref<TurnstileWidgetStatus>('idle')
  const isGoogleClientChallengeSubmitting = ref(false)
  const requests = useAuthEntryAttempt(() => resetGooglePopupState())
  let attempt: ReturnType<typeof requests.begin> = null
  let popup: Window | null = null
  let stopPopup: (() => void) | null = null

  function resetGoogleClientChallengeState() {
    pendingGoogleHandoffCode.value = ''
    googleClientChallengeSiteKey.value = ''
    googleClientChallengeError.value = ''
    googleClientChallengeDetail.value = ''
    isGoogleClientChallengeSubmitting.value = false
    googleClientChallengeStatus.value = 'idle'
    widget.value?.reset()
  }
  function setGooglePopupStatus(state: GooglePopupState, errorKey = '') {
    googlePopupState.value = state
    googlePopupErrorKey.value = errorKey
  }
  function clearGooglePopupListener(options: { closePopup?: boolean } = {}) {
    requests.cancel()
    attempt = null
    stopPopup?.()
    stopPopup = null
    if (options.closePopup && popup) {
      try {
        if (!popup.closed) popup.close()
      } catch {
        /* A closed or cross-origin window may reject access. */
      }
    }
    popup = null
  }
  function resetGooglePopupState() {
    clearGooglePopupListener({ closePopup: true })
    setGooglePopupStatus('idle')
    resetGoogleClientChallengeState()
  }
  watch(query, resetGooglePopupState, { deep: true, flush: 'sync' })
  onBeforeUnmount(() => clearGooglePopupListener({ closePopup: true }))

  return {
    googlePopupState,
    googlePopupErrorKey,
    pendingGoogleHandoffCode,
    googleClientChallengeSiteKey,
    googleClientChallengeError,
    googleClientChallengeDetail,
    googleClientChallengeStatus,
    googleBusy: requests.busy,
    resetGoogleClientChallengeState,
    setGooglePopupStatus,
    clearGooglePopupListener,
    resetGooglePopupState,
    currentGoogleAttempt: () => (attempt?.isCurrent() ? attempt : null),
    beginGoogleChallenge() {
      if (!attempt?.isCurrent() || isGoogleClientChallengeSubmitting.value) return null
      attempt.setBusy(true)
      isGoogleClientChallengeSubmitting.value = true
      googleClientChallengeError.value = ''
      googleClientChallengeDetail.value = ''
      return attempt
    },
    finishGoogleChallenge(challenge: NonNullable<typeof attempt>) {
      if (!challenge.isCurrent()) return
      isGoogleClientChallengeSubmitting.value = false
      challenge.setBusy(false)
    },
    listenForGooglePopup(
      result: Extract<GooglePopupFlowResult, { status: 'opened' }>,
      handleMessage: (message: GooglePopupMessage) => Promise<void>
    ) {
      const waiting = requests.begin(false)
      if (!waiting) return
      attempt = waiting
      popup = result.popup
      stopPopup = result.dispose
      setGooglePopupStatus('waiting')
      void result.promise.then(async (message) => {
        if (!waiting.isCurrent()) return
        popup = null
        stopPopup = null
        waiting.setBusy(true)
        setGooglePopupStatus('handling')
        try {
          await handleMessage(message)
        } catch (error) {
          if (waiting.isCurrent()) {
            setGooglePopupStatus('error', resolveGoogleAuthSecurityError(error).messageKey)
          }
        } finally {
          waiting.setBusy(false)
        }
      })
    },
  }
}
