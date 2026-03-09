import { readonly, ref } from 'vue'

const isOpen = ref(false)
const turnstileSiteKey = ref('')

let currentPromise: Promise<boolean> | null = null
let settleCurrent: ((value: boolean) => void) | null = null

function cleanupChallengeState() {
  isOpen.value = false
  currentPromise = null
  settleCurrent = null
}

export const clientChallengeState = {
  isOpen: readonly(isOpen),
  turnstileSiteKey: readonly(turnstileSiteKey),
}

export function setClientChallengeSiteKey(siteKey?: string | null) {
  if (typeof siteKey !== 'string') return
  const normalized = siteKey.trim()
  if (!normalized) return
  turnstileSiteKey.value = normalized
}

export function requestClientChallenge(siteKey?: string | null): Promise<boolean> {
  setClientChallengeSiteKey(siteKey)
  isOpen.value = true

  if (!currentPromise) {
    currentPromise = new Promise<boolean>((resolve) => {
      settleCurrent = resolve
    })
  }

  return currentPromise
}

export function resolveClientChallenge() {
  settleCurrent?.(true)
  cleanupChallengeState()
}

export function dismissClientChallenge() {
  settleCurrent?.(false)
  cleanupChallengeState()
}
