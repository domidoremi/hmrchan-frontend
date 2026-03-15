import type { PostDetailResponse, PostListItem } from '@/api/postService'
import { EXPLORE_FALLBACK_POSTS } from './exploreFallback'
import { HOME_FALLBACK_POSTS } from './homepageFallback'

const FALLBACK_POSTS: PostListItem[] = [...HOME_FALLBACK_POSTS, ...EXPLORE_FALLBACK_POSTS]

function uniquePosts(posts: PostListItem[]): PostListItem[] {
  const seen = new Set<string>()
  return posts.filter((post) => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })
}

const UNIQUE_FALLBACK_POSTS = uniquePosts(FALLBACK_POSTS)

function toPostDetail(post: PostListItem): PostDetailResponse {
  const authorOtherPosts = UNIQUE_FALLBACK_POSTS.filter(
    (candidate) => candidate.author_id === post.author_id && candidate.id !== post.id
  )
    .slice(0, 6)
    .map((candidate) => ({
      id: candidate.id,
      platform: candidate.platform,
      post_type: candidate.post_type,
      title: candidate.title ?? null,
      post_url: candidate.post_url,
      published_at: candidate.published_at ?? null,
      view_count: candidate.view_count,
      like_count: candidate.like_count,
    }))

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
    media_count: post.media_count ?? (post.thumbnail_url ? 1 : 0),
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
    author_other_posts: authorOtherPosts,
  }
}

export function getFallbackPostDetailById(postId: string): PostDetailResponse | null {
  const post = UNIQUE_FALLBACK_POSTS.find((item) => item.id === postId)
  return post ? toPostDetail(post) : null
}
