export function withVerificationToken(
  requestMethod: string,
  requestBody: BodyInit | null | undefined,
  requestHeaders: HeadersInit,
  verificationToken: string
): { body: BodyInit | null | undefined; headers: HeadersInit } {
  const nextHeaders = { ...(requestHeaders as Record<string, string>) }
  const normalizedMethod = requestMethod.toUpperCase()

  if (normalizedMethod === 'DELETE' || !requestBody || requestBody instanceof FormData) {
    nextHeaders['X-Verification-Token'] = verificationToken
    return { body: requestBody, headers: nextHeaders }
  }

  if (typeof requestBody === 'string') {
    try {
      const parsed = JSON.parse(requestBody) as Record<string, unknown>
      return {
        body: JSON.stringify({
          ...parsed,
          verification_token: verificationToken,
        }),
        headers: nextHeaders,
      }
    } catch {
      nextHeaders['X-Verification-Token'] = verificationToken
      return { body: requestBody, headers: nextHeaders }
    }
  }

  nextHeaders['X-Verification-Token'] = verificationToken
  return { body: requestBody, headers: nextHeaders }
}

export function extractChallengeSiteKey(errorBody: Record<string, unknown>): string | undefined {
  const directSiteKey = errorBody['turnstile_site_key']
  if (typeof directSiteKey === 'string') return directSiteKey

  const nestedError = errorBody['error']
  if (nestedError && typeof nestedError === 'object') {
    const nestedSiteKey = (nestedError as Record<string, unknown>)['turnstile_site_key']
    if (typeof nestedSiteKey === 'string') return nestedSiteKey
  }

  const nestedData = errorBody['data']
  if (nestedData && typeof nestedData === 'object') {
    const nestedSiteKey = (nestedData as Record<string, unknown>)['turnstile_site_key']
    if (typeof nestedSiteKey === 'string') return nestedSiteKey
  }

  return undefined
}

export function isAccessRestrictedMessage(errorMessage?: string): boolean {
  return (
    typeof errorMessage === 'string' &&
    errorMessage.toLowerCase().includes('access temporarily restricted')
  )
}
