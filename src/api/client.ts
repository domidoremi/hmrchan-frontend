/**
 * API Client - HTTP 请求客户端
 *
 * 保持统一门面：
 * - request/get/post/put/patch/delete/text/blob/response
 * - 认证刷新
 * - challenge / verification / client security
 * - 错误映射与请求退避
 */

import { reportClientEvent } from '@/utils/clientReporter'
import {
  ApiError,
  extractApiErrorMeta,
  handleErrorResponse,
  handleTransportError,
} from './client/error-mapping'
import {
  isTokenRefreshInProgress,
  onTokenRefreshFailed,
  onTokenRefreshed,
  refreshAccessToken,
  setTokenRefreshInProgress,
  subscribeTokenRefresh,
} from './client/auth-refresh'
import {
  attachClientSecurityHeaders,
  isCredentialRefreshInProgress,
  isSignatureErrorResponse,
  onCredentialsRefreshFailed,
  onCredentialsRefreshed,
  rebuildClientSecurityHeaders,
  refreshClientSecurityCredentials,
  setCredentialRefreshInProgress,
  subscribeCredentialRefresh,
} from './client/client-security'
import {
  extractChallengeSiteKey,
  isAccessRestrictedMessage,
  withVerificationToken,
} from './client/challenge-verification'
import {
  API_AUTH_URL,
  REQUEST_TIMEOUT,
  buildCacheKey,
  buildRequestUrl,
  fetchWithTransportGuards,
  getAccessTokenAsync,
  parseSuccessfulResponse,
  setRateLimitCooldown,
} from './client/transport'
import type {
  ApiResponse,
  PaginatedApiResponse,
  PaginatedApiResponseWithLimit,
  RequestConfig,
} from './client/types'

export { API_AUTH_URL }
export { ApiError }
export type { ApiResponse, PaginatedApiResponse, PaginatedApiResponseWithLimit, RequestConfig }

const inflightRequests = new Map<string, Promise<unknown>>()

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout: number,
  useTransportGuards = false
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const requestInit = {
      ...init,
      signal: controller.signal,
    }
    return useTransportGuards
      ? await fetchWithTransportGuards(url, requestInit)
      : await fetch(url, requestInit)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function retryWithAuthToken<T>(options: {
  url: string
  timeout: number
  headers: HeadersInit
  requestInit: RequestInit
  responseType: RequestConfig['responseType']
  skipErrorToast: boolean
  token: string
}): Promise<T> {
  const { url, timeout, headers, requestInit, responseType, skipErrorToast, token } = options
  ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

  const retryResponse = await fetchWithTimeout(
    url,
    {
      ...requestInit,
      headers,
    },
    timeout
  )

  if (!retryResponse.ok) {
    if (retryResponse.status === 304) {
      return parseSuccessfulResponse<T>(retryResponse, responseType)
    }
    await handleErrorResponse(retryResponse, skipErrorToast)
  }

  return parseSuccessfulResponse<T>(retryResponse, responseType)
}

