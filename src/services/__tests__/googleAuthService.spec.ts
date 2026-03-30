import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearPendingGoogleAuthRequest,
  getPendingGoogleAuthRequest,
  openGoogleAuthPopup,
  prefersGoogleAuthPopup,
  startGoogleAuthRedirect,
  waitForGooglePopupResult,
} from '../googleAuthService'

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

  it('opens Google auth through the site proxy instead of the API origin', () => {
    const popup = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
    } as unknown as Window

    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup)

    openGoogleAuthPopup('login', '/schedule')

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `^${window.location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/auth/google/start\\?`
        )
      ),
      'momi-google-auth',
      expect.any(String)
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

    const pending = waitForGooglePopupResult(popup)

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'google-auth-result',
          status: 'success',
          handoffCode: 'handoff-123',
          intent: 'login',
        },
      })
    )

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        status: 'success',
        handoffCode: 'handoff-123',
      })
    )
  })

  it('ignores foreign-origin messages and settles when the popup closes', async () => {
    const popup = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
    } as { closed: boolean; close: () => void; focus: () => void }

    const pending = waitForGooglePopupResult(popup as unknown as Window)

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: {
          type: 'google-auth-result',
          status: 'success',
          handoffCode: 'should-be-ignored',
        },
      })
    )

    popup.closed = true
    vi.advanceTimersByTime(400)

    await expect(pending.promise).resolves.toEqual(
      expect.objectContaining({
        type: 'google-auth-result',
        status: 'error',
        error: 'popup_closed',
      })
    )
  })
})
