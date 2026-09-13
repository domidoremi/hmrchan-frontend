function base64UrlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function isAuthenticatorTransport(value: string): value is AuthenticatorTransport {
  return ['ble', 'hybrid', 'internal', 'nfc', 'usb'].includes(value)
}

function mapCredentialDescriptor(
  descriptor: PublicKeyCredentialDescriptorJSON
): PublicKeyCredentialDescriptor {
  if (descriptor.type !== 'public-key') throw new TypeError('Unsupported credential type')
  return {
    type: descriptor.type,
    id: base64UrlToUint8Array(descriptor.id),
    ...(descriptor.transports === undefined
      ? {}
      : { transports: descriptor.transports.filter(isAuthenticatorTransport) }),
  }
}

// Legacy browsers without toJSON() expose the original binary extension results
// and may not implement the newer attestation metadata methods.
type LegacyCredentialJSON = {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    attestationObject?: string
    transports?: string[]
    authenticatorData?: string
    signature?: string
    userHandle?: string | null
  }
  clientExtensionResults: AuthenticationExtensionsClientOutputs
}

export type SerializedPublicKeyCredential =
  | RegistrationResponseJSON
  | AuthenticationResponseJSON
  | LegacyCredentialJSON

function mapPrfValues(
  values: AuthenticationExtensionsPRFValuesJSON
): AuthenticationExtensionsPRFValues {
  return {
    first: base64UrlToUint8Array(values.first),
    ...(values.second === undefined ? {} : { second: base64UrlToUint8Array(values.second) }),
  }
}

function mapExtensions(
  extensions: AuthenticationExtensionsClientInputsJSON
): AuthenticationExtensionsClientInputs {
  const { largeBlob, prf, ...rest } = extensions
  const { write, ...blobOptions } = largeBlob ?? {}
  return {
    ...rest,
    ...(largeBlob === undefined
      ? {}
      : {
          largeBlob: {
            ...blobOptions,
            ...(write === undefined ? {} : { write: base64UrlToUint8Array(write) }),
          },
        }),
    ...(prf === undefined
      ? {}
      : {
          prf: {
            ...(prf.eval === undefined ? {} : { eval: mapPrfValues(prf.eval) }),
            ...(prf.evalByCredential === undefined
              ? {}
              : {
                  evalByCredential: Object.fromEntries(
                    Object.entries(prf.evalByCredential).map(([id, values]) => [
                      id,
                      mapPrfValues(values),
                    ])
                  ),
                }),
          },
        }),
  }
}

function mapCreationOptions(
  options: PublicKeyCredentialCreationOptionsJSON
): CredentialCreationOptions {
  if (
    typeof PublicKeyCredential !== 'undefined' &&
    typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function'
  ) {
    return {
      publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
    }
  }

  const { excludeCredentials, attestation, extensions, ...creationOptions } = options
  if (
    attestation !== undefined &&
    attestation !== 'none' &&
    attestation !== 'indirect' &&
    attestation !== 'direct' &&
    attestation !== 'enterprise'
  ) {
    throw new TypeError('Unsupported attestation preference')
  }
  return {
    publicKey: {
      ...creationOptions,
      ...(attestation === undefined ? {} : { attestation }),
      ...(extensions === undefined ? {} : { extensions: mapExtensions(extensions) }),
      challenge: base64UrlToUint8Array(options.challenge),
      user: {
        ...options.user,
        id: base64UrlToUint8Array(options.user.id),
      },
      ...(excludeCredentials === undefined
        ? {}
        : { excludeCredentials: excludeCredentials.map(mapCredentialDescriptor) }),
    },
  }
}

function mapRequestOptions(
  options: PublicKeyCredentialRequestOptionsJSON
): CredentialRequestOptions {
  if (
    typeof PublicKeyCredential !== 'undefined' &&
    typeof PublicKeyCredential.parseRequestOptionsFromJSON === 'function'
  ) {
    return {
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
    }
  }

  const { allowCredentials, userVerification, extensions, ...requestOptions } = options
  if (
    userVerification !== undefined &&
    userVerification !== 'required' &&
    userVerification !== 'preferred' &&
    userVerification !== 'discouraged'
  ) {
    throw new TypeError('Unsupported user verification requirement')
  }
  return {
    publicKey: {
      ...requestOptions,
      ...(userVerification === undefined ? {} : { userVerification }),
      ...(extensions === undefined ? {} : { extensions: mapExtensions(extensions) }),
      challenge: base64UrlToUint8Array(options.challenge),
      ...(allowCredentials === undefined
        ? {}
        : { allowCredentials: allowCredentials.map(mapCredentialDescriptor) }),
    },
  }
}

type WebAuthnAssertionRequestOptions = {
  conditional?: boolean
  signal?: AbortSignal
}

function serializeCredentialFallback(
  credential: PublicKeyCredential
): SerializedPublicKeyCredential {
  const response = credential.response

  if (response instanceof AuthenticatorAttestationResponse) {
    return {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
        attestationObject: arrayBufferToBase64Url(response.attestationObject),
        ...(typeof response.getTransports === 'function'
          ? { transports: response.getTransports() }
          : {}),
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    }
  }

  const assertion = response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: arrayBufferToBase64Url(assertion.clientDataJSON),
      authenticatorData: arrayBufferToBase64Url(assertion.authenticatorData),
      signature: arrayBufferToBase64Url(assertion.signature),
      userHandle: assertion.userHandle ? arrayBufferToBase64Url(assertion.userHandle) : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  }
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials
}

export async function isConditionalMediationAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false
  }

  const credentialConstructor = window.PublicKeyCredential as typeof PublicKeyCredential & {
    isConditionalMediationAvailable?: () => Promise<boolean>
  }
  if (typeof credentialConstructor.isConditionalMediationAvailable !== 'function') {
    return false
  }

  try {
    return await credentialConstructor.isConditionalMediationAvailable()
  } catch {
    return false
  }
}

export async function createWebAuthnCredential(
  options: PublicKeyCredentialCreationOptionsJSON
): Promise<Credential | null> {
  return navigator.credentials.create(mapCreationOptions(options))
}

export async function getWebAuthnAssertion(
  options: PublicKeyCredentialRequestOptionsJSON,
  requestOptions: WebAuthnAssertionRequestOptions = {}
): Promise<Credential | null> {
  const mappedOptions = mapRequestOptions(options) as CredentialRequestOptions & {
    mediation?: CredentialMediationRequirement | 'conditional'
    signal?: AbortSignal
  }
  if (requestOptions.conditional) {
    mappedOptions.mediation = 'conditional'
  }
  if (requestOptions.signal) {
    mappedOptions.signal = requestOptions.signal
  }
  return navigator.credentials.get(mappedOptions)
}

export function serializePublicKeyCredential(
  credential: PublicKeyCredential
): SerializedPublicKeyCredential {
  if (typeof credential.toJSON === 'function') {
    return credential.toJSON()
  }

  return serializeCredentialFallback(credential)
}
