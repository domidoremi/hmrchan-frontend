import { describe, expect, it, vi } from 'vitest'
import type { FavoriteResponse } from '@/api/favoriteService'
import type { PostDetailResponse, PostListItem } from '@/api/postService'
import { favoriteModel, postModel } from '../models'

vi.mock('@/i18n', () => ({ default: { global: { t: (key: string) => key } } }))

const id = '01a1b5a5-0c10-7d5d-9ba8-39318248b255'
const basePost: PostListItem = {
  id,
  platform: 'twitter',
  view_count: 0,
  like_count: 0,
  comment_count: 0,
  media_count: 0,
}
const baseDetail: PostDetailResponse = {
  id,
  platform: basePost.platform,
  title: 'Original title',
  description: 'Original body',
  view_count: 0,
  like_count: 0,
  comment_count: 0,
  media_count: 0,
  created_at: '2026-11-07T12:00:00Z',
  external_links: [],
}
const favorite: FavoriteResponse = {
  id: '01a1b5a5-0c10-7d5d-9ba8-39318248b251',
  post_id: id,
  created_at: baseDetail.created_at,
}

describe('journal title and text origin', () => {
  it('marks a local fallback without shortening the complete body', () => {
    const body = `First paragraph\n\n${'🙂正文'.repeat(60)}\nLast paragraph`
    const model = postModel({ ...basePost, content: body })
    expect(model).toMatchObject({
      title: body.slice(0, 100),
      titleOrigin: 'fallback',
      text: body,
      textOrigin: 'post',
    })
  })

  it('keeps supplied title whitespace and leaves upstream provenance unknown', () => {
    const title = '  Original\n title  '
    const body = '  Full body\n\nwith a second paragraph  '
    const model = postModel({ ...basePost, title, content: body })
    expect(model).toMatchObject({
      title,
      titleOrigin: 'unknown',
      text: body,
      textOrigin: 'post',
    })
    expect(postModel({ ...basePost, title: '   ', content: body }).titleOrigin).toBe('unknown')
  })

  it('preserves the existing separate content and description fallback paths', () => {
    expect(
      postModel({ ...basePost, title: '', content: '', description: 'Description body' })
    ).toMatchObject({
      title: '动态',
      titleOrigin: 'fallback',
      text: 'Description body',
      textOrigin: 'post',
    })
  })

  it('marks a missing favorite summary title without treating notes as its source', () => {
    expect(favoriteModel({ ...favorite, notes: 'My note' })).toMatchObject({
      title: '已收藏动态',
      titleOrigin: 'fallback',
      text: 'My note',
      textOrigin: 'favorite-note',
    })
    expect(
      favoriteModel({
        ...favorite,
        notes: 'My note',
        post: { id, title: 'Saved title' },
      })
    ).toMatchObject({
      title: 'Saved title',
      titleOrigin: 'unknown',
      text: 'My note',
      textOrigin: 'favorite-note',
    })
  })

  it('leaves favorite text provenance unknown without notes or detail', () => {
    expect(favoriteModel(favorite)).toMatchObject({
      title: '已收藏动态',
      titleOrigin: 'fallback',
      text: '',
      textOrigin: 'unknown',
    })
  })

  it('inherits detail title origin while replacing the displayed body with notes', () => {
    expect(favoriteModel({ ...favorite, notes: 'My note' }, baseDetail)).toMatchObject({
      title: baseDetail.title,
      titleOrigin: 'unknown',
      text: 'My note',
      textOrigin: 'favorite-note',
    })
    const untitledDetail = { ...baseDetail, title: undefined }
    expect(favoriteModel({ ...favorite, notes: 'My note' }, untitledDetail)).toMatchObject({
      title: baseDetail.description,
      titleOrigin: 'fallback',
      text: 'My note',
      textOrigin: 'favorite-note',
    })
  })

  it('tracks the existing empty and whitespace-only notes fallback without trimming', () => {
    expect(favoriteModel({ ...favorite, notes: '' }, baseDetail)).toMatchObject({
      text: baseDetail.description,
      textOrigin: 'post',
    })
    expect(favoriteModel({ ...favorite, notes: ' \n ' }, baseDetail)).toMatchObject({
      text: ' \n ',
      textOrigin: 'favorite-note',
    })
  })
})
