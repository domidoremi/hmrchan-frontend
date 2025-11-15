/**
 * 内容状态管理 - 增强版（带持久化和缓存）
 * v2.0 - UUID迁移：ID参数已从number改为string
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Post, PostDetail, PostListParams, PaginatedResponse, Platform, UUID } from '@/types'
import { api } from '@/api/client'
import { indexedDB } from '@/utils/indexedDB'
import { fetchWithFallback } from '@/utils/cacheHelper'

export const usePostsStore = defineStore(
  'posts',
  () => {
    // 状态
    const posts = ref<Post[]>([])
    const currentPost = ref<PostDetail | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // 离线状态标记：最近一次列表/详情请求是否使用了 IndexedDB 回退数据
    const lastListFromFallback = ref(false)
    const lastDetailFromFallback = ref(false)

    // 分页信息
    const pagination = ref({
      page: 1,
      page_size: 20,
      total: 0,
      pages: 0,
    })

    // 筛选参数
    const filters = ref<PostListParams>({
      page: 1,
      page_size: 20,
      sort_by: 'scraped_at',
      sort_order: 'desc',
    })

    // 获取内容列表
    async function fetchPosts(params?: PostListParams & { append?: boolean }) {
      // 如果是追加模式，不显示loading状态（避免UI闪烁）
      const { append, ...apiParams } = params || {}
      if (!append) {
        loading.value = true
      }
      error.value = null

      const mergedParams: PostListParams = {
        ...filters.value,
        ...apiParams,
      }

      try {
        const { data, fromFallback } = await fetchWithFallback<PaginatedResponse<Post>>({
          primary: () =>
            api.get<PaginatedResponse<Post>>('/posts/', {
              params: mergedParams,
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
              console.error('[PostsStore] Failed to load posts from IndexedDB:', fallbackError)
              return null
            }
          },
          onSuccess: async (response) => {
            if (!response.items || !response.items.length) return

            try {
              await indexedDB.savePosts(response.items)
            } catch (persistError) {
              console.error('[PostsStore] Failed to persist posts list to IndexedDB:', persistError)
            }
          },
        })

        const response = data

        // 标记此次列表数据是否来自本地回退
        lastListFromFallback.value = !!fromFallback

        // 防御性检查：确保响应数据有效
        if (!response || !response.items) {
          console.warn('API 返回无效数据，使用空数组')
          posts.value = []
          return {
            items: [],
            page: 1,
            page_size: 20,
            total: 0,
            pages: 0,
          }
        }

        // 如果append为true，追加到现有列表；否则替换
        if (append) {
          posts.value = [...posts.value, ...(response.items || [])]
        } else {
          posts.value = response.items || []
        }

        pagination.value = {
          page: response.page || 1,
          page_size: response.page_size || 20,
          total: response.total || 0,
          pages: response.pages || 0,
        }

        return response
      } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : 'API 请求失败'
        console.error('获取帖子列表失败:', err)

        // 失败时视为非回退数据
        lastListFromFallback.value = false

        // API 失败时，设置空数组防止 undefined 错误
        if (!append) {
          posts.value = []
        }

        // 不抛出错误，让页面显示空状态而不是崩溃
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

    // 获取单个内容详情（带 IndexedDB 回退）
    async function fetchPost(postId: UUID) {
      loading.value = true
      error.value = null

      try {
        const { data, fromFallback } = await fetchWithFallback<PostDetail>({
          primary: () => api.get<PostDetail>(`/posts/${postId}`),
          fallback: async () => {
            // 从 IndexedDB 读取基础 Post 信息，构造一个最小可用的 PostDetail
            try {
              const cached = await indexedDB.getPost(postId)
              if (!cached) return null
              return {
                ...cached,
                media_files: [],
                tags: [],
              } as PostDetail
            } catch {
              return null
            }
          },
          onSuccess: async (value) => {
            try {
              await indexedDB.savePosts([value])
            } catch (persistError) {
              console.error('[PostsStore] Failed to persist post to IndexedDB:', persistError)
            }
          },
        })

        currentPost.value = data

        // 标记此次详情数据是否来自本地回退
        lastDetailFromFallback.value = !!fromFallback

        return data
      } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : 'Unknown error'
        throw err
      } finally {
        loading.value = false
      }
    }

    // 按平台获取内容
    async function fetchPostsByPlatform(platform: Platform, params?: PostListParams) {
      return fetchPosts({ ...params, platform })
    }

    // 搜索内容
    async function searchPosts(query: string, params?: PostListParams) {
      return fetchPosts({ ...params, q: query })
    }

    // 更新筛选
    function updateFilters(newFilters: Partial<PostListParams>) {
      filters.value = { ...filters.value, ...newFilters }
    }

    // 重置筛选
    function resetFilters() {
      filters.value = {
        page: 1,
        page_size: 20,
        sort_by: 'scraped_at',
        sort_order: 'desc',
        platform: undefined,
        q: undefined,
        has_media: undefined,
      }
    }

    // 下一页
    async function nextPage() {
      if (pagination.value.page < pagination.value.pages) {
        filters.value.page = pagination.value.page + 1
        await fetchPosts()
      }
    }

    // 上一页
    async function prevPage() {
      if (pagination.value.page > 1) {
        filters.value.page = pagination.value.page - 1
        await fetchPosts()
      }
    }

    // 跳转到指定页
    async function goToPage(page: number) {
      if (page >= 1 && page <= pagination.value.pages) {
        filters.value.page = page
        await fetchPosts()
      }
    }

    // 清空所有状态（用于登出或重置）
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
      // 状态
      posts,
      currentPost,
      loading,
      error,
      pagination,
      filters,
      lastListFromFallback,
      lastDetailFromFallback,

      // 方法
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
    // 持久化配置 - 只持久化filters，不持久化posts数组（避免返回时显示旧数据）
    persist:
      typeof window !== 'undefined'
        ? {
            storage: sessionStorage,
            pick: ['filters', 'pagination'], // 只持久化filters和pagination，不持久化posts/currentPost
          }
        : false,
  },
)
