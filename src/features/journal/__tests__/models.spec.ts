import { describe, expect, it, vi } from 'vitest'
import type { FavoriteResponse } from '@/api/favoriteService'
import type { PostDetailResponse } from '@/api/postService'
import type { ScheduleResponse } from '@/api/scheduleService'
import { eventModel, favoriteModel, postModel } from '../models'

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

describe('journal event description', () => {
  const event: ScheduleResponse = {
    id: '01a1b5a5-0c10-7d5d-9ba8-39318248b253',
    title: '作者原活动',
    category: 'birth',
    start_date: '2026-11-06T00:00:00+08:00',
    is_all_day: true,
    is_published: true,
    created_at: '2026-11-06T00:00:00+08:00',
  }

  it('removes visible legacy closing break tags without changing the API record', () => {
    const source = { ...event, description: '11月 6, 2026 </br></br>' }
    expect(eventModel(source)).toMatchObject({
      description: '11月 6, 2026',
      date: '2026-11-06',
      title: event.title,
    })
    expect(source.description).toBe('11月 6, 2026 </br></br>')
  })

  it('preserves authored text and line breaks across imported break spellings', () => {
    expect(
      eventModel({ ...event, description: '作者説明 <&><BR>会場<br/>時間<br />備考\n原文' })
        .description
    ).toBe('作者説明 <&>\n会場\n時間\n備考\n原文')
  })

  it('does not create an empty description from missing text or break-only imports', () => {
    for (const description of [undefined, null, '<br> </BR>']) {
      expect(eventModel({ ...event, description }).description).toBe('')
    }
  })
})
