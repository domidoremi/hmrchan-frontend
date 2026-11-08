import { defineComponent, h, reactive, shallowRef } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useJournalDialogs } from '../useJournalDialogs'
import type { JournalRuntime } from '../runtime'
import type { JournalPost } from '../models'

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'first' as string | undefined }, isAuthenticated: true },
  favorites: {
    items: [] as { post_id: string }[],
    checkFavorited: vi.fn(),
    addFavorite: vi.fn(),
    removeFavoriteByPostId: vi.fn(),
  },
  listPosts: vi.fn(),
  getPost: vi.fn(),
  searchPosts: vi.fn(),
  likePost: vi.fn(),
  unlikePost: vi.fn(),
}))
vi.mock('@/stores', () => ({
  useAuthStore: () => mocks.auth,
  useFavoritesStore: () => mocks.favorites,
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, fullPath: '/' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/services/authSurface', () => ({
  ensureAuthStoreLoaded: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/api/postService', () => ({
  postService: {
    listPosts: mocks.listPosts,
    getPost: mocks.getPost,
    likePost: mocks.likePost,
    unlikePost: mocks.unlikePost,
  },
}))
vi.mock('@/api/searchService', () => ({ searchService: { searchPosts: mocks.searchPosts } }))
vi.mock('@/api/authorService', () => ({ authorService: {} }))
vi.mock('@/utils/mediaOptimizer', () => ({
  getMediaStreamUrl: (id: string) => `/media/${id}/stream`,
  getMediaThumbnailUrl: (id: string) => `/media/${id}/thumbnail`,
}))
vi.mock('../models', () => ({ postModel: (post: JournalPost) => post, platforms: { x: 'X' } }))

const id = '019ab001-0000-7000-8000-000000000001'
const post = (title = 'A photo'): JournalPost => ({
  id,
  title,
  text: 'First line\nSecond line',
  image: '/preview.webp',
  author: 'Author',
  authorId: null,
  avatar: '/avatar.webp',
  time: 'Today',
  likes: 2,
  platform: 'x',
  type: '写真',
  tags: ['photo'],
})
let wrapper: VueWrapper, dialogs: ReturnType<typeof useJournalDialogs>
const escape = (value: unknown) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
function start() {
  const runtime = {
    UI: {
      escape,
      icon: () => '<svg></svg>',
      hydrate: vi.fn(),
      toast: vi.fn(),
      closeDialog: () => document.querySelector('dialog')!.removeAttribute('open'),
      openDialog: (content: string, className: string) => {
        document.dispatchEvent(new Event('dialogwillchange'))
        const element = document.querySelector('dialog')!
        element.className = className
        element.setAttribute('open', '')
        document.querySelector('#dialog-content')!.innerHTML = content
      },
    },
    Experience: { savedFeedback: vi.fn() },
  } as unknown as JournalRuntime
  wrapper = mount(
    defineComponent({
      setup() {
        dialogs = useJournalDialogs(shallowRef(runtime))
        return () => h('div')
      },
    }),
    { attachTo: document.body }
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = '<dialog id="app-dialog"><div id="dialog-content"></div></dialog>'
  HTMLElement.prototype.scrollIntoView = vi.fn()
  mocks.auth = reactive({ user: { id: 'first' }, isAuthenticated: true })
  mocks.favorites.items = []
  mocks.favorites.checkFavorited.mockResolvedValue(false)
  mocks.listPosts.mockResolvedValue({ items: [post()], has_more: false })
  mocks.getPost.mockResolvedValue({
    ...post(),
    media_files: [
      { id: 'one', file_type: 'image/jpeg' },
      { id: 'video', file_type: 'video/mp4' },
      { id: 'two', file_type: 'image/png' },
    ],
  })
  start()
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})
describe('journal dialog requests and real media', () => {
  it('keeps an open dialog during initial session restoration', async () => {
    mocks.auth.user.id = undefined
    await flushPromises()
    dialogs.openSearch()
    mocks.auth.user.id = 'first'
    await flushPromises()
    expect(document.querySelector('#app-dialog')!.hasAttribute('open')).toBe(true)
  })
  it('uses the confirmed community like count instead of adding to platform likes', async () => {
    mocks.getPost.mockResolvedValue({ ...post(), likes: 200, communityLikes: 3, liked: true })
    mocks.unlikePost.mockResolvedValue({ post_id: id, is_liked: false, community_like_count: 2 })
    await dialogs.openPost(post())
    const button = document.querySelector<HTMLElement>('[data-dialog-like]')!
    expect(button.textContent).toBe('3')
    button.click()
    await flushPromises()
    expect(mocks.unlikePost).toHaveBeenCalledWith(id, expect.any(Object))
    expect(button.textContent).toBe('2')
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps the newer search when an old request finishes later', async () => {
    let finish!: (value: unknown) => void
    mocks.searchPosts
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        })
      )
      .mockResolvedValueOnce({ items: [post('New result')], has_more: false })
    dialogs.openSearch('old')
    const signal = mocks.searchPosts.mock.calls[0]![1].signal
    dialogs.openSearch('new')
    await flushPromises()
    finish({ items: [post('Stale result')], has_more: false })
    await flushPromises()
    expect(signal.aborted).toBe(true)
    expect(document.querySelector('#search-results')!.textContent).toContain('New result')
    expect(document.querySelector('#search-results')!.textContent).not.toContain('Stale result')
  })
  it('does not replace a later dialog with a late post response', async () => {
    let finish!: (value: unknown) => void
    mocks.getPost.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const request = dialogs.openPost(post())
    dialogs.openSearch()
    finish(post('Late detail'))
    await request
    expect(document.querySelector('#app-dialog')!.className).toBe('search-dialog')
  })
  it('uses all real photos, excludes video, and preserves keyboard navigation', async () => {
    await dialogs.openPost(post())
    document.querySelector<HTMLElement>('[data-dialog-gallery]')!.click()
    await flushPromises()
    expect(document.querySelectorAll('.gallery-filmstrip button')).toHaveLength(2)
    expect(document.querySelector('.gallery-image')!.getAttribute('src')).toBe('/media/one/stream')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.querySelector('.gallery-image')!.getAttribute('src')).toBe('/media/two/stream')
    expect(document.querySelector('.gallery-counter')!.textContent).toBe('02 / 02')
    expect(document.activeElement?.getAttribute('data-real-gallery-step')).toBe('1')
  })
  it('escapes untrusted search titles and attributes', async () => {
    mocks.listPosts.mockResolvedValue({
      items: [post('<img id="injected" src=x onerror=alert(1)>')],
      has_more: false,
    })
    dialogs.openSearch()
    await flushPromises()
    expect(document.querySelector('#injected')).toBeNull()
    expect(document.querySelector('.search-result')!.textContent).toContain('<img id="injected"')
  })
  it('does not mutate a favorite after the account changes during its check', async () => {
    await dialogs.openPost(post())
    let finish!: (value: boolean) => void
    mocks.favorites.checkFavorited.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    document.querySelector<HTMLElement>('[data-dialog-save]')!.click()
    await flushPromises()
    mocks.auth.user.id = 'second'
    finish(false)
    await flushPromises()
    expect(mocks.favorites.addFavorite).not.toHaveBeenCalled()
    expect(mocks.favorites.removeFavoriteByPostId).not.toHaveBeenCalled()
  })
})