async function handleForbiddenResponse<T>(options: {
  endpoint: string
  config: RequestConfig
  response: Response
  method: string
  body: BodyInit | null | undefined
  headers: HeadersInit
  timeout: number
  url: string
  requestInit: RequestInit
  responseType: RequestConfig['responseType']
  skipErrorToast: boolean
  onResponseHeaders?: (headers: Headers) => void
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
    headers,
    timeout,
    url,
    requestInit,
    responseType,
    skipErrorToast,
    onResponseHeaders,
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
        headers,
        verificationToken
      )

      return request<T>(endpoint, {
        ...config,
        body: retryBody,
        headers: retryHeaders,
        skipVerificationRetry: true,
      })
    }

    if (isSignatureErrorResponse(errorCode, errorMessage)) {
      const retryWithNewCredentials = async (): Promise<T> => {
        await rebuildClientSecurityHeaders(headers, { method, url })

        const retryResponse = await fetchWithTimeout(
          url,
          {
            ...requestInit,
            headers,
          },
          timeout,
          true
        )

        if (!retryResponse.ok) {
          if (retryResponse.status === 304) {
            return parseSuccessfulResponse<T>(retryResponse, responseType)
          }
          await handleErrorResponse(retryResponse, skipErrorToast)
        }

        onResponseHeaders?.(retryResponse.headers)
        return parseSuccessfulResponse<T>(retryResponse, responseType)
      }

      if (!isCredentialRefreshInProgress()) {
        setCredentialRefreshInProgress(true)
        try {
          await refreshClientSecurityCredentials()
          setCredentialRefreshInProgress(false)
          onCredentialsRefreshed()
          return await retryWithNewCredentials()
        } catch (initError) {
          setCredentialRefreshInProgress(false)
          const refreshError =
            initError instanceof Error ? initError : new Error('Credential refresh failed')
          onCredentialsRefreshFailed(refreshError)
        }
      } else {
        try {
          await new Promise<void>((resolve, reject) => {
            subscribeCredentialRefresh(resolve, reject)
          })
          return await retryWithNewCredentials()
        } catch (queueError) {
          if (queueError instanceof ApiError) {
            throw queueError
          }
        }
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
    ...fetchConfig
  } = config

  const headers: HeadersInit = { ...customHeaders }
  const method = fetchConfig.method?.toUpperCase() || 'GET'
  const isFormData = body instanceof FormData
  const shouldSetContentType = body && !isFormData && ['POST', 'PUT', 'PATCH'].includes(method)

  if (shouldSetContentType) {
    ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  let hadToken = false
  if (!skipAuth) {
    const token = await getAccessTokenAsync()
    if (token) {
      hadToken = true
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  const url = buildRequestUrl(endpoint, baseUrl)

  if (!skipSecurity) {
    try {
      await attachClientSecurityHeaders(headers, { method, url, hadToken })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CHALLENGE_REQUIRED') {
        reportClientEvent(
          'client.challenge.required',
          { endpoint, method: config.method ?? 'GET' },
          { severity: 'warn' }
        )
        throw error
      }
    }
  }

  const requestInit: RequestInit = {
    ...fetchConfig,
    body: body ?? null,
    headers,
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

    if (response.status === 304) {
      onResponseHeaders?.(response.headers)
      return parseSuccessfulResponse<T>(response, responseType)
    }

    if (response.status === 401 && !skipAuth && hadToken) {
      if (!isTokenRefreshInProgress()) {
        setTokenRefreshInProgress(true)

        let nextToken: string | null = null
        let refreshError: Error | null = null

        try {
          nextToken = await refreshAccessToken(request)
        } catch (error) {
          refreshError = error instanceof Error ? error : new Error('Token refresh failed')
        } finally {
          setTokenRefreshInProgress(false)
        }

        if (nextToken) {
          onTokenRefreshed(nextToken)
          return retryWithAuthToken<T>({
            url,
            timeout,
            headers,
            requestInit,
            responseType,
            skipErrorToast,
            token: nextToken,
          })
        }

        const authError = refreshError || new Error('Token refresh failed')
        onTokenRefreshFailed(authError)
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'auth_failed' } }))
        await handleErrorResponse(response, skipErrorToast)
      }

      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (token) => {
          try {
            resolve(
              await retryWithAuthToken<T>({
                url,
                timeout,
                headers,
                requestInit,
                responseType,
                skipErrorToast,
                token,
              })
            )
          } catch (error) {
            reject(error)
          }
        }, reject)
      })
    }

    if (!response.ok) {
      if (response.status === 403) {
        return handleForbiddenResponse<T>({
          endpoint,
          config,
          response,
          method,
          body,
          headers,
          timeout,
          url,
          requestInit,
          responseType,
          skipErrorToast,
          onResponseHeaders,
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
    const isFormData = data instanceof FormData
    const body = data !== undefined ? (isFormData ? data : JSON.stringify(data)) : null

    return request<T>(endpoint, {
      ...config,
      method: 'POST',
      body,
      ...(isFormData ? {} : config?.headers ? { headers: config.headers } : {}),
    })
  },

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : null,
    })
  },

  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : null,
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
