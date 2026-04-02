import { describe, expect, it } from 'vitest'

import { APP_UPDATE_IDLE_WINDOW_MS, createAppUpdatePolicySnapshot } from '../policy'

describe('app update policy', () => {
  it('allows auto activation and auto reload for idle auto pages', () => {
    const snapshot = createAppUpdatePolicySnapshot({
      routeMode: 'auto',
      strategy: 'public-idle-refresh',
      documentVisible: true,
      documentFocused: true,
      hasEditableFocus: false,
      hasActiveBlockers: false,
      millisecondsSinceLastInteraction: APP_UPDATE_IDLE_WINDOW_MS,
    })

    expect(snapshot.shouldAutoActivate).toBe(true)
    expect(snapshot.canAutoReload).toBe(true)
    expect(snapshot.reason).toBe('auto-ready')
  })

  it('downgrades to prompt when blockers are active', () => {
    const snapshot = createAppUpdatePolicySnapshot({
      routeMode: 'auto',
      strategy: 'public-idle-refresh',
      documentVisible: true,
      documentFocused: true,
      hasEditableFocus: false,
      hasActiveBlockers: true,
      blockerIds: ['discussion-composer:create'],
      millisecondsSinceLastInteraction: APP_UPDATE_IDLE_WINDOW_MS,
    })

    expect(snapshot.shouldAutoActivate).toBe(false)
    expect(snapshot.shouldPrompt).toBe(true)
    expect(snapshot.reason).toBe('active-blockers')
    expect(snapshot.blockerIds).toEqual(['discussion-composer:create'])
  })

  it('forces prompt mode when the user chooses prompt-only', () => {
    const snapshot = createAppUpdatePolicySnapshot({
      routeMode: 'auto',
      strategy: 'prompt-only',
      documentVisible: true,
      documentFocused: true,
      hasEditableFocus: false,
      hasActiveBlockers: false,
      millisecondsSinceLastInteraction: APP_UPDATE_IDLE_WINDOW_MS * 2,
    })

    expect(snapshot.shouldAutoActivate).toBe(false)
    expect(snapshot.canAutoReload).toBe(false)
    expect(snapshot.reason).toBe('strategy-prompt-only')
  })
})
