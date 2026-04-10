/**
 * API Client - HTTP 请求客户端
 *
 * 统一负责：
 * - 同源 /api/v1/* 请求基线
 * - 内存 access token 注入与 401 单飞 refresh
 * - request-integrity V2
 * - challenge / verification / client re-init / contract gate
 * - multipart 自组装上传
 */

import { reportClientEvent } from '@/utils/clientReporter'
import {
  clearAuthRuntimeSession,
  establishAuthRuntimeSession,
  getAuthRuntimeSession,
  getRuntimeAccessToken,
} from './client/auth-runtime'
import {
  ApiError,
  extractApiErrorMeta,
  handleErrorResponse,
  handleTransportError,
} from './client/error-mapping'
import {
  attachClientSecurityHeaders,
  isCredentialRefreshInProgress,
  isSignatureErrorResponse,
  onCredentialsRefreshFailed,
  onCredentialsRefreshed,
  refreshClientSecurityCredentials,
  setCredentialRefreshInProgress,
  subscribeCredentialRefresh,
} from './client/client-security'
import {
  extractChallengeSiteKey,
  isAccessRestrictedMessage,
  withVerificationToken,
} from './client/challenge-verification'
import { buildMultipartRequestBody } from './client/multipart'
import {
  REQUEST_TIMEOUT,
  REFRESH_TIMEOUT,
  buildCacheKey,
  buildRequestUrl,
  fetchWithTransportGuards,
  parseSuccessfulResponse,
  setRateLimitCooldown,
} from './client/transport'
import { applyRequestSecurityHeaders } from './client/request-security'
import type {
  ApiResponse,
  CursorCollectionResponse,
  PaginatedApiResponse,
  PaginatedApiResponseWithLimit,
  RequestConfig,
} from './client/types'

export { ApiError }
export type {
  ApiResponse,
  CursorCollectionResponse,
  PaginatedApiResponse,
  PaginatedApiResponseWithLimit,
  RequestConfig,
}

interface RefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_threshold: number
  permission_version: number | string
}

const textEncoder = new TextEncoder()
const inflightRequests = new Map<string, Promise<unknown>>()
let authRefreshPromise: Promise<boolean> | null = null

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout: number,
  useTransportGuards = false
): Promise<Response> {
  const timeoutController = new AbortController()
  const externalSignal = init.signal
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout)

  const forwardAbort = () => {
    timeoutController.abort()
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      timeoutController.abort()
    } else {
      externalSignal.addEventListener('abort', forwardAbort, { once: true })
    }
  }

  try {
    const requestInit = {
      ...init,
      signal: timeoutController.signal,
    }

    return useTransportGuards
      ? await fetchWithTransportGuards(url, requestInit)
      : await fetch(url, requestInit)
  } finally {
    clearTimeout(timeoutId)
    if (externalSignal) {
      externalSignal.removeEventListener('abort', forwardAbort)
    }
  }
}

function dispatchLogout(reason: 'auth_failed' | 'permission_version_stale' = 'auth_failed'): void {
  const hadSession = Boolean(getRuntimeAccessToken())
  clearAuthRuntimeSession()
  if (typeof window !== 'undefined' && hadSession) {
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } }))
  }
}

function isClientReinitRequired(response: Response): boolean {
  return response.headers.get('X-Client-Reinit-Required')?.toLowerCase() === 'true'
}

function isClientUpgradeRequired(response: Response): boolean {
  return (
    response.status === 426 ||
    response.headers.get('X-Client-Upgrade-Required')?.toLowerCase() === 'true'
  )
}

function triggerHardReloadGate(): never {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:hard-reload-required'))

    const isTest = import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true'
    if (!isTest) {
      window.setTimeout(() => {
        window.location.reload()
      }, 0)
    }
  }

  throw new ApiError('Client upgrade required', 426, 'CLIENT_UPGRADE_REQUIRED')
}

async function readErrorMeta(response: Response): Promise<{ code?: string; message: string }> {
  try {
    const body = await response.clone().json()
    return extractApiErrorMeta(body)
  } catch {
    return { message: '' }
  }
}

