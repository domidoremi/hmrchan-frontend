import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { mapPostDetailContent } from '@/api/hmrContentMappers'
import type { HmrPostDetailContent } from '@/api/hmrContent'
import {
  formatHmrCompactNumber,
  useHmrPostDetailView,
} from '@/hmr/composables/useHmrPostDetailView'
import type { HmrPageState } from '@/hmr/types'

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

describe('formatHmrCompactNumber', () => {
  it('formats compact counts for detail labels', () => {
    expect(formatHmrCompactNumber(999)).toBe('999')
    expect(formatHmrCompactNumber(1200)).toBe('1.2K')
    expect(formatHmrCompactNumber(1000000)).toBe('1M')
  })
})

describe('useHmrPostDetailView', () => {
  it('derives available detail labels and interaction metrics', () => {
    const detail = ref(
      makeDetailContent({
        post: {
          ...makeDetailContent().post,
          commentCount: 1200,
          likeCount: 2500000,
          postUrl: 'https://example.com/post/1',
        },
        comments: [
          { id: 'comment-1', title: 'First', excerpt: 'One', metric: 'now' },
          { id: 'comment-2', title: 'Second', excerpt: 'Two', metric: 'later' },
        ],
      })
    )
    const pageState = ref<HmrPageState>('ready')
    const view = useHmrPostDetailView(detail, pageState)

    expect(view.heroEyebrow.value).toBe('YouTube · 刚刚')
    expect(view.heroTitle.value).toBe('Loaded post')
    expect(view.sourceDescription.value).toBe('https://example.com/post/1')
    expect(view.interactionLabel.value).toBe('1.2K 回应 · 2.5M 喜欢')
    expect(view.commentsPreview.value).toHaveLength(2)
    expect(view.detailMetrics.value).toEqual([
      { label: '平台', value: 'YouTube' },
      { label: '作者', value: 'MomiChan' },
      { label: '互动', value: '12 views' },
      { label: '类型', value: '帖子' },
    ])
  })

  it('uses responsive thumbnails for hero and media attachments', () => {
    const detail = ref(
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
            title: 'Attachment',
            mediaType: 'image',
            thumbnailUrl: '/api/v1/media/attachment/thumbnail?size=small',
            streamUrl: '/api/v1/media/attachment/stream',
          },
        ],
      })
    )
    const pageState = ref<HmrPageState>('ready')
    const view = useHmrPostDetailView(detail, pageState)

    expect(view.heroImage.value).toBe('/api/v1/media/hero/thumbnail?size=small')
    expect(view.heroImageSrcset.value).toContain('/api/v1/media/hero/thumbnail?size=medium')
    expect(view.mediaImageSrcset('/api/v1/media/attachment/thumbnail?size=small')).toContain(
      '/api/v1/media/attachment/thumbnail?size=medium'
    )
    expect(view.mediaLabel.value).toBe('2 个媒体资源')
    expect(view.showMediaSection.value).toBe(true)
  })

  it('uses the first mapped attachment thumbnail as the hero fallback', () => {
    const detail = ref(
      mapPostDetailContent(
        'post-1',
        {
          post: {
            id: 'post-1',
            title: 'File-only post',
            excerpt: 'Loaded from file metadata',
            platform: 'twitter',
            files: [
              {
                id: 'image-file',
                file_name: '2026-05-28_1.jpg',
                file_type: 'image',
              },
            ],
          },
        },
        null
      )
    )
    const pageState = ref<HmrPageState>('ready')
    const view = useHmrPostDetailView(detail, pageState)

    expect(detail.value.post.mediaUrl).toBeUndefined()
    expect(view.heroImage.value).toBe('/api/v1/media/image-file/thumbnail?size=small')
    expect(view.heroImageSrcset.value).toContain('/api/v1/media/image-file/thumbnail?size=medium')
    expect(view.mediaLabel.value).toBe('1 个媒体资源')
    expect(view.showMediaSection.value).toBe(true)
  })

  it('maps restricted, not-found, and unavailable states to reader copy', () => {
    const detail = ref(
      makeDetailContent({
        viewState: 'restricted',
      })
    )
    const pageState = ref<HmrPageState>('error')
    const view = useHmrPostDetailView(detail, pageState)

    expect(view.heroTitle.value).toBe('这条帖子当前无法公开预览')
    expect(view.detailMetrics.value[0]).toEqual({ label: '状态', value: '公开预览受限' })
    expect(view.showContentSections.value).toBe(false)
    expect(view.canRetry.value).toBe(false)

    detail.value = makeDetailContent({ viewState: 'not-found' })
    pageState.value = 'empty'
    expect(view.heroEyebrow.value).toBe('未找到 · 该帖子可能已被移除')
    expect(view.stateTitle.value).toBe('未找到内容')

    detail.value = makeDetailContent({ viewState: 'temporary-unavailable' })
    pageState.value = 'error'
    expect(view.heroTitle.value).toBe('内容暂时不可用')
    expect(view.canRetry.value).toBe(true)
  })
})
