import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  bridgeGooglePopupResult,
  clearPendingGoogleAuthRequest,
  getPendingGoogleAuthRequest,
  openGoogleAuthPopup,
  openGoogleAuthPopupFlow,
  prefersGoogleAuthPopup,
  publishGooglePopupResult,
  resolveGooglePopupBridgeMessage,
  startGoogleAuthRedirect,
  waitForGooglePopupResult,
} from '../googleAuthService'

const GOOGLE_POPUP_RELAY_STORAGE_KEY = '__momi_google_auth_popup_result__'

class FakeBroadcastChannel {
  private static listeners = new Map<string, Set<(event: MessageEvent<unknown>) => void>>()
  readonly name: string

  constructor(name: string) {
    this.name = name
    if (!FakeBroadcastChannel.listeners.has(name)) {
      FakeBroadcastChannel.listeners.set(name, new Set())
    }
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void) {
    FakeBroadcastChannel.listeners.get(this.name)?.add(listener)
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void) {
    FakeBroadcastChannel.listeners.get(this.name)?.delete(listener)
  }

  postMessage(data: unknown) {
    for (const listener of FakeBroadcastChannel.listeners.get(this.name) ?? []) {
      listener(new MessageEvent('message', { data }))
    }
  }

  close() {}

  static reset() {
    FakeBroadcastChannel.listeners.clear()
  }
}

