/**
 * API配置
 * 根据FRONTEND-API-GUIDE.md文档
 */
import { getApiBaseUrl, getApiEndpoint } from '@/utils/url'

export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  endpoint: getApiEndpoint(),
  wsURL: import.meta.env.VITE_WS_URL || 'wss://api.momichan.xyz/ws',
  timeout: 30000,
}

// 导出API_BASE_URL供组件使用
export const API_BASE_URL = API_CONFIG.baseURL

export const API_ENDPOINTS = {
  // 帖子相关
  POSTS: '/api/v1/posts',
  POST_DETAIL: (id: string) => `/api/v1/posts/${id}`,
  POST_STATS: '/api/v1/posts/stats/summary',
  
  // 媒体相关
  MEDIA: '/api/v1/media',
  MEDIA_DETAIL: (id: string) => `/api/v1/media/${id}`,
  MEDIA_STREAM: (id: string) => `/api/v1/media/${id}/stream`,
  MEDIA_DOWNLOAD: (id: string) => `/api/v1/media/${id}/download`,
  MEDIA_THUMBNAIL: (id: string) => `/api/v1/media/${id}/thumbnail`,
  
  // 作者相关
  AUTHORS: '/api/v1/authors',
  AUTHOR_DETAIL: (id: string) => `/api/v1/authors/${id}`,
  AUTHOR_POSTS: (id: string) => `/api/v1/authors/${id}/posts`,
  
  // 搜索
  SEARCH: '/api/v1/search',
  
  // 认证
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  ME: '/api/v1/auth/me',
  
  // 收藏
  FAVORITES: '/api/v1/favorites',
  FAVORITE_CHECK: (postId: string) => `/api/v1/favorites/check/${postId}`,
  
  // 健康检查
  HEALTH: '/health',
}

/**
 * 支持的平台
 */
export const SUPPORTED_PLATFORMS = {
  TWITTER: 'twitter' as const,
  YOUTUBE: 'youtube' as const,
  TIKTOK: 'tiktok' as const,
  INSTAGRAM: 'instagram' as const, // 暂时禁用
}

/**
 * 平台状态
 */
export const PLATFORM_STATUS = {
  [SUPPORTED_PLATFORMS.TWITTER]: true,
  [SUPPORTED_PLATFORMS.YOUTUBE]: true,
  [SUPPORTED_PLATFORMS.TIKTOK]: true,
  [SUPPORTED_PLATFORMS.INSTAGRAM]: false, // 暂时禁用
}
