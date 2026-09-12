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
