/**
 * API 服务层
 *
 * 主要功能：
 * - 封装所有后端 API 调用
 * - 提供类型安全的 API 接口
 * - 统一错误处理和日志记录
 * - 支持缓存策略和缓存失效
 * - 集成国际化错误消息
 *
 * 版本历史：
 * - v2.0: UUID 迁移，所有 ID 参数从 number 改为 string (UUID 格式)
 * - v2.1: 增强错误处理，统一错误处理机制
 * - v2.2: 国际化支持，所有错误消息使用 i18n
 */
import { api } from './client'
import { getRuntimeApiEndpoint } from '@/config/runtime'
import { indexedDB } from '@/utils/storage'
import { postCache } from '@/utils/cache'
import { cacheInvalidation } from '@/utils/cache/cacheInvalidation'
import { handleError } from '@/utils'
import logger from '@/utils/logger'
import { toLogContext } from '@/utils/typeGuards'
import i18n from '@/i18n'
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
  VerifyPasswordResponse,
  VerifyIdentityRequest,
  VerifyIdentityResponse,
} from '@/types'

/**
 * 获取国际化文本
 *
 * @param key - 国际化键名
 * @returns 翻译后的文本
 */
const t = (key: string): string => {
  return i18n.global.t(key) as string
}

/**
 * 认证 API
 *
 * 提供用户认证相关的 API 调用
 */
export const authApi = {
  /**
   * 用户注册
   *
   * @param data - 注册信息
   * @param data.username - 用户名
   * @param data.email - 邮箱
   * @param data.password - 密码
   * @param data.full_name - 可选，全名
   * @returns 登录响应（包含 token 和用户信息）
   *
   * @example
   * const response = await authApi.register({
   *   username: 'john',
   *   email: 'john@example.com',
   *   password: 'password123'
   * })
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
   *
   * @param credentials - 登录凭证
   * @param credentials.username - 用户名
   * @param credentials.password - 密码
   * @returns 登录响应（包含 token 和用户信息）
   *
   * @example
   * const response = await authApi.login({
   *   username: 'john',
   *   password: 'password123'
   * })
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
   *
   * @returns 当前登录用户的详细信息
   *
   * @example
   * const user = await authApi.getCurrentUser()
   */
  async getCurrentUser() {
    try {
      return await api.get<User>('/auth/me')
    } catch (error) {
      handleError(error, 'Auth.GetCurrentUser', {
        customMessage: t('api.fetchCurrentUser'),
      })
      throw error
    }
  },

  /**
   * 用户登出
   *
   * 客户端操作，清除本地存储的认证信息
   *
   * @example
   * authApi.logout()
   */
  logout() {
    try {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      logger.info('[Auth] User logged out successfully', {})
    } catch (error) {
      logger.error('[Auth] Error during logout', toLogContext(error))
    }
  },

  /**
   * 验证密码
   *
   * 用于敏感操作前验证用户密码
   *
   * @param password - 当前用户密码
   * @returns 验证结果和验证令牌
   *
   * @example
   * const result = await authApi.verifyPassword('password123')
   * if (result.verified) {
   *   // 使用 result.verification_token 进行敏感操作
   * }
   */
  async verifyPassword(password: string): Promise<VerifyPasswordResponse> {
    try {
      return await api.post<VerifyPasswordResponse>('/auth/verify-password', { password })
    } catch (error) {
      handleError(error, 'Auth.VerifyPassword', {
        customMessage: t('api.verifyPasswordFailed'),
      })
      throw error
    }
  },

  /**
   * 身份验证（二次验证）
   *
   * 用于执行敏感操作前验证用户身份
   *
   * @param data - 验证信息
   * @param data.password - 当前用户密码
   * @param data.action - 敏感操作类型
   * @param data.resource_id - 可选，操作的资源 ID
   * @returns 验证结果和验证令牌
   *
   * @example
   * const result = await authApi.verifyIdentity({
   *   password: 'password123',
   *   action: 'delete_account'
   * })
   */
  async verifyIdentity(data: VerifyIdentityRequest): Promise<VerifyIdentityResponse> {
    try {
      return await api.post<VerifyIdentityResponse>('/auth/verify-identity', data)
    } catch (error) {
      handleError(error, 'Auth.VerifyIdentity', {
        customMessage: t('api.verifyIdentityFailed'),
      })
      throw error
    }
  },
}

