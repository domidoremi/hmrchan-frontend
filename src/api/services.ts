/**
 * API服务层 - 根据后端文档实现完整的API调用
 * v2.0 - UUID迁移：所有ID参数已从number改为string (UUID格式)
 * v2.1 - 增强错误处理：所有API调用都使用统一的错误处理机制
 */
import { api } from './client'
import { getRuntimeApiEndpoint } from '@/config/runtime'
import { indexedDB } from '@/utils/storage'
import { cacheInvalidation } from '@/utils/cache/cacheInvalidation'
import { handleError } from '@/utils/error'
import logger from '@/utils/logger'
import { toLogContext } from '@/utils/typeGuards'
import type {
  LoginRequest,
  LoginResponse,
  User,
  Post,
  PostDetail,
  PostListParams,
  PaginatedResponse,
  Author,
  AuthorListItem,
  Favorite,
  FavoriteCreate,
  FavoriteUpdate,
  MediaFile,
  PostStats,
  UUID,
  SearchSuggestionResponse,
} from '@/types'

// ========== 认证API ==========

export const authApi = {
  /**
   * 用户注册
   * POST /auth/register
   */
  async register(data: { username: string; email: string; password: string; full_name?: string }) {
    try {
      return await api.post<LoginResponse>('/auth/register', data)
    } catch (error) {
      handleError(error, 'Auth.Register', {
        customMessage: 'Failed to register user',
      })
      throw error
    }
  },

  /**
   * 用户登录
   * POST /auth/login
   */
  async login(credentials: LoginRequest) {
    try {
      return await api.post<LoginResponse>('/auth/login', credentials)
    } catch (error) {
      handleError(error, 'Auth.Login', {
        customMessage: 'Failed to login',
      })
      throw error
    }
  },

  /**
   * 获取当前用户信息
   * GET /auth/me
   */
  async getCurrentUser() {
    try {
      return await api.get<User>('/auth/me')
    } catch (error) {
      handleError(error, 'Auth.GetCurrentUser', {
        customMessage: 'Failed to fetch current user',
      })
      throw error
    }
  },

  /**
   * 登出（客户端操作，无需调用API）
   */
  logout() {
    try {
      // 清除本地存储
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      logger.info('[Auth] User logged out successfully', {})
    } catch (error) {
      logger.error('[Auth] Error during logout', toLogContext(error))
    }
  },
}

// ========== 搜索API ==========

export const searchApi = {
  /**
   * 搜索帖子
   * GET /search/posts?q=keyword
   */
  async searchPosts(query: string, params?: Omit<PostListParams, 'q'>) {
    try {
      return await api.get<PaginatedResponse<Post>>('/search/posts', {
        params: { ...params, q: query },
      })
    } catch (error) {
      handleError(error, 'Search.SearchPosts', {
        customMessage: `Failed to search posts with query: ${query}`,
      })
      throw error
    }
  },

  /**
   * 搜索作者
   * GET /search/authors?q=keyword
   */
  async searchAuthors(
    query: string,
    params?: {
      platform?: string
      is_verified?: boolean
      min_followers?: number
      page?: number
      page_size?: number
    },
  ) {
    try {
      return await api.get<PaginatedResponse<AuthorListItem>>('/search/authors', {
        params: { ...params, q: query },
      })
    } catch (error) {
      handleError(error, 'Search.SearchAuthors', {
        customMessage: `Failed to search authors with query: ${query}`,
      })
      throw error
    }
  },

  /**
   * 搜索联想建议
   * GET /search/suggestions?q=keyword
   */
  async fetchSuggestions(
    query: string,
    params?: {
      type?: 'post' | 'author' | 'all'
      platform?: string
      limit?: number
    },
  ) {
    try {
      return await api.get<SearchSuggestionResponse>('/search/suggestions', {
        params: {
          type: 'all',
          limit: 10,
          ...params,
          q: query,
        },
      })
    } catch (error) {
      handleError(error, 'Search.FetchSuggestions', {
        customMessage: `Failed to fetch search suggestions for: ${query}`,
      })
      throw error
    }
  },
}

// ========== 内容API ==========

