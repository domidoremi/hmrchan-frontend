import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
    post: clientMocks.post,
    delete: clientMocks.delete,
  },
  ApiError: class extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

import { normalizePostExternalLinks, postService } from '../postService'

describe('postService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based post list queries for explore feed loading', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    await postService.listPosts(
      {
        limit: 12,
        cursor: 'cursor-0',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith('/posts?limit=12&cursor=cursor-0', {
      skipErrorToast: true,
    })
  })

  it('preserves cursor pagination fields from the normalized post list response', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [
        {
          id: 'post-1',
          platform: 'youtube',
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          media_count: 0,
        },
      ],
      next_cursor: 'cursor-2',
      has_more: true,
    })

    await expect(postService.listPosts({ limit: 10 })).resolves.toMatchObject({
      items: [{ id: 'post-1' }],
      next_cursor: 'cursor-2',
      has_more: true,
    })
  })

  it('strictly normalizes external links and optional target ids', () => {
    const currentId = '01890f47-6a35-7cc4-8a2d-7f5b56c9e001'
    const targetId = '01890f47-6a35-7cc4-8a2d-7f5b56c9e002'
    const acceptedHosts = [
      ['tiktok', 'tiktok.com'],
      ['tiktok', 'www.tiktok.com'],
      ['tiktok', 'm.tiktok.com'],
      ['tiktok', 'vm.tiktok.com'],
      ['tiktok', 'vt.tiktok.com'],
      ['youtube', 'youtube.com'],
      ['youtube', 'www.youtube.com'],
      ['youtube', 'm.youtube.com'],
      ['youtube', 'music.youtube.com'],
      ['youtube', 'youtu.be'],
    ] as const
    const invalid = [
      { platform: 'youtube', url: 'https://tiktok.com/video/1' },
      { platform: 'youtube', url: 'https://evil.youtube.com/watch?v=1' },
      { platform: 'youtube', url: 'https://youtube.com.evil.test/watch?v=1' },
      { platform: 'youtube', url: 'http://youtube.com/watch?v=1' },
      { platform: 'youtube', url: '/watch?v=1' },
      { platform: 'youtube', url: 'https://user@youtube.com/watch?v=1' },
      { platform: 'youtube', url: 'https://youtube.com:444/watch?v=1' },
      { platform: 'youtube', url: 'https://youtube.com\\watch?v=1' },
      { platform: 'youtube', url: 'https://youtube.com/\nwatch?v=1' },
      { platform: 'vimeo', url: 'https://youtube.com/watch?v=1' },
    ]

    const normalized = normalizePostExternalLinks(
      [
        ...acceptedHosts.map(([platform, host]) => ({
          platform,
          url: `https://${host}/post`,
          platform_post_id: 7,
          target_post_id: targetId,
        })),
        { platform: 'youtube', url: 'https://youtu.be/self', target_post_id: currentId },
        { platform: 'youtube', url: 'https://youtu.be/invalid', target_post_id: 'not-a-uuid' },
        ...invalid,
      ],
      currentId
    )

    expect(normalized).toHaveLength(12)
    expect(normalized.slice(0, 10).map((link) => link.url)).toEqual(
      acceptedHosts.map(([, host]) => `https://${host}/post`)
    )
    expect(normalized[0]).toMatchObject({ target_post_id: targetId })
    expect(normalized[0]).not.toHaveProperty('platform_post_id')
    expect(normalized[10]).not.toHaveProperty('target_post_id')
    expect(normalized[11]).not.toHaveProperty('target_post_id')
    expect(normalizePostExternalLinks(undefined)).toEqual([])
    expect(normalizePostExternalLinks({})).toEqual([])
  })

  it('normalizes external links in list and both detail response shapes', async () => {
    const id = '01890f47-6a35-7cc4-8a2d-7f5b56c9e001'
    const externalLinks = [{ platform: 'youtube', url: 'https://youtu.be/video' }]
    vi.mocked(clientMocks.get)
      .mockResolvedValueOnce({
        items: [
          {
            id,
            platform: 'youtube',
            view_count: 0,
            like_count: 0,
            comment_count: 0,
            media_count: 0,
            external_links: externalLinks,
          },
        ],
      })
      .mockResolvedValueOnce({
        id,
        platform: 'youtube',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        media_count: 1,
        created_at: '',
        media_files: [
          { id: 'media', file_path: '', file_type: 'image', is_downloaded: true, created_at: '' },
        ],
        external_links: externalLinks,
      })
      .mockResolvedValueOnce({
        id,
        platform: 'youtube',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        files: [],
      })

    await expect(postService.listPosts()).resolves.toMatchObject({
      items: [{ external_links: externalLinks }],
    })
    await expect(postService.getPost(id)).resolves.toMatchObject({ external_links: externalLinks })
    await expect(postService.getPost(id)).resolves.toMatchObject({ external_links: [] })
  })

  it('calls the post like and unlike endpoints with request config', async () => {
    vi.mocked(clientMocks.post).mockResolvedValueOnce(undefined)
    vi.mocked(clientMocks.delete).mockResolvedValueOnce(undefined)
    const config = { skipErrorToast: true }

    await postService.likePost('post-1', config)
    await postService.unlikePost('post-1', config)

    expect(clientMocks.post).toHaveBeenCalledWith('/posts/post-1/like', null, config)
    expect(clientMocks.delete).toHaveBeenCalledWith('/posts/post-1/like', config)
  })
})

