import { secureTokenManager } from '@/utils/tokenSecurity'
import { reportClientError, reportClientEvent } from '@/utils/clientReporter'
import { API_AUTH_URL, REFRESH_TIMEOUT } from './transport'
import type { RequestConfig } from './types'

type TokenRefreshSubscriber = {
  resolve: (token: string) => void
  reject: (error: Error) => void
}

type RequestExecutor = <T>(endpoint: string, config?: RequestConfig) => Promise<T>

let isRefreshing = false
let refreshSubscribers: TokenRefreshSubscriber[] = []

export function isTokenRefreshInProgress(): boolean {
  return isRefreshing
}

export function setTokenRefreshInProgress(nextValue: boolean): void {
  isRefreshing = nextValue
}

export function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (error: Error) => void
): void {
  refreshSubscribers.push({ resolve, reject })
}

export function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach(({ resolve }) => resolve(token))
  refreshSubscribers = []
}

export function onTokenRefreshFailed(error: Error): void {
  reportClientError('auth.refresh.failed', error, undefined, { severity: 'warn' })
  refreshSubscribers.forEach(({ reject }) => reject(error))
  refreshSubscribers = []
}

export async function refreshAccessToken(request: RequestExecutor): Promise<string | null> {
  try {
    const data = await request<{ access_token?: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
      baseUrl: API_AUTH_URL,
      skipAuth: true,
      skipErrorToast: true,
      timeout: REFRESH_TIMEOUT,
    })
    const newAccessToken = data.access_token

    if (!newAccessToken) {
      throw new Error('Token refresh failed')
    }

    try {
      await secureTokenManager.store(newAccessToken)
    } catch {
      console.warn('Secure token storage failed, using plain storage')
    }

    window.dispatchEvent(
      new CustomEvent('auth:token-refreshed', { detail: { token: newAccessToken } })
    )
    reportClientEvent('auth.refresh.succeeded')

    return newAccessToken
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Token refresh timeout')
    }

    try {
      localStorage.removeItem('auth')
      secureTokenManager.clear()
    } catch {
      // ignore storage errors
    }

    reportClientError('auth.refresh.request_failed', error, undefined, { severity: 'warn' })
    return null
  }
}
