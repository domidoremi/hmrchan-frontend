import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import PostDetailPage from '../PostDetailPage.vue'

const mocks = vi.hoisted(() => {
  const DEFAULT_POST_ID = '0195fe30-6f9d-7f31-9e6f-c9a5c478a336'
  class MockApiError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  }

  let lazyObserverCallback: (() => void) | null = null

  return {
    MockApiError,
    replaceSpy: vi.fn(),
    pushSpy: vi.fn(),
    backSpy: vi.fn(),
    loadCachedPostMock: vi.fn(),
    getPostEntityMock: vi.fn(),
    applyPageMetaMock: vi.fn(),
    getFallbackPostDetailMock: vi.fn(),
    isServiceUnavailableErrorMock: vi.fn(() => false),
    getPostNavigationContextMock: vi.fn(() => null),
    getPostNavigationSummaryMock: vi.fn(() => null),
    updatePostNavigationIndexMock: vi.fn(),
    formatDateMock: vi.fn(() => 'Apr 14, 2026'),
    getMediaStreamUrlMock: vi.fn((id: string) => `/media/${id}/stream`),
    getMediaThumbnailUrlMock: vi.fn((id: string, size: string) => `/media/${id}/${size}.jpg`),
    getMediaThumbnailSrcsetMock: vi.fn((id: string) => `/media/${id}/small.jpg 1x`),
    resolveThumbnailSrcMock: vi.fn((url: string | null) => (url ? `${url}?resolved=1` : '')),
    resolveThumbnailSrcsetMock: vi.fn((url: string | null) => (url ? `${url}?resolved=1 1x` : '')),
    settingsRef: null as unknown as { value: { enableSwipeNavigation: boolean } },
    mockedRoute: {
      params: { id: DEFAULT_POST_ID },
      query: { from: 'profile' },
      hash: '#comments',
      path: `/post/${DEFAULT_POST_ID}`,
    },
    createLazyObserver: vi.fn((callback: () => void) => {
      lazyObserverCallback = callback
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
      }
    }),
    triggerLazyObserver: () => {
      lazyObserverCallback?.()
    },
  }
})

mocks.settingsRef = ref({
  enableSwipeNavigation: false,
})

vi.mock('pinia', () => ({
  storeToRefs: (store: Record<string, unknown>) => store,
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      replace: mocks.replaceSpy,
      push: mocks.pushSpy,
      back: mocks.backSpy,
    }),
    useRoute: () => mocks.mockedRoute,
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'post.publishedAt' && params?.date) {
        return `${key}:${params.date}`
      }
      return key
    },
  }),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    isAuthenticated: ref(true),
  }),
  useSettingsStore: () => ({
    settings: mocks.settingsRef,
  }),
}))

vi.mock('@/api', () => ({
  postService: {
    getPost: vi.fn(),
  },
  ApiError: mocks.MockApiError,
}))

vi.mock('@/composables/useCachedPosts', () => ({
  shouldUseStalePostDetailOnError: vi.fn(() => false),
  useCachedPost: () => ({
    data: ref(null),
    load: mocks.loadCachedPostMock,
    invalidate: vi.fn(),
  }),
}))

vi.mock('@/utils/performance', () => ({
  createLazyObserver: mocks.createLazyObserver,
  preconnect: vi.fn(),
  preloadResource: vi.fn(),
  runWhenIdle: vi.fn(() => () => {}),
  throttleRAF: (fn: (...args: unknown[]) => unknown) => fn,
  warmDecodedImage: vi.fn(),
}))

vi.mock('@/composables/useViewTracking', () => ({
  trackPostView: vi.fn(),
}))

vi.mock('@/utils/postNavigation', () => ({
  getPostNavigationContext: (...args: unknown[]) => mocks.getPostNavigationContextMock(...args),
  getPostNavigationSummary: (...args: unknown[]) => mocks.getPostNavigationSummaryMock(...args),
  updatePostNavigationIndex: (...args: unknown[]) => mocks.updatePostNavigationIndexMock(...args),
}))

