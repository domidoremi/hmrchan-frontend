import type { PostListItem } from '@/api'
import { STATIC_HOME_POSTS } from './generated/publicSnapshots'
import { clonePublicSnapshot } from './publicPageFallback'

export const HOME_FALLBACK_PREFIX = '__home_fallback__'

export function isHomeFallbackPost(post: Pick<PostListItem, 'id'> | null | undefined): boolean {
  return Boolean(post?.id?.startsWith(HOME_FALLBACK_PREFIX))
}

export const HOME_FALLBACK_POSTS: PostListItem[] = clonePublicSnapshot(STATIC_HOME_POSTS)
