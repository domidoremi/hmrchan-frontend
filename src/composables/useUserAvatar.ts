/**
 * 用户头像管理 Composable
 *
 * 提供统一的头像 URL 获取和缓存机制
 * 解决导航栏、评论区等多处头像不同步的问题
 */

import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores'
import { normalizeAvatarUrl } from '@/api/userService'

// 全局头像缓存（带版本号防止浏览器缓存）
// 使用 Map 存储每个用户的头像版本，避免不必要的缓存破坏
const avatarVersionMap = new Map<string, number>()

// 默认头像生成器
function getDefaultAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
}

/**
 * 获取用户头像 URL（带缓存破坏）
 */
export function getUserAvatarUrl(
  avatarUrl: string | null | undefined,
  username: string | undefined
): string {
  const normalized = normalizeAvatarUrl(avatarUrl)

  if (normalized) {
    // 获取该头像的版本号（如果不存在则创建）
    const cacheKey = normalized
    if (!avatarVersionMap.has(cacheKey)) {
      avatarVersionMap.set(cacheKey, Date.now())
    }
    const version = avatarVersionMap.get(cacheKey)!

    // 添加版本参数以破坏浏览器缓存（仅在头像更新后）
    const separator = normalized.includes('?') ? '&' : '?'
    return `${normalized}${separator}v=${version}`
  }

  return getDefaultAvatar(username || 'default')
}

/**
 * 刷新头像缓存（在头像上传成功后调用）
 */
export function refreshAvatarCache(): void {
  // 清空所有版本号，强制刷新
  avatarVersionMap.clear()
}

/**
 * 使用当前用户头像的 Composable
 * 自动响应 authStore.user 变化
 */
export function useUserAvatar() {
  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)

  const avatarUrl = computed(() => {
    return getUserAvatarUrl(user.value?.avatar_url, user.value?.username)
  })

  // 监听用户变化，自动刷新缓存
  watch(
    () => user.value?.avatar_url,
    (newUrl, oldUrl) => {
      if (newUrl && newUrl !== oldUrl) {
        refreshAvatarCache()
      }
    }
  )

  return {
    avatarUrl,
    refreshAvatarCache,
  }
}

/**
 * 预加载头像图片（提高导航栏头像显示优先级）
 * 使用 Set 防止重复预加载相同的 URL
 */
const preloadedUrls = new Set<string>()

export function preloadUserAvatar(url: string): void {
  if (!url || url.includes('dicebear.com')) return

  // 如果已经预加载过，跳过
  if (preloadedUrls.has(url)) return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = url
  link.fetchPriority = 'high'
  document.head.appendChild(link)

  // 记录已预加载的 URL
  preloadedUrls.add(url)

  // 清理旧的 preload 标签（保留最近 5 个）
  if (preloadedUrls.size > 5) {
    const oldestUrl = preloadedUrls.values().next().value
    preloadedUrls.delete(oldestUrl)

    // 移除对应的 link 标签
    const oldLink = document.querySelector(`link[rel="preload"][href="${oldestUrl}"]`)
    if (oldLink) {
      oldLink.remove()
    }
  }
}
