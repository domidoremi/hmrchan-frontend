/**
 * API配置
 * 根据FRONTEND-API-GUIDE.md文档
 */

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.momichan.xyz',
  endpoint: import.meta.env.VITE_API_ENDPOINT || 'https://api.momichan.xyz/api',
  wsURL: import.meta.env.VITE_WS_URL || 'wss://api.momichan.xyz/ws',
  timeout: 30000,
}

export const API_ENDPOINTS = {
  // 帖子相关
  POSTS: '/api/posts',
  POST_DETAIL: (id: string) => `/api/posts/${id}`,
  POST_STATS: '/api/posts/stats/summary',
  
  // 媒体相关
  MEDIA: '/api/media',
  MEDIA_DETAIL: (id: string) => `/api/media/${id}`,
  MEDIA_STREAM: (id: string) => `/api/media/${id}/stream`,
  MEDIA_DOWNLOAD: (id: string) => `/api/media/${id}/download`,
  MEDIA_THUMBNAIL: (id: string) => `/api/media/${id}/thumbnail`,
  
  // 作者相关
  AUTHORS: '/api/authors',
  AUTHOR_DETAIL: (id: string) => `/api/authors/${id}`,
  AUTHOR_POSTS: (id: string) => `/api/authors/${id}/posts`,
  
  // 搜索
  SEARCH: '/api/search',
  
  // 认证
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  ME: '/api/auth/me',
  
  // 收藏
  FAVORITES: '/api/favorites',
  FAVORITE_CHECK: (postId: string) => `/api/favorites/check/${postId}`,
  
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
