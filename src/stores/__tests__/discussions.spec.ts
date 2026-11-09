import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiscussionsStore } from '../discussions'
import { ApiError } from '@/api/client'
import type { Discussion } from '@/api/discussionService'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  getSummary: vi.fn(),
  snapshot: vi.fn(),
}))
vi.mock('@/api/discussionService', () => ({ discussionService: mocks }))
vi.mock('@/utils/cache', () => ({
  getPublicSnapshot: mocks.snapshot,
  setPublicSnapshot: vi.fn().mockResolvedValue(undefined),
}))

const discussion = (id: string): Discussion => ({
  id,
  title: id,
  content: 'Public discussion',
  category: 'general',
  author: { id: 'author', username: 'author' },
  tags: [],
  view_count: 0,
  likes_count: 0,
  comments_count: 0,
  created_at: '2026-11-08T00:00:00Z',
})

describe('public discussion counts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.list.mockReset()
    mocks.get.mockReset()
    mocks.snapshot.mockReset()
  })

  it('counts the completed public cursor feed without requesting private account totals', async () => {
    mocks.list
      .mockResolvedValueOnce({
        items: [discussion('one')],
        next_cursor: 'page-two',
        has_more: true,
      })
      .mockResolvedValueOnce({ items: [discussion('one'), discussion('two')], has_more: false })
    const store = useDiscussionsStore()
    expect(await store.fetchDiscussions(true)).toBe(true)
    expect(store.total).toBeNull()
    expect(await store.loadMore()).toBe(true)
    expect(store.items.map((item) => item.id)).toEqual(['one', 'two'])
    expect(store.total).toBe(2)
    expect(mocks.getSummary).not.toHaveBeenCalled()
  })

  it('clears a previous total when a refreshed feed has another page', async () => {
    mocks.list
      .mockResolvedValueOnce({ items: [discussion('one')], has_more: false })
      .mockResolvedValueOnce({ items: [discussion('two')], next_cursor: 'more', has_more: true })
    const store = useDiscussionsStore()
    await store.fetchDiscussions(true)
    expect(store.total).toBe(1)
    await store.fetchDiscussions(true)
    expect(store.total).toBeNull()
  })

  it('clears the detail error after a successful retry', async () => {
    mocks.get
      .mockRejectedValueOnce(new Error('request rejected'))
      .mockResolvedValueOnce(discussion('one'))
    const store = useDiscussionsStore()
    await store.fetchDiscussion('one')
    expect(store.error).toBe('community.error.fetchFailed')
    await store.fetchDiscussion('one')
    expect(store.currentDiscussion?.id).toBe('one')
    expect(store.error).toBeNull()
  })

  it('clears the previous detail and identifies a missing discussion', async () => {
    mocks.get
      .mockResolvedValueOnce(discussion('one'))
      .mockRejectedValueOnce(new ApiError('Discussion not found', 404))
    const store = useDiscussionsStore()
    await store.fetchDiscussion('one')
    store.source = 'fallback'
    await store.fetchDiscussion('missing')
    expect(store.currentDiscussion).toBeNull()
    expect(store.source).toBe('live')
    expect(store.error).toBe('common.notFound')
  })

  it('keeps the total unknown for an incomplete cached feed', async () => {
    mocks.list.mockRejectedValue(new Error('service unavailable'))
    mocks.snapshot.mockResolvedValue({
      items: [discussion('one')],
      next_cursor: 'more',
      has_more: true,
    })
    const store = useDiscussionsStore()
    expect(await store.fetchDiscussions(true)).toBe(true)
    expect(store.source).toBe('cached')
    expect(store.total).toBeNull()
    expect(mocks.getSummary).not.toHaveBeenCalled()
  })

  it('reports zero when the public feed is empty', async () => {
    mocks.list.mockResolvedValue({ items: [], has_more: false })
    const store = useDiscussionsStore()
    await store.fetchDiscussions(true)
    expect(store.total).toBe(0)
    expect(mocks.getSummary).not.toHaveBeenCalled()
  })
})