export const postsApi = {
  /**
   * 获取内容列表（带缓存）
   * GET /posts/
   * Note: Trailing slash added to avoid 307 redirect to HTTP
   */
  async getPosts(params?: PostListParams) {
    try {
      const response = await api.get<PaginatedResponse<Post>>('/posts/', {
        params,
        cache: true,
        ttl: 60 * 1000, // 1分钟缓存
        useMultiLayerCache: true,
      })

      // 将帖子列表持久化到 IndexedDB（忽略错误，避免影响正常请求）
      try {
        await indexedDB.savePosts(response.items)
      } catch (error) {
        logger.warn('[Posts.GetPosts] Failed to save posts to IndexedDB', toLogContext(error))
      }

      return response
    } catch (error) {
      handleError(error, 'Posts.GetPosts', {
        customMessage: 'Failed to fetch posts',
      })
      throw error
    }
  },

  /**
   * 获取单个内容详情（带缓存）
   * GET /posts/{post_id}
   */
  async getPostById(postId: UUID) {
    try {
      const detail = await api.get<PostDetail>(`/posts/${postId}`, {
        cache: true,
        ttl: 5 * 60 * 1000, // 5分钟缓存
        useMultiLayerCache: true,
      })

      // 将详情也写入 IndexedDB，便于后续作为列表/离线回退使用
      try {
        await indexedDB.savePosts([detail])
      } catch (error) {
        logger.warn(
          '[Posts.GetPostById] Failed to save post detail to IndexedDB',
          toLogContext(error),
        )
      }

      return detail
    } catch (error) {
      handleError(error, 'Posts.GetPostById', {
        customMessage: `Failed to fetch post: ${postId}`,
      })
      throw error
    }
  },

  /**
   * 搜索内容（带缓存）
   * GET /posts/?q=keyword
   * Note: Trailing slash added to avoid 307 redirect to HTTP
   */
  async searchPosts(query: string, params?: Omit<PostListParams, 'q'>) {
    try {
      return await api.get<PaginatedResponse<Post>>('/posts/', {
        params: { ...params, q: query },
        cache: true,
        ttl: 2 * 60 * 1000, // 2分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Posts.SearchPosts', {
        customMessage: `Failed to search posts with query: ${query}`,
      })
      throw error
    }
  },

  /**
   * 按平台获取内容（带缓存）
   * GET /posts/?platform=youtube
   * Note: Trailing slash added to avoid 307 redirect to HTTP
   */
  async getPostsByPlatform(platform: string, params?: Omit<PostListParams, 'platform'>) {
    try {
      return await api.get<PaginatedResponse<Post>>('/posts/', {
        params: { ...params, platform },
        cache: true,
        ttl: 60 * 1000, // 1分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Posts.GetPostsByPlatform', {
        customMessage: `Failed to fetch posts for platform: ${platform}`,
      })
      throw error
    }
  },

  /**
   * 获取内容统计（带缓存）
   * GET /posts/stats/summary
   */
  async getPostStats() {
    try {
      return await api.get<PostStats>('/posts/stats/summary', {
        cache: true,
        ttl: 5 * 60 * 1000, // 5分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Posts.GetPostStats', {
        customMessage: 'Failed to fetch post statistics',
      })
      throw error
    }
  },
}

// ========== 媒体API ==========

export const mediaApi = {
  /**
   * 获取媒体文件信息
   * GET /media/{media_id}
   */
  async getMediaInfo(mediaId: UUID) {
    try {
      return await api.get<MediaFile>(`/media/${mediaId}`)
    } catch (error) {
      handleError(error, 'Media.GetMediaInfo', {
        customMessage: `Failed to fetch media info: ${mediaId}`,
      })
      throw error
    }
  },

  /**
   * 运行时强制 HTTPS（防止构建时内联 HTTP）
   */
  _forceHttps(url: string): string {
    if (typeof window !== 'undefined' && url.startsWith('http://')) {
      return url.replace('http://', 'https://')
    }
    return url
  },

  /**
   * 获取媒体流式播放URL
   * 返回完整URL以支持跨域访问
   */
  getStreamUrl(mediaId: UUID) {
    const url = `${getRuntimeApiEndpoint()}/media/${mediaId}/stream`
    return this._forceHttps(url)
  },

  /**
   * 获取媒体下载URL
   * 返回完整URL以支持跨域访问
   */
  getDownloadUrl(mediaId: UUID) {
    const url = `${getRuntimeApiEndpoint()}/media/${mediaId}/download`
    return this._forceHttps(url)
  },

  /**
   * 获取缩略图URL
   * 返回完整URL以支持跨域访问
   */
  getThumbnailUrl(mediaId: UUID) {
    const url = `${getRuntimeApiEndpoint()}/media/${mediaId}/thumbnail`
    return this._forceHttps(url)
  },

  /**
   * 获取字幕URL
   * 返回完整URL以支持跨域访问
   */
  getSubtitleUrl(mediaId: UUID) {
    const url = `${getRuntimeApiEndpoint()}/media/${mediaId}/subtitle`
    return this._forceHttps(url)
  },

  /**
   * 下载媒体文件
   */
  async downloadMedia(mediaId: UUID, filename?: string) {
    try {
      const response = await api.get<Blob>(`/media/${mediaId}/download`, {
        responseType: 'blob',
      })

      // 创建下载链接
      const url = window.URL.createObjectURL(response)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `media_${mediaId}`
      link.click()
      window.URL.revokeObjectURL(url)

      logger.info('[Media] Downloaded media successfully', { mediaId })
    } catch (error) {
      handleError(error, 'Media.DownloadMedia', {
        customMessage: `Failed to download media: ${mediaId}`,
      })
      throw error
    }
  },
}

