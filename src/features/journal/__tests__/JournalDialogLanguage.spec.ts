import { defineComponent, h, nextTick, reactive, shallowRef } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createJournalRuntime, type JournalRuntime } from '../runtime'
import { useJournalDialogs } from '../useJournalDialogs'
import { journalFavoriteFeedback } from '../feedback'
import type { JournalPost } from '../models'
import { createJournalTestI18n, type JournalTestLocale } from './journalTestI18n'

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'owner' }, isAuthenticated: true },
  favorites: {
    items: [] as { post_id: string }[],
    checkFavorited: vi.fn(),
    addFavorite: vi.fn(),
    removeFavoriteByPostId: vi.fn(),
    restoreFavorite: vi.fn(),
  },
  ensureAccount: vi.fn(),
  getPost: vi.fn(),
  listPosts: vi.fn(),
  searchPosts: vi.fn(),
  getAuthor: vi.fn(),
  listAuthorPosts: vi.fn(),
}))
vi.mock('@/stores', () => ({
  useAuthStore: () => mocks.auth,
  useFavoritesStore: () => mocks.favorites,
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, fullPath: '/explore' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/services/authSurface', () => ({ ensureAuthStoreLoaded: mocks.ensureAccount }))
vi.mock('@/api/postService', () => ({
  postService: { getPost: mocks.getPost, listPosts: mocks.listPosts },
}))
vi.mock('@/api/searchService', () => ({ searchService: { searchPosts: mocks.searchPosts } }))
vi.mock('@/api/authorService', () => ({
  authorService: { getAuthor: mocks.getAuthor, listAuthorPosts: mocks.listAuthorPosts },
}))
vi.mock('@/utils/mediaOptimizer', () => ({
  getMediaStreamUrl: (id: string) => `/media/${id}/stream`,
  getMediaThumbnailUrl: (id: string) => `/media/${id}/thumbnail`,
}))
vi.mock('../models', () => ({ postModel: (post: JournalPost) => post, platforms: { x: 'X' } }))
vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }),
}))
vi.mock('../runtime/viewport-motion.js', () => ({
  installViewportMotion: () => ({ refresh: vi.fn(), dispose: vi.fn() }),
}))
vi.mock('../runtime/layout-motion.js', () => ({
  createLayoutMotion: () => ({ layout: vi.fn(), cancel: vi.fn() }),
}))
vi.mock('../runtime/motion.js', () => ({
  createMotionPreference: ({ changed }: { changed(value: string): void }) => {
    changed('reduced')
    return { set: vi.fn() }
  },
  motionTiming: {},
}))

