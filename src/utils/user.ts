/**
 * 获取用户显示名称
 * 优先使用 full_name（显示名称），否则回退到 username
 */
export function getUserDisplayName(user: { username: string; full_name?: string | null }): string {
  return user.full_name?.trim() || user.username
}

/**
 * 检查用户是否设置了自定义显示名称
 */
export function hasCustomDisplayName(user: {
  username: string
  full_name?: string | null
}): boolean {
  return !!user.full_name?.trim() && user.full_name !== user.username
}
