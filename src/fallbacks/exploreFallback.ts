import type { ListPostsParams, PostListItem } from '@/api/postService'
import { STATIC_EXPLORE_POSTS } from './generated/publicSnapshots'
import {
  clonePublicSnapshot,
  createPublicFallbackId,
  cursorPaginateFallbackItems,
  hoursAgo,
} from './publicPageFallback'

const RUNTIME_EXPLORE_POSTS: PostListItem[] = [
  {
    id: createPublicFallbackId('explore', 'spring-stage-letter'),
    platform: 'official',
    platform_post_id: 'spring-stage-letter',
    post_type: 'image',
    title: '春のステージから届いた、きらめく一枚',
    content: '籾山ひめりと高嶺のなでしこの舞台から、何度でも眺めたくなる瞬間を。',
    thumbnail_url: '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp',
    thumbnail_width: 900,
    thumbnail_height: 1200,
    published_at: hoursAgo(1),
    created_at: hoursAgo(1),
    view_count: 4200,
    like_count: 582,
    comment_count: 46,
    media_count: 1,
    author_name: '高嶺のなでしこ Official',
    tags: ['籾山ひめり', '舞台'],
  },
  {
    id: createPublicFallbackId('explore', 'weekly-live-memory'),
    platform: 'youtube',
    platform_post_id: 'weekly-live-memory',
    post_type: 'video',
    title: '今週の配信で見つけた、やさしい笑顔',
    content: '配信の余韻と、みんなで残しておきたい小さなエピソード。',
    thumbnail_url: '/snapshot-media/home/featured-1-bb51c72a-fd3d-4439-b009-8db595568e36.webp',
    thumbnail_width: 1280,
    thumbnail_height: 720,
    published_at: hoursAgo(4),
    created_at: hoursAgo(4),
    view_count: 3600,
    like_count: 431,
    comment_count: 38,
    media_count: 1,
    author_name: 'ひめり放送部',
    tags: ['配信', '高嶺のなでしこ'],
  },
  {
    id: createPublicFallbackId('explore', 'blue-dress-photo'),
    platform: 'instagram',
    platform_post_id: 'blue-dress-photo',
    post_type: 'image',
    title: '写真に残したい、青い衣装の日',
    content: '透明感のある色合いと、ひめりらしい表情を一緒に楽しむフォトメモ。',
    thumbnail_url: '/snapshot-media/home/featured-2-5acfcb8e-235b-4c81-91cc-7711b043005a.webp',
    thumbnail_width: 900,
    thumbnail_height: 1200,
    published_at: hoursAgo(8),
    created_at: hoursAgo(8),
    view_count: 3100,
    like_count: 398,
    comment_count: 27,
    media_count: 1,
    author_name: 'ひめりアルバム',
    tags: ['籾山ひめり', '写真'],
  },
  {
    id: createPublicFallbackId('explore', 'weekend-stage-clip'),
    platform: 'x',
    platform_post_id: 'weekend-stage-clip',
    post_type: 'video',
    title: '週末ステージの好きな場面をもう一度',
    content: '曲の終わりに交わした笑顔まで、ファンのみんなとゆっくり振り返ります。',
    thumbnail_url: '/snapshot-media/home/story-1-90c52c15-ab0a-473d-8981-f2420a91fdc1.webp',
    thumbnail_width: 900,
    thumbnail_height: 1200,
    published_at: hoursAgo(14),
    created_at: hoursAgo(14),
    view_count: 2800,
    like_count: 354,
    comment_count: 31,
    media_count: 1,
    author_name: 'ステージ便り',
    tags: ['ステージ', '思い出'],
  },
  {
    id: createPublicFallbackId('explore', 'nadeshiko-group-day'),
    platform: 'official',
    platform_post_id: 'nadeshiko-group-day',
    post_type: 'image',
    title: '高嶺のなでしこと過ごす、今日の一ページ',
    content: 'メンバーの空気まで伝わってくる集合写真を、みんなのアルバムへ。',
    thumbnail_url: '/snapshot-media/home/story-0-403aefeb-e9e2-4f16-884d-1875ee34916f.webp',
    thumbnail_width: 1200,
    thumbnail_height: 800,
    published_at: hoursAgo(21),
    created_at: hoursAgo(21),
    view_count: 2600,
    like_count: 327,
    comment_count: 24,
    media_count: 1,
    author_name: 'なでしこ手帳',
    tags: ['高嶺のなでしこ', '日常'],
  },
]

export const EXPLORE_FALLBACK_POSTS: PostListItem[] =
  STATIC_EXPLORE_POSTS.length > 0
    ? clonePublicSnapshot(STATIC_EXPLORE_POSTS)
    : clonePublicSnapshot(RUNTIME_EXPLORE_POSTS)

export function getFallbackExplorePosts(
  params: ListPostsParams = {}
): ReturnType<typeof cursorPaginateFallbackItems<PostListItem>> {
  return cursorPaginateFallbackItems(EXPLORE_FALLBACK_POSTS, {
    cursor: params.cursor ?? null,
    limit: params.limit ?? 20,
  })
}

export function getFallbackExplorePostById(postId: string): PostListItem | null {
  return EXPLORE_FALLBACK_POSTS.find((post) => post.id === postId) ?? null
}
