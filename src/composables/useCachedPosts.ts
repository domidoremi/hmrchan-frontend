/**
 * 帖子数据的缓存感知 Composable
 *
 * 实现"双通道"加载策略：
 * - 通道 A（极速通道）：立即从缓存读取，秒开渲染
 * - 通道 B（更新通道）：后台网络请求，静默更新
 */

import { ref, shallowRef } from 'vue'
import { postCache } from '@/utils/cache'

interface UseCachedPostsOptions {
  /** 是否在缓存命中后仍然发起网络请求更新 */
  revalidate?: boolean
  /** 缓存过期后的回调 */
  onStale?: () => void
  /** 数据更新后的回调 */
  onUpdate?: () => void
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

/**
 * 帖子列表的缓存加载
 */
export function useCachedPostList<T>(
  fetchFn: (params: Record<string, unknown>) => Promise<{ data: T[]; total: number }>,
  options: UseCachedPostsOptions = {}
) {
  const { revalidate = true, onUpdate } = options

  const data = shallowRef<T[]>([])
  const total = ref(0)
  const state = ref<FetchState>({
    loading: false,
    revalidating: false,
    error: null,
    source: null,
  })

  async function load(params: Record<string, unknown> = {}) {
    state.value.error = null

    // 通道 A：立即查缓存
    const cached = await postCache.getList(params)
    if (cached) {
      data.value = cached.data as T[]
      total.value = cached.total
      state.value.source = 'cache'

      if (!revalidate) {
        return { data: data.value, total: total.value, fromCache: true }
      }

      // 有缓存，后台静默更新
      state.value.revalidating = true
    } else {
      // 无缓存，显示加载状态
      state.value.loading = true
    }

    // 通道 B：网络请求
    try {
      const result = await fetchFn(params)

      // 更新数据
      data.value = result.data
      total.value = result.total
      state.value.source = 'network'

      // 写入缓存
      await postCache.setList(params, result.data, result.total)

      onUpdate?.()

      return { data: data.value, total: total.value, fromCache: false }
    } catch (err) {
      // 如果有缓存，网络失败不算错误
      if (!cached) {
        state.value.error = err as Error
      }
      throw err
    } finally {
      state.value.loading = false
      state.value.revalidating = false
    }
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
  fetchFn: (uuid: string) => Promise<T>,
  options: UseCachedPostsOptions = {}
) {
  const { revalidate = true, onUpdate } = options

  const data = shallowRef<T | null>(null)
  const state = ref<FetchState>({
    loading: false,
    revalidating: false,
    error: null,
    source: null,
  })

  async function load(uuid: string) {
    state.value.error = null

    // 通道 A：立即查缓存
    const cached = await postCache.getPost(uuid)
    if (cached) {
      data.value = cached.data as T
      state.value.source = 'cache'

      if (!revalidate) {
        return { data: data.value, fromCache: true }
      }

      // 有缓存，后台静默更新
      state.value.revalidating = true
    } else {
      // 无缓存，显示加载状态
      state.value.loading = true
    }

    // 通道 B：网络请求
    try {
      const result = await fetchFn(uuid)

      data.value = result
      state.value.source = 'network'

      // 写入缓存
      await postCache.setPost(uuid, result)

      onUpdate?.()

      return { data: data.value, fromCache: false }
    } catch (err) {
      if (!cached) {
        state.value.error = err as Error
      }
      throw err
    } finally {
      state.value.loading = false
      state.value.revalidating = false
    }
  }

  async function invalidate(uuid: string) {
    await postCache.deletePost(uuid)
  }

  return {
    data,
    state,
    load,
    invalidate,
  }
}
