import { secureTokenManager } from '@/utils/tokenSecurity'
import { normalizeResponse } from './error-mapping'
import type { RequestConfig } from './types'

const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.VITE_API_URL || '/api'}/v1`
const API_AUTH_URL = import.meta.env.VITE_API_URL || '/api'
const REQUEST_TIMEOUT = 30000
const REFRESH_TIMEOUT = 10000

const MAX_CONCURRENT = 4
let activeCount = 0
const waitQueue: Array<() => void> = []
let rateLimitedUntil = 0

function acquireSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount += 1
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    waitQueue.push(() => {
      activeCount += 1
      resolve()
    })
  })
}

function releaseSlot(): void {
  activeCount -= 1
  const next = waitQueue.shift()
  if (next) next()
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  if (rateLimitedUntil <= now) return
  await new Promise<void>((resolve) => setTimeout(resolve, rateLimitedUntil - now))
}

export { API_AUTH_URL, API_BASE_URL, REFRESH_TIMEOUT, REQUEST_TIMEOUT }

export function buildRequestUrl(endpoint: string, baseUrl?: string): string {
  const effectiveBase = baseUrl ?? API_BASE_URL
  return endpoint.startsWith('http') ? endpoint : `${effectiveBase}${endpoint}`
}

export function buildCacheKey(method: string, url: string): string {
  return `api:${method}:${url}`
}

export function setRateLimitCooldown(waitMs: number): void {
  rateLimitedUntil = Date.now() + waitMs
}

export async function fetchWithTransportGuards(url: string, init: RequestInit): Promise<Response> {
  await waitForRateLimit()
  await acquireSlot()

  try {
    return await fetch(url, init)
  } finally {
    releaseSlot()
  }
}

export async function getAccessTokenAsync(): Promise<string | null> {
  try {
    const secureToken = await secureTokenManager.retrieve()
    return secureToken || null
  } catch (error) {
    console.error('Failed to retrieve access token from secure storage:', error)
    return null
  }
}

export async function parseSuccessfulResponse<T>(
  response: Response,
  responseType: RequestConfig['responseType'] = 'json'
): Promise<T> {
  if (response.status === 204 || response.status === 304) {
    return undefined as T
  }

  switch (responseType) {
    case 'response':
      return response as T
    case 'blob':
      return (await response.blob()) as T
    case 'text':
      return (await response.text()) as T
    case 'json':
    default: {
      const data = await response.json()
      return normalizeResponse<T>(data)
    }
  }
}
