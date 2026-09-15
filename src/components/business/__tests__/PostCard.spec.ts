import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('vue', async () => await import('vue/dist/vue.runtime-with-vapor.esm-browser.js'))
import { createApp, defineComponent, h, nextTick, vaporInteropPlugin, type App } from 'vue'
import type { PostListItem } from '@/api'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()

  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

import PostCard from '../PostCard.vue'

function createPost(overrides: Partial<PostListItem> = {}): PostListItem {
  return {
    id: 'post-1',
    platform: 'youtube',
    title: 'Post title',
    description: 'Post description',
    thumbnail_url: null,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    media_count: 0,
    author_name: 'Test Author',
    author_avatar_url: 'https://example.com/avatar.jpg',
    tags: [],
    external_links: [],
    ...overrides,
  }
}

const mountedApps: Array<{ app: App; host: HTMLDivElement }> = []

function mountPostCard(post: PostListItem, props: { preferOriginalImage?: boolean } = {}) {
  const emitted: Array<[string, string | null]> = []
  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp(
    defineComponent({
      setup() {
        const handleClick = (postId: string, thumbnailSrc: string | null) => {
          emitted.push([postId, thumbnailSrc])
        }

        return () =>
          h(PostCard, {
            post,
            ...props,
            onClick: handleClick,
          })
      },
    })
  )

  app.use(vaporInteropPlugin)
  app.mount(host)
  mountedApps.push({ app, host })

  return { emitted, host }
}

afterEach(() => {
  while (mountedApps.length > 0) {
    const entry = mountedApps.pop()
    entry?.app.unmount()
    entry?.host.remove()
  }
  vi.unstubAllGlobals()
})

describe('PostCard', () => {
  it('emits the post id and thumbnail source when clicked', () => {
    const { emitted, host } = mountPostCard(createPost())

    host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(emitted).toEqual([['post-1', null]])
  })

  it('keeps whole-card navigation unchanged when external links are present', () => {
    const { emitted, host } = mountPostCard(
      createPost({
        external_links: [{ platform: 'youtube', url: 'https://youtu.be/video' }],
      })
    )

    expect(host.querySelectorAll('a')).toHaveLength(0)
    expect(host.querySelectorAll('button')).toHaveLength(1)
    host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(emitted).toEqual([['post-1', null]])
  })

  it('falls back to the shared avatar fallback when author image loading fails', async () => {
    const { host } = mountPostCard(createPost())

    const img = host.querySelector('.post-author-avatar img')

    expect(img).not.toBeNull()

    img?.dispatchEvent(new Event('error'))
    await nextTick()

    expect(host.querySelector('.post-author-avatar img')).toBeNull()
    expect(host.querySelector('.post-author-avatar .ui-avatar__fallback')).not.toBeNull()
  })

  it('upgrades undersized large thumbnails to an image stream', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
        }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const mediaId = '123e4567-e89b-12d3-a456-426614174000'
    const { host } = mountPostCard(
      createPost({
        thumbnail_url: `/api/v1/media/${mediaId}/thumbnail?size=small`,
        media_count: 1,
      })
    )
    const image = host.querySelector<HTMLImageElement>('.post-image')
    expect(image).not.toBeNull()
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 400 })
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 600 })

    image?.dispatchEvent(new Event('load'))
    await vi.waitFor(() => {
      expect(host.querySelector<HTMLImageElement>('.post-image')?.src).toContain(
        `/api/v1/media/${mediaId}/stream`
      )
    })

    expect(fetchMock).toHaveBeenCalledWith(`/api/v1/media/${mediaId}/stream`, {
      headers: { Range: 'bytes=0-15' },
      credentials: 'same-origin',
      signal: expect.any(AbortSignal),
    })
  })

  it('keeps the thumbnail when the media stream is not an image', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
        })
      )
    )

    const mediaId = '3a1f5c8e-2b6d-4f90-8a3b-1c2d3e4f5a6b'
    const { host } = mountPostCard(
      createPost({
        thumbnail_url: `/api/v1/media/${mediaId}/thumbnail?size=small`,
        media_count: 1,
      })
    )
    const image = host.querySelector<HTMLImageElement>('.post-image')
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 400 })
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 225 })

    image?.dispatchEvent(new Event('load'))
    await vi.waitFor(() => expect(image?.classList.contains('is-loaded')).toBe(true))

    // The non-image stream probe must not replace the rendered thumbnail with /stream.
    expect(image?.src).not.toContain('/stream')
    expect(image?.src).toContain(`/media/${mediaId}/thumbnail`)
  })

  it('uses the original image stream before any thumbnail when requested', async () => {
    const mediaId = '223e4567-e89b-12d3-a456-426614174000'
    const { host } = mountPostCard(
      createPost({
        thumbnail_url: `/api/v1/media/${mediaId}/thumbnail?size=small`,
        media_type: 'image',
        media_count: 1,
      }),
      { preferOriginalImage: true }
    )
    await nextTick()
    const image = host.querySelector<HTMLImageElement>('.post-image')

    expect(image?.src).toContain(`/api/v1/media/${mediaId}/stream`)
  })
})

describe('PostCard no-media semantics', () => {
  it('renders no media placeholder for a text-only post with an inflated media_count', () => {
    // Production shape: backend counts a metadata record in file_count, posts may
    // surface media_count=1 while having neither thumbnail nor stream media.
    const { host } = mountPostCard(
      createPost({
        title: '@saara_hazuki すきー！！！',
        description: '@saara_hazuki すきー！！！',
        content: '@saara_hazuki すきー！！！',
        media_type: 'text',
        media_count: 1,
        thumbnail_url: null,
        stream_url: null,
        media_id: null,
      })
    )

    expect(host.querySelector('.post-image')).toBeNull()
    expect(host.querySelector('.post-image-placeholder--media')).toBeNull()
    expect(host.textContent).toContain('@saara_hazuki すきー！！！')
  })

  it('renders no media placeholder when media_count is positive but no source resolves', () => {
    const { host } = mountPostCard(
      createPost({
        media_count: 2,
        media_type: null,
        thumbnail_url: null,
        stream_url: '',
        media_id: null,
        description: null,
        content: null,
      })
    )

    expect(host.querySelector('.post-image')).toBeNull()
    expect(host.querySelector('.post-image-placeholder--media')).toBeNull()
    expect(host.querySelector('.post-image-placeholder--empty')).not.toBeNull()
  })

  it('renders no image for an empty-string thumbnail url', () => {
    const { host } = mountPostCard(createPost({ thumbnail_url: '', media_count: 1 }))

    expect(host.querySelector('.post-image')).toBeNull()
    expect(host.querySelector('.post-image-placeholder--media')).toBeNull()
  })

  it('still renders an image for a post with a genuine thumbnail', () => {
    const { host } = mountPostCard(
      createPost({
        thumbnail_url: 'https://img.example.com/cover.jpg',
        media_count: 1,
      })
    )

    const image = host.querySelector<HTMLImageElement>('.post-image')
    expect(image?.src).toContain('https://img.example.com/cover.jpg')
  })

  it('still marks a video post with a thumbnail as having media', () => {
    const mediaId = '123e4567-e89b-12d3-a456-426614174000'
    const { host } = mountPostCard(
      createPost({
        media_count: 1,
        media_type: 'video',
        thumbnail_url: `/api/v1/media/${mediaId}/thumbnail?size=small`,
        duration: 12,
      })
    )

    const image = host.querySelector<HTMLImageElement>('.post-image')
    expect(image).not.toBeNull()
  })
})
