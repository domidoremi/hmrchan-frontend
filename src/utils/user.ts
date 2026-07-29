export function getUserDisplayName(user: { username: string; full_name?: string | null }): string {
  return user.full_name?.trim() || user.username
}

export function hasCustomDisplayName(user: {
  username: string
  full_name?: string | null
}): boolean {
  return !!user.full_name?.trim() && user.full_name !== user.username
}
