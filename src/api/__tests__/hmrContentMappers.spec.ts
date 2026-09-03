import { describe, expect, it } from 'vitest'

import {
  mapAuthor,
  mapExploreContent,
  mapPost,
  mapPostDetailContent,
} from '@/api/hmrContentMappers'

describe('hmrContentMappers author mapping', () => {
  it('prefers the public display name over the account username', () => {
    expect(
      mapAuthor(
        {
          id: 'author-1',
          username: 'account-handle',
          display_name: 'Public Creator',
          bio: 'Creator bio',
        },
        0
      )
    ).toEqual({
      id: 'author-1',
      name: 'Public Creator',
      bio: 'Creator bio',
    })
  })
})

describe('hmrContentMappers post mapping', () => {
  it('maps API field aliases into normalized post card data', () => {
    const post = mapPost(
      {
        post_id: 'post-1',
        display_text: 'RT @source: Long live #topic https://example.test',
        body_preview: 'A helpful summary with @member',
        author: {
          display_name: 'Nested Author',
        },
        platform: 'Twitter',
        platform_post_id: 'platform-1',
        relationship_type: 'self_repost',
        repost_of_platform_post_id: 'origin-1',
        canonical_display_key: 'twitter:origin-1',
        post_type: 'status',
        media_type: 'video',
        post_url: 'https://x.test/post-1',
        comments: '6',
        duration_sec: '42',
        files: [
          {
            media_type: 'plain_text',
            url: '/note.txt',
          },
          {
            media_type: 'image',
            image_url: '/cover.webp',
          },
        ],
        media_count: '1',
      },
      0
    )

    expect(post).toMatchObject({
      id: 'post-1',
      title: 'Long live',
      excerpt: 'A helpful summary with',
      authorName: 'Nested Author',
      platform: 'twitter',
      platformPostId: 'platform-1',
      relationshipType: 'self_repost',
      repostOfPlatformPostId: 'origin-1',
      canonicalDisplayKey: 'twitter:origin-1',
      postType: 'status',
      mediaType: 'video',
      postUrl: 'https://x.test/post-1',
      commentCount: 6,
      durationSec: 42,
      hasMedia: true,
      hasRenderableMedia: true,
      mediaCount: 1,
    })
  })

  it('keeps the source platform like count when the site-side count is zero', () => {
    const post = mapPost(
      {
        id: 'post-2',
        title: 'Post with platform likes',
        community_like_count: 0,
        like_count: 1329,
      },
      0
    )

    expect(post.likeCount).toBe(1329)
  })
})

describe('hmrContentMappers explore mapping', () => {
  it('prefers public posts, dedupes collapsible reposts, and filters unsupported platforms', () => {
    const content = mapExploreContent(
      {
        items: [
          {
            id: 'mixed-only',
            title: 'Mixed',
            platform: 'youtube',
          },
        ],
      },
      {
        items: [
          {
            id: 'repost',
            title: 'Repost',
            platform: 'x',
            relationship_type: 'repost',
            repost_of_platform_post_id: 'origin-1',
          },
          {
            id: 'original',
            title: 'Original',
            platform: 'x',
            platform_post_id: 'origin-1',
          },
          {
            id: 'unsupported',
            title: 'Unsupported',
            platform: 'threads',
          },
          {
            id: 'clip',
            title: 'Clip',
            platform: 'tiktok',
            platform_post_id: 'clip-1',
          },
        ],
        nextCursor: 'cursor-2',
        hasMore: true,
      },
      {
        items: [{ id: 'author-1', name: 'Author One', bio: 'Bio' }],
      },
      {
        results: [{ query: 'live' }, { label: 'clips' }, 'showroom'],
      },
      {
        platform: 'x',
        query: ' live ',
        limit: 12,
      }
    )

    expect(content.posts.map((post) => post.id)).toEqual(['original', 'clip'])
    expect(content.authors).toEqual([{ id: 'author-1', name: 'Author One', bio: 'Bio' }])
    expect(content.suggestions).toEqual(['live', 'clips', 'showroom'])
    expect(content.nextCursor).toBe('cursor-2')
    expect(content.hasMore).toBe(true)
    expect(content.activeQuery).toBe('live')
    expect(content.activePlatform).toBe('x')
    expect(content.platforms.find((platform) => platform.id === 'all')?.count).toBe(2)
    expect(content.platforms.find((platform) => platform.id === 'x')?.count).toBe(1)
  })
})

describe('hmrContentMappers post detail mapping', () => {
  it('filters text-only media and removes current-post duplicates from related posts', () => {
    const detail = mapPostDetailContent(
      'main-post',
      {
        post: {
          id: 'main-post',
          title: 'Main Post',
          platform: 'youtube',
          platform_post_id: 'main-platform-id',
          files: [
            {
              id: 'text-file',
              title: 'Text',
              media_type: 'text',
              url: '/text.txt',
            },
            {
              id: 'video-file',
              title: 'Video',
              media_type: 'video',
              stream_url: '/video.m3u8',
              thumbnail_url: '/thumb.webp',
            },
          ],
          author_other_posts: [
            {
              id: 'main-repost',
              title: 'Main repost',
              platform: 'youtube',
              relationship_type: 'repost',
              repost_of_platform_post_id: 'main-platform-id',
            },
            {
              id: 'other-post',
              title: 'Other Post',
              platform: 'instagram',
              platform_post_id: 'other-platform-id',
            },
          ],
        },
      },
      {
        comments: [
          {
            comment_id: 'comment-1',
            body: 'Looks good',
            post_id: 'main-post',
          },
        ],
      }
    )

    expect(detail.viewState).toBe('available')
    expect(detail.media).toEqual([
      {
        id: 'video-file',
        title: 'Video',
        mediaType: 'video',
        streamUrl: '/video.m3u8',
        thumbnailUrl: '/thumb.webp',
      },
    ])
    expect(detail.relatedPosts.map((post) => post.id)).toEqual(['other-post'])
    expect(detail.comments).toEqual([
      {
        id: 'comment-1',
        title: '社区信号',
        excerpt: 'Looks good',
        metric: '活跃',
        target: '/posts/main-post',
      },
    ])
  })

  it('derives media thumbnail and stream URLs from post detail file ids', () => {
    const detail = mapPostDetailContent(
      'main-post',
      {
        post: {
          id: 'main-post',
          title: 'Main Post',
          platform: 'twitter',
          media_type: 'image',
          files: [
            {
              id: 'image-file',
              file_name: '2026-05-28_1.jpg',
              file_type: 'image',
            },
          ],
        },
      },
      null
    )

    expect(detail.post.hasRenderableMedia).toBe(true)
    expect(detail.post.mediaUrl).toBeUndefined()
    expect(detail.post.mediaCount).toBe(1)
    expect(detail.media).toEqual([
      {
        id: 'image-file',
        title: '2026-05-28_1.jpg',
        mediaType: 'image',
        streamUrl: '/api/v1/media/image-file/stream',
        thumbnailUrl: '/api/v1/media/image-file/thumbnail?size=small',
      },
    ])
  })

  it('returns a temporary unavailable detail shape when payload is empty', () => {
    expect(mapPostDetailContent('missing-post', null, null)).toEqual({
      post: {
        id: 'missing-post',
        title: '内容暂时不可用',
        excerpt: '',
        authorName: 'MomiChan',
        tag: '',
        createdAt: '',
        statsLabel: '',
      },
      relatedPosts: [],
      comments: [],
      media: [],
      viewState: 'temporary-unavailable',
    })
  })
})
