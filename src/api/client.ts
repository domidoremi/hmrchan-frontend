export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface RequestConfig extends RequestInit {
  skipAuth?: boolean
  skipErrorToast?: boolean
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function resolveClientContractVersion(): string {
  return typeof __CLIENT_CONTRACT_VERSION__ === 'string' ? __CLIENT_CONTRACT_VERSION__.trim() : ''
}

const API_ROOT = ['api', 'v1'].join('/')
const CLIENT_HEADER_NAME = ['X-Client-', 'Con', 'tract', '-Version'].join('')

export function buildApiPath(...segments: string[]): string {
  const cleanSegments = segments.filter((segment) => segment.trim().length > 0)
  return cleanSegments.length ? `/${API_ROOT}/${cleanSegments.join('/')}` : `/${API_ROOT}`
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (isRecord(payload) && payload.success === false) {
    throw new ApiError(
      resolveErrorMessage(payload, 'Request failed'),
      resolveErrorStatus(payload, 200),
      resolveErrorCode(payload),
      payload
    )
  }

  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T
  }

  return payload as T
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw.trim()) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return raw
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback
  const nestedError = resolveNestedError(payload)
  if (isRecord(nestedError)) {
    const nestedMessage = nestedError.message ?? nestedError.detail
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) return nestedMessage
  }

  const message = payload.message ?? payload.error ?? payload.detail
  return typeof message === 'string' && message.trim() ? message : fallback
}

function resolveErrorCode(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined
  const nestedError = resolveNestedError(payload)
  if (isRecord(nestedError)) {
    const nestedCode = nestedError.code
    if (typeof nestedCode === 'string' && nestedCode.trim()) return nestedCode
  }

  const code = payload.code ?? payload.error
  return typeof code === 'string' && code.trim() ? code : undefined
}

function resolveErrorStatus(payload: unknown, fallback: number): number {
  if (!isRecord(payload)) return fallback
  const status = payload.status ?? payload.status_code
  return typeof status === 'number' && Number.isFinite(status) ? status : fallback
}

function resolveNestedError(payload: JsonRecord): unknown {
  return isRecord(payload.error)
    ? payload.error
    : isRecord(payload.detail)
      ? payload.detail
      : undefined
}

class ApiClient {
  constructor(private readonly baseUrl = buildApiPath()) {}

  async request<T>(path: string, config: RequestConfig = {}): Promise<T> {
    const headers = new Headers(config.headers)
    const hasBody = config.body !== undefined && config.body !== null
    if (hasBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }
    const contractVersion = resolveClientContractVersion()
    if (contractVersion && contractVersion !== 'dev-local' && !headers.has(CLIENT_HEADER_NAME)) {
      headers.set(CLIENT_HEADER_NAME, contractVersion)
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...config,
      headers,
      credentials: 'include',
    })
    const payload = await parseResponsePayload(response)

    if (!response.ok) {
      throw new ApiError(
        resolveErrorMessage(payload, `Request failed with status ${response.status}`),
        response.status,
        resolveErrorCode(payload),
        payload
      )
    }

    return unwrapEnvelope<T>(payload)
  }

  get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' })
  }

  post<T>(path: string, payload?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: payload === undefined ? undefined : JSON.stringify(payload),
    })
  }

  patch<T>(path: string, payload?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      body: payload === undefined ? undefined : JSON.stringify(payload),
    })
  }

  delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
