import { computed, ref } from 'vue'

import type { useAuthStore } from '@/stores/auth'

type HmrAuthStore = ReturnType<typeof useAuthStore>
export type HmrPasskeyRecoveryStep = 'start' | 'verify'

export function useHmrPasskeyRecoveryFlow(auth: HmrAuthStore) {
  const email = ref('')
  const password = ref('')
  const verificationCode = ref('')
  const recoveryStep = computed<HmrPasskeyRecoveryStep>(() =>
    auth.passkeyRecovery?.id ? 'verify' : 'start'
  )

  function payload() {
    return {
      email: email.value,
      password: password.value,
      verificationCode: verificationCode.value,
    }
  }

  async function submit(): Promise<void> {
    if (recoveryStep.value === 'start') {
      await auth.startPasskeyRecovery(payload())
      return
    }

    await auth.verifyPasskeyRecovery(payload())
  }

  async function pollStatus(): Promise<void> {
    await auth.pollPasskeyRecoveryStatus()
  }

  return {
    email,
    password,
    pollStatus,
    recoveryStep,
    submit,
    verificationCode,
  }
}
