/**
 * 内容状态管理
 *
 * 功能说明：
 * - 管理内容列表和详情数据
 * - 支持分页、筛选、搜索功能
 * - 使用 IndexedDB 实现离线缓存
 * - 采用 Stale-While-Revalidate 缓存策略
 * - 支持按平台筛选内容
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Post, PostDetail, PostListParams, PaginatedResponse, Platform, UUID } from '@/types'
import { api } from '@/api/client'
import { indexedDB } from '@/utils/storage'
import { fetchWithFallback } from '@/utils/cache'
import { handleError } from '@/utils/error'
import logger from '@/utils/logger'
import { toLogContext } from '@/utils/typeGuards'
import { useSettingsStore } from './useSettings'

export const usePostsStore = defineStore(
  'posts',
  () => {
    /** 内容列表 */
    const posts = ref<Post[]>([])

    /** 当前查看的内容详情 */
    const currentPost = ref<PostDetail | null>(null)

    /** 加载状态 */
    const loading = ref(false)

    /** 错误信息 */
    const error = ref<string | null>(null)

    /** 最近一次列表请求是否使用了离线数据 */
    const lastListFromFallback = ref(false)

    /** 最近一次详情请求是否使用了离线数据 */
    const lastDetailFromFallback = ref(false)

    /** 获取设置 store */
    const settingsStore = useSettingsStore()

    /** 分页信息 */
    const pagination = ref({
      page: 1,
      page_size: settingsStore.settings.postsPerPage,
      total: 0,
      pages: 0,
    })

    /** 筛选参数 */
    const filters = ref<PostListParams>({
      page: 1,
      page_size: settingsStore.settings.postsPerPage,
      sort_by: 'scraped_at',
      sort_order: 'desc',
    })

    /**
     * 获取内容列表
     *
     * @param params - 查询参数
     * @param params.append - 是否追加到现有列表（用于无限滚动）
     * @param params.ignoreFilters - 是否忽略当前筛选条件
     * @returns 分页响应数据
     */
    async function fetchPosts(
      params?: PostListParams & { append?: boolean; ignoreFilters?: boolean },
    ) {
      const { append, ignoreFilters, ...apiParams } = params || {}
      if (!append) {
        loading.value = true
      }
      error.value = null

      const mergedParams: PostListParams = ignoreFilters
        ? { ...apiParams }
        : {
            ...filters.value,
            ...apiParams,
          }

      const sanitizedParams: PostListParams = Object.fromEntries(
        Object.entries(mergedParams).filter(([key, value]) => {
          if (value === undefined || value === null) return false
          if (value === 'undefined') return false
          if ((key === 'platform' || key === 'q') && value === '') return false
          return true
        }),
      ) as PostListParams

      try {
        const { data, fromFallback } = await fetchWithFallback<PaginatedResponse<Post>>({
          primary: () =>
            api.get<PaginatedResponse<Post>>('/posts', {
              params: sanitizedParams,
            }),
          fallback: async () => {
            try {
              const page = mergedParams.page ?? 1
              const pageSize = mergedParams.page_size ?? 20
              const offset = (page - 1) * pageSize
              const limit = pageSize
              const platform = mergedParams.platform

              const cachedPosts = await indexedDB.getPosts({
                platform,
                limit,
                offset,
              })

              if (!cachedPosts.length) {
                return null
              }

              return {
                items: cachedPosts,
                page,
                page_size: pageSize,
                total: cachedPosts.length,
                pages: 1,
              }
            } catch (fallbackError) {
              logger.warn(
                '[PostsStore] Failed to load posts from IndexedDB',
                toLogContext(fallbackError),
              )
              return null
            }
          },
          onSuccess: async (response) => {
            if (!response.items || !response.items.length) return

            try {
              await indexedDB.savePosts(response.items)
            } catch (persistError) {
              logger.error(
                '[PostsStore] Failed to persist posts list to IndexedDB',
                toLogContext(persistError),
              )
            }
          },
        })

        const response = data

        lastListFromFallback.value = !!fromFallback

        if (!response || !response.items) {
          logger.warn('[PostsStore] API 返回无效数据，使用空数组')
          posts.value = []
          return {
            items: [],
            page: 1,
            page_size: 20,
            total: 0,
            pages: 0,
          }
        }

        if (append) {
          posts.value = [...posts.value, ...(response.items || [])]
        } else {
          posts.value = response.items || []
        }

        const pageSize = response.page_size || 20
        const total = response.total || 0
        // 如果 API 没有返回 pages，则手动计算
        const pages = response.pages || Math.ceil(total / pageSize)

        pagination.value = {
          page: response.page || 1,
          page_size: pageSize,
          total: total,
          pages: pages,
        }

        return response
      } catch (err: unknown) {
        const errorResponse = handleError(err, 'PostsStore.FetchPosts', {
          silent: true,
        })
        error.value = errorResponse.message
        logger.error('[Posts] Failed to fetch posts', toLogContext(err))

        lastListFromFallback.value = false

        if (!append) {
          posts.value = []
        }

        return {
          items: [],
          page: 1,
          page_size: 20,
          total: 0,
          pages: 0,
        }
      } finally {
        if (!append) {
          loading.value = false
        }
      }
    }

    /**
     * 获取单个内容详情
     *
     * 采用 Stale-While-Revalidate 缓存策略：
     * - 优先返回新鲜缓存，后台静默刷新
     * - 缓存过期时请求网络，失败则使用过期缓存
     *
     * @param postId - 内容 ID
     * @param options - 配置选项
     * @param options.forceFresh - 是否强制从网络获取最新数据
     * @returns 内容详情数据
     * @throws 获取失败时抛出错误
     */
    async function fetchPost(postId: UUID, options = { forceFresh: false }) {
      loading.value = true
      error.value = null

      try {
        if (!options.forceFresh) {
          const cached = await indexedDB.getPost(postId)

          if (cached && indexedDB.isCacheFresh(cached, 30 * 1000)) {
            const cachedDetail = cached as unknown as PostDetail

            currentPost.value = cachedDetail
            lastDetailFromFallback.value = false
            loading.value = false

            api
              .get<PostDetail>(`/posts/${postId}`)
              .then(async (response) => {
                currentPost.value = response
                await indexedDB.savePosts([response])
                logger.debug('[PostsStore] Background refresh completed for post', {
                  postId,
                })
              })
              .catch((err) => {
                logger.warn('[PostsStore] Background refresh failed', toLogContext(err))
              })

            return cachedDetail
          }
        }

        const { data, fromFallback } = await fetchWithFallback<PostDetail>({
          primary: () => api.get<PostDetail>(`/posts/${postId}`),
          fallback: async () => {
            try {
              const cached = await indexedDB.getPost(postId)
              if (!cached) return null
              return cached as unknown as PostDetail
            } catch {
              return null
            }
          },
          onSuccess: async (value) => {
            try {
              await indexedDB.savePosts([value])
            } catch (persistError) {
              logger.warn(
                '[PostsStore] Failed to persist post to IndexedDB',
                toLogContext(persistError),
              )
            }
          },
        })

        currentPost.value = data
        lastDetailFromFallback.value = !!fromFallback

        return data
      } catch (err: unknown) {
        const errorResponse = handleError(err, 'PostsStore.FetchPost')
        error.value = errorResponse.message
        throw err
      } finally {
        loading.value = false
      }
    }

    /**
     * 按平台获取内容
     *
     * @param platform - 平台类型
     * @param params - 额外的查询参数
     * @returns 分页响应数据
     */
    async function fetchPostsByPlatform(platform: Platform, params?: PostListParams) {
      return fetchPosts({ ...params, platform })
    }

    /**
     * 搜索内容
     *
     * @param query - 搜索关键词
     * @param params - 额外的查询参数
     * @returns 分页响应数据
     */
    async function searchPosts(query: string, params?: PostListParams) {
      return fetchPosts({ ...params, q: query })
    }

    /**
     * 更新筛选条件
     *
     * @param newFilters - 新的筛选参数（部分更新）
     */
    function updateFilters(newFilters: Partial<PostListParams>) {
      filters.value = { ...filters.value, ...newFilters }
    }

    /**
     * 重置筛选条件
     *
     * 恢复到默认的筛选参数
     */
    function resetFilters() {
      filters.value = {
        page: 1,
        page_size: settingsStore.settings.postsPerPage,
        sort_by: 'scraped_at',
        sort_order: 'desc',
        platform: undefined,
        q: undefined,
        has_media: undefined,
      }
      // 同时重置分页信息
      pagination.value = {
        page: 1,
        page_size: settingsStore.settings.postsPerPage,
        total: 0,
        pages: 0,
      }
    }

    /**
     * 加载下一页
     */
    async function nextPage() {
      if (pagination.value.page < pagination.value.pages) {
        filters.value.page = pagination.value.page + 1
        await fetchPosts()
      }
    }

    /**
     * 加载上一页
     */
    async function prevPage() {
      if (pagination.value.page > 1) {
        filters.value.page = pagination.value.page - 1
        await fetchPosts()
      }
    }

    /**
     * 跳转到指定页
     *
     * @param page - 目标页码
     */
    async function goToPage(page: number) {
      if (page >= 1 && page <= pagination.value.pages) {
        filters.value.page = page
        await fetchPosts()
      }
    }

    /**
     * 清空所有状态
     *
     * 用于用户登出或重置应用状态
     */
    function clearStore() {
      posts.value = []
      currentPost.value = null
      loading.value = false
      error.value = null
      pagination.value = {
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
      }
      resetFilters()
    }

    return {
      posts,
      currentPost,
      loading,
      error,
      pagination,
      filters,
      lastListFromFallback,
      lastDetailFromFallback,
      fetchPosts,
      fetchPost,
      fetchPostsByPlatform,
      searchPosts,
      updateFilters,
      resetFilters,
      nextPage,
      prevPage,
      goToPage,
      clearStore,
    }
  },
  {
    persist:
      typeof window !== 'undefined'
        ? {
            key: 'posts',
            storage: sessionStorage,
            pick: ['filters', 'pagination'],
          }
        : false,
  },
)