// ========== 作者API ==========

export const authorsApi = {
  /**
   * 获取作者列表（带缓存）
   * GET /authors
   */
  async getAuthors(params?: { page?: number; page_size?: number; platform?: string }) {
    try {
      return await api.get<PaginatedResponse<AuthorListItem>>('/authors', {
        params,
        cache: true,
        ttl: 10 * 60 * 1000, // 10分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Authors.GetAuthors', {
        customMessage: 'Failed to fetch authors',
      })
      throw error
    }
  },

  /**
   * 获取单个作者信息（带缓存）
   * GET /authors/{author_id}
   */
  async getAuthorById(authorId: UUID) {
    try {
      return await api.get<Author>(`/authors/${authorId}`, {
        cache: true,
        ttl: 10 * 60 * 1000, // 10分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Authors.GetAuthorById', {
        customMessage: `Failed to fetch author: ${authorId}`,
      })
      throw error
    }
  },

  /**
   * 获取作者的内容（带缓存）
   * GET /authors/{author_id}/posts/
   * Note: Trailing slash added to avoid 307 redirect to HTTP
   */
  async getAuthorPosts(authorId: UUID, params?: PostListParams) {
    try {
      return await api.get<PaginatedResponse<Post>>(`/authors/${authorId}/posts/`, {
        params,
        cache: true,
        ttl: 2 * 60 * 1000, // 2分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Authors.GetAuthorPosts', {
        customMessage: `Failed to fetch posts for author: ${authorId}`,
      })
      throw error
    }
  },
}

// ========== 收藏API ==========

