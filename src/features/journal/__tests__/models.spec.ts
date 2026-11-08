import { describe, expect, it, vi } from 'vitest'
import type { FavoriteResponse } from '@/api/favoriteService'
import type { PostDetailResponse } from '@/api/postService'
import { favoriteModel, postModel } from '../models'

vi.mock('@/i18n', () => ({ default: { global: { t: (key: string) => key } } }))
const favorite: FavoriteResponse = {
  id: '01a1b5a5-0c10-7d5d-9ba8-39318248b251',
  post_id: '01a1b5a5-0c10-7d5d-9ba8-39318248b255',
  created_at: '2026-11-07T12:00:00Z',
  post: { id: '01a1b5a5-0c10-7d5d-9ba8-39318248b255', title: 'Saved photo', platform: 'twitter' },
  author: { id: '01a1b5a5-0c10-7d5d-9ba8-39318248b252', username: 'Himeri' },
}

describe('journal favorite presentation', () => {
  it('does not invent a like count when the favorite API returns only a summary', () => {
    expect(favoriteModel(favorite)).toMatchObject({
      author: 'Himeri',
      authorId: favorite.author?.id,
      platform: 'x',
      image: null,
      likes: null,
    })
  })

  it('restores a photo from detail media files when the summary has no thumbnail', () => {
    const mediaId = '01a1b5a5-0c10-7d5d-9ba8-39318248b254'
    const detail: PostDetailResponse = {
      id: favorite.post_id,
      platform: 'twitter',
      title: 'Saved photo',
      description: 'Original post',
      author_id: favorite.author?.id,
      author_name: 'Himeri',
      like_count: 422,
      view_count: 4816,
      comment_count: 0,
      media_count: 1,
      created_at: favorite.created_at,
      external_links: [],
      media_files: [
        {
          id: mediaId,
          file_type: 'image',
          file_path: `/api/v1/media/${mediaId}/stream`,
          file_size: 1,
          is_downloaded: true,
          created_at: favorite.created_at,
        },
      ],
    }
    const model = favoriteModel({ ...favorite, notes: 'My note', tags: ['Saved tag'] }, detail)
    expect(model.image).toContain(`/media/${mediaId}/thumbnail?size=large`)
    expect(model.originalImage).toBe(`/api/v1/media/${mediaId}/stream`)
    expect(model).toMatchObject({
      favoriteId: favorite.id,
      type: '写真',
      platform: 'x',
      author: 'Himeri',
      likes: 422,
      text: 'My note',
      tags: ['Saved tag'],
    })
  })

  it('does not send a video stream to an image element', () => {
    const model = postModel({
      id: favorite.post_id,
      platform: 'youtube',
      media_type: 'video',
      media_id: favorite.post_id,
      thumbnail_url: `/api/v1/media/${favorite.post_id}/thumbnail`,
      stream_url: `/api/v1/media/${favorite.post_id}/stream`,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      media_count: 1,
    })
    expect(model.image).toContain('/thumbnail')
    expect(model.originalImage).toBeNull()
  })
})
