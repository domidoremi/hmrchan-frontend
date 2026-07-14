import { apiClient, ApiError } from '@/api/client'
import { shouldUseApiFallback } from '@/api/runtimeFlags'
import type { HmrApiErrorKind, HmrApiErrorState, HmrAsyncResource } from '@/hmr/types'

export interface EndpointResult<T> {
  data: T | null
  error: HmrApiErrorState | null
  source: 'api' | 'local'
  path: string
}

export function shouldUseFallbackContent(): boolean {
  return shouldUseApiFallback()
}

export function isPreviewMemberSession(): boolean {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return false

  const query = new URLSearchParams(window.location.search).get('previewAuth')
  if (query === 'member') return true
  if (query === 'off') return false

  return window.localStorage.getItem('hmr.preview.auth') === 'member'
}

function classifyApiError(error: unknown): HmrApiErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      if (
        error.code === 'ACCESS_TEMPORARILY_RESTRICTED' ||
        error.code === 'AUTOMATED_ACCESS_NOT_PERMITTED'
      ) {
        return 'restricted'
      }

      return 'unauthorized'
    }
    if (error.status === 401) return 'unauthorized'
    if (error.status === 404) return 'not-found'
    if (error.status === 426 || error.code === 'CLIENT_CONTRACT_MISMATCH') {
      return 'refresh-needed'
    }
    if (error.status === 429) return 'rate-limited'
    if (error.status >= 500 || error.status === 530) return 'server'
    return 'unknown'
  }

  if (error instanceof TypeError) return 'network'
  if (error instanceof Error && /network|fetch|failed|tunnel|1033|530/i.test(error.message)) {
    return 'network'
  }

  return 'unknown'
}

export function toApiErrorState(error: unknown, path: string): HmrApiErrorState {
  if (error instanceof ApiError) {
    return {
      kind: classifyApiError(error),
      message: error.message || '当前内容暂时不可用。',
      path,
      status: error.status,
      ...(error.code === undefined ? {} : { code: error.code }),
    }
  }

  if (error instanceof Error) {
    return {
      kind: classifyApiError(error),
      message: error.message || '当前内容暂时不可用。',
      path,
    }
  }

  return {
    kind: 'unknown',
    message: '当前内容暂时不可用。',
    path,
  }
}

export function makeResource<T>(
  data: T,
  options: {
    paths: string[]
    source: 'api' | 'local'
    error?: HmrApiErrorState | null
    retry?: () => Promise<void>
  }
): HmrAsyncResource<T> {
  const resource: HmrAsyncResource<T> = {
    state: 'ready',
    data,
    source: options.source,
    error: options.error ?? null,
    paths: options.paths,
    updatedAt: new Date().toISOString(),
  }

  if (options.retry) {
    resource.retry = {
      label: '重试',
      run: options.retry,
    }
  }

  return resource
}

export function combineEndpointResults(results: EndpointResult<unknown>[]): {
  source: 'api' | 'local'
  error: HmrApiErrorState | null
  paths: string[]
} {
  const paths = results.map((item) => item.path)
  const errors = results
    .map((item) => item.error)
    .filter((item): item is HmrApiErrorState => Boolean(item))
  const hasApiData = results.some((item) => item.source === 'api' && item.data !== null)

  return {
    source: hasApiData && errors.length === 0 ? 'api' : 'local',
    error: errors[0] ?? null,
    paths,
  }
}

export async function readEndpointResult<T>(
  path: string,
  options: { skipAuth?: boolean } = {}
): Promise<EndpointResult<T>> {
  if (shouldUseFallbackContent()) {
    return {
      data: null,
      error: {
        kind: 'network',
        message: '当前内容暂时不可用。',
        path,
      },
      source: 'local',
      path,
    }
  }

  try {
    return {
      data: await apiClient.get<T>(path, { skipAuth: options.skipAuth === true }),
      error: null,
      source: 'api',
      path,
    }
  } catch (error) {
    return {
      data: null,
      error: toApiErrorState(error, path),
      source: 'local',
      path,
    }
  }
}

export async function readEndpoint<T>(path: string, fallback: T): Promise<T> {
  const result = await readEndpointResult<T>(path)
  return result.data ?? fallback
}
