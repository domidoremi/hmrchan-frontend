/**
 * 用户头像管理 Composable
 *
 * 提供统一的头像 URL 获取和缓存机制
 * 解决导航栏、评论区等多处头像不同步的问题
 */

import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores'
import { normalizeAvatarUrl } from '@/api/userService'

// 全局头像缓存（带版本号防止浏览器缓存）
const avatarVersion = ref(Date.now())
const DEFAULT_AVATAR = '/images/expressions/sitting-sm.webp'

// 默认头像生成器
function getDefaultAvatar(): string {
  return DEFAULT_AVATAR
}

/**
 * 获取用户头像 URL（带缓存破坏）
 */
export function getUserAvatarUrl(avatarUrl: string | null | undefined): string {
  const normalized = normalizeAvatarUrl(avatarUrl)

  if (normalized) {
    // 添加版本参数以破坏浏览器缓存（仅在头像更新后）
    const separator = normalized.includes('?') ? '&' : '?'
    return `${normalized}${separator}v=${avatarVersion.value}`
  }

  return getDefaultAvatar()
}

/**
 * 刷新头像缓存（在头像上传成功后调用）
 */
export function refreshAvatarCache(): void {
  avatarVersion.value = Date.now()
}

/**
 * 使用当前用户头像的 Composable
 * 自动响应 authStore.user 变化
 */
export function useUserAvatar() {
  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)

  const avatarUrl = computed(() => {
    return getUserAvatarUrl(user.value?.avatar_url)
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
 * 使用 Map 存储 URL 和对应的 link 元素，防止重复预加载
 */
const MAX_PRELOADED_AVATARS = 5
const preloadCache = new Map<string, HTMLLinkElement>()

export function preloadUserAvatar(url: string): void {
  if (!url || url === DEFAULT_AVATAR) return

  // 如果已经预加载过，跳过
  if (preloadCache.has(url)) return

  try {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = url
    // TypeScript 可能不识别 fetchPriority，使用类型断言
    ;(link as HTMLLinkElement & { fetchPriority: string }).fetchPriority = 'high'
    document.head.appendChild(link)

    // 记录已预加载的 URL 和对应的 link 元素
    preloadCache.set(url, link)

    // 清理旧的 preload 标签（保留最近 5 个）
    if (preloadCache.size > MAX_PRELOADED_AVATARS) {
      const oldestUrl = preloadCache.keys().next().value
      if (oldestUrl) {
        const oldLink = preloadCache.get(oldestUrl)
        if (oldLink) {
          oldLink.remove()
        }
        preloadCache.delete(oldestUrl)
      }
    }
  } catch (error) {
    // 静默失败，预加载失败不应影响应用功能
    if (import.meta.env.DEV) {
      console.warn('Failed to preload avatar:', url, error)
    }
  }
}

/**
 * 清理所有预加载的头像（用于测试或内存清理）
 */
export function clearAvatarPreloadCache(): void {
  preloadCache.forEach((link) => link.remove())
  preloadCache.clear()
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearAvatarPreloadCache()
  })
}
