function base64UrlToUint8Array(value: string): Uint8Array {
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

  return {
    publicKey: {
      ...options,
      challenge: base64UrlToUint8Array(options.challenge),
      user: {
        ...options.user,
        id: base64UrlToUint8Array(options.user.id),
      },
      excludeCredentials: options.excludeCredentials?.map((item) => ({
        ...item,
        id: base64UrlToUint8Array(item.id),
      })),
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

  return {
    publicKey: {
      ...options,
      challenge: base64UrlToUint8Array(options.challenge),
      allowCredentials: options.allowCredentials?.map((item) => ({
        ...item,
        id: base64UrlToUint8Array(item.id),
      })),
    },
  }
}

function serializeCredentialFallback(credential: PublicKeyCredential): PublicKeyCredentialJSON {
  const response = credential.response

  if (response instanceof AuthenticatorAttestationResponse) {
    return {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
        attestationObject: arrayBufferToBase64Url(response.attestationObject),
        transports:
          typeof response.getTransports === 'function' ? response.getTransports() : undefined,
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

export async function createWebAuthnCredential(
  options: PublicKeyCredentialCreationOptionsJSON
): Promise<Credential | null> {
  return navigator.credentials.create(mapCreationOptions(options))
}

export async function getWebAuthnAssertion(
  options: PublicKeyCredentialRequestOptionsJSON
): Promise<Credential | null> {
  return navigator.credentials.get(mapRequestOptions(options))
}

export function serializePublicKeyCredential(
  credential: PublicKeyCredential
): PublicKeyCredentialJSON {
  if (typeof credential.toJSON === 'function') {
    return credential.toJSON()
  }

  return serializeCredentialFallback(credential)
}
