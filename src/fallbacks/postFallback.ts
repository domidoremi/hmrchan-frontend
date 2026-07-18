import type { PostDetailResponse, PostListItem } from '@/api/postService'
import { STATIC_HOME_POSTS, STATIC_POST_DETAILS } from './generated/publicSnapshots'
import { EXPLORE_FALLBACK_POSTS } from './exploreFallback'
import { clonePublicSnapshot } from './publicPageFallback'

const FALLBACK_POSTS: PostListItem[] = [
  ...clonePublicSnapshot(STATIC_HOME_POSTS),
  ...clonePublicSnapshot(EXPLORE_FALLBACK_POSTS),
]

function uniquePosts(posts: PostListItem[]): PostListItem[] {
  const seen = new Set<string>()
  return posts.filter((post) => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })
}

const UNIQUE_FALLBACK_POSTS = uniquePosts(FALLBACK_POSTS)

export function buildFallbackPostDetail(post: PostListItem): PostDetailResponse {
  return {
    id: post.id,
    platform: post.platform,
    platform_post_id: post.platform_post_id,
    title: post.title ?? undefined,
    description: post.content ?? post.description ?? post.title ?? undefined,
    url: post.post_url ?? post.url,
    thumbnail_url: post.thumbnail_url ?? null,
    author_id: post.author_id ?? undefined,
    author_name: post.author_name ?? undefined,
    author_username: post.author_username ?? undefined,
    author_avatar_url: post.author_avatar_url ?? null,
    view_count: post.view_count,
    like_count: post.like_count,
    comment_count: post.comment_count,
    media_count: post.media_count ?? 0,
    duration: post.duration ?? null,
    published_at: post.published_at ?? undefined,
    created_at: post.created_at ?? post.published_at ?? new Date().toISOString(),
    original_author_id: post.original_author_id ?? null,
    original_author_name: post.original_author_name ?? null,
    original_author_username: post.original_author_username ?? null,
    original_author_avatar_url: post.original_author_avatar_url ?? null,
    media_files: [],
    tags: post.tags ?? [],
    post_type: post.post_type ?? undefined,
    media_type: null,
    language: null,
    author_other_posts: [],
  }
}

export function getFallbackPostDetailById(postId: string): PostDetailResponse | null {
  const detail = STATIC_POST_DETAILS[postId]
  if (detail) return clonePublicSnapshot(detail)

  const post = UNIQUE_FALLBACK_POSTS.find((item) => item.id === postId)
  if (!post) return null

  return buildFallbackPostDetail(post)
}
