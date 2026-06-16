import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppUpdateCoordinator } from '../coordinator'

function configureVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  })
}

describe('app update coordinator', () => {
  beforeEach(() => {
    localStorage.clear()
    configureVisibility('visible')
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('acquires leadership for the visible tab', () => {
    const leadershipChanges = vi.fn()
    const coordinator = new AppUpdateCoordinator({
      onLeadershipChange: leadershipChanges,
    })

    coordinator.start()

    expect(coordinator.isLeader()).toBe(true)
    expect(leadershipChanges).toHaveBeenCalledWith(true)

    coordinator.stop()
  })

  it('processes storage fallback messages when BroadcastChannel is unavailable', () => {
    const onMessage = vi.fn()
    const coordinator = new AppUpdateCoordinator({
      onMessage,
    })

    coordinator.start()

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: '__hmrchan_app_update_message__',
        newValue: JSON.stringify({
          id: 'peer:1',
          payload: {
            type: 'update-available',
            senderTabId: 'peer-tab',
            timestamp: 1,
            scriptUrl: 'https://momichan.com/sw-v2.js',
          },
        }),
      })
    )

    expect(onMessage).toHaveBeenCalledWith({
      type: 'update-available',
      senderTabId: 'peer-tab',
      timestamp: 1,
      scriptUrl: 'https://momichan.com/sw-v2.js',
    })

    coordinator.stop()
  })

  it('drops leadership when another visible tab owns the lease', () => {
    const leadershipChanges = vi.fn()
    const coordinator = new AppUpdateCoordinator({
      onLeadershipChange: leadershipChanges,
    })

    coordinator.start()
    expect(coordinator.isLeader()).toBe(true)

    localStorage.setItem(
      '__hmrchan_app_update_leader__',
      JSON.stringify({
        tabId: 'other-tab',
        expiresAt: Date.now() + 30_000,
      })
    )

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: '__hmrchan_app_update_leader__',
        newValue: localStorage.getItem('__hmrchan_app_update_leader__'),
      })
    )

    expect(coordinator.isLeader()).toBe(false)
    expect(leadershipChanges).toHaveBeenLastCalledWith(false)

    coordinator.stop()
  })
})
