export const TURNSTILE_HOSTNAME_MISMATCH_CODE = '110200'
const TURNSTILE_RETRYABLE_ERROR_PREFIX = '600'
const TURNSTILE_REQUIRED_CODES = new Set(['CHALLENGE_REQUIRED', 'TURNSTILE_REQUIRED'])

export type TurnstileErrorKind =
  | 'hostname-mismatch'
  | 'script-load'
  | 'token-rejected'
  | 'browser-support'
  | 'challenge-required'
  | 'unknown'

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

export function classifyTurnstileError(error: unknown): TurnstileErrorKind {
  const code = extractTurnstileErrorCode(error)
  const message = normalizeErrorText(error instanceof Error ? error.message : error).toLowerCase()

  if (code === TURNSTILE_HOSTNAME_MISMATCH_CODE) {
    return 'hostname-mismatch'
  }

  if (
    message.includes('failed to load turnstile script') ||
    message.includes('api is unavailable') ||
    message.includes('networkerror') ||
    message.includes('network error')
  ) {
    return 'script-load'
  }

  if (message.includes('adapter') || message.includes('private access token')) {
    return 'browser-support'
  }

  if (isTurnstileRequiredError(error)) {
    return 'challenge-required'
  }

  if ((typeof code === 'string' && code.startsWith(TURNSTILE_RETRYABLE_ERROR_PREFIX)) || code) {
    return 'token-rejected'
  }

  return 'unknown'
}

export function describeTurnstileError(error: unknown): string {
  const kind = classifyTurnstileError(error)
  const code = extractTurnstileErrorCode(error)

  const reason = (() => {
    switch (kind) {
      case 'hostname-mismatch':
        return 'Hostname is not authorized for the current Turnstile site key.'
      case 'script-load':
        return 'Challenge script failed to load or initialize.'
      case 'token-rejected':
        return 'Verification token was rejected or expired.'
      case 'browser-support':
        return 'Browser trust adapter is unavailable in this environment.'
      case 'challenge-required':
        return 'Verification is still required before this action can continue.'
      default:
        return 'Challenge verification could not be completed.'
    }
  })()

  return code ? `${reason} (code ${code})` : reason
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
  switch (classifyTurnstileError(error)) {
    case 'hostname-mismatch':
      return 'auth.error.turnstileHostnameMismatch'
    case 'challenge-required':
      return 'auth.error.turnstileRequired'
    case 'script-load':
      return 'error.networkError'
    default:
      return 'auth.error.turnstileFailed'
  }
}
