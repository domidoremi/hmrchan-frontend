import { readonly, ref } from 'vue'
import { reportClientEvent } from '@/utils/clientReporter'

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
  reportClientEvent(
    'client.challenge.requested',
    { hasSiteKey: Boolean(siteKey?.trim()) },
    { severity: 'warn' }
  )

  if (!currentPromise) {
    currentPromise = new Promise<boolean>((resolve) => {
      settleCurrent = resolve
    })
  }

  return currentPromise
}

export function resolveClientChallenge() {
  reportClientEvent('client.challenge.resolved')
  settleCurrent?.(true)
  cleanupChallengeState()
}

export function dismissClientChallenge() {
  reportClientEvent('client.challenge.dismissed', undefined, { severity: 'warn' })
  settleCurrent?.(false)
  cleanupChallengeState()
}