/**
 * 搜索 API
 *
 * 提供内容和作者的搜索功能
 */
export const searchApi = {
  /**
   * 搜索帖子
   *
   * @param query - 搜索关键词
   * @param params - 可选，额外的查询参数（分页、排序等）
   * @returns 分页的帖子列表
   *
   * @example
   * const results = await searchApi.searchPosts('Vue', { page: 1, page_size: 20 })
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
   *
   * @param query - 搜索关键词
   * @param params - 可选，筛选参数
   * @param params.platform - 平台筛选
   * @param params.is_verified - 是否认证
   * @param params.min_followers - 最小粉丝数
   * @param params.page - 页码
   * @param params.page_size - 每页数量
   * @returns 分页的作者列表
   *
   * @example
   * const results = await searchApi.searchAuthors('John', { platform: 'youtube' })
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
   * 获取搜索联想建议
   *
   * @param query - 搜索关键词
   * @param params - 可选，筛选参数
   * @param params.type - 建议类型（post/author/all）
   * @param params.platform - 平台筛选
   * @param params.limit - 返回数量限制
   * @returns 搜索建议列表
   *
   * @example
   * const suggestions = await searchApi.fetchSuggestions('Vue', { type: 'all', limit: 10 })
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
        customMessage: t('api.fetchSuggestions'),
      })
      throw error
    }
  },
}

/**
 * 内容 API
 *
 * 提供帖子内容的增删改查功能
 */
export const postsApi = {
  /**
   * 获取内容列表
   *
   * 启用多层缓存（1 分钟 TTL）
   *
   * @param params - 可选，查询参数
   * @param params.page - 页码
   * @param params.page_size - 每页数量
   * @param params.platform - 平台筛选
   * @param params.author_id - 作者筛选
   * @returns 分页的帖子列表
   *
   * @example
   * const posts = await postsApi.getPosts({ page: 1, page_size: 20 })
   */
  async getPosts(params?: PostListParams) {
    try {
      const response = await api.get<PaginatedResponse<Post>>('/posts', {
        ...(params !== undefined && { params }),
        cache: true,
        ttl: 60 * 1000, // 1分钟缓存
        useMultiLayerCache: true,
      })

      try {
        await indexedDB.savePosts(response.items)
      } catch (error) {
        logger.warn('[Posts.GetPosts] Failed to save posts to IndexedDB', toLogContext(error))
      }

      return response
    } catch (error) {
      handleError(error, 'Posts.GetPosts', {
        customMessage: t('api.fetchPosts'),
      })
      throw error
    }
  },

  /**
   * 获取单个内容详情
   *
   * 使用统一帖子缓存服务，支持完整离线访问（含 media_files）
   * 缓存策略：先返回缓存，后台更新（Stale-While-Revalidate）
   *
   * @param postId - 帖子 UUID
   * @param options - 可选配置
   * @param options.forceRefresh - 强制刷新，跳过缓存
   * @returns 帖子详情（含 media_files 和 tags）
   *
   * @example
   * const post = await postsApi.getPostById('123e4567-e89b-12d3-a456-426614174000')
   */
  async getPostById(postId: UUID, options?: { forceRefresh?: boolean }) {
    const { forceRefresh = false } = options || {}

    try {
      // 1. 先检查缓存（除非强制刷新）
      if (!forceRefresh) {
        const cached = await postCache.getPost(postId)
        if (cached.data) {
          logger.debug(`[Posts.GetPostById] Cache ${cached.source}: ${postId}`, {
            isStale: cached.isStale,
          })

          // 如果缓存过期，后台更新
          if (cached.isStale) {
            this.refreshPostInBackground(postId)
          }

          return cached.data
        }
      }

      // 2. 从网络获取
      const detail = await api.get<PostDetail>(`/posts/${postId}`, {
        cache: false, // SW 层已有缓存，这里不需要重复
      })

      // 3. 缓存完整帖子详情（含 media_files）
      try {
        await postCache.cachePost(detail)
        logger.debug(
          `[Posts.GetPostById] Cached: ${postId} with ${detail.media_files?.length || 0} media files`,
        )
      } catch (error) {
        logger.warn('[Posts.GetPostById] Failed to cache post detail', toLogContext(error))
      }

      return detail
    } catch (error) {
      // 网络失败时尝试返回缓存
      const cached = await postCache.getPost(postId)
      if (cached.data) {
        logger.warn(`[Posts.GetPostById] Network failed, using cache for: ${postId}`)
        return cached.data
      }

      handleError(error, 'Posts.GetPostById', {
        customMessage: t('api.fetchPostById'),
      })
      throw error
    }
  },

  /**
   * 后台刷新帖子数据（不阻塞 UI）
   */
  async refreshPostInBackground(postId: UUID) {
    try {
      const detail = await api.get<PostDetail>(`/posts/${postId}`, { cache: false })
      await postCache.cachePost(detail)
      logger.debug(`[Posts.RefreshBackground] Updated: ${postId}`)
    } catch (error) {
      logger.warn(`[Posts.RefreshBackground] Failed for: ${postId}`, toLogContext(error))
    }
  },

  /**
   * 搜索内容
   *
   * 启用多层缓存（2 分钟 TTL）
   *
   * @param query - 搜索关键词
   * @param params - 可选，额外的查询参数
   * @returns 分页的帖子列表
   *
   * @example
   * const results = await postsApi.searchPosts('Vue', { page: 1 })
   */
  async searchPosts(query: string, params?: Omit<PostListParams, 'q'>) {
    try {
      return await api.get<PaginatedResponse<Post>>('/posts', {
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
   * 按平台获取内容
   *
   * 启用多层缓存（1 分钟 TTL）
   *
   * @param platform - 平台名称（如 youtube、bilibili）
   * @param params - 可选，额外的查询参数
   * @returns 分页的帖子列表
   *
   * @example
   * const posts = await postsApi.getPostsByPlatform('youtube', { page: 1 })
   */
  async getPostsByPlatform(platform: string, params?: Omit<PostListParams, 'platform'>) {
    try {
      return await api.get<PaginatedResponse<Post>>('/posts', {
        params: { ...params, platform },
        cache: true,
        ttl: 60 * 1000, // 1分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Posts.GetPostsByPlatform', {
        customMessage: t('api.fetchPostsByPlatform'),
      })
      throw error
    }
  },

  /**
   * 获取内容统计
   *
   * 启用多层缓存（5 分钟 TTL）
   *
   * @returns 内容统计数据（总数、按平台分组等）
   *
   * @example
   * const stats = await postsApi.getPostStats()
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
        customMessage: t('api.fetchPostStats'),
      })
      throw error
    }
  },
}

/**
 * 媒体 API
 *
 * 提供媒体文件的获取、流式播放、下载等功能
 */
export const mediaApi = {
  /**
   * 获取媒体文件信息
   *
   * @param mediaId - 媒体文件 UUID
   * @returns 媒体文件详细信息
   *
   * @example
   * const media = await mediaApi.getMediaInfo('123e4567-e89b-12d3-a456-426614174000')
   */
  async getMediaInfo(mediaId: UUID) {
    try {
      return await api.get<MediaFile>(`/media/${mediaId}`)
    } catch (error) {
      handleError(error, 'Media.GetMediaInfo', {
        customMessage: t('api.fetchMediaInfo'),
      })
      throw error
    }
  },

  /**
   * 强制 URL 使用 HTTPS
   *
   * 运行时检测，防止构建时内联 HTTP
   *
   * @param url - 原始 URL
   * @returns HTTPS URL
   */
  _forceHttps(url: string): string {
    if (typeof window !== 'undefined' && url.startsWith('http://')) {
      return url.replace('http://', 'https://')
    }
    return url
  },

  /**
   * 获取媒体流式播放 URL
   *
   * @param mediaId - 媒体文件 UUID
   * @returns 流式播放 URL
   *
   * @example
   * const streamUrl = mediaApi.getStreamUrl('123e4567-e89b-12d3-a456-426614174000')
   * videoElement.src = streamUrl
   */
  getStreamUrl(mediaId: UUID) {
    const url = `${getRuntimeApiEndpoint()}/media/${mediaId}/stream`
    return this._forceHttps(url)
  },

  /**
   * 获取媒体下载 URL
   *
   * @param mediaId - 媒体文件 UUID
   * @returns 下载 URL
   *
   * @example
   * const downloadUrl = mediaApi.getDownloadUrl('123e4567-e89b-12d3-a456-426614174000')
   */
  getDownloadUrl(mediaId: UUID) {
    const url = `${getRuntimeApiEndpoint()}/media/${mediaId}/download`
    return this._forceHttps(url)
  },

  /**
   * 获取缩略图 URL
   *
   * @param mediaId - 媒体文件 UUID
   * @returns 缩略图 URL
   *
   * @example
   * const thumbnailUrl = mediaApi.getThumbnailUrl('123e4567-e89b-12d3-a456-426614174000')
   */
  getThumbnailUrl(mediaId: UUID) {
    const url = `${getRuntimeApiEndpoint()}/media/${mediaId}/thumbnail`
    return this._forceHttps(url)
  },

  /**
   * 获取字幕 URL
   *
   * @param mediaId - 媒体文件 UUID
   * @returns 字幕 URL
   *
   * @example
   * const subtitleUrl = mediaApi.getSubtitleUrl('123e4567-e89b-12d3-a456-426614174000')
   */
  getSubtitleUrl(mediaId: UUID) {
    const url = `${getRuntimeApiEndpoint()}/media/${mediaId}/subtitle`
    return this._forceHttps(url)
  },

  /**
   * 下载媒体文件
   *
   * 触发浏览器下载
   *
   * @param mediaId - 媒体文件 UUID
   * @param filename - 可选，下载文件名
   *
   * @example
   * await mediaApi.downloadMedia('123e4567-e89b-12d3-a456-426614174000', 'video.mp4')
   */
  async downloadMedia(mediaId: UUID, filename?: string) {
    try {
      const response = await api.getBlob(`/media/${mediaId}/download`)

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

/**
 * 作者 API
 *
 * 提供作者信息的查询功能
 */
export const authorsApi = {
  /**
   * 获取作者列表
   *
   * 启用多层缓存（10 分钟 TTL）
   *
   * @param params - 可选，查询参数
   * @param params.page - 页码
   * @param params.page_size - 每页数量
   * @param params.platform - 平台筛选
   * @returns 分页的作者列表
   *
   * @example
   * const authors = await authorsApi.getAuthors({ page: 1, platform: 'youtube' })
   */
  async getAuthors(params?: { page?: number; page_size?: number; platform?: string }) {
    try {
      return await api.get<PaginatedResponse<AuthorListItem>>('/authors', {
        ...(params !== undefined && { params }),
        cache: true,
        ttl: 10 * 60 * 1000, // 10分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Authors.GetAuthors', {
        customMessage: t('api.fetchAuthors'),
      })
      throw error
    }
  },

  /**
   * 获取单个作者信息
   *
   * 启用多层缓存（10 分钟 TTL）
   *
   * @param authorId - 作者 UUID
   * @returns 作者详细信息
   *
   * @example
   * const author = await authorsApi.getAuthorById('123e4567-e89b-12d3-a456-426614174000')
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
        customMessage: t('api.fetchAuthorById'),
      })
      throw error
    }
  },

  /**
   * 获取作者的内容
   *
   * 启用多层缓存（2 分钟 TTL）
   *
   * @param authorId - 作者 UUID
   * @param params - 可选，查询参数
   * @returns 分页的帖子列表
   *
   * @example
   * const posts = await authorsApi.getAuthorPosts('123e4567-e89b-12d3-a456-426614174000', { page: 1 })
   */
  async getAuthorPosts(authorId: UUID, params?: PostListParams) {
    try {
      return await api.get<PaginatedResponse<Post>>(`/authors/${authorId}/posts`, {
        ...(params !== undefined && { params }),
        cache: true,
        ttl: 2 * 60 * 1000, // 2分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Authors.GetAuthorPosts', {
        customMessage: t('api.fetchAuthorPosts'),
      })
      throw error
    }
  },
}

/**
 * 收藏 API
 *
 * 提供收藏的增删改查功能
 */
export const favoritesApi = {
  /**
   * 获取收藏列表
   *
   * 启用多层缓存（1 分钟 TTL）
   *
   * @param params - 可选，查询参数
   * @param params.page - 页码
   * @param params.page_size - 每页数量
   * @param params.folder_name - 文件夹筛选
   * @returns 分页的收藏列表
   *
   * @example
   * const favorites = await favoritesApi.getFavorites({ page: 1, folder_name: 'Tech' })
   */
  async getFavorites(params?: { page?: number; page_size?: number; folder_name?: string }) {
    try {
      return await api.get<PaginatedResponse<Favorite>>('/favorites', {
        ...(params !== undefined && { params }),
        cache: true,
        ttl: 60 * 1000, // 1分钟缓存
        useMultiLayerCache: true,
      })
    } catch (error) {
      handleError(error, 'Favorites.GetFavorites', {
        customMessage: t('api.fetchFavorites'),
      })
      throw error
    }
  },

  /**
   * 添加收藏
   *
   * 自动失效相关缓存
   *
   * @param data - 收藏数据
   * @param data.post_id - 帖子 UUID
   * @param data.folder_name - 可选，文件夹名称
   * @param data.notes - 可选，备注
   * @returns 创建的收藏记录
   *
   * @example
   * const favorite = await favoritesApi.addFavorite({
   *   post_id: '123e4567-e89b-12d3-a456-426614174000',
   *   folder_name: 'Tech'
   * })
   */
  async addFavorite(data: FavoriteCreate) {
    try {
      const result = await api.post<Favorite>('/favorites', data, {
        invalidatePatterns: ['/favorites', `/posts/${data.post_id}`],
      })

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
   * 更新收藏
   *
   * 自动失效相关缓存
   *
   * @param favoriteId - 收藏记录 UUID
   * @param data - 更新数据
   * @param data.folder_name - 可选，文件夹名称
   * @param data.notes - 可选，备注
   * @returns 更新后的收藏记录
   *
   * @example
   * const favorite = await favoritesApi.updateFavorite('123e4567-e89b-12d3-a456-426614174000', {
   *   folder_name: 'New Folder'
   * })
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
   * 删除收藏
   *
   * 自动失效相关缓存
   *
   * @param postId - 帖子 UUID
   *
   * @example
   * await favoritesApi.deleteFavorite('123e4567-e89b-12d3-a456-426614174000')
   */
  async deleteFavorite(postId: UUID) {
    try {
      const result = await api.delete(`/favorites/${postId}`, {
        invalidatePatterns: ['/favorites', `/posts/${postId}`],
      })

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
   * 获取收藏文件夹列表
   *
   * 启用多层缓存（5 分钟 TTL）
   *
   * @returns 文件夹名称列表
   *
   * @example
   * const folders = await favoritesApi.getFolders()
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
        customMessage: t('api.fetchFolders'),
      })
      throw error
    }
  },

  /**
   * 检查内容是否已收藏
   *
   * 不使用缓存，确保实时性
   *
   * @param postId - 帖子 UUID
   * @returns 收藏状态和收藏记录 ID
   *
   * @example
   * const { is_favorited, favorite_id } = await favoritesApi.checkFavorite('123e4567-e89b-12d3-a456-426614174000')
   */
  async checkFavorite(postId: UUID): Promise<{ is_favorited: boolean; favorite_id: UUID | null }> {
    try {
      return await api.get<{ is_favorited: boolean; favorite_id: UUID | null }>(
        `/favorites/check/${postId}`,
        { cache: false },
      )
    } catch (error) {
      handleError(error, 'Favorites.CheckFavorite', {
        customMessage: `Failed to check favorite status: ${postId}`,
        silent: true,
      })
      throw error
    }
  },

  /**
   * 检查内容是否已收藏（简化版）
   *
   * 只返回布尔值，失败时返回 false
   *
   * @param postId - 帖子 UUID
   * @returns 是否已收藏
   *
   * @example
   * const isFavorited = await favoritesApi.isFavorited('123e4567-e89b-12d3-a456-426614174000')
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

/**
 * 统计 API
 *
 * 提供各类统计数据的查询功能
 */
export const statsApi = {
  /**
   * 获取平台统计
   *
   * @returns 按平台分组的统计数据
   *
   * @example
   * const stats = await statsApi.getPlatformStats()
   * console.log('YouTube posts:', stats.youtube)
   */
  async getPlatformStats(): Promise<Record<string, number>> {
    try {
      const stats = await postsApi.getPostStats()
      return stats.by_platform || {}
    } catch (error) {
      handleError(error, 'Stats.GetPlatformStats', {
        customMessage: t('api.fetchPlatformStats'),
      })
      throw error
    }
  },

  /**
   * 获取完整统计数据
   *
   * @returns 完整的统计数据（包含总数、按平台分组等）
   *
   * @example
   * const stats = await statsApi.getFullStats()
   */
  async getFullStats() {
    try {
      return await postsApi.getPostStats()
    } catch (error) {
      handleError(error, 'Stats.GetFullStats', {
        customMessage: t('api.fetchFullStats'),
      })
      throw error
    }
  },
}

/**
 * 文件上传响应类型
 */
export interface FileUploadResponse {
  /** 文件名 */
  filename: string
  /** 文件 URL */
  url: string
  /** 文件大小（字节） */
  size: number
  /** 内容类型 */
  content_type: string
  /** 文件哈希值 */
  hash: string
  /** 上传时间 */
  uploaded_at: string
}

/**
 * 上传 API
 *
 * 提供文件上传功能
 */
export const uploadApi = {
  /**
   * 上传头像
   *
   * @param file - 头像文件
   * @returns 上传响应（包含文件 URL 等信息）
   *
   * @example
   * const response = await uploadApi.uploadAvatar(file)
   * console.log('Avatar URL:', response.url)
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
   * 为指定用户上传头像
   *
   * 管理员功能
   *
   * @param userId - 用户 UUID
   * @param file - 头像文件
   * @returns 上传响应（包含文件 URL 等信息）
   *
   * @example
   * const response = await uploadApi.uploadUserAvatar('123e4567-e89b-12d3-a456-426614174000', file)
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

/**
 * 统一导出所有 API 服务
 *
 * @example
 * import { services } from '@/api/services'
 * const posts = await services.posts.getPosts()
 */
export const services = {
  /** 认证 API */
  auth: authApi,
  /** 内容 API */
  posts: postsApi,
  /** 媒体 API */
  media: mediaApi,
  /** 作者 API */
  authors: authorsApi,
  /** 收藏 API */
  favorites: favoritesApi,
  /** 统计 API */
  stats: statsApi,
  /** 上传 API */
  upload: uploadApi,
  /** 搜索 API */
  search: searchApi,
}

export default services
