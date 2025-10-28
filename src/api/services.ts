/**
 * API服务层 - 根据后端文档实现完整的API调用
 */
import { api } from './client'
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
  getPostById(postId: number) {
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
  getMediaInfo(mediaId: number) {
    return api.get<MediaFile>(`/media/${mediaId}`)
  },

  /**
   * 获取媒体流式播放URL
   */
  getStreamUrl(mediaId: number) {
    return `/api/media/${mediaId}/stream`
  },

  /**
   * 获取媒体下载URL
   */
  getDownloadUrl(mediaId: number) {
    return `/api/media/${mediaId}/download`
  },

  /**
   * 获取缩略图URL
   */
  getThumbnailUrl(mediaId: number) {
    return `/api/media/${mediaId}/thumbnail`
  },

  /**
   * 下载媒体文件
   */
  async downloadMedia(mediaId: number, filename?: string) {
    const response = await api.get(`/media/${mediaId}/download`, {
      responseType: 'blob',
    })

    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response]))
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
  getAuthorById(authorId: number) {
    return api.get<Author>(`/authors/${authorId}`)
  },

  /**
   * 获取作者的内容
   * GET /authors/{author_id}/posts
   */
  getAuthorPosts(authorId: number, params?: PostListParams) {
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
  updateFavorite(favoriteId: number, data: FavoriteUpdate) {
    return api.put<Favorite>(`/favorites/${favoriteId}`, data)
  },

  /**
   * 删除收藏
   * DELETE /favorites/{favorite_id}
   */
  deleteFavorite(favoriteId: number) {
    return api.delete(`/favorites/${favoriteId}`)
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
   * POST /favorites/check/{post_id}
   */
  async checkFavorite(
    postId: number,
  ): Promise<{ is_favorited: boolean; favorite_id: number | null }> {
    return api.post<{ is_favorited: boolean; favorite_id: number | null }>(
      `/favorites/check/${postId}`,
    )
  },

  /**
   * 检查内容是否已收藏（简化版）
   */
  async isFavorited(postId: number): Promise<boolean> {
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
  async getPlatformStats() {
    const stats = await postsApi.getPostStats()
    return stats
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
  async uploadUserAvatar(userId: number, file: File): Promise<FileUploadResponse> {
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
