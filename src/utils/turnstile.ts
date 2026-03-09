export const TURNSTILE_HOSTNAME_MISMATCH_CODE = '110200'

function normalizeTurnstileErrorCode(errorCode: unknown): string | null {
  if (errorCode === null || errorCode === undefined) return null

  const normalized = String(errorCode).trim()
  return normalized.length > 0 ? normalized : null
}

export function extractTurnstileErrorCode(error: unknown): string | null {
  if (typeof error === 'string' || typeof error === 'number') {
    return normalizeTurnstileErrorCode(error)
  }

  if (error instanceof Error) {
    const matchedCode = error.message.match(/\b(\d{6})\b/)
    return matchedCode?.[1] ?? null
  }

  return null
}

export function getTurnstileErrorMessageKey(error: unknown): string {
  return extractTurnstileErrorCode(error) === TURNSTILE_HOSTNAME_MISMATCH_CODE
    ? 'auth.error.turnstileHostnameMismatch'
    : 'auth.error.turnstileFailed'
}
