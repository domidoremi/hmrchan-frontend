/**
 * 头像工具函数
 */

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

  return getAvatarUrl(user.avatar_url, user.username, user.full_name, size)
}