vi.mock('@/fallbacks/postFallback', () => ({
  getFallbackPostDetailById: (...args: unknown[]) => mocks.getFallbackPostDetailMock(...args),
  buildFallbackPostDetail: (post: {
    id: string
    platform?: string
    title?: string | null
    content?: string | null
    description?: string
    thumbnail_url?: string | null
    media_count?: number
    view_count?: number
    like_count?: number
    comment_count?: number
    author_id?: string | null
    author_name?: string | null
    published_at?: string | null
    created_at?: string
  }) => ({
    id: post.id,
    platform: post.platform ?? 'unknown',
    title: post.title ?? undefined,
    description: post.description ?? post.content ?? post.title ?? undefined,
    thumbnail_url: post.thumbnail_url ?? null,
    author_id: post.author_id ?? undefined,
    author_name: post.author_name ?? undefined,
    view_count: post.view_count ?? 0,
    like_count: post.like_count ?? 0,
    comment_count: post.comment_count ?? 0,
    media_count: post.media_count ?? 0,
    created_at: post.created_at ?? post.published_at ?? '2026-04-14T00:00:00Z',
    published_at: post.published_at ?? undefined,
    media_files: [],
    tags: [],
    media_type: null,
    language: null,
    author_other_posts: [],
  }),
}))

vi.mock('@/fallbacks/publicPageFallback', () => ({
  isServiceUnavailableError: (...args: unknown[]) => mocks.isServiceUnavailableErrorMock(...args),
}))

vi.mock('@/utils/mediaOptimizer', () => ({
  getMediaStreamUrl: (...args: unknown[]) => mocks.getMediaStreamUrlMock(...args),
  getMediaThumbnailSrcset: (...args: unknown[]) => mocks.getMediaThumbnailSrcsetMock(...args),
  getMediaThumbnailUrl: (...args: unknown[]) => mocks.getMediaThumbnailUrlMock(...args),
}))

vi.mock('@/utils/thumbnailPresentation', () => ({
  resolveThumbnailSrc: (...args: unknown[]) => mocks.resolveThumbnailSrcMock(...args),
  resolveThumbnailSrcset: (...args: unknown[]) => mocks.resolveThumbnailSrcsetMock(...args),
}))

vi.mock('@/utils/pageMeta', () => ({
  applyPageMeta: mocks.applyPageMetaMock,
}))

vi.mock('@/utils/date', () => ({
  formatDate: (...args: unknown[]) => mocks.formatDateMock(...args),
}))

vi.mock('@/utils/bodyScrollLock', () => ({
  lockBodyScroll: vi.fn(),
  unlockBodyScroll: vi.fn(),
}))

vi.mock('@/utils/cache', () => ({
  postCache: {
    getPostEntity: mocks.getPostEntityMock,
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    name: 'StateIndicator',
    template: '<div data-testid="state-indicator" />',
  },
}))

vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: {
    name: 'Skeleton',
    template: '<div data-testid="skeleton" />',
  },
}))

vi.mock('@/components/ui/VideoPlayer.vue', () => ({
  default: {
    name: 'VideoPlayer',
    template: '<div data-testid="video-player" />',
  },
}))

vi.mock('@/components/animation/AnimatedIcon.vue', () => ({
  default: {
    name: 'AnimatedIcon',
    template: '<span data-testid="animated-icon" />',
  },
}))

const basePost = {
  id: '0195fe30-6f9d-7f31-9e6f-c9a5c478a336',
  title: 'Sample post',
  description: 'Detail body',
  media_count: 0,
  media_files: [],
  thumbnail_url: null,
  author_id: 'author-1',
  author_name: 'alice',
  created_at: '2026-04-14T00:00:00Z',
  view_count: 10,
  like_count: 2,
  published_at: '2026-04-14T00:00:00Z',
}

