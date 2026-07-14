import { describe, expect, it, vi } from 'vitest'
import { registerPrivateSessionReset, resetPrivateSessionState } from '../privateSessionState'

describe('privateSessionState', () => {
  it('resets registered private state and allows disposal with the owning store scope', () => {
    const reset = vi.fn()
    const unregister = registerPrivateSessionReset(reset)

    resetPrivateSessionState()
    unregister()
    resetPrivateSessionState()

    expect(reset).toHaveBeenCalledTimes(1)
  })
})
