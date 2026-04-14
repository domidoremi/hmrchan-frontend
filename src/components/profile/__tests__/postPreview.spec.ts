import { describe, expect, it } from 'vitest'
import { buildFavoritePostPreview, buildHistoryPostPreview } from '../postPreview'

describe('profile post preview adapters', () => {
  it('prefers favorite post thumbnail metadata and derives mediaId target hints', () => {
    const preview = buildFavoritePostPreview({
      id: 'fav-1',
      post_id: 'post-1',
      post: {
        id: 'post-1',
        title: 'Favorite title',
        thumbnail_url:
          'https://momichan.xyz/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium',
        author_name: 'alice',
      },
    } as never)

    expect(preview).toMatchObject({
      id: 'fav-1',
      postId: 'post-1',
      title: 'Favorite title',
      authorName: 'alice',
      thumbnailUrl:
        'https://momichan.xyz/api/v1/media/123e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium',
      mediaId: '123e4567-e89b-12d3-a456-426614174000',
      target: '/post/post-1?mediaId=123e4567-e89b-12d3-a456-426614174000',
    })
  })

  it('uses fallback title and placeholder target when favorite preview metadata is missing', () => {
    const preview = buildFavoritePostPreview(
      {
        id: 'fav-2',
        post_id: 'post-2',
        post: {
          id: 'post-2',
          title: '',
          thumbnail_url: null,
          author_name: '',
        },
      } as never,
      'Unknown favorite'
    )

    expect(preview).toMatchObject({
      id: 'fav-2',
      postId: 'post-2',
      title: 'Unknown favorite',
      authorName: undefined,
      thumbnailUrl: null,
      mediaId: null,
      target: '/post/post-2',
    })
  })

  it('prefers history preview thumbnail/title fields before post-level fallbacks', () => {
    const record = buildHistoryPostPreview(
      {
        id: 42,
        content_uuid: 'post-42',
        post_id: 'post-42',
        post_title: 'Older title',
        post_thumbnail_url:
          'https://momichan.xyz/api/v1/media/223e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium',
        author_name: 'fallback-author',
        created_at: '2026-04-14T10:00:00Z',
        content_preview: {
          title: 'Preview title',
          thumbnail_url:
            'https://momichan.xyz/api/v1/media/323e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium',
          author_name: 'preview-author',
        },
      } as never,
      'Unknown history'
    )

    expect(record).toMatchObject({
      id: '42',
      viewedAt: '2026-04-14T10:00:00Z',
      preview: {
        id: '42',
        postId: 'post-42',
        title: 'Preview title',
        authorName: 'preview-author',
        thumbnailUrl:
          'https://momichan.xyz/api/v1/media/323e4567-e89b-12d3-a456-426614174000/thumbnail?size=medium',
        mediaId: '323e4567-e89b-12d3-a456-426614174000',
        target: '/post/post-42?mediaId=323e4567-e89b-12d3-a456-426614174000',
      },
    })
  })

  it('falls back to post-level history fields and keeps plain post target when no thumbnail exists', () => {
    const record = buildHistoryPostPreview(
      {
        id: 7,
        content_uuid: 'post-7',
        post_id: 'post-7',
        post_title: '',
        post_thumbnail_url: null,
        author_name: 'history-author',
        viewed_at: '2026-04-14T11:00:00Z',
        content_preview: null,
      } as never,
      'Unknown history'
    )

    expect(record).toMatchObject({
      id: '7',
      viewedAt: '2026-04-14T11:00:00Z',
      preview: {
        id: '7',
        postId: 'post-7',
        title: 'Unknown history',
        authorName: 'history-author',
        thumbnailUrl: null,
        mediaId: null,
        target: '/post/post-7',
      },
    })
  })
})
