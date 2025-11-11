/**
 * Posts组合式函数 - 提供帖子数据获取和管理功能
 */
import { ref, computed } from 'vue'
import { api } from '@/api/client'
import type { Post, PostDetail, PostListParams, PaginatedResponse } from '@/types'

export function usePosts() {
  const posts = ref<Post[]>([])
  const currentPost = ref<PostDetail | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pagination = ref({
    page: 1,
    page_size: 20,
    total: 0,
    pages: 0,
  })

  /**
   * 获取帖子列表
   */
  const fetchPosts = async (params?: PostListParams) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.get<PaginatedResponse<Post>>('/posts', { params })

      posts.value = response.items
      pagination.value = {
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        pages: response.pages,
      }

      return response
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch posts'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取单个帖子详情
   */
  const fetchPostDetail = async (postId: number) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.get<PostDetail>(`/posts/${postId}`)
      currentPost.value = response
      return response
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch post detail'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 搜索帖子
   */
  const searchPosts = async (query: string, params?: Omit<PostListParams, 'q'>) => {
    return fetchPosts({ ...params, q: query })
  }

  /**
   * 按平台筛选
   */
  const fetchPostsByPlatform = async (
    platform: string,
    params?: Omit<PostListParams, 'platform'>,
  ) => {
    return fetchPosts({ ...params, platform })
  }

  /**
   * 重置数据
   */
  const reset = () => {
    posts.value = []
    currentPost.value = null
    error.value = null
    pagination.value = {
      page: 1,
      page_size: 20,
      total: 0,
      pages: 0,
    }
  }

  const hasMore = computed(() => pagination.value.page < pagination.value.pages)

  return {
    // 状态
    posts,
    currentPost,
    loading,
    error,
    pagination,
    hasMore,

    // 方法
    fetchPosts,
    fetchPostDetail,
    searchPosts,
    fetchPostsByPlatform,
    reset,
  }
}
