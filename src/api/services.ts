/**
 * API服务层 - 根据后端文档实现完整的API调用
 * v2.0 - UUID迁移：所有ID参数已从number改为string (UUID格式)
 */
import { api } from './client'
import { getApiBaseUrl, getApiEndpoint } from '@/utils/url'
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
} from '@/types'

// ========== 认证API ==========

export const authApi = {
  /**
   * 用户注册
   * POST /auth/register
   */
  register(data: { username: string; email: string; password: string; full_name?: string }) {
    return api.post<LoginResponse>('/auth/register', data)
  },

  /**
   * 用户登录
   * POST /auth/login
   */
  login(credentials: LoginRequest) {
    return api.post<LoginResponse>('/auth/login', credentials)
  },

  /**
   * 获取当前用户信息
   * GET /auth/me
   */
  getCurrentUser() {
    return api.get<User>('/auth/me')
  },

  /**
   * 登出（客户端操作，无需调用API）
   */
  logout() {
    // 清除本地存储
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },
}

// ========== 内容API ==========

export const postsApi = {
  /**
   * 获取内容列表
   * GET /posts
   */
  getPosts(params?: PostListParams) {
    return api.get<PaginatedResponse<Post>>('/posts', { params })
  },

  /**
   * 获取单个内容详情
   * GET /posts/{post_id}
   */
  getPostById(postId: UUID) {
    return api.get<PostDetail>(`/posts/${postId}`)
  },

  /**
   * 搜索内容
   * GET /posts?q=keyword
   */
  searchPosts(query: string, params?: Omit<PostListParams, 'q'>) {
    return api.get<PaginatedResponse<Post>>('/posts', {
      params: { ...params, q: query },
    })
  },

  /**
   * 按平台获取内容
   * GET /posts?platform=youtube
   */
  getPostsByPlatform(platform: string, params?: Omit<PostListParams, 'platform'>) {
    return api.get<PaginatedResponse<Post>>('/posts', {
      params: { ...params, platform },
    })
  },

  /**
   * 获取内容统计
   * GET /posts/stats/summary
   */
  getPostStats() {
    return api.get<PostStats>('/posts/stats/summary')
  },
}

// ========== 媒体API ==========

export const mediaApi = {
  /**
   * 获取媒体文件信息
   * GET /media/{media_id}
   */
  getMediaInfo(mediaId: UUID) {
    return api.get<MediaFile>(`/media/${mediaId}`)
  },

  /**
   * 获取媒体流式播放URL
   * 返回完整URL以支持跨域访问
   */
  getStreamUrl(mediaId: UUID) {
    return `${getApiBaseUrl()}${getApiEndpoint().replace(getApiBaseUrl(), '')}/media/${mediaId}/stream`
  },

  /**
   * 获取媒体下载URL
   * 返回完整URL以支持跨域访问
   */
  getDownloadUrl(mediaId: UUID) {
    return `${getApiBaseUrl()}${getApiEndpoint().replace(getApiBaseUrl(), '')}/media/${mediaId}/download`
  },

  /**
   * 获取缩略图URL
   * 返回完整URL以支持跨域访问
   */
  getThumbnailUrl(mediaId: UUID) {
    return `${getApiBaseUrl()}${getApiEndpoint().replace(getApiBaseUrl(), '')}/media/${mediaId}/thumbnail`
  },

  /**
   * 获取字幕URL
   * 返回完整URL以支持跨域访问
   */
  getSubtitleUrl(mediaId: UUID) {
    return `${getApiBaseUrl()}${getApiEndpoint().replace(getApiBaseUrl(), '')}/media/${mediaId}/subtitle`
  },

  /**
   * 下载媒体文件
   */
  async downloadMedia(mediaId: UUID, filename?: string) {
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
  },
}

// ========== 作者API ==========

export const authorsApi = {
  /**
   * 获取作者列表
   * GET /authors
   */
  getAuthors(params?: { page?: number; page_size?: number; platform?: string }) {
    return api.get<PaginatedResponse<AuthorListItem>>('/authors', { params })
  },

  /**
   * 获取单个作者信息
   * GET /authors/{author_id}
   */
  getAuthorById(authorId: UUID) {
    return api.get<Author>(`/authors/${authorId}`)
  },

  /**
   * 获取作者的内容
   * GET /authors/{author_id}/posts
   */
  getAuthorPosts(authorId: UUID, params?: PostListParams) {
    return api.get<PaginatedResponse<Post>>(`/authors/${authorId}/posts`, { params })
  },
}

// ========== 收藏API ==========

export const favoritesApi = {
  /**
   * 获取收藏列表
   * GET /favorites
   */
  getFavorites(params?: { page?: number; page_size?: number; folder_name?: string }) {
    return api.get<PaginatedResponse<Favorite>>('/favorites', { params })
  },

  /**
   * 添加收藏
   * POST /favorites
   */
  addFavorite(data: FavoriteCreate) {
    return api.post<Favorite>('/favorites', data)
  },

  /**
   * 更新收藏
   * PUT /favorites/{favorite_id}
   */
  updateFavorite(favoriteId: UUID, data: FavoriteUpdate) {
    return api.put<Favorite>(`/favorites/${favoriteId}`, data)
  },

  /**
   * 删除收藏
   * DELETE /favorites/{post_id}
   */
  deleteFavorite(postId: UUID) {
    return api.delete(`/favorites/${postId}`)
  },

  /**
   * 获取收藏文件夹列表
   * GET /favorites/folders
   */
  getFolders() {
    return api.get<string[]>('/favorites/folders')
  },

  /**
   * 检查内容是否已收藏
   * GET /favorites/check/{post_id}
   */
  async checkFavorite(
    postId: UUID,
  ): Promise<{ is_favorited: boolean; favorite_id: UUID | null }> {
    return api.get<{ is_favorited: boolean; favorite_id: UUID | null }>(
      `/favorites/check/${postId}`,
      { cache: false }, // 不缓存收藏状态，确保实时性
    )
  },

  /**
   * 检查内容是否已收藏（简化版）
   */
  async isFavorited(postId: UUID): Promise<boolean> {
    try {
      const result = await this.checkFavorite(postId)
      return result.is_favorited
    } catch {
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
    const stats = await postsApi.getPostStats()
    return stats.by_platform || {}
  },

  /**
   * 获取完整统计数据
   */
  async getFullStats() {
    return postsApi.getPostStats()
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
    const formData = new FormData()
    formData.append('file', file)
    return api.post<FileUploadResponse>('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * 为指定用户上传头像（管理员功能）
   * POST /upload/users/{user_id}/avatar
   */
  async uploadUserAvatar(userId: UUID, file: File): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<FileUploadResponse>(`/upload/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
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
}

export default services