const id = '019ab001-0000-7000-8000-000000000001'
const post = (title = '作者原題「夏」'): JournalPost => ({
  id,
  title,
  text: '作者正文 <&>',
  image: '/preview.webp',
  author: '作者原名',
  authorId: null,
  avatar: '/avatar.webp',
  time: '原時間',
  likes: null,
  platform: 'x',
  type: '作者原分類',
  tags: ['原标签'],
})
let runtime: JournalRuntime
let wrapper: VueWrapper
let dialogs: ReturnType<typeof useJournalDialogs>
let i18n: ReturnType<typeof createJournalTestI18n>
let dialog: HTMLDialogElement
let originalDocumentLanguage = ''
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
async function language(locale: JournalTestLocale) {
  document.documentElement.lang = locale
  i18n.global.locale.value = locale
  await nextTick()
  runtime.refreshLocalizedControls()
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-11T12:00:00Z'))
  originalDocumentLanguage = document.documentElement.lang
  document.documentElement.lang = 'en'
  mocks.auth = reactive({ user: { id: 'owner' }, isAuthenticated: true })
  mocks.favorites.items = []
  mocks.favorites.checkFavorited.mockResolvedValue(false)
  mocks.favorites.addFavorite.mockResolvedValue({ success: true })
  mocks.favorites.removeFavoriteByPostId.mockResolvedValue({ success: true })
  mocks.ensureAccount.mockResolvedValue(undefined)
  mocks.getPost.mockResolvedValue({
    ...post(),
    media_files: [
      { id: 'one', file_type: 'image/jpeg' },
      { id: 'two', file_type: 'image/png' },
    ],
  })
  mocks.listPosts.mockResolvedValue({ items: [post()], has_more: false })
  mocks.searchPosts.mockResolvedValue({ items: [post()], has_more: false })
  mocks.getAuthor.mockResolvedValue({ avatar_url: '/author.webp', post_count: 3 })
  mocks.listAuthorPosts.mockResolvedValue({ items: [post()] })
  document.body.innerHTML =
    '<main id="main-content"></main><dialog id="app-dialog"><div class="dialog-head"><span class="eyebrow">MOMICHAN</span><button data-close>Close</button></div><div id="dialog-content"></div></dialog><div id="toast"></div>'
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  document.querySelector<HTMLElement>('#dialog-content')!.getAnimations = () => []
  dialog = document.querySelector<HTMLDialogElement>('#app-dialog')!
  dialog.showModal = vi.fn(() => {
    dialog.open = true
  })
  dialog.close = () => {
    dialog.open = false
    dialog.dispatchEvent(new Event('close'))
  }
  i18n = createJournalTestI18n('en')
  runtime = createJournalRuntime(vi.fn(), {
    translate: (key, named) => i18n.global.t(key, named ?? {}),
  })
  vi.spyOn(runtime.UI, 'toast').mockImplementation(() => undefined)
  wrapper = mount(
    defineComponent({
      setup() {
        dialogs = useJournalDialogs(shallowRef(runtime))
        return () => h('div')
      },
    }),
    { global: { plugins: [i18n] } }
  )
})
afterEach(() => {
  wrapper.unmount()
  runtime.dispose()
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.documentElement.lang = originalDocumentLanguage
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  document.body.innerHTML = ''
})