describe('googleAuthService', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
  })

  afterEach(() => {
    clearPendingGoogleAuthRequest()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    FakeBroadcastChannel.reset()
  })

  it('stores pending auth state before redirecting', () => {
    try {
      startGoogleAuthRedirect('login', '/profile/settings')
    } catch {
      // jsdom does not implement navigation; the pending request should still be persisted
    }

    expect(getPendingGoogleAuthRequest()).toEqual(
      expect.objectContaining({
        intent: 'login',
        redirectTo: '/profile/settings',
      })
    )
  })

  it('returns blocked when the popup cannot be opened', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)

    const result = openGoogleAuthPopup('register', '/')

    expect(result).toEqual({ status: 'blocked' })
  })

  it('builds a popup bridge message from raw query params on any popup route', () => {
    const message = resolveGooglePopupBridgeMessage({
      search: '?handoff_code=handoff-any-route',
      pendingRequest: {
        requestId: 'popup-request-1',
        mode: 'popup',
        intent: 'login',
        redirectTo: '/profile',
        createdAt: Date.now(),
      },
    })

    expect(message).toEqual({
      type: 'google-auth-result',
      requestId: 'popup-request-1',
      status: 'success',
      handoffCode: 'handoff-any-route',
      redirectTo: '/profile',
      intent: 'login',
    })
  })

  it('bridges popup results before app mount when the popup lands on the wrong route', () => {
    const postMessage = vi.fn()

    const bridge = bridgeGooglePopupResult({
      search: '?error=access_denied',
      opener: { postMessage } as unknown as Window,
      pendingRequest: {
        requestId: 'popup-request-2',
        mode: 'popup',
        intent: 'register',
        redirectTo: '/welcome',
        createdAt: Date.now(),
      },
    })

    expect(bridge).toEqual({
      handled: true,
      message: {
        type: 'google-auth-result',
        requestId: 'popup-request-2',
        status: 'error',
        error: 'access_denied',
        redirectTo: '/welcome',
        intent: 'register',
      },
    })
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'popup-request-2',
        status: 'error',
        error: 'access_denied',
      }),
      window.location.origin
    )
  })

  it('opens Google auth through the site proxy instead of the API origin', () => {
    const popup = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window

    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup)

    const result = openGoogleAuthPopup('login', '/schedule')

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `^${window.location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/v1/auth/google/start\\?`
        )
      ),
      expect.stringMatching(/^momi-google-auth:/),
      expect.any(String)
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'opened',
        requestId: expect.any(String),
      })
    )
  })

  it('arms popup listeners before opening the popup so fast callbacks are not lost', async () => {
    const popup = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window

    vi.spyOn(window, 'open').mockImplementation(() => {
      const requestId = getPendingGoogleAuthRequest()?.requestId

      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: {
            type: 'google-auth-result',
            requestId,
            status: 'success',
            handoffCode: 'handoff-fast-return',
          },
        })
      )

      return popup
    })

    const result = openGoogleAuthPopupFlow('login', '/library')

    expect(result.status).toBe('opened')
    if (result.status !== 'opened') {
      return
    }

    await expect(result.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        status: 'success',
        handoffCode: 'handoff-fast-return',
      })
    )
  })

  it('prefers popup on desktop-like environments', () => {
    expect(prefersGoogleAuthPopup()).toBe(true)
  })

  it('resolves secure popup success messages', async () => {
    const popup = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window

    const pending = waitForGooglePopupResult(popup, { requestId: 'request-1' })

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'google-auth-result',
          requestId: 'request-1',
          status: 'success',
          handoffCode: 'handoff-123',
          intent: 'login',
        },
      })
    )

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'request-1',
        status: 'success',
        handoffCode: 'handoff-123',
      })
    )
  })

  it('accepts popup bridge messages from the configured frontend origin in dev', async () => {
    vi.stubEnv('VITE_FRONTEND_ORIGIN', 'http://127.0.0.1:4173')

    const popup = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window

    const pending = waitForGooglePopupResult(popup, { requestId: 'request-dev' })

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://127.0.0.1:4173',
        data: {
          type: 'google-auth-result',
          requestId: 'request-dev',
          status: 'success',
          handoffCode: 'handoff-dev-origin',
        },
      })
    )

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'request-dev',
        status: 'success',
        handoffCode: 'handoff-dev-origin',
      })
    )
  })

  it('resolves popup results from the relay BroadcastChannel when opener messaging is unavailable', async () => {
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel as unknown as typeof BroadcastChannel)

    const popup = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window

    const pending = waitForGooglePopupResult(popup, { requestId: 'relay-request' })

    publishGooglePopupResult({
      type: 'google-auth-result',
      requestId: 'relay-request',
      status: 'success',
      handoffCode: 'relay-handoff',
    })

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'relay-request',
        status: 'success',
        handoffCode: 'relay-handoff',
      })
    )
  })

  it('replays the latest stored popup relay result for late subscribers', async () => {
    const popup = {
      close: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window

    publishGooglePopupResult({
      type: 'google-auth-result',
      requestId: 'stored-request',
      status: 'success',
      handoffCode: 'stored-handoff',
    })

    const pending = waitForGooglePopupResult(popup, { requestId: 'stored-request' })

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'stored-request',
        status: 'success',
        handoffCode: 'stored-handoff',
      })
    )
  })

  it('ignores relay messages for a different popup request id', async () => {
    const popup = {
      close: vi.fn(),
      focus: vi.fn(),
    } as { close: () => void; focus: () => void }

    const pending = waitForGooglePopupResult(popup as unknown as Window, {
      requestId: 'expected-request',
      timeoutMs: 10_000,
    })

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: GOOGLE_POPUP_RELAY_STORAGE_KEY,
        newValue: JSON.stringify({
          id: 'relay-1',
          payload: {
            type: 'google-auth-result',
            requestId: 'other-request',
            status: 'success',
            handoffCode: 'ignored-handoff',
          },
        }),
      })
    )

    vi.advanceTimersByTime(10_000)

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'expected-request',
        status: 'error',
        error: 'popup_closed',
      })
    )
  })

  it('ignores foreign-origin messages and settles when the popup times out', async () => {
    const popup = {
      close: vi.fn(),
      focus: vi.fn(),
    } as { close: () => void; focus: () => void }

    const pending = waitForGooglePopupResult(popup as unknown as Window, {
      requestId: 'close-request',
      timeoutMs: 10_000,
    })

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: {
          type: 'google-auth-result',
          requestId: 'close-request',
          status: 'success',
          handoffCode: 'should-be-ignored',
        },
      })
    )

    vi.advanceTimersByTime(10_000)

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'close-request',
        status: 'error',
        error: 'popup_closed',
      })
    )
    expect(popup.close).toHaveBeenCalled()
  })

  it('settles when the popup is manually closed before timeout', async () => {
    vi.useFakeTimers()

    const popup = {
      close: vi.fn(),
      focus: vi.fn(),
      closed: false,
    } as { close: () => void; focus: () => void; closed: boolean }

    const pending = waitForGooglePopupResult(popup as unknown as Window, {
      requestId: 'manual-close-request',
      timeoutMs: 10_000,
    })

    popup.closed = true
    vi.advanceTimersByTime(500)

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        requestId: 'manual-close-request',
        status: 'error',
        error: 'popup_closed',
      })
    )
    expect(popup.close).not.toHaveBeenCalled()
  })
})
