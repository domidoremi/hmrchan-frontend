import { afterEach, describe, expect, it, vi } from 'vitest'

import { startGoogleAuth } from '@/services/googleAuthService'

function setWindowLocation() {
  const location = { href: 'https://hmr.local/' }
  vi.stubGlobal('window', { location })
  return location
}

describe('googleAuthService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts Google login with the default profile redirect', () => {
    const location = setWindowLocation()

    startGoogleAuth('login')

    expect(location.href).toBe('/api/v1/auth/google/start?intent=login&return_to=%2Fprofile')
  })

  it('normalizes nested auth-entry redirects before starting Google auth', () => {
    const location = setWindowLocation()

    startGoogleAuth('register', '/login?redirect=/settings')

    expect(location.href).toBe('/api/v1/auth/google/start?intent=register&return_to=%2Fsettings')
  })

  it('falls back when the return target is unsafe', () => {
    const location = setWindowLocation()

    startGoogleAuth('login', 'https://evil.example')

    expect(location.href).toBe('/api/v1/auth/google/start?intent=login&return_to=%2Fprofile')
  })

  it('does not require a browser window', () => {
    vi.stubGlobal('window', undefined)

    expect(() => startGoogleAuth('login')).not.toThrow()
  })
})
