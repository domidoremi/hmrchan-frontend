import { afterEach, describe, expect, it, vi } from 'vitest'

import { getWebAuthnAssertion, isConditionalMediationAvailable } from '../webauthn'

function installPublicKeyCredential(overrides: Record<string, unknown> = {}) {
  const credentialConstructor = {
    parseRequestOptionsFromJSON: vi.fn((options: unknown) => options),
    ...overrides,
  }
  Object.defineProperty(window, 'PublicKeyCredential', {
    value: credentialConstructor,
    configurable: true,
  })
  vi.stubGlobal('PublicKeyCredential', credentialConstructor)
  return credentialConstructor
}

function installCredentialsGet() {
  const get = vi.fn(async () => null)
  Object.defineProperty(navigator, 'credentials', {
    value: { get },
    configurable: true,
  })
  return get
}

describe('webauthn utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports conditional mediation as unavailable when the browser API is missing', async () => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: undefined,
      configurable: true,
    })

    await expect(isConditionalMediationAvailable()).resolves.toBe(false)
  })

  it('reports conditional mediation availability from PublicKeyCredential', async () => {
    installCredentialsGet()
    installPublicKeyCredential({
      isConditionalMediationAvailable: vi.fn(async () => true),
    })

    await expect(isConditionalMediationAvailable()).resolves.toBe(true)
  })

  it('passes conditional mediation and abort signals into navigator.credentials.get', async () => {
    const get = installCredentialsGet()
    installPublicKeyCredential()
    const abortController = new AbortController()

    await getWebAuthnAssertion(
      {
        challenge: 'challenge',
        rpId: 'momichan.xyz',
      },
      {
        conditional: true,
        signal: abortController.signal,
      }
    )

    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({
        mediation: 'conditional',
        signal: abortController.signal,
      })
    )
  })
})
