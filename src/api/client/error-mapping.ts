import i18nInstance from '@/i18n'
import type { ApiEnvelope } from './types'

let toastStore: ReturnType<typeof import('@/stores/toast').useToastStore> | null = null

async function getToastStore() {
  if (!toastStore) {
    const { useToastStore } = await import('@/stores/toast')
    toastStore = useToastStore()
  }
  return toastStore
}

export class ApiError extends Error {
  status: number
  code: string | undefined
  details: Record<string, unknown> | undefined

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function pickNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return undefined
}

function normalizeErrorText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isUpstreamServiceUnavailableMessage(value: string | undefined): boolean {
  if (!value) return false

  const normalized = normalizeErrorText(value)

  return (
    normalized.includes('cloudflare tunnel error') ||
    normalized.includes('configured as a cloudflare tunnel') ||
    normalized.includes('cloudflare is currently unable to resolve it') ||
    normalized.includes('error 1033') ||
    normalized.includes('error code: 1033') ||
    normalized.includes('error 1016') ||
    normalized.includes('error code: 1016') ||
    normalized.includes('origin dns error') ||
    normalized.includes('upstream connect error')
  )
}

async function readErrorBodyText(response: Response): Promise<string> {
  try {
    const readable = typeof response.clone === 'function' ? response.clone() : response
    return await readable.text()
  } catch {
    return ''
  }
}

export function normalizeResponse<T>(payload: unknown): T {
  if (isRecord(payload)) {
    const maybeEnvelope = payload as ApiEnvelope
    const hasEnvelopeHint =
      'data' in maybeEnvelope && ('success' in maybeEnvelope || 'meta' in maybeEnvelope)

    if (hasEnvelopeHint) {
      const data = maybeEnvelope.data
      const pagination = maybeEnvelope.pagination

      if (pagination && isRecord(pagination)) {
        if (Array.isArray(data)) {
          return { items: data, ...pagination } as T
        }

        if (isRecord(data)) {
          const hasPaginationFields =
            'page' in data || 'page_size' in data || 'total' in data || 'total_pages' in data
          if (!hasPaginationFields) {
            return { ...data, ...pagination } as T
          }
        }
      }

      return data as T
    }
  }

  return payload as T
}

export function extractApiErrorMeta(errorBody: unknown): { code?: string; message: string } {
  if (!isRecord(errorBody)) return { message: '' }

  const body = errorBody as Record<string, unknown>
  const detail = body['detail']
  const envelopeError = isRecord(body['error']) ? (body['error'] as Record<string, unknown>) : null
  const detailObject = isRecord(detail) ? (detail as Record<string, unknown>) : null

  let message =
    pickNonEmptyString(
      envelopeError?.['message'],
      body['message'],
      detailObject?.['message'],
      detailObject?.['detail'],
      detail
    ) ?? ''

  if (!message && Array.isArray(detail)) {
    const detailMessages = detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (isRecord(item) && typeof item['msg'] === 'string') return item['msg']
        return ''
      })
      .filter(Boolean)
    message = detailMessages.join('; ')
  }

  const code = pickNonEmptyString(envelopeError?.['code'], body['code'], detailObject?.['code'])

  return { code, message }
}

