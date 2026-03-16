export const TURNSTILE_HOSTNAME_MISMATCH_CODE = '110200'
const TURNSTILE_RETRYABLE_ERROR_PREFIX = '600'
const TURNSTILE_REQUIRED_CODES = new Set(['CHALLENGE_REQUIRED', 'TURNSTILE_REQUIRED'])

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

function normalizeErrorText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!value || typeof value !== 'object') return ''

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function isRetryableTurnstileError(error: unknown): boolean {
  const code = extractTurnstileErrorCode(error)
  return typeof code === 'string' && code.startsWith(TURNSTILE_RETRYABLE_ERROR_PREFIX)
}

export function isTurnstileRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const apiError = error as {
    status?: unknown
    code?: unknown
    message?: unknown
    details?: unknown
  }

  const code = normalizeErrorText(apiError.code).trim().toUpperCase()
  if (TURNSTILE_REQUIRED_CODES.has(code)) {
    return true
  }

  const status = Number(apiError.status ?? 0)
  const detailsText = normalizeErrorText(apiError.details).toLowerCase()
  const message = `${normalizeErrorText(apiError.message)} ${detailsText}`.toLowerCase()

  return (
    status === 403 &&
    (message.includes('challenge required') ||
      message.includes('human verification') ||
      message.includes('turnstile') ||
      message.includes('verification required'))
  )
}

export function getTurnstileErrorMessageKey(error: unknown): string {
  return extractTurnstileErrorCode(error) === TURNSTILE_HOSTNAME_MISMATCH_CODE
    ? 'auth.error.turnstileHostnameMismatch'
    : 'auth.error.turnstileFailed'
}
