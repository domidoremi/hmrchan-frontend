import { describe, expect, it, vi } from 'vitest'
import {
  createAuthSessionOperation,
  subscribeAuthSessionScope,
  transitionAuthSessionScope,
} from '../authSessionScope'

describe('authSessionScope', () => {
  it('aborts and invalidates work captured by the previous principal', () => {
    transitionAuthSessionScope('user-a')
    const operation = createAuthSessionOperation('user-a')

    transitionAuthSessionScope('user-b')

    expect(operation.signal.aborted).toBe(true)
    expect(operation.isCurrent()).toBe(false)
  })

  it('rejects operations whose owner does not match the active principal', () => {
    transitionAuthSessionScope('user-b')

    const operation = createAuthSessionOperation('user-a')

    expect(operation.signal.aborted).toBe(true)
    expect(operation.isCurrent()).toBe(false)
  })

  it('notifies subscribers after the epoch and principal change', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeAuthSessionScope(listener)

    const snapshot = transitionAuthSessionScope('user-c')

    expect(listener).toHaveBeenCalledWith(snapshot)
    unsubscribe()
  })
})