describe('imperative dialog language changes', () => {
  it('keeps search text, caret, focus, scroll and the pending request while changing control copy', async () => {
    let finish!: (value: unknown) => void
    mocks.searchPosts.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    dialogs.openSearch('作者原検索')
    const input = document.querySelector<HTMLInputElement>('#global-search')!
    input.setSelectionRange(1, 3)
    const content = document.querySelector<HTMLElement>('#dialog-content')!
    content.scrollTop = 138
    const changes = vi.fn()
    document.addEventListener('dialogwillchange', changes)
    const signal = mocks.searchPosts.mock.calls[0]![1].signal as AbortSignal
    await language('ja')
    expect(document.querySelector('#global-search')).toBe(input)
    expect(input.value).toBe('作者原検索')
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3])
    expect(document.activeElement).toBe(input)
    expect(content.scrollTop).toBe(138)
    expect(signal.aborted).toBe(false)
    expect(mocks.searchPosts).toHaveBeenCalledOnce()
    expect(changes).not.toHaveBeenCalled()
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(input.getAttribute('aria-label')).toBe(i18n.global.t('journal.search.inputLabel'))
    document.removeEventListener('dialogwillchange', changes)
    finish({ items: [post()], has_more: false })
    await flushPromises()
    expect(document.querySelector('.search-result')!.textContent).toContain(post().title)
    expect(document.querySelector('.results-count')!.textContent).toBe(
      i18n.global.t('journal.search.results', { count: 1, more: '' })
    )
    expect(document.querySelector('#global-search')).toBe(input)
  })

  it('keeps retry bound to the original query after failure copy changes', async () => {
    mocks.searchPosts.mockRejectedValueOnce(new Error('offline'))
    dialogs.openSearch('作者の検索')
    await flushPromises()
    const retry = document.querySelector<HTMLButtonElement>('[data-search-retry]')!
    await language('ja')
    expect(document.querySelector('[data-search-retry]')).toBe(retry)
    expect(retry.textContent).toBe(i18n.global.t('common.retry'))
    retry.click()
    await flushPromises()
    expect(mocks.searchPosts).toHaveBeenCalledTimes(2)
    expect(mocks.searchPosts.mock.calls[1]![0].q).toBe('作者の検索')
  })

  it('preserves safe named favorite controls through locale, pending saves and Undo', async () => {
    const title = '<img id="injected-title" src=x onerror=alert(1)> 作者原題'
    mocks.getPost.mockResolvedValueOnce(post(title))
    await dialogs.openPost(post(title))
    const button = document.querySelector<HTMLButtonElement>('[data-dialog-save]')!
    const icon = button.querySelector('svg')
    button.focus()
    await language('ja')
    expect(document.querySelector('[data-dialog-save]')).toBe(button)
    expect(button.querySelector('svg')).toBe(icon)
    expect(document.activeElement).toBe(button)
    expect(button.getAttribute('aria-label')).toBe(
      i18n.global.t('journal.actions.addFavorite', { title })
    )
    expect(document.querySelector('#injected-title')).toBeNull()
    let finish!: (value: unknown) => void
    mocks.favorites.addFavorite.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    button.click()
    await flushPromises()
    await language('zh-TW')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(mocks.favorites.addFavorite).toHaveBeenCalledOnce()
    finish({ success: true })
    await flushPromises()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('aria-label')).toBe(
      i18n.global.t('journal.actions.removeFavorite', { title })
    )
    expect(button.querySelector('.dialog-save-label')!.textContent).toBe(
      i18n.global.t('journal.actions.saved')
    )
    expect(runtime.UI.toast).toHaveBeenCalledWith(
      i18n.global.t('journal.toast.favoriteAdded'),
      expect.any(Object),
      { type: 'success' }
    )
    const action = vi.mocked(runtime.UI.toast).mock.calls.at(-1)![1]!
    expect(action.label).toBe(i18n.global.t('spatial.undo'))
    const announcements = vi.mocked(runtime.UI.toast).mock.calls.length
    await language('en')
    expect(vi.mocked(runtime.UI.toast).mock.calls).toHaveLength(announcements)
    const undoing = action.run()
    expect(undoing).toBeInstanceOf(Promise)
    await undoing
    await flushPromises()
    expect(mocks.favorites.removeFavoriteByPostId).toHaveBeenCalledExactlyOnceWith(
      id,
      journalFavoriteFeedback
    )
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps the current gallery image and localized labels for later zoom and step operations', async () => {
    await dialogs.openPost(post())
    document.querySelector<HTMLElement>('[data-dialog-gallery]')!.click()
    await flushPromises()
    document.querySelector<HTMLElement>('[data-real-gallery-index="1"]')!.click()
    const image = document.querySelector<HTMLImageElement>('.gallery-image')!
    const next = document.querySelector<HTMLElement>('[data-real-gallery-step="1"]')!
    const zoom = document.querySelector<HTMLElement>('[data-gallery-zoom]')!
    zoom.click()
    await language('ja')
    expect(document.querySelector('.gallery-image')).toBe(image)
    expect(image.getAttribute('src')).toBe('/media/two/stream')
    expect(next.getAttribute('aria-label')).toBe(i18n.global.t('journal.gallery.next'))
    expect(zoom.getAttribute('aria-label')).toBe(i18n.global.t('common.zoomOut'))
    expect(mocks.getPost).toHaveBeenCalledTimes(2)
    expect(document.querySelector('[data-dialog-back]')!.textContent).toBe(
      i18n.global.t('journal.actions.backTo', { label: i18n.global.t('nav.postDetail') })
    )
    next.click()
    expect(document.querySelector('.gallery-image')!.getAttribute('src')).toBe('/media/one/stream')
    expect(
      document.querySelector('[data-real-gallery-index="0"]')!.getAttribute('aria-label')
    ).toBe(i18n.global.t('journal.gallery.viewIndex', { index: 1 }))
    const nextZoom = document.querySelector<HTMLElement>('[data-gallery-zoom]')!
    expect(nextZoom.getAttribute('aria-label')).toBe(i18n.global.t('common.zoomIn'))
    nextZoom.click()
    expect(nextZoom.getAttribute('aria-label')).toBe(i18n.global.t('common.zoomOut'))
    nextZoom.click()
    expect(nextZoom.getAttribute('aria-label')).toBe(i18n.global.t('common.zoomIn'))
  })

  it('localizes author statistics without replacing author data or starting new requests', async () => {
    await dialogs.openAuthor(id, '作者原名')
    const heading = document.querySelector('#dialog-title')!
    const result = document.querySelector('.search-result')!
    await language('ja')
    expect(document.querySelector('#dialog-title')).toBe(heading)
    expect(heading.textContent).toBe('作者原名')
    expect(document.querySelector('.search-result')).toBe(result)
    expect(result.textContent).toContain(post().title)
    expect(document.querySelector('.author-post-count')!.textContent).toBe(
      i18n.global.t('author.postCount', { count: 3 })
    )
    expect(mocks.getAuthor).toHaveBeenCalledOnce()
    expect(mocks.listAuthorPosts).toHaveBeenCalledOnce()
  })

  it('refreshes the existing detail time during a pending request and uses the active language when it completes', async () => {
    let finish!: (value: unknown) => void
    mocks.getPost.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const current = { ...post(), time: '旧系统时间', publishedAt: '2026-11-11T11:58:00Z' }
    const opening = dialogs.openPost(current)
    const time = document.querySelector<HTMLElement>('[data-post-time]')!
    const heading = document.querySelector('#dialog-title')!
    const changes = vi.fn()
    document.addEventListener('dialogwillchange', changes)
    expect(time.textContent).toBe(i18n.global.t('common.minutesAgo', { n: 2 }))
    await language('ja')
    expect(document.querySelector('[data-post-time]')).toBe(time)
    expect(document.querySelector('#dialog-title')).toBe(heading)
    expect(time.textContent).toBe(i18n.global.t('common.minutesAgo', { n: 2 }))
    expect(heading.textContent).toBe(current.title)
    expect(mocks.getPost).toHaveBeenCalledOnce()
    expect(changes).not.toHaveBeenCalled()
    document.removeEventListener('dialogwillchange', changes)
    finish({ ...current, text: '読み込まれた作者原文' })
    await opening
    expect(document.querySelector('[data-post-time]')!.textContent).toBe(
      i18n.global.t('common.minutesAgo', { n: 2 })
    )
    expect(document.querySelector('.dialog-copy')!.textContent).toBe('読み込まれた作者原文')
    expect(current.time).toBe('旧系统时间')
    expect(mocks.getPost).toHaveBeenCalledOnce()
  })

  it('refreshes author-row time without replacing the row or reloading its posts', async () => {
    const current = { ...post(), time: '旧系统时间', publishedAt: '2026-11-11T11:58:00Z' }
    mocks.listAuthorPosts.mockResolvedValueOnce({ items: [current] })
    await dialogs.openAuthor(id, '作者原名')
    const row = document.querySelector<HTMLButtonElement>('.search-result')!
    const time = row.querySelector<HTMLElement>('[data-post-time]')!
    row.focus()
    await language('ja')
    expect(document.querySelector('.search-result')).toBe(row)
    expect(row.querySelector('[data-post-time]')).toBe(time)
    expect(document.activeElement).toBe(row)
    expect(time.textContent).toBe(i18n.global.t('common.minutesAgo', { n: 2 }))
    expect(row.textContent).toContain(current.title)
    expect(mocks.listAuthorPosts).toHaveBeenCalledOnce()
    expect(current.time).toBe('旧系统时间')
  })
})
