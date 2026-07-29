import { ref, shallowRef } from 'vue'
import { ApiError } from '@/api/client'
import { postCache } from '@/utils/cache'

interface UseCachedPostsOptions {
  revalidate?: boolean

  onStale?: () => void

  onUpdate?: () => void

  shouldUseStaleOnError?: (error: unknown) => boolean
}

interface FetchState {
  loading: boolean

  revalidating: boolean

  error: Error | null

  source: 'cache' | 'network' | null
}

interface LoadResult<T> {
  data: T
  total?: number | undefined
  meta?: Record<string, unknown> | undefined
  fromCache: boolean
}

interface CachedLoadConfig {
  signal?: AbortSignal
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error('Unknown error occurred')
}

async function loadWithCache<T, P>(
  params: P,
  getCached: (
    params: P
  ) => Promise<{ data: T; total?: number; meta?: Record<string, unknown> } | null>,
  fetchFn: (
    params: P,
    config?: CachedLoadConfig
  ) => Promise<{ data: T; total?: number; meta?: Record<string, unknown> }>,
  setCache: (params: P, data: T, total?: number, meta?: Record<string, unknown>) => Promise<void>,
  state: { value: FetchState },
  dataRef: { value: T },
  totalRef: { value: number } | null,
  options: UseCachedPostsOptions,
  requestConfig?: CachedLoadConfig
): Promise<LoadResult<T>> {
  const { revalidate = true, onStale, onUpdate, shouldUseStaleOnError } = options

  state.value.error = null

  const cached = await getCached(params)

  if (cached) {
    dataRef.value = cached.data
    if (totalRef && cached.total !== undefined) {
      totalRef.value = cached.total
    }
    state.value.source = 'cache'

    if (!revalidate) {
      return {
        data: dataRef.value,
        total: totalRef?.value,
        meta: cached.meta,
        fromCache: true,
      }
    }

    state.value.revalidating = true
  } else {
    state.value.loading = true
  }

  try {
    const result = requestConfig ? await fetchFn(params, requestConfig) : await fetchFn(params)

    dataRef.value = result.data
    if (totalRef && result.total !== undefined) {
      totalRef.value = result.total
    }
    state.value.source = 'network'

    await setCache(params, result.data, result.total, result.meta)

    onUpdate?.()

    return {
      data: dataRef.value,
      total: totalRef?.value,
      meta: result.meta,
      fromCache: false,
    }
  } catch (err) {
    const canUseStaleCache = shouldUseStaleOnError ? shouldUseStaleOnError(err) : true
    if (cached && canUseStaleCache) {
      state.value.source = 'cache'
      state.value.error = null
      onStale?.()
      return {
        data: dataRef.value,
        total: totalRef?.value,
        meta: cached.meta,
        fromCache: true,
      }
    }
    state.value.error = toError(err)
    throw err
  } finally {
    state.value.loading = false
    state.value.revalidating = false
  }
}

export function useCachedPostList<T>(
  fetchFn: (
    params: Record<string, unknown>,
    config?: CachedLoadConfig
  ) => Promise<{ data: T[]; total?: number; meta?: Record<string, unknown> }>,
  options: UseCachedPostsOptions = {}
) {
  const data = shallowRef<T[]>([])
  const total = ref(0)
  const state = ref<FetchState>({
    loading: false,
    revalidating: false,
    error: null,
    source: null,
  })

  async function load(params: Record<string, unknown> = {}, requestConfig?: CachedLoadConfig) {
    const result = await loadWithCache(
      params,
      async (p) => {
        const cached = await postCache.getList(p)
        if (!cached) return null

        if (!Array.isArray(cached.data)) {
          return null
        }

        return { data: cached.data as T[], total: cached.total, meta: cached.meta }
      },
      fetchFn,
      async (p, d, t, meta) => {
        await postCache.setList(
          p,
          d as Array<{ uuid?: string; id?: string }>,
          t ?? 0,
          undefined,
          meta
        )
      },
      state,
      data,
      total,
      options,
      requestConfig
    )
    return result
  }

  function clearCache() {
    postCache.clearLists()
  }

  return {
    data,
    total,
    state,
    load,
    clearCache,
  }
}

export function useCachedPost<T>(
  fetchFn: (uuid: string, config?: CachedLoadConfig) => Promise<T>,
  options: UseCachedPostsOptions = {}
) {
  const data = shallowRef<T | null>(null)
  const state = ref<FetchState>({
    loading: false,
    revalidating: false,
    error: null,
    source: null,
  })

  async function load(uuid: string, requestConfig?: CachedLoadConfig) {
    return loadWithCache(
      uuid,
      async (id) => {
        const cached = await postCache.getPostEntity(id)
        return cached ? { data: cached as T } : null
      },
      async (id, config) => ({
        data: config ? await fetchFn(id, config) : await fetchFn(id),
      }),
      (id, d) => postCache.setPostEntity(id, d),
      state,
      data as { value: T },
      null,
      options,
      requestConfig
    )
  }

  async function invalidate(uuid: string) {
    await postCache.deletePostEntity(uuid)
  }

  return {
    data,
    state,
    load,
    invalidate,
  }
}

export function shouldUseStalePostDetailOnError(error: unknown): boolean {
  return !(error instanceof ApiError && error.status === 404)
}
