import { beforeEach, describe, expect, it, vi } from 'vitest'

async function importBridge() {
  return import('@/api/clientChallengeBridge')
}

describe('clientChallengeBridge', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('opens a challenge and normalizes a non-empty site key', async () => {
    const { clientChallengeState, requestClientChallenge } = await importBridge()

    void requestClientChallenge('  site-key-1  ')

    expect(clientChallengeState.isOpen.value).toBe(true)
    expect(clientChallengeState.turnstileSiteKey.value).toBe('site-key-1')
  })

  it('keeps the previous site key when the next value is empty or not a string', async () => {
    const { clientChallengeState, setClientChallengeSiteKey } = await importBridge()

    setClientChallengeSiteKey('site-key-1')
    setClientChallengeSiteKey('')
    setClientChallengeSiteKey(null)

    expect(clientChallengeState.turnstileSiteKey.value).toBe('site-key-1')
  })

  it('reuses one pending promise until the challenge settles', async () => {
    const { requestClientChallenge, resolveClientChallenge } = await importBridge()

    const first = requestClientChallenge('site-key-1')
    const second = requestClientChallenge('site-key-2')
    resolveClientChallenge()

    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
    expect(first).toBe(second)
  })

  it('cleans up open state after resolve and allows a later challenge', async () => {
    const { clientChallengeState, requestClientChallenge, resolveClientChallenge } =
      await importBridge()

    const first = requestClientChallenge('site-key-1')
    resolveClientChallenge()
    await expect(first).resolves.toBe(true)

    expect(clientChallengeState.isOpen.value).toBe(false)

    const second = requestClientChallenge('site-key-2')

    expect(clientChallengeState.isOpen.value).toBe(true)
    expect(clientChallengeState.turnstileSiteKey.value).toBe('site-key-2')
    expect(second).not.toBe(first)
  })

  it('resolves false when the challenge is dismissed', async () => {
    const { clientChallengeState, dismissClientChallenge, requestClientChallenge } =
      await importBridge()

    const pending = requestClientChallenge('site-key-1')
    dismissClientChallenge()

    await expect(pending).resolves.toBe(false)
    expect(clientChallengeState.isOpen.value).toBe(false)
  })
})
