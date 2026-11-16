import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createWebAuthnCredential,
  getWebAuthnAssertion,
  isConditionalMediationAvailable,
} from '../webauthn'

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

  it.each([true, false])(
    'passes creation cancellation through the native parser=%s',
    async (native) => {
      const create = vi.fn(async () => null)
      Object.defineProperty(navigator, 'credentials', { value: { create }, configurable: true })
      installPublicKeyCredential({
        parseCreationOptionsFromJSON: native ? vi.fn((options: unknown) => options) : undefined,
      })
      const controller = new AbortController()
      const options = {
        challenge: 'AQI',
        rp: { name: 'Site' },
        user: { id: 'AwQ', name: 'user', displayName: 'User' },
        pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
      }
      await createWebAuthnCredential(options, { signal: controller.signal })
      expect(create).toHaveBeenCalledExactlyOnceWith({
        signal: controller.signal,
        publicKey: native
          ? options
          : {
              ...options,
              challenge: new Uint8Array([1, 2]),
              user: { ...options.user, id: new Uint8Array([3, 4]) },
            },
      })
      controller.abort()
      await expect(
        createWebAuthnCredential(options, { signal: controller.signal })
      ).rejects.toMatchObject({ name: 'AbortError' })
      expect(create).toHaveBeenCalledOnce()
    }
  )

  it('decodes credential IDs and challenges without native JSON parsers', async () => {
    const get = installCredentialsGet()
    installPublicKeyCredential({ parseRequestOptionsFromJSON: undefined })
    await getWebAuthnAssertion({
      challenge: 'AQI',
      allowCredentials: [{ type: 'public-key', id: 'AwQ', transports: ['internal', 'future'] }],
    })
    expect(get).toHaveBeenCalledWith({
      publicKey: {
        challenge: new Uint8Array([1, 2]),
        allowCredentials: [
          { type: 'public-key', id: new Uint8Array([3, 4]), transports: ['internal'] },
        ],
      },
    })
  })

  it('omits absent optional credential lists in legacy browsers', async () => {
    const get = installCredentialsGet()
    installPublicKeyCredential({ parseRequestOptionsFromJSON: undefined })
    await getWebAuthnAssertion({ challenge: 'AQI' })
    expect(get).toHaveBeenCalledWith({ publicKey: { challenge: new Uint8Array([1, 2]) } })
  })

  it('rejects invalid credential types before calling the browser', async () => {
    const get = installCredentialsGet()
    installPublicKeyCredential({ parseRequestOptionsFromJSON: undefined })
    await expect(
      getWebAuthnAssertion({
        challenge: 'AQI',
        allowCredentials: [{ type: 'invalid', id: 'AwQ' }],
      })
    ).rejects.toThrow('Unsupported credential type')
    expect(get).not.toHaveBeenCalled()
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
        rpId: 'momichan.com',
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
