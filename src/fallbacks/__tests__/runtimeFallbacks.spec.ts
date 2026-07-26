import { describe, expect, it, vi } from 'vitest'

import { getFallbackExplorePostById, getFallbackExplorePosts } from '../exploreFallback'
import {
  getFallbackDiscussionById,
  getFallbackDiscussionComments,
  getFallbackDiscussionsCursor,
} from '../communityFallback'
import { getFallbackScheduleById, getFallbackScheduleCalendar } from '../scheduleFallback'
import {
  getFallbackAuthorById,
  getFallbackAuthorPosts,
  getFallbackAuthors,
} from '../authorsFallback'

describe('runtime public fallbacks', () => {
  it('keeps Explore useful while the content service is unavailable', () => {
    const result = getFallbackExplorePosts({ limit: 3 })

    expect(result.items).toHaveLength(3)
    expect(result.items.every((item) => item.thumbnail_url?.startsWith('/'))).toBe(true)
    expect(getFallbackExplorePostById(result.items[0]!.id)).toMatchObject({
      id: result.items[0]!.id,
    })
  })

  it('projects a populated schedule into the requested calendar range', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00.000Z'))

    try {
      const events = getFallbackScheduleCalendar({
        start: '2026-07-01T00:00:00.000Z',
        end: '2026-07-31T23:59:59.999Z',
      })

      expect(events.length).toBeGreaterThanOrEqual(4)
      expect(new Set(events.map((event) => event.category)).size).toBeGreaterThanOrEqual(3)
      expect(getFallbackScheduleById(events[0]!.id)).toMatchObject({
        id: events[0]!.id,
        title: events[0]!.title,
        is_published: true,
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('provides warm community discussions and a navigable detail thread', () => {
    const result = getFallbackDiscussionsCursor({ limit: 10 })

    expect(result.items.length).toBeGreaterThanOrEqual(4)
    const discussion = result.items.find((item) => item.comments_count > 0)
    expect(discussion).toBeDefined()
    expect(getFallbackDiscussionById(discussion!.id)).toMatchObject({ id: discussion!.id })

    const comments = getFallbackDiscussionComments(discussion!.id, { limit: 10 })
    expect(comments.items.length).toBeGreaterThan(0)
  })

  it('keeps the author shelf useful and its profiles navigable', () => {
    const result = getFallbackAuthors({ limit: 10 })

    expect(result.items.length).toBeGreaterThanOrEqual(5)
    expect(result.items.every((author) => author.avatar_url?.startsWith('/'))).toBe(true)
    expect(result.items.every((author) => author.description?.trim())).toBe(true)

    const authorWithPosts = result.items.find(
      (author) => getFallbackAuthorPosts(author.id).items.length > 0
    )
    expect(authorWithPosts).toBeDefined()
    expect(getFallbackAuthorById(authorWithPosts!.id)).toMatchObject({
      id: authorWithPosts!.id,
      display_name: authorWithPosts!.display_name,
    })
    expect(getFallbackAuthorPosts(authorWithPosts!.id).items[0]).toMatchObject({
      author_id: authorWithPosts!.id,
    })
  })
})