async function serializeRequestBody(body: BodyInit | null | undefined): Promise<{
  body: BodyInit | null
  bodyBytes: Uint8Array
  contentType?: string
}> {
  if (body == null) {
    return {
      body: null,
      bodyBytes: new Uint8Array(),
    }
  }

  if (body instanceof FormData) {
    const multipart = await buildMultipartRequestBody(body)
    return {
      body: multipart.body,
      bodyBytes: multipart.body,
      contentType: multipart.contentType,
    }
  }

  if (typeof body === 'string') {
    const bytes = textEncoder.encode(body)
    return {
      body,
      bodyBytes: bytes,
    }
  }

  if (body instanceof URLSearchParams) {
    const encoded = body.toString()
    return {
      body: encoded,
      bodyBytes: textEncoder.encode(encoded),
      contentType: 'application/x-www-form-urlencoded;charset=UTF-8',
    }
  }

  if (body instanceof Blob) {
    const bytes = new Uint8Array(await body.arrayBuffer())
    return {
      body,
      bodyBytes: bytes,
      contentType: body.type || undefined,
    }
  }

  if (body instanceof ArrayBuffer) {
    const bytes = new Uint8Array(body)
    return {
      body: bytes,
      bodyBytes: bytes,
    }
  }

  if (ArrayBuffer.isView(body)) {
    const bytes = new Uint8Array(
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
    )
    return {
      body: bytes,
      bodyBytes: bytes,
    }
  }

  throw new TypeError('Unsupported request body type')
}

async function retryAfterClientReinit<T>(
  endpoint: string,
  config: RequestConfig,
  shouldRetry: boolean
): Promise<T | null> {
  if (!shouldRetry) return null

  const { clientSecurityService } = await import('./clientSecurityService')
  await clientSecurityService.init(true, { promptChallenge: false })
  return request<T>(endpoint, {
    ...config,
    skipClientReinitRetry: true,
  })
}

async function retryAfterAuthRefresh(): Promise<boolean> {
  if (authRefreshPromise) {
    return authRefreshPromise
  }

  authRefreshPromise = (async () => {
    try {
      const refreshed = await request<RefreshResponse>('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
        skipErrorToast: true,
        timeout: REFRESH_TIMEOUT,
        skipUnauthorizedRetry: true,
        skipChallengeRetry: true,
        skipVerificationRetry: true,
      })

      establishAuthRuntimeSession(refreshed)
      return true
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'PERMISSION_VERSION_STALE' || error.status === 401) {
          dispatchLogout(
            error.code === 'PERMISSION_VERSION_STALE' ? 'permission_version_stale' : 'auth_failed'
          )
          return false
        }

        if (error.status === 0 || error.status === 408) {
          reportClientEvent(
            'auth.session.refresh_transport_failed',
            {
              status: error.status,
            },
            {
              category: 'security',
              requiresAnalyticsConsent: false,
              severity: 'warn',
            }
          )
          dispatchLogout('auth_failed')
          return false
        }
      }

      if (!(error instanceof ApiError)) {
        reportClientEvent(
          'auth.session.refresh_transport_failed',
          {},
          {
            category: 'security',
            requiresAnalyticsConsent: false,
            severity: 'warn',
          }
        )
        dispatchLogout('auth_failed')
        return false
      }

      throw error
    } finally {
      authRefreshPromise = null
    }
  })()

  return authRefreshPromise
}

