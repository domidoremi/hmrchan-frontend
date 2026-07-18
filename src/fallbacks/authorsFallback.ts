import type { AuthorListItem, AuthorResponse, ListAuthorsParams } from '@/api/authorService'
import type { CursorCollectionResponse } from '@/api'
import type { PostListItem } from '@/api/postService'
import {
  STATIC_AUTHORS,
  STATIC_AUTHOR_DETAILS,
  STATIC_AUTHOR_POSTS,
} from './generated/publicSnapshots'
import { EXPLORE_FALLBACK_POSTS } from './exploreFallback'
import {
  clonePublicSnapshot,
  createPublicFallbackId,
  cursorPaginateFallbackItems,
  daysAgo,
} from './publicPageFallback'

const RUNTIME_AUTHORS: AuthorListItem[] = [
  {
    id: createPublicFallbackId('author', 'official'),
    platform: 'official',
    username: 'takanenonadeshiko',
    display_name: '高嶺のなでしこ Official',
    avatar_url: '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp',
    follower_count: 128000,
    post_count: 286,
    is_verified: true,
    description: '高嶺のなでしこのステージ、音楽、うれしいお知らせを届ける公式便り。',
    created_at: daysAgo(420),
  },
  {
    id: createPublicFallbackId('author', 'himeri-broadcast-club'),
    platform: 'youtube',
    username: 'himeri_housoubu',
    display_name: 'ひめり放送部',
    avatar_url: '/snapshot-media/home/featured-1-bb51c72a-fd3d-4439-b009-8db595568e36.webp',
    follower_count: 18400,
    post_count: 94,
    is_verified: false,
    description: '配信で見つけた籾山ひめりの言葉や笑顔を、やさしいメモに残しています。',
    created_at: daysAgo(310),
  },
  {
    id: createPublicFallbackId('author', 'himeri-album'),
    platform: 'instagram',
    username: 'himeri_album',
    display_name: 'ひめりアルバム',
    avatar_url: '/snapshot-media/home/featured-2-5acfcb8e-235b-4c81-91cc-7711b043005a.webp',
    follower_count: 12600,
    post_count: 168,
    is_verified: false,
    description: '衣装、表情、季節の色。何度も眺めたいひめりの一瞬を集める写真帖。',
    created_at: daysAgo(270),
  },
  {
    id: createPublicFallbackId('author', 'stage-letter'),
    platform: 'x',
    username: 'stage_letter',
    display_name: 'ステージ便り',
    avatar_url: '/snapshot-media/home/story-1-90c52c15-ab0a-473d-8981-f2420a91fdc1.webp',
    follower_count: 9800,
    post_count: 132,
    is_verified: false,
    description: 'ライブの余韻や好きな場面を、ファンの目線からゆっくり振り返ります。',
    created_at: daysAgo(230),
  },
  {
    id: createPublicFallbackId('author', 'nadeshiko-notebook'),
    platform: 'community',
    username: 'nadeshiko_note',
    display_name: 'なでしこ手帳',
    avatar_url: '/snapshot-media/home/story-0-403aefeb-e9e2-4f16-884d-1875ee34916f.webp',
    follower_count: 7600,
    post_count: 116,
    is_verified: false,
    description: '高嶺のなでしこと過ごした日々を、みんなでめくれる一冊の手帳へ。',
    created_at: daysAgo(190),
  },
]

export const AUTHORS_FALLBACK_AUTHORS: AuthorListItem[] =
  STATIC_AUTHORS.length > 0
    ? clonePublicSnapshot(STATIC_AUTHORS)
    : clonePublicSnapshot(RUNTIME_AUTHORS)

const RUNTIME_AUTHOR_DETAILS: Record<string, AuthorResponse> = Object.fromEntries(
  AUTHORS_FALLBACK_AUTHORS.map((author) => [
    author.id,
    {
      ...author,
      bio: author.description ?? null,
      following_count: 0,
    },
  ])
)

const RUNTIME_AUTHOR_POSTS: Record<string, PostListItem[]> = Object.fromEntries(
  AUTHORS_FALLBACK_AUTHORS.map((author) => [
    author.id,
    EXPLORE_FALLBACK_POSTS.filter((post) => post.author_name === author.display_name).map(
      (post) => ({
        ...post,
        author_id: author.id,
        author_username: author.username,
        author_avatar_url: author.avatar_url ?? null,
      })
    ),
  ])
)

export function getFallbackAuthors(
  params: ListAuthorsParams = {}
): CursorCollectionResponse<AuthorListItem> {
  return cursorPaginateFallbackItems(AUTHORS_FALLBACK_AUTHORS, {
    cursor: params.cursor ?? null,
    limit: params.limit ?? 20,
  })
}

export function getFallbackAuthorById(authorId: string): AuthorResponse | null {
  const item = STATIC_AUTHOR_DETAILS[authorId] ?? RUNTIME_AUTHOR_DETAILS[authorId]
  return item ? clonePublicSnapshot(item) : null
}

export function getFallbackAuthorPosts(
  authorId: string,
  options: {
    cursor?: string | null
    limit?: number
  } = {}
): CursorCollectionResponse<PostListItem> {
  const items = clonePublicSnapshot(
    STATIC_AUTHOR_POSTS[authorId] ?? RUNTIME_AUTHOR_POSTS[authorId] ?? []
  )
  return cursorPaginateFallbackItems(items, {
    cursor: options.cursor ?? null,
    limit: options.limit ?? 20,
  })
}
