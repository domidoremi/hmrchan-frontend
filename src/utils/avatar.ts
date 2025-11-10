/**
 * 头像工具函数
 */
import { getRuntimeApiBaseUrl } from '@/config/runtime'

/**
 * 生成默认头像URL（使用 UI Avatars API）
 * @param name - 用户名或全名
 * @param size - 图片大小（像素）
 */
export function generateDefaultAvatar(name: string, size: number = 200): string {
  // 使用 UI Avatars 服务生成默认头像
  // https://ui-avatars.com/
  const params = new URLSearchParams({
    name: name || 'User',
    size: size.toString(),
    background: '8B5CF6', // 紫色背景
    color: 'ffffff', // 白色文字
    bold: 'true',
    format: 'svg',
  })

  return `https://ui-avatars.com/api/?${params.toString()}`
}

/**
 * 获取头像URL，如果没有则返回默认头像
 * @param avatarUrl - 用户上传的头像URL
 * @param username - 用户名
 * @param fullName - 全名
 * @param size - 默认头像大小
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  username: string,
  fullName?: string | null,
  size: number = 200,
): string {
  // 如果有头像URL，直接返回
  if (avatarUrl) {
    return avatarUrl
  }

  // 否则生成默认头像
  const displayName = fullName || username || 'User'
  return generateDefaultAvatar(displayName, size)
}

/**
 * 从用户对象获取头像URL
 */
export function getUserAvatar(
  user:
    | {
        avatar_url?: string | null
        username: string
        full_name?: string | null
      }
    | null
    | undefined,
  size: number = 200,
): string {
  if (!user) {
    return generateDefaultAvatar('User', size)
  }

  // 如果有avatar_url
  let avatarUrl = user.avatar_url

  // 开发环境：相对路径直接使用（Vite会代理到后端）
  // 生产环境：相对路径需要拼接完整URL
  if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
    // 开发环境直接使用相对路径，会被Vite代理
    // 生产环境需要根据部署配置处理
    if (import.meta.env.DEV) {
      // 开发环境：直接使用，Vite会代理
      avatarUrl = avatarUrl
    } else {
      // 生产环境：使用HTTPS强制的base URL
      const baseUrl = getRuntimeApiBaseUrl()
      avatarUrl = `${baseUrl}${avatarUrl}`
    }
  }

  return getAvatarUrl(avatarUrl, user.username, user.full_name, size)
}