async function handleForbiddenResponse<T>(options: {
  endpoint: string
  config: RequestConfig
  response: Response
  method: string
  body: BodyInit | null | undefined
  skipErrorToast: boolean
  verificationAction?: string
  verificationResourceId?: string
  skipChallengeRetry?: boolean
  skipVerificationRetry?: boolean
}): Promise<T> {
  const {
    endpoint,
    config,
    response,
    method,
    body,
    skipErrorToast,
    verificationAction,
    verificationResourceId,
    skipChallengeRetry = false,
    skipVerificationRetry = false,
  } = options

  try {
    const errorBody = await response.clone().json()
    const { code: errorCode, message: errorMessage } = extractApiErrorMeta(errorBody)
    const verificationRequired =
      response.headers.get('X-Verification-Required')?.toLowerCase() === 'true'

    if (errorCode?.toUpperCase() === 'CHALLENGE_REQUIRED') {
      const siteKey = extractChallengeSiteKey(errorBody)
      window.dispatchEvent(
        new CustomEvent('client:challenge-required', {
          detail: { turnstile_site_key: siteKey },
        })
      )

      reportClientEvent(
        'client.challenge.prompted',
        {
          endpoint,
          method,
          hasSiteKey: Boolean(siteKey),
        },
        { severity: 'warn' }
      )

      if (!skipChallengeRetry) {
        const { requestClientChallenge } = await import('./clientChallengeBridge')
        const verified = await requestClientChallenge(siteKey)

        if (verified) {
          return request<T>(endpoint, {
            ...config,
            skipChallengeRetry: true,
          })
        }
      }

      throw new ApiError(errorMessage || 'Challenge required', 403, 'CHALLENGE_REQUIRED', {
        turnstile_site_key: siteKey,
      })
    }

    if (verificationRequired && verificationAction && !skipVerificationRetry) {
      const { ensureVerificationToken } = await import('./verificationBridge')
      const verificationToken = await ensureVerificationToken(verificationAction, {
        resourceId: verificationResourceId,
      })
      const { body: retryBody, headers: retryHeaders } = withVerificationToken(
        method,
        body,
        config.headers ?? {},
        verificationToken
      )

      return request<T>(endpoint, {
        ...config,
        body: retryBody,
        headers: retryHeaders,
        skipVerificationRetry: true,
      })
    }

    if (isSignatureErrorResponse(errorCode, errorMessage) && !config.skipClientSignatureRetry) {
      if (!isCredentialRefreshInProgress()) {
        setCredentialRefreshInProgress(true)
        try {
          await refreshClientSecurityCredentials()
          setCredentialRefreshInProgress(false)
          onCredentialsRefreshed()
          return request<T>(endpoint, {
            ...config,
            skipClientSignatureRetry: true,
          })
        } catch (initError) {
          setCredentialRefreshInProgress(false)
          const refreshError =
            initError instanceof Error ? initError : new Error('Credential refresh failed')
          onCredentialsRefreshFailed(refreshError)
        }
      } else {
        await new Promise<void>((resolve, reject) => {
          subscribeCredentialRefresh(resolve, reject)
        })
        return request<T>(endpoint, {
          ...config,
          skipClientSignatureRetry: true,
        })
      }
    }

    if (isAccessRestrictedMessage(errorMessage)) {
      window.dispatchEvent(new CustomEvent('client:access-restricted'))
      reportClientEvent(
        'client.access_restricted',
        {
          endpoint,
          method,
        },
        { severity: 'warn' }
      )
      throw new ApiError(errorMessage ?? 'Access temporarily restricted', 403, 'ACCESS_RESTRICTED')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
  }

  await handleErrorResponse(response, skipErrorToast)
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const {
    timeout = REQUEST_TIMEOUT,
    skipAuth = false,
    skipErrorToast = false,
    responseType = 'json',
    skipSecurity = false,
    baseUrl,
    onResponseHeaders,
    skipChallengeRetry = false,
    verificationAction,
    verificationResourceId,
    skipVerificationRetry = false,
    headers: customHeaders = {},
    body,
    skipUnauthorizedRetry = false,
    skipClientReinitRetry = false,
    skipClientSignatureRetry = false,
    ...fetchConfig
  } = config

  const method = fetchConfig.method?.toUpperCase() || 'GET'
  const url = buildRequestUrl(endpoint, baseUrl)
  const requestHeaders: Record<string, string> = { ...(customHeaders as Record<string, string>) }
  const serializedBody = await serializeRequestBody(body)
  const accessToken = !skipAuth ? getRuntimeAccessToken() : null
  const requestId = applyRequestSecurityHeaders(requestHeaders, method, url, config)

  if (serializedBody.contentType && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = serializedBody.contentType
  }

  if (
    serializedBody.body &&
    !serializedBody.contentType &&
    !requestHeaders['Content-Type'] &&
    ['POST', 'PUT', 'PATCH'].includes(method)
  ) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  if (accessToken) {
    requestHeaders['Authorization'] = `Bearer ${accessToken}`
  }

  if (!skipSecurity) {
    try {
      await attachClientSecurityHeaders(requestHeaders, {
        method,
        url,
        hadToken: Boolean(accessToken),
        bodyBytes: serializedBody.bodyBytes,
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CHALLENGE_REQUIRED') {
        reportClientEvent('client.challenge.required', { endpoint, method }, { severity: 'warn' })
      }

      throw error
    }
  }

  const requestInit: RequestInit = {
    ...fetchConfig,
    method,
    body: serializedBody.body,
    headers: requestHeaders,
    credentials: 'include',
  }

  try {
    let response = await fetchWithTimeout(url, requestInit, timeout, true)

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitSeconds = retryAfter ? Math.min(parseInt(retryAfter, 10) || 5, 60) : 5
      const waitMs = waitSeconds * 1000
      setRateLimitCooldown(waitMs)

      if (skipErrorToast) {
        await handleErrorResponse(response, skipErrorToast)
      }

      await new Promise<void>((resolve) => setTimeout(resolve, waitMs))
      response = await fetchWithTimeout(url, requestInit, timeout, true)

      if (!response.ok) {
        await handleErrorResponse(response, skipErrorToast)
      }
    }

    if (isClientUpgradeRequired(response)) {
      triggerHardReloadGate()
    }

    const errorMeta = response.ok ? null : await readErrorMeta(response)

    if (
      !response.ok &&
      isClientReinitRequired(response) &&
      errorMeta?.code !== 'PERMISSION_VERSION_STALE'
    ) {
      const retried = await retryAfterClientReinit<T>(
        endpoint,
        {
          ...config,
          headers: requestHeaders,
          body,
          skipClientSignatureRetry,
        },
        !skipClientReinitRetry
      )

      if (retried !== null) {
        return retried
      }
    }

    if (response.status === 304) {
      onResponseHeaders?.(response.headers)
      return parseSuccessfulResponse<T>(response, responseType)
    }

    if (!response.ok && errorMeta?.code === 'PERMISSION_VERSION_STALE') {
      dispatchLogout('permission_version_stale')
      await handleErrorResponse(response, skipErrorToast)
    }

    if (response.status === 401 && !skipAuth) {
      if (!skipUnauthorizedRetry) {
        const refreshedToken = getRuntimeAccessToken()
        if (accessToken && refreshedToken && refreshedToken !== accessToken) {
          return request<T>(endpoint, {
            ...config,
            skipUnauthorizedRetry: true,
            skipClientReinitRetry,
            skipClientSignatureRetry,
          })
        }

        const refreshed = await retryAfterAuthRefresh()
        if (refreshed) {
          return request<T>(endpoint, {
            ...config,
            skipUnauthorizedRetry: true,
            skipClientReinitRetry,
            skipClientSignatureRetry,
          })
        }
      }

      const runtimeSession = getAuthRuntimeSession()
      reportClientEvent(
        skipUnauthorizedRetry ? 'auth.session.rejected_after_refresh' : 'auth.session.rejected',
        {
          endpoint,
          method,
          hasAccessToken: Boolean(accessToken),
          hasRuntimeAccessToken: Boolean(runtimeSession?.accessToken),
          accessTokenRotated: Boolean(
            accessToken && runtimeSession?.accessToken && runtimeSession.accessToken !== accessToken
          ),
          permissionVersion: runtimeSession?.permissionVersion,
        },
        {
          category: 'security',
          requestId,
          requiresAnalyticsConsent: false,
          severity: 'warn',
        }
      )
      dispatchLogout('auth_failed')
      await handleErrorResponse(response, skipErrorToast)
    }

    if (!response.ok) {
      if (response.status === 403) {
        return handleForbiddenResponse<T>({
          endpoint,
          config: {
            ...config,
            headers: requestHeaders,
            body,
            skipClientSignatureRetry,
            skipClientReinitRetry,
          },
          response,
          method,
          body,
          skipErrorToast,
          verificationAction,
          verificationResourceId,
          skipChallengeRetry,
          skipVerificationRetry,
        })
      }

      await handleErrorResponse(response, skipErrorToast)
    }

    onResponseHeaders?.(response.headers)
    return parseSuccessfulResponse<T>(response, responseType)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    reportClientEvent(
      'client.request.transport_failed',
      {
        endpoint,
        method,
      },
      {
        category: 'security',
        requestId,
        requiresAnalyticsConsent: false,
        severity: 'warn',
      }
    )
    return handleTransportError(error, skipErrorToast)
  }
}

export const apiClient = {
  request<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, config)
  },

  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    const { skipAuth = false, baseUrl, ...restConfig } = config || {}
    const url = buildRequestUrl(endpoint, baseUrl)
    const cacheKey = buildCacheKey('GET', url)
    const inflight = inflightRequests.get(cacheKey) as Promise<T> | undefined

    if (inflight) {
      return inflight
    }

    const promise = request<T>(endpoint, {
      ...restConfig,
      skipAuth,
      baseUrl,
      method: 'GET',
    }).finally(() => {
      inflightRequests.delete(cacheKey)
    })

    inflightRequests.set(cacheKey, promise)
    return promise
  },

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const body = data !== undefined ? ((data as BodyInit) ?? null) : null

    return request<T>(endpoint, {
      ...config,
      method: 'POST',
      body:
        body instanceof FormData ||
        body instanceof Blob ||
        body instanceof URLSearchParams ||
        typeof body === 'string' ||
        body == null
          ? body
          : JSON.stringify(body),
    })
  },

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body:
        data instanceof FormData ||
        data instanceof Blob ||
        data instanceof URLSearchParams ||
        typeof data === 'string' ||
        data == null
          ? (data as BodyInit | null | undefined)
          : JSON.stringify(data),
    })
  },

  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body:
        data instanceof FormData ||
        data instanceof Blob ||
        data instanceof URLSearchParams ||
        typeof data === 'string' ||
        data == null
          ? (data as BodyInit | null | undefined)
          : JSON.stringify(data),
    })
  },

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'DELETE' })
  },

  text(endpoint: string, config?: RequestConfig): Promise<string> {
    return request<string>(endpoint, {
      ...config,
      method: config?.method ?? 'GET',
      responseType: 'text',
    })
  },

  blob(endpoint: string, config?: RequestConfig): Promise<Blob> {
    return request<Blob>(endpoint, {
      ...config,
      method: config?.method ?? 'GET',
      responseType: 'blob',
    })
  },

  response(endpoint: string, config?: RequestConfig): Promise<Response> {
    return request<Response>(endpoint, {
      ...config,
      method: config?.method ?? 'GET',
      responseType: 'response',
    })
  },
}