describe('normalizePostDetail media_count semantics', () => {
  const baseRaw = {
    id: '01a09c33-5207-7c02-9b88-da5d3c3112cc',
    platform: 'twitter',
    view_count: 10,
    like_count: 5,
    comment_count: 0,
    created_at: '2026-04-01T00:00:00Z',
  }

  it('derives media_count 0 for a text-only post whose file_count counts a metadata record', async () => {
    // Real production shape: { content, media_type: 'text', file_count: 1, files: [] }
    clientMocks.get.mockResolvedValueOnce({
      ...baseRaw,
      title: 'hello',
      content: 'hello',
      media_type: 'text',
      file_count: 1,
      files: [],
    })

    const post = await postService.getPost(baseRaw.id)
    expect(post.media_files).toEqual([])
    expect(post.media_count).toBe(0)
  })

  it('derives media_count 0 when files contain only metadata records', async () => {
    clientMocks.get.mockResolvedValueOnce({
      ...baseRaw,
      title: 'hello',
      file_count: 2,
      files: [{ id: 'meta-1', file_type: 'metadata', file_name: 'tweet.json' }],
    })

    const post = await postService.getPost(baseRaw.id)
    expect(post.media_count).toBe(0)
  })

  it('normalizes a missing media field as no media rather than a fallback', async () => {
    clientMocks.get.mockResolvedValueOnce({ ...baseRaw, title: 'plain' })

    const post = await postService.getPost(baseRaw.id)
    expect(post.media_count).toBe(0)
    expect(post.media_files ?? []).toEqual([])
  })

  it('treats an empty stream url as no media instead of defaulting to a generated url', async () => {
    clientMocks.get.mockResolvedValueOnce({
      ...baseRaw,
      media_type: 'image',
      stream_url: '',
      thumbnail_url: null,
      file_count: 1,
      files: [],
    })

    const post = await postService.getPost(baseRaw.id)
    expect(post.media_count).toBe(0)
  })

  it('keeps a real file_count for posts with a resolvable top-level media source', async () => {
    const mediaId = '2d43c52e-83d6-46a1-a125-707f54119a2f'
    clientMocks.get.mockResolvedValueOnce({
      ...baseRaw,
      media_id: mediaId,
      media_type: 'image',
      file_count: 1,
      files: [],
    })

    const post = await postService.getPost(baseRaw.id)
    expect(post.media_count).toBe(1)
  })

  it('derives media_count from actual media files and keeps them renderable', async () => {
    clientMocks.get.mockResolvedValueOnce({
      ...baseRaw,
      media_type: 'video',
      file_count: 3,
      files: [
        { id: 'video-1', file_type: 'video', file_name: 'a.mp4' },
        { id: 'image-1', file_type: 'image', file_name: 'b.jpg' },
      ],
    })

    const post = await postService.getPost(baseRaw.id)
    expect(post.media_count).toBe(2)
    expect(post.media_files).toHaveLength(2)
    expect(post.media_files?.[0]?.file_type).toBe('video')
  })

  it('respects an explicit media_count from the api', async () => {
    clientMocks.get.mockResolvedValueOnce({
      ...baseRaw,
      media_count: 4,
      media_files: [
        { id: 'media-1', file_path: '', file_type: 'image', is_downloaded: true, created_at: '' },
      ],
      external_links: [],
    })

    const post = await postService.getPost(baseRaw.id)
    expect(post.media_count).toBe(4)
    expect(post.media_files).toHaveLength(1)
  })
})
