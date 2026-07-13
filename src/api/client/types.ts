export interface RequestConfig extends RequestInit {
  timeout?: number
  skipAuth?: boolean
  skipErrorToast?: boolean
  responseType?: 'json' | 'text' | 'blob' | 'response'
  skipSecurity?: boolean
  securityPolicy?: 'default' | 'sensitive'
  baseUrl?: string | undefined
  idempotencyKey?: string | false
  onResponseHeaders?: (headers: Headers) => void
  skipChallengeRetry?: boolean
  verificationAction?: string
  verificationResourceId?: string
  skipVerificationRetry?: boolean
  skipUnauthorizedRetry?: boolean
  skipClientReinitRetry?: boolean
  skipClientSignatureRetry?: boolean
  skipAuthLogoutOnUnauthorized?: boolean
  /** Opt in only when concurrent callers have equivalent request and response semantics. */
  dedupeKey?: string
}

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  status: number
}

export interface PaginatedApiResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next?: boolean
  has_prev?: boolean
}

export interface PaginatedApiResponseWithLimit<T> extends PaginatedApiResponse<T> {
  limit?: number
  total_limit?: number
}

export interface CursorCollectionResponse<T> {
  items: T[]
  next_cursor?: string | null
  has_more: boolean
}

export type ApiEnvelope<T = unknown> = {
  success?: boolean
  data?: T
  meta?: Record<string, unknown>
  pagination?: Record<string, unknown>
}
