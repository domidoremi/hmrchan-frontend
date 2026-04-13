/**
 * 帖子数据的缓存感知 Composable
 *
 * 实现"双通道"加载策略：
 * - 通道 A（极速通道）：立即从缓存读取，秒开渲染
 * - 通道 B（更新通道）：后台网络请求，静默更新
 */

import { ref, shallowRef } from 'vue'
import { ApiError } from '@/api/client'
import { postCache } from '@/utils/cache'

interface UseCachedPostsOptions {
  /** 是否在缓存命中后仍然发起网络请求更新 */
  revalidate?: boolean
  /** 缓存过期后的回调 */
  onStale?: () => void
  /** 数据更新后的回调 */
  onUpdate?: () => void
  /** 是否允许网络错误时回退到陈旧缓存 */
  shouldUseStaleOnError?: (error: unknown) => boolean
}

interface FetchState {
  /** 是否正在加载（首次无缓存时） */
  loading: boolean
  /** 是否正在后台更新 */
  revalidating: boolean
  /** 错误信息 */
  error: Error | null
  /** 数据来源 */
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

/**
 * 将未知错误转换为 Error 实例
 */
function toError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error('Unknown error occurred')
}

/**
 * 通用缓存加载逻辑（内部使用）
 */
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

  // 通道 A：立即查缓存
  const cached = await getCached(params)

  if (cached) {
    dataRef.value = cached.data
    if (totalRef && cached.total !== undefined) {
      totalRef.value = cached.total
    }
    state.value.source = 'cache'

    // 如果不需要重新验证，直接返回缓存数据
    if (!revalidate) {
      return {
        data: dataRef.value,
        total: totalRef?.value,
        meta: cached.meta,
        fromCache: true,
      }
    }

    // 有缓存且需要重新验证，后台静默更新
    state.value.revalidating = true
  } else {
    // 无缓存，显示加载状态
    state.value.loading = true
  }

  // 通道 B：网络请求（只有在需要时才执行）
  try {
    const result = requestConfig ? await fetchFn(params, requestConfig) : await fetchFn(params)

    // 更新数据
    dataRef.value = result.data
    if (totalRef && result.total !== undefined) {
      totalRef.value = result.total
    }
    state.value.source = 'network'

    // 写入缓存
    await setCache(params, result.data, result.total, result.meta)

    onUpdate?.()

    return {
      data: dataRef.value,
      total: totalRef?.value,
      meta: result.meta,
      fromCache: false,
    }
  } catch (err) {
    // 如果有缓存，网络失败不算错误（降级策略）
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

/**
 * 帖子列表的缓存加载
 */
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

        // 两层缓存返回的数据已经是完整的帖子数组
        if (!Array.isArray(cached.data)) {
          return null
        }

        return { data: cached.data as T[], total: cached.total, meta: cached.meta }
      },
      fetchFn,
      async (p, d, t, meta) => {
        // 使用两层缓存：查询缓存 + 帖子实体缓存
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

/**
 * 帖子详情的缓存加载
 */
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
