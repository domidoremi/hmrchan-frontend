import { computed, type Ref } from 'vue'

import type { HmrHomeContent, HmrPost } from '@/api/hmrContent'

export const HMR_HOME_PLATFORM_ITEMS = ['YouTube', 'Instagram', 'X', 'TikTok', 'Showroom'] as const

export function normalizeHomePosts(
  posts: Array<HmrPost | null | undefined>,
  count: number
): HmrPost[] {
  return posts.slice(0, count).filter((post): post is HmrPost => Boolean(post))
}

export function toCssContentString(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function useHmrHomeView(content: Ref<HmrHomeContent>) {
  const featuredPosts = computed(() => normalizeHomePosts(content.value.featured, 6))

  return {
    cssContent: toCssContentString,
    featuredPosts,
    platformItems: HMR_HOME_PLATFORM_ITEMS,
  }
}