export const favoritesApi = {
  /**
   * 获取收藏列表（带缓存）
   * GET /favorites
   */
  async getFavorites(params?: { page?: number; page_size?: number; folder_name?: string }) {
    try {
      return await api.get<PaginatedResponse<Favorite>>('/favorites', {
        params,
        cache: true,
        ttl: 60 * 1000, // 1分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Favorites.GetFavorites', {
        customMessage: 'Failed to fetch favorites',
      })
      throw error
    }
  },

  /**
   * 添加收藏（带缓存失效）
   * POST /favorites
   */
  async addFavorite(data: FavoriteCreate) {
    try {
      const result = await api.post<Favorite>('/favorites', data, {
        invalidatePatterns: ['/favorites', `/posts/${data.post_id}`],
      })

      // 手动失效相关缓存
      await cacheInvalidation.invalidateByAction('favorites.add', data.post_id)

      logger.info('[Favorites] Added favorite successfully', { postId: data.post_id })
      return result
    } catch (error) {
      handleError(error, 'Favorites.AddFavorite', {
        customMessage: 'Failed to add favorite',
      })
      throw error
    }
  },

  /**
   * 更新收藏（带缓存失效）
   * PUT /favorites/{favorite_id}
   */
  async updateFavorite(favoriteId: UUID, data: FavoriteUpdate) {
    try {
      const result = await api.put<Favorite>(`/favorites/${favoriteId}`, data, {
        invalidatePatterns: ['/favorites', `/favorites/${favoriteId}`],
      })

      logger.info('[Favorites] Updated favorite successfully', { favoriteId })
      return result
    } catch (error) {
      handleError(error, 'Favorites.UpdateFavorite', {
        customMessage: `Failed to update favorite: ${favoriteId}`,
      })
      throw error
    }
  },

  /**
   * 删除收藏（带缓存失效）
   * DELETE /favorites/{post_id}
   */
  async deleteFavorite(postId: UUID) {
    try {
      const result = await api.delete(`/favorites/${postId}`, {
        invalidatePatterns: ['/favorites', `/posts/${postId}`],
      })

      // 手动失效相关缓存
      await cacheInvalidation.invalidateByAction('favorites.remove', postId)

      logger.info('[Favorites] Deleted favorite successfully', { postId })
      return result
    } catch (error) {
      handleError(error, 'Favorites.DeleteFavorite', {
        customMessage: `Failed to delete favorite: ${postId}`,
      })
      throw error
    }
  },

  /**
   * 获取收藏文件夹列表（带缓存）
   * GET /favorites/folders
   */
  async getFolders() {
    try {
      return await api.get<string[]>('/favorites/folders', {
        cache: true,
        ttl: 5 * 60 * 1000, // 5分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Favorites.GetFolders', {
        customMessage: 'Failed to fetch favorite folders',
      })
      throw error
    }
  },

  /**
   * 检查内容是否已收藏
   * GET /favorites/check/{post_id}
   */
  async checkFavorite(postId: UUID): Promise<{ is_favorited: boolean; favorite_id: UUID | null }> {
    try {
      return await api.get<{ is_favorited: boolean; favorite_id: UUID | null }>(
        `/favorites/check/${postId}`,
        { cache: false }, // 不缓存收藏状态，确保实时性
      )
    } catch (error) {
      handleError(error, 'Favorites.CheckFavorite', {
        customMessage: `Failed to check favorite status: ${postId}`,
        silent: true, // 静默处理，不显示toast
      })
      throw error
    }
  },

  /**
   * 检查内容是否已收藏（简化版）
   */
  async isFavorited(postId: UUID): Promise<boolean> {
    try {
      const result = await this.checkFavorite(postId)
      return result.is_favorited
    } catch (error) {
      logger.warn(
        '[Favorites] Failed to check favorite status, returning false',
        toLogContext(error),
      )
      return false
    }
  },
}

// ========== 统计API ==========

export const statsApi = {
  /**
   * 获取平台统计
   */
  async getPlatformStats(): Promise<Record<string, number>> {
    try {
      const stats = await postsApi.getPostStats()
      return stats.by_platform || {}
    } catch (error) {
      handleError(error, 'Stats.GetPlatformStats', {
        customMessage: 'Failed to fetch platform statistics',
      })
      throw error
    }
  },

  /**
   * 获取完整统计数据
   */
  async getFullStats() {
    try {
      return await postsApi.getPostStats()
    } catch (error) {
      handleError(error, 'Stats.GetFullStats', {
        customMessage: 'Failed to fetch full statistics',
      })
      throw error
    }
  },
}

// ========== 上传API ==========

export interface FileUploadResponse {
  filename: string
  url: string
  size: number
  content_type: string
  hash: string
  uploaded_at: string
}

export const uploadApi = {
  /**
   * 上传头像
   * POST /upload/avatar
   */
  async uploadAvatar(file: File): Promise<FileUploadResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.post<FileUploadResponse>('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      logger.info('[Upload] Avatar uploaded successfully', {})
      return result
    } catch (error) {
      handleError(error, 'Upload.UploadAvatar', {
        customMessage: 'Failed to upload avatar',
      })
      throw error
    }
  },

  /**
   * 为指定用户上传头像（管理员功能）
   * POST /upload/users/{user_id}/avatar
   */
  async uploadUserAvatar(userId: UUID, file: File): Promise<FileUploadResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.post<FileUploadResponse>(
        `/upload/users/${userId}/avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      )

      logger.info('[Upload] User avatar uploaded successfully', { userId })
      return result
    } catch (error) {
      handleError(error, 'Upload.UploadUserAvatar', {
        customMessage: `Failed to upload avatar for user: ${userId}`,
      })
      throw error
    }
  },
}

// 导出所有API服务
export const services = {
  auth: authApi,
  posts: postsApi,
  media: mediaApi,
  authors: authorsApi,
  favorites: favoritesApi,
  stats: statsApi,
  upload: uploadApi,
  search: searchApi,
}

export default services
