import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import type { HmrPostDetailContent } from '@/api/hmrContent'
import type { HmrAsyncResource } from '@/hmr/types'
import PostDetailPage from '@/views/PostDetailPage.vue'

const mocks = vi.hoisted(() => ({
  loadPostDetailContentResource: vi.fn(),
  readPublicContent: vi.fn(),
}))

vi.mock('@/api/hmrContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hmrContent')>()
  return {
    ...actual,
    loadPostDetailContentResource: mocks.loadPostDetailContentResource,
  }
})

vi.mock('@/utils/cache/publicContentCache', () => ({
  readPublicContent: mocks.readPublicContent,
}))

function makeDetailContent(overrides: Partial<HmrPostDetailContent> = {}): HmrPostDetailContent {
  return {
    post: {
      id: 'post-1',
      title: 'Loaded post',
      excerpt: 'Loaded public summary',
      authorName: 'MomiChan',
      tag: 'YouTube',
      createdAt: '刚刚',
      statsLabel: '12 views',
      platform: 'youtube',
    },
    relatedPosts: [],
    comments: [],
    media: [],
    viewState: 'available',
    ...overrides,
  }
}

function makeResource(data: HmrPostDetailContent): HmrAsyncResource<HmrPostDetailContent> {
  return {
    state: 'ready',
    data,
    source: 'api',
    error: null,
    paths: ['/posts/post-1'],
    updatedAt: '2026-05-28T00:00:00.000Z',
  }
}

async function mountPostDetail(path = '/posts/post-1') {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/posts/:id', component: PostDetailPage },
      { path: '/explore', component: { template: '<div />' } },
      { path: '/community', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(PostDetailPage, {
    global: {
      plugins: [router],
    },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('PostDetailPage', () => {
  beforeEach(() => {
    mocks.loadPostDetailContentResource.mockReset()
    mocks.readPublicContent.mockReset()
  })

  it('loads detail content through the public resource cache using the route id', async () => {
    mocks.readPublicContent.mockResolvedValue(makeResource(makeDetailContent()))

    const { wrapper } = await mountPostDetail('/posts/post-1')

    expect(mocks.readPublicContent).toHaveBeenCalledWith({
      key: 'hmr:post-detail:post-1',
      scope: 'post-detail',
      strategy: 'stale-while-revalidate',
      loader: expect.any(Function),
    })
    const loader = mocks.readPublicContent.mock.calls[0]?.[0]?.loader as () => Promise<unknown>
    await loader()
    expect(mocks.loadPostDetailContentResource).toHaveBeenCalledExactlyOnceWith('post-1')
    expect(wrapper.text()).toContain('Loaded post')
    expect(wrapper.text()).toContain('Loaded public summary')
  })

  it('maps not-found detail resources to the empty page state', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(
        makeDetailContent({
          post: {
            id: 'missing',
            title: '这条帖子不存在或已下架',
            excerpt: '',
            authorName: 'MomiChan',
            tag: '',
            createdAt: '',
            statsLabel: '',
          },
          viewState: 'not-found',
        })
      )
    )

    const { wrapper } = await mountPostDetail('/posts/missing')

    expect(wrapper.text()).toContain('未找到 · 该帖子可能已被移除')
    expect(wrapper.text()).toContain('这条帖子不存在或已下架')
    expect(wrapper.text()).toContain('未找到内容')
  })

  it('prioritizes the hero image and lazily loads attachment thumbnails', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(
        makeDetailContent({
          post: {
            ...makeDetailContent().post,
            mediaUrl: '/api/v1/media/hero/thumbnail?size=small',
            mediaCount: 2,
            hasRenderableMedia: true,
          },
          media: [
            {
              id: 'media-1',
              title: 'Attachment preview',
              mediaType: 'image',
              thumbnailUrl: '/api/v1/media/attachment/thumbnail?size=small',
              streamUrl: '/api/v1/media/attachment/stream',
            },
          ],
        })
      )
    )

    const { wrapper } = await mountPostDetail('/posts/post-1')
    const heroImage = wrapper.find('.hmr-detail-cover-media img')
    const mediaImage = wrapper.find('.hmr-detail-media-card img')

    expect(heroImage.attributes('loading')).toBe('eager')
    expect(heroImage.attributes('fetchpriority')).toBe('high')
    expect(heroImage.attributes('srcset')).toContain('/api/v1/media/hero/thumbnail?size=medium')
    expect(mediaImage.attributes('loading')).toBe('lazy')
    expect(mediaImage.attributes('fetchpriority')).toBe('low')
    expect(mediaImage.attributes('srcset')).toContain(
      '/api/v1/media/attachment/thumbnail?size=medium'
    )
  })

  it('opens image attachment cards with a large preview URL', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(
        makeDetailContent({
          media: [
            {
              id: 'media-1',
              title: 'Attachment preview',
              mediaType: 'image',
              thumbnailUrl: '/api/v1/media/media-1/thumbnail?size=small',
              streamUrl: '/api/v1/media/media-1/stream',
            },
          ],
        })
      )
    )

    const { wrapper } = await mountPostDetail('/posts/post-1')
    const mediaCard = wrapper.find('.hmr-detail-media-card')
    const mediaImage = mediaCard.find('img')

    expect(mediaCard.attributes('href')).toBe('/api/v1/media/media-1/thumbnail?size=large')
    expect(mediaCard.attributes('target')).toBe('_blank')
    expect(mediaImage.attributes('src')).toBe('/api/v1/media/media-1/thumbnail?size=small')
  })

  it('does not route back into the current post when an image attachment is clicked', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(
        makeDetailContent({
          media: [
            {
              id: 'media-1',
              title: 'Attachment preview',
              mediaType: 'image',
              thumbnailUrl: '/api/v1/media/media-1/thumbnail?size=small',
              streamUrl: '/api/v1/media/media-1/stream',
            },
          ],
        })
      )
    )

    const { wrapper, router } = await mountPostDetail('/posts/post-1')
    const mediaCard = wrapper.find('.hmr-detail-media-card')

    await mediaCard.trigger('click')

    expect(router.currentRoute.value.fullPath).toBe('/posts/post-1')
    expect(mediaCard.attributes('href')).toBe('/api/v1/media/media-1/thumbnail?size=large')
  })

  it('opens non-image attachment cards with the stream URL', async () => {
    mocks.readPublicContent.mockResolvedValue(
      makeResource(
        makeDetailContent({
          media: [
            {
              id: 'media-1',
              title: 'Video preview',
              mediaType: 'video',
              thumbnailUrl: '/api/v1/media/media-1/thumbnail?size=small',
              streamUrl: '/api/v1/media/media-1/stream',
            },
          ],
        })
      )
    )

    const { wrapper } = await mountPostDetail('/posts/post-1')

    expect(wrapper.find('.hmr-detail-media-card').attributes('href')).toBe(
      '/api/v1/media/media-1/stream'
    )
  })
})