function mountDetailPage(options?: {
  commentList?: object
  attachToBody?: boolean
  errorHandler?: (error: unknown) => void
}) {
  return mount(PostDetailPage, {
    attachTo: options?.attachToBody ? document.body : undefined,
    global: {
      config: options?.errorHandler
        ? {
            errorHandler: options.errorHandler,
          }
        : undefined,
      stubs: {
        Transition: false,
        Suspense: false,
        CommentList: options?.commentList ?? {
          props: ['postId'],
          template: '<div class="comment-list-stub">comments for {{ postId }}</div>',
        },
        PostActionStrip: {
          template: '<div class="post-action-strip-stub" />',
        },
        MediaLightbox: {
          props: ['isOpen'],
          template: '<div class="media-lightbox-stub" :data-open="String(isOpen)" />',
        },
      },
      mocks: {
        $t: (key: string, params?: Record<string, unknown>) => {
          if (key === 'post.publishedAt' && params?.date) {
            return `${key}:${params.date}`
          }
          return key
        },
      },
    },
  })
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function flushAnimationFrame() {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  await flushPromises()
}

const PostCommentListHarness = defineComponent({
  name: 'PostCommentListHarness',
  template: `
    <section class="comment-list">
      <form class="comment-form" @submit.prevent="submitRootSuccess">
        <button type="submit" class="comment-submit-success">submit success</button>
      </form>
      <button type="button" class="comment-submit-failure" @click="submitRootFailure">
        submit failure
      </button>
      <button type="button" class="reply-toggle" @click="startReply">reply</button>
      <form v-if="showReplyForm" class="comment-form comment-form--reply" @submit.prevent="submitReplySuccess">
        <button type="submit" class="reply-submit-success">reply success</button>
        <button type="button" class="reply-submit-cancel" @click="cancelReply">reply cancel</button>
      </form>
      <div class="comment-feedback comment-feedback--success" v-if="successCount > 0">
        success:{{ successCount }}
      </div>
      <div class="comment-feedback comment-feedback--error" v-if="errorCount > 0">
        error:{{ errorCount }}
      </div>
      <div class="reply-thread-state">{{ replyThreadState }}</div>
      <div class="comment-count">{{ commentsCount }}</div>
    </section>
  `,
  setup() {
    const commentsCount = ref(1)
    const successCount = ref(0)
    const errorCount = ref(0)
    const showReplyForm = ref(false)
    const replyThreadState = ref('idle')

    function submitRootSuccess() {
      commentsCount.value += 1
      successCount.value += 1
    }

    function submitRootFailure() {
      errorCount.value += 1
    }

    function startReply() {
      showReplyForm.value = true
      replyThreadState.value = 'replying'
    }

    function submitReplySuccess() {
      successCount.value += 1
      replyThreadState.value = 'updated'
      showReplyForm.value = false
    }

    function cancelReply() {
      showReplyForm.value = false
      replyThreadState.value = 'cancelled'
    }

    return {
      commentsCount,
      successCount,
      errorCount,
      showReplyForm,
      replyThreadState,
      submitRootSuccess,
      submitRootFailure,
      startReply,
      submitReplySuccess,
      cancelReply,
    }
  },
})

describe('PostDetailPage', () => {
  let originalIntersectionObserver: typeof window.IntersectionObserver | undefined

  beforeEach(() => {
    mocks.mockedRoute.params.id = '0195fe30-6f9d-7f31-9e6f-c9a5c478a336'
    mocks.mockedRoute.path = '/post/0195fe30-6f9d-7f31-9e6f-c9a5c478a336'
    mocks.mockedRoute.query = { from: 'profile' }
    mocks.mockedRoute.hash = '#comments'
    mocks.replaceSpy.mockReset()
    mocks.pushSpy.mockReset()
    mocks.backSpy.mockReset()
    mocks.loadCachedPostMock.mockReset()
    mocks.getPostEntityMock.mockReset()
    mocks.applyPageMetaMock.mockReset()
    mocks.getFallbackPostDetailMock.mockReset()
    mocks.isServiceUnavailableErrorMock.mockReset()
    mocks.getPostNavigationContextMock.mockReset()
    mocks.getPostNavigationSummaryMock.mockReset()
    mocks.updatePostNavigationIndexMock.mockReset()
    mocks.formatDateMock.mockReset()
    mocks.getMediaStreamUrlMock.mockReset()
    mocks.getMediaThumbnailUrlMock.mockReset()
    mocks.getMediaThumbnailSrcsetMock.mockReset()
    mocks.resolveThumbnailSrcMock.mockReset()
    mocks.resolveThumbnailSrcsetMock.mockReset()
    mocks.getPostEntityMock.mockResolvedValue(null)
    mocks.loadCachedPostMock.mockResolvedValue({
      data: basePost,
      fromCache: false,
    })
    mocks.getFallbackPostDetailMock.mockReturnValue(null)
    mocks.isServiceUnavailableErrorMock.mockReturnValue(false)
    mocks.getPostNavigationContextMock.mockReturnValue(null)
    mocks.getPostNavigationSummaryMock.mockReturnValue(null)
    mocks.formatDateMock.mockReturnValue('Apr 14, 2026')
    mocks.getMediaStreamUrlMock.mockImplementation((id: string) => `/media/${id}/stream`)
    mocks.getMediaThumbnailUrlMock.mockImplementation(
      (id: string, size: string) => `/media/${id}/${size}.jpg`
    )
    mocks.getMediaThumbnailSrcsetMock.mockImplementation(
      (id: string) => `/media/${id}/small.jpg 1x`
    )
    mocks.resolveThumbnailSrcMock.mockImplementation((url: string | null) =>
      url ? `${url}?resolved=1` : ''
    )
    mocks.resolveThumbnailSrcsetMock.mockImplementation((url: string | null) =>
      url ? `${url}?resolved=1 1x` : ''
    )
    mocks.settingsRef.value.enableSwipeNavigation = false
    originalIntersectionObserver = window.IntersectionObserver
    window.IntersectionObserver = vi.fn() as unknown as typeof window.IntersectionObserver
  })

  afterEach(() => {
    if (originalIntersectionObserver) {
      window.IntersectionObserver = originalIntersectionObserver
    } else {
      delete (window as Partial<Window>).IntersectionObserver
    }
    vi.clearAllMocks()
  })

  it('redirects to not-found when the detail request returns 404', async () => {
    mocks.loadCachedPostMock.mockRejectedValue(new mocks.MockApiError('Post not found', 404))

    mountDetailPage()

    await flushPromises()

    expect(mocks.replaceSpy).toHaveBeenCalledWith({
      name: 'not-found',
      params: { pathMatch: ['post', mocks.mockedRoute.params.id] },
      query: mocks.mockedRoute.query,
      hash: mocks.mockedRoute.hash,
    })
  })

  it('redirects invalid placeholder route ids to not-found instead of explore', async () => {
    mocks.mockedRoute.params.id = 'undefined'
    mocks.mockedRoute.path = '/post/undefined'

    mountDetailPage()
    await flushPromises()

    expect(mocks.replaceSpy).toHaveBeenCalledWith({
      name: 'not-found',
      params: { pathMatch: ['post', 'undefined'] },
      query: mocks.mockedRoute.query,
      hash: mocks.mockedRoute.hash,
    })
    expect(mocks.loadCachedPostMock).not.toHaveBeenCalled()
  })

  it('renders a synthesized fallback when the detail request returns 404 but navigation summary exists', async () => {
    mocks.getPostNavigationSummaryMock.mockReturnValue({
      id: basePost.id,
      platform: 'twitter',
      title: 'List summary title',
      content: 'List summary content',
      thumbnail_url: 'https://cdn.example.com/list-thumb.jpg',
      media_count: 1,
      view_count: 99,
      like_count: 12,
      comment_count: 7,
      author_name: 'summary author',
      author_id: 'author-1',
      published_at: '2026-04-14T00:00:00Z',
      created_at: '2026-04-14T00:00:00Z',
    })
    mocks.loadCachedPostMock.mockRejectedValue(new mocks.MockApiError('Post not found', 404))

    const wrapper = mountDetailPage({ attachToBody: true })
    await flushPromises()

    expect(mocks.replaceSpy).not.toHaveBeenCalled()
    expect(wrapper.find('.post-title').text()).toContain('List summary title')
    expect(wrapper.find('.post-description').text()).toContain('List summary content')
    expect(wrapper.find('.post-image').attributes('src')).toContain('list-thumb.jpg?resolved=1')
  })

  it('loads the comment list branch once the comments section becomes visible', async () => {
    mocks.loadCachedPostMock.mockResolvedValue({
      data: basePost,
      fromCache: false,
    })

    const wrapper = mountDetailPage({ attachToBody: true })

    await flushPromises()

    expect(wrapper.find('.post-comments__placeholder').exists()).toBe(true)
    mocks.triggerLazyObserver()
    await flushPromises()

    expect(wrapper.find('.comment-list-stub').exists()).toBe(true)
    expect(wrapper.find('.comment-list-stub').text()).toContain(basePost.id)
  })

  it('loads the comment list branch after programmatic scroll brings the comments section into view', async () => {
    mocks.loadCachedPostMock.mockResolvedValue({
      data: basePost,
      fromCache: false,
    })

    const wrapper = mountDetailPage({ attachToBody: true })
    await flushPromises()

    const commentsSection = wrapper.get('.post-comments').element as HTMLElement
    vi.spyOn(commentsSection, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 720,
      top: 720,
      bottom: 980,
      left: 0,
      right: 960,
      width: 960,
      height: 260,
      toJSON: () => ({}),
    } as DOMRect)

    expect(wrapper.find('.comment-list-stub').exists()).toBe(false)

    window.dispatchEvent(new Event('scroll'))
    await flushAnimationFrame()

    expect(wrapper.find('.comment-list-stub').exists()).toBe(true)
    expect(wrapper.find('.comment-list-stub').text()).toContain(basePost.id)
  })

  it('keeps post comment success, reply update, and cancel flows stable once the detail comments branch is loaded', async () => {
    const errorHandler = vi.fn()
    mocks.loadCachedPostMock.mockResolvedValue({
      data: basePost,
      fromCache: false,
    })

    const wrapper = mountDetailPage({
      attachToBody: true,
      errorHandler,
      commentList: PostCommentListHarness,
    })

    await flushPromises()
    mocks.triggerLazyObserver()
    await flushPromises()

    expect(wrapper.find('.comment-form').exists()).toBe(true)

    await wrapper.get('.comment-submit-success').trigger('click')
    await flushPromises()

    expect(wrapper.find('.comment-feedback--success').text()).toContain('1')
    expect(wrapper.find('.comment-feedback--error').exists()).toBe(false)
    expect(wrapper.find('.comment-count').text()).toContain('2')

    await wrapper.get('.reply-toggle').trigger('click')
    expect(wrapper.find('.comment-form--reply').exists()).toBe(true)

    await wrapper.get('.reply-submit-success').trigger('click')
    await flushPromises()

    expect(wrapper.find('.reply-thread-state').text()).toContain('updated')
    expect(wrapper.find('.comment-form--reply').exists()).toBe(false)
    expect(wrapper.find('.comment-feedback--success').text()).toContain('2')

    await wrapper.get('.reply-toggle').trigger('click')
    expect(wrapper.find('.comment-form--reply').exists()).toBe(true)

    await wrapper.get('.reply-submit-cancel').trigger('click')
    await flushPromises()

    expect(wrapper.find('.comment-form--reply').exists()).toBe(false)
    expect(wrapper.find('.reply-thread-state').text()).toContain('cancelled')
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it('surfaces only the post comment error state when submission fails', async () => {
    const errorHandler = vi.fn()
    mocks.loadCachedPostMock.mockResolvedValue({
      data: basePost,
      fromCache: false,
    })

    const wrapper = mountDetailPage({
      attachToBody: true,
      errorHandler,
      commentList: PostCommentListHarness,
    })

    await flushPromises()
    mocks.triggerLazyObserver()
    await flushPromises()

    await wrapper.get('.comment-submit-failure').trigger('click')
    await flushPromises()

    expect(wrapper.find('.comment-feedback--error').text()).toContain('1')
    expect(wrapper.find('.comment-feedback--success').exists()).toBe(false)
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it('renders fallback text detail, opens and closes the text modal, and keeps live errors hidden when fallback is active', async () => {
    const fallbackPost = {
      ...basePost,
      title: 'A very long fallback title',
      description: `${'Long fallback body '.repeat(30)}`.trim(),
      media_count: 0,
      media_files: [],
      thumbnail_url: null,
    }

    mocks.isServiceUnavailableErrorMock.mockReturnValue(true)
    mocks.getFallbackPostDetailMock.mockReturnValue(fallbackPost)
    mocks.loadCachedPostMock.mockRejectedValue(new Error('service unavailable'))

    const wrapper = mountDetailPage({ attachToBody: true })
    await flushPromises()

    expect(wrapper.find('[data-testid="state-indicator"]').exists()).toBe(false)
    expect(wrapper.find('.post-media-text-only').exists()).toBe(true)
    expect(wrapper.find('.post-title').text()).toContain('A very long fallback title')
    expect(wrapper.find('.post-date').text()).toContain('Apr 14, 2026')
    expect(mocks.applyPageMetaMock).toHaveBeenCalled()

    await wrapper.get('.post-description-more').trigger('click')
    await flushPromises()
    expect(wrapper.find('.post-text-overlay').exists()).toBe(true)
    expect(wrapper.find('.post-text-content').text()).toContain('Long fallback body')
  })

  it('uses cached pending media state first and then refreshes into thumbnail fallback content', async () => {
    const deferredRefresh = createDeferred<{ data: typeof basePost; fromCache: boolean }>()
    mocks.getPostEntityMock.mockResolvedValue({
      ...basePost,
      media_count: 3,
      media_files: [],
      thumbnail_url: 'https://cdn.example.com/thumb.jpg',
    })
    mocks.loadCachedPostMock.mockReturnValue(deferredRefresh.promise)

    const wrapper = mountDetailPage({ attachToBody: true })
    await flushPromises()

    expect(wrapper.find('.media-viewer .media-skeleton').exists()).toBe(true)
    expect(wrapper.findAll('.thumbnail-btn--placeholder')).toHaveLength(3)

    deferredRefresh.resolve({
      data: {
        ...basePost,
        media_count: 0,
        media_files: [],
        thumbnail_url: 'https://cdn.example.com/thumb.jpg',
      },
      fromCache: false,
    })
    await flushPromises()

    expect(wrapper.find('.post-image').attributes('src')).toContain('thumb.jpg?resolved=1')
    expect(wrapper.findAll('.thumbnail-btn--placeholder')).toHaveLength(0)
  })

  it('renders loaded image galleries and routes author/back actions', async () => {
    mocks.loadCachedPostMock.mockResolvedValue({
      data: {
        ...basePost,
        media_count: 2,
        media_files: [
          { id: 'media-1', file_type: 'image', width: 1280, height: 720 },
          { id: 'media-2', file_type: 'image', width: 720, height: 1280 },
        ],
      },
      fromCache: false,
    })

    const wrapper = mountDetailPage({ attachToBody: true })
    await flushPromises()

    expect(wrapper.findAll('.thumbnail-btn')).toHaveLength(2)
    expect(wrapper.find('.media-nav.next').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.media-nav.prev').attributes('disabled')).toBeDefined()
    expect(
      wrapper
        .findAll('.media-viewer-item')
        .some((item) => item.attributes('src')?.includes('/media/media-1/large.jpg'))
    ).toBe(true)
    expect(wrapper.find('.media-viewer-expand').exists()).toBe(true)
    expect(wrapper.find('.media-nav.next').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.media-nav.prev').attributes('disabled')).toBeDefined()

    await wrapper.get('.author-link').trigger('click')
    expect(mocks.pushSpy).toHaveBeenCalledWith('/author/author-1')

    await wrapper.get('.post-back-fab').trigger('click')
    expect(mocks.backSpy).toHaveBeenCalledTimes(1)
  })

  it('supports media selection, lightbox opening, and full-text modal dismissal flows', async () => {
    mocks.loadCachedPostMock.mockResolvedValue({
      data: {
        ...basePost,
        title: 'Gallery title',
        description: `Lead paragraph ${'detail body '.repeat(40)}`.trim(),
        media_count: 3,
        media_files: [
          { id: 'media-1', file_type: 'image', width: 1280, height: 720 },
          { id: 'media-2', file_type: 'image', width: 720, height: 1280 },
          { id: 'media-3', file_type: 'image', width: 1280, height: 720 },
        ],
      },
      fromCache: false,
    })

    const wrapper = mountDetailPage({ attachToBody: true })
    await flushPromises()

    expect(wrapper.findAll('.thumbnail-btn')).toHaveLength(3)

    await wrapper.findAll('.thumbnail-btn')[1]!.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.thumbnail-btn')[1]!.classes()).toContain('active')

    await wrapper.get('.media-nav.next').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.thumbnail-btn')[2]!.classes()).toContain('active')

    await wrapper.get('.media-nav.prev').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.thumbnail-btn')[1]!.classes()).toContain('active')

    await wrapper.get('.media-viewer-expand').trigger('click')
    await flushPromises()
    expect(wrapper.find('.media-lightbox-stub').attributes('data-open')).toBe('true')

    await wrapper.get('.post-description-more').trigger('click')
    await flushPromises()
    expect(wrapper.find('.post-text-overlay').exists()).toBe(true)
    expect(wrapper.find('.post-text-close').exists()).toBe(true)
  })

  it('requires a second wheel gesture before navigating to the next post when swipe navigation is enabled', async () => {
    mocks.settingsRef.value.enableSwipeNavigation = true
    mocks.getPostNavigationContextMock.mockReturnValue({
      ids: [basePost.id, 'post-2'],
      index: 0,
      source: 'search',
    })
    mocks.loadCachedPostMock.mockResolvedValue({
      data: {
        ...basePost,
        media_count: 0,
        media_files: [],
      },
      fromCache: false,
    })

    const wrapper = mountDetailPage({ attachToBody: true })
    await flushPromises()

    window.dispatchEvent(new PointerEvent('pointerdown'))
    await flushPromises()

    const stage = wrapper.get('.post-stage').element
    const firstWheel = new WheelEvent('wheel', {
      deltaX: 160,
      deltaY: 0,
      cancelable: true,
    })
    stage.dispatchEvent(firstWheel)
    await flushPromises()

    expect(mocks.pushSpy).not.toHaveBeenCalled()
    expect(wrapper.find('.post-nav-hint').exists()).toBe(true)

    const secondWheel = new WheelEvent('wheel', {
      deltaX: 160,
      deltaY: 0,
      cancelable: true,
    })
    stage.dispatchEvent(secondWheel)
    await flushPromises()

    expect(mocks.pushSpy).toHaveBeenCalledWith('/post/post-2')
  })
})
