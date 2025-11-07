/**
 * 内容状态管理 - 增强版（带持久化和缓存）
 * v2.0 - UUID迁移：ID参数已从number改为string
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Post, PostDetail, PostListParams, PaginatedResponse, Platform, UUID } from '@/types'
import { api } from '@/api/client'

export const usePostsStore = defineStore(
  'posts',
  () => {
    // 状态
    const posts = ref<Post[]>([])
    const currentPost = ref<PostDetail | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

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

      try {
        const response = await api.get<PaginatedResponse<Post>>('/posts', {
          params: { ...filters.value, ...apiParams },
        })

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
        loading.value = false
      }
    }

    // 获取单个内容详情
    async function fetchPost(postId: UUID) {
      loading.value = true
      error.value = null

      try {
        const response = await api.get<PostDetail>(`/posts/${postId}`)
        currentPost.value = response
        return response
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
    // 持久化配置 - 使用 sessionStorage 保存会话期间的数据
    persist:
      typeof window !== 'undefined'
        ? {
            storage: sessionStorage,
          }
        : false,
  },
)
