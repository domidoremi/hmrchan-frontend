import { describe, it, expect } from 'vitest'
import { useMasonryColumns } from '../useMasonryColumns'
import type { PostListItem } from '@/api/postService'

function createMockPost(id: number, thumbnailWidth = 300, thumbnailHeight = 400): PostListItem {
  return {
    id: `post-${id}`,
    title: `Test Post ${id}`,
    content: 'Test content',
    author_id: 'author-1',
    author_name: 'Test Author',
    author_username: 'testauthor',
    platform: 'twitter',
    thumbnail_url: `https://example.com/image-${id}.jpg`,
    thumbnail_width: thumbnailWidth,
    thumbnail_height: thumbnailHeight,
    view_count: 100,
    like_count: 10,
    comment_count: 5,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    media_count: 1,
  }
}

describe('useMasonryColumns', () => {
  describe('initialization', () => {
    it('should initialize with default column count', () => {
      const { columnCount, columns } = useMasonryColumns()

      expect(columnCount.value).toBe(3)
      expect(columns.value.length).toBe(3)
    })

    it('should initialize with custom column count', () => {
      const { columnCount, columns } = useMasonryColumns({ initialColumnCount: 4 })

      expect(columnCount.value).toBe(4)
      expect(columns.value.length).toBe(4)
    })
  })

  describe('distributePosts', () => {
    it('should distribute posts to columns', () => {
      const { columns, distributePosts } = useMasonryColumns({ initialColumnCount: 3 })

      const posts = [createMockPost(1), createMockPost(2), createMockPost(3)]

      distributePosts(posts, 300, false)

      const totalPosts = columns.value.reduce((sum, col) => sum + col.length, 0)
      expect(totalPosts).toBe(3)
    })

    it('should append posts when append is true', () => {
      const { columns, distributePosts } = useMasonryColumns({ initialColumnCount: 2 })

      const firstBatch = [createMockPost(1), createMockPost(2)]
      const secondBatch = [createMockPost(3), createMockPost(4)]

      distributePosts(firstBatch, 300, false)
      const firstTotal = columns.value.reduce((sum, col) => sum + col.length, 0)
      expect(firstTotal).toBe(2)

      distributePosts(secondBatch, 300, true)
      const secondTotal = columns.value.reduce((sum, col) => sum + col.length, 0)
      expect(secondTotal).toBe(4)
    })

    it('should clear columns when append is false', () => {
      const { columns, distributePosts } = useMasonryColumns({ initialColumnCount: 2 })

      distributePosts([createMockPost(1), createMockPost(2)], 300, false)
      distributePosts([createMockPost(3)], 300, false)

      const total = columns.value.reduce((sum, col) => sum + col.length, 0)
      expect(total).toBe(1)
    })
  })

  describe('getColumnWidth', () => {
    it('should calculate column width correctly', () => {
      const { getColumnWidth } = useMasonryColumns({ initialColumnCount: 3 })

      // (1000 - 32) / 3 = 322.67
      const width = getColumnWidth(1000)
      expect(width).toBeCloseTo(322.67, 1)
    })
  })

  describe('redistribute', () => {
    it('should redistribute all posts to new column layout', () => {
      const { columns, columnCount, distributePosts, redistribute } = useMasonryColumns({
        initialColumnCount: 2,
      })

      const posts = [createMockPost(1), createMockPost(2), createMockPost(3), createMockPost(4)]

      distributePosts(posts, 300, false)

      columnCount.value = 4
      redistribute(posts, 250)

      expect(columns.value.length).toBe(4)
      const total = columns.value.reduce((sum, col) => sum + col.length, 0)
      expect(total).toBe(4)
    })
  })

  describe('distributePostsRoundRobin', () => {
    it('should distribute posts evenly using round robin', () => {
      const { columns, initColumns, distributePostsRoundRobin } = useMasonryColumns({
        initialColumnCount: 3,
      })

      initColumns()
      const posts = [
        createMockPost(1),
        createMockPost(2),
        createMockPost(3),
        createMockPost(4),
        createMockPost(5),
        createMockPost(6),
      ]

      distributePostsRoundRobin(posts, 0)

      expect(columns.value[0]?.length).toBe(2)
      expect(columns.value[1]?.length).toBe(2)
      expect(columns.value[2]?.length).toBe(2)
    })
  })
})
