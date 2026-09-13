import { normalizeResponse } from './error-mapping'
import { getRuntimeAccessToken } from './auth-runtime'
import type { RequestConfig } from './types'

const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT?.trim() ||
  `${(import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')}/v1`
const REQUEST_TIMEOUT = 30000
const REFRESH_TIMEOUT = 10000

const MAX_CONCURRENT = 4
let activeCount = 0
const waitQueue: Array<() => void> = []
let rateLimitedUntil = 0

function acquireSlot(signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason)
  if (activeCount < MAX_CONCURRENT) {
    activeCount += 1
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const grant = () => {
      signal?.removeEventListener('abort', onAbort)
      activeCount += 1
      resolve()
    }
    const onAbort = () => {
      const index = waitQueue.indexOf(grant)
      if (index >= 0) waitQueue.splice(index, 1)
      reject(signal?.reason)
    }
    waitQueue.push(grant)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function releaseSlot(): void {
  activeCount -= 1
  const next = waitQueue.shift()
  if (next) {
    next()
  }
}

async function waitForRateLimit(signal?: AbortSignal | null): Promise<void> {
  while (rateLimitedUntil > Date.now()) {
    if (signal?.aborted) throw signal.reason
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }, rateLimitedUntil - Date.now())
      const onAbort = () => {
        clearTimeout(timer)
        reject(signal?.reason)
      }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }
}

export { API_BASE_URL, REFRESH_TIMEOUT, REQUEST_TIMEOUT }

export function buildRequestUrl(endpoint: string, baseUrl?: string): string {
  const effectiveBase = (baseUrl ?? API_BASE_URL).replace(/\/+$/, '')
  return /^https?:\/\//i.test(endpoint) ? endpoint : `${effectiveBase}${endpoint}`
}

export function buildCacheKey(method: string, url: string): string {
  return `api:${method}:${url}`
}

export function setRateLimitCooldown(waitMs: number): void {
  rateLimitedUntil = Date.now() + waitMs
}

export async function fetchWithTransportGuards(url: string, init: RequestInit): Promise<Response> {
  await acquireSlot(init.signal)

  try {
    await waitForRateLimit(init.signal)
    if (init.signal?.aborted) throw init.signal.reason
    return await fetch(url, init)
  } finally {
    releaseSlot()
  }
}

export async function getAccessTokenAsync(): Promise<string | null> {
  return getRuntimeAccessToken()
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
    default:
      return normalizeResponse<T>(await response.json())
  }
}