export async function handleErrorResponse(
  response: Response,
  skipErrorToast?: boolean
): Promise<never> {
  let errorMessage = 'error.unknown'
  let effectiveStatus = response.status
  let errorCode: string | undefined
  let errorDetails: Record<string, unknown> | undefined
  let rawErrorMessage: string | undefined

  try {
    const errorData = await (
      typeof response.clone === 'function' ? response.clone() : response
    ).json()

    if (Array.isArray(errorData?.errors)) {
      errorDetails = { ...errorDetails, errors: errorData.errors }
    }

    const detail = errorData?.detail
    const envelopeError = errorData?.error

    if (typeof detail === 'string') {
      errorMessage = detail
      rawErrorMessage = detail
      errorCode = errorData.code
      errorDetails = { ...errorDetails, ...errorData.details }
    } else if (Array.isArray(detail)) {
      const messages = detail
        .map((item: { msg?: string; loc?: string[] }) => {
          const field = item.loc?.slice(-1)[0]
          return field ? `${field}: ${item.msg}` : item.msg
        })
        .filter(Boolean)
      errorMessage = messages.join('; ') || errorMessage
      errorCode = errorData.code
    } else if (detail && typeof detail === 'object') {
      errorMessage = detail.message || errorMessage
      rawErrorMessage = detail.message || rawErrorMessage
      errorCode = detail.code || errorData.code
      errorDetails = { ...errorDetails, ...(detail.details || errorData.details) }
    } else if (
      envelopeError &&
      typeof envelopeError === 'object' &&
      !Array.isArray(envelopeError)
    ) {
      errorMessage = envelopeError.message || errorMessage
      rawErrorMessage = envelopeError.message || rawErrorMessage
      errorCode = envelopeError.code || errorCode
    } else {
      errorMessage = errorData.message || errorMessage
      rawErrorMessage = errorData.message || rawErrorMessage
      errorCode = errorData.code
      errorDetails = { ...errorDetails, ...errorData.details }
    }
  } catch {
    const errorText = await readErrorBodyText(response)
    if (errorText) {
      if (isUpstreamServiceUnavailableMessage(errorText)) {
        errorMessage = 'service temporarily unavailable'
        rawErrorMessage = 'cloudflare tunnel error'
        effectiveStatus = 530
      }
    }
  }

  if (
    effectiveStatus === response.status &&
    isUpstreamServiceUnavailableMessage(rawErrorMessage || errorMessage)
  ) {
    effectiveStatus = 530
  }

  const statusMessages: Record<number, string> = {
    400: 'error.badRequest',
    401: 'error.unauthorized',
    403: 'error.forbidden',
    404: 'error.notFound',
    409: 'error.conflict',
    410: 'error.notFound',
    422: 'error.validationError',
    429: 'error.tooManyRequests',
    500: 'error.serverError',
    520: 'error.serviceUnavailable',
    521: 'error.serviceUnavailable',
    522: 'error.serviceUnavailable',
    523: 'error.serviceUnavailable',
    524: 'error.serviceUnavailable',
    525: 'error.serviceUnavailable',
    526: 'error.serviceUnavailable',
    502: 'error.badGateway',
    503: 'error.serviceUnavailable',
    530: 'error.serviceUnavailable',
  }

  const serverMessageMap: Record<string, string> = {
    'invalid request signature': 'error.server.invalidSignature',
    'invalid client token': 'error.server.invalidClientToken',
    'missing client token': 'error.server.invalidClientToken',
    'client token expired': 'error.server.clientTokenExpired',
    'invalid timestamp': 'error.server.invalidTimestamp',
    'request expired': 'error.server.requestExpired',
    'human verification failed': 'error.server.turnstileFailed',
    '人机验证失败，请重试': 'error.server.turnstileFailed',
    '人機驗證失敗，請重試': 'error.server.turnstileFailed',
    '認証に失敗しました。もう一度お試しください': 'error.server.turnstileFailed',
    '请求签名无效，请刷新页面重试': 'error.server.invalidSignature',
    请求签名无效: 'error.server.invalidSignature',
    '客户端凭证无效，请刷新页面': 'error.server.invalidClientToken',
    客户端凭证无效: 'error.server.invalidClientToken',
    '客户端凭证已过期，请刷新页面': 'error.server.clientTokenExpired',
    客户端凭证已过期: 'error.server.clientTokenExpired',
    '请求时间戳异常，请检查系统时间': 'error.server.invalidTimestamp',
    请求时间戳异常: 'error.server.invalidTimestamp',
    '请求已过期，请重试': 'error.server.requestExpired',
    请求已过期: 'error.server.requestExpired',
    '請求簽名無效，請重新整理頁面重試': 'error.server.invalidSignature',
    '客戶端憑證無效，請重新整理頁面': 'error.server.invalidClientToken',
    '客戶端憑證已過期，請重新整理頁面': 'error.server.clientTokenExpired',
    '請求時間戳異常，請檢查系統時間': 'error.server.invalidTimestamp',
    '請求已過期，請重試': 'error.server.requestExpired',
    'リクエスト署名が無効です。ページを更新してください': 'error.server.invalidSignature',
    'クライアントトークンが無効です。ページを更新してください': 'error.server.invalidClientToken',
    'クライアントトークンの有効期限が切れました。ページを更新してください':
      'error.server.clientTokenExpired',
    'リクエストのタイムスタンプが異常です。システム時刻を確認してください':
      'error.server.invalidTimestamp',
    'リクエストの有効期限が切れました。もう一度お試しください': 'error.server.requestExpired',
    'access temporarily restricted': 'error.server.accessRestricted',
    'challenge required': 'error.server.challengeRequired',
    'invalid fingerprint': 'error.server.invalidFingerprint',
    'permission denied': 'error.server.permissionDenied',
    'resource not found': 'error.server.resourceNotFound',
    'duplicate entry': 'error.server.duplicateEntry',
    'content too large': 'error.server.contentTooLarge',
    'unsupported media type': 'error.server.unsupportedMediaType',
    'account suspended': 'error.server.accountSuspended',
    'email not verified': 'error.server.emailNotVerified',
    'invalid credentials': 'error.server.invalidCredentials',
    'token expired': 'error.server.tokenExpired',
    'token invalid': 'error.server.tokenInvalid',
    'internal server error': 'error.server.internalError',
  }

  if (rawErrorMessage) {
    errorDetails = { ...errorDetails, rawMessage: rawErrorMessage }
  }

  function resolveServerMessage(message: string): string | undefined {
    const lower = message.toLowerCase().trim()
    if (serverMessageMap[lower]) return serverMessageMap[lower]

    for (const [pattern, key] of Object.entries(serverMessageMap)) {
      if (lower.includes(pattern)) return key
    }

    return undefined
  }

  const { t } = i18nInstance.global
  let localizedMessage: string

  if (effectiveStatus === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const seconds = retryAfter ? parseInt(retryAfter, 10) : 60
    localizedMessage = t('error.tooManyRequestsWithTime', { seconds })
  } else {
    const mappedKey =
      errorMessage !== 'error.unknown' ? resolveServerMessage(errorMessage) : undefined
    localizedMessage = mappedKey
      ? t(mappedKey)
      : statusMessages[effectiveStatus]
        ? t(statusMessages[effectiveStatus])
        : t('error.unknown')
  }

  if (!skipErrorToast && effectiveStatus !== 401) {
    const activeToastStore = await getToastStore()
    activeToastStore.error(localizedMessage)
  }

  throw new ApiError(localizedMessage, effectiveStatus, errorCode, errorDetails)
}

export async function handleTransportError(
  error: unknown,
  skipErrorToast?: boolean
): Promise<never> {
  if (error instanceof ApiError) {
    throw error
  }

  const { t } = i18nInstance.global

  if (error instanceof Error && error.name === 'AbortError') {
    if (!skipErrorToast) {
      const activeToastStore = await getToastStore()
      activeToastStore.error(t('error.timeout'))
    }
    throw new ApiError(t('error.timeout'), 408)
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    if (!skipErrorToast) {
      const activeToastStore = await getToastStore()
      activeToastStore.error(t('error.serviceUnavailable'))
    }
    throw new ApiError(t('error.serviceUnavailable'), 503)
  }

  if (!skipErrorToast) {
    const activeToastStore = await getToastStore()
    activeToastStore.error(t('error.networkError'))
  }

  throw new ApiError(t('error.networkError'), 0)
}
