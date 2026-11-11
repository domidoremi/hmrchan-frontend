import { defineComponent, h, nextTick, reactive, shallowRef } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createJournalRuntime, type JournalRuntime } from '../runtime'
import { useJournalDiscussion } from '../useJournalDiscussion'
import type { JournalDiscussion } from '../models'
import { createJournalTestI18n } from './journalTestI18n'
import { prepareJournalDialogHost } from './journalDialogHost'

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'owner' }, isAuthenticated: true },
  ensureAccount: vi.fn(),
  get: vi.fn(),
  getComments: vi.fn(),
  addComment: vi.fn(),
}))
vi.mock('@/stores', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ fullPath: '/community' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/services/authSurface', () => ({ ensureAuthStoreLoaded: mocks.ensureAccount }))
vi.mock('@/api/discussionService', () => ({
  discussionService: {
    get: mocks.get,
    getComments: mocks.getComments,
    addComment: mocks.addComment,
  },
}))
vi.mock('../models', () => ({ discussionModel: (item: JournalDiscussion) => item }))
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
const item = (title = '作者原討論「夏」'): JournalDiscussion => ({
  id,
  title,
  text: '原文本文 <&>',
  author: '原名',
  category: '作者自訂分類',
  replies: 0,
  time: '原時間',
  avatar: '',
  tone: 'purple',
})
let runtime: JournalRuntime
let wrapper: VueWrapper
let discussion: ReturnType<typeof useJournalDiscussion>
let i18n: ReturnType<typeof createJournalTestI18n>
let host: ReturnType<typeof prepareJournalDialogHost>
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth = reactive({ user: { id: 'owner' }, isAuthenticated: true })
  mocks.ensureAccount.mockResolvedValue(undefined)
  mocks.get.mockResolvedValue({ ...item(), is_closed: false })
  mocks.getComments.mockResolvedValue({ items: [], next_cursor: 'next-page' })
  host = prepareJournalDialogHost()
  i18n = createJournalTestI18n('en')
  runtime = createJournalRuntime(vi.fn(), {
    translate: (key, named) => i18n.global.t(key, named ?? {}),
  })
  vi.spyOn(runtime.UI, 'toast').mockImplementation(() => undefined)
  vi.spyOn(runtime.UI, 'openDialog')
  wrapper = mount(
    defineComponent({
      setup() {
        discussion = useJournalDiscussion(shallowRef(runtime))
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
  document.body.innerHTML = ''
})

describe('discussion dialog language', () => {
  it('preserves a draft, caret, focus, scroll and detail request during language change', async () => {
    let finish!: (value: unknown) => void
    mocks.get.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    discussion.open(item())
    const input = document.querySelector<HTMLInputElement>('#comment-form input')!
    input.value = 'まだ送信しない草稿 <&>'
    input.focus()
    input.setSelectionRange(2, 5)
    host.content.scrollTop = 203
    const renders = vi.mocked(runtime.UI.openDialog).mock.calls.length
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(document.querySelector('#comment-form input')).toBe(input)
    expect(input.value).toBe('まだ送信しない草稿 <&>')
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 5])
    expect(document.activeElement).toBe(input)
    expect(host.content.scrollTop).toBe(203)
    expect(vi.mocked(runtime.UI.openDialog).mock.calls).toHaveLength(renders)
    expect(host.dialog.showModal).toHaveBeenCalledOnce()
    expect(mocks.get).toHaveBeenCalledOnce()
    expect(mocks.getComments).toHaveBeenCalledOnce()
    expect(mocks.ensureAccount).not.toHaveBeenCalled()
    expect(input.getAttribute('aria-label')).toBe(i18n.global.t('journal.community.replyLabel'))
    finish({ ...item('取得した原題'), is_closed: false })
    await flushPromises()
    expect(document.querySelector('#dialog-title')!.textContent).toBe('取得した原題')
    expect(document.querySelector<HTMLInputElement>('#comment-form input')!.value).toBe(
      'まだ送信しない草稿 <&>'
    )
    expect(document.querySelector('#comment-form button')!.textContent).toBe(
      i18n.global.t('comment.reply')
    )
  })

  it('keeps pending submission disabled and uses the current locale when the reply finishes', async () => {
    discussion.open(item())
    await flushPromises()
    const form = document.querySelector<HTMLFormElement>('#comment-form')!
    const input = form.querySelector<HTMLInputElement>('input')!
    const submit = form.querySelector<HTMLButtonElement>('button')!
    let finish!: (value: unknown) => void
    mocks.addComment.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    input.value = '作者原回复 <&>'
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(submit.disabled).toBe(true)
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(form.querySelector('input')).toBe(input)
    expect(submit.disabled).toBe(true)
    expect(submit.textContent).toBe(i18n.global.t('comment.reply'))
    expect(mocks.addComment).toHaveBeenCalledExactlyOnceWith(id, { content: '作者原回复 <&>' })
    finish({
      user: { username: '原作者 <&>' },
      created_at: '2026-11-11T00:00:00Z',
      content: '作者原回复 <&>',
    })
    await flushPromises()
    expect(submit.disabled).toBe(false)
    expect(input.value).toBe('')
    expect(document.querySelector('#journal-comments')!.textContent).toContain('作者原回复 <&>')
    expect(document.querySelector('#journal-comments')!.textContent).toContain('原作者 <&>')
    expect(runtime.UI.toast).toHaveBeenCalledWith(i18n.global.t('comment.submitSuccess'))
  })

  it('localizes a closed discussion and more-replies control without treating author content as keys', async () => {
    mocks.get.mockResolvedValueOnce({ ...item('common.search'), is_closed: true })
    discussion.open(item())
    await flushPromises()
    const heading = document.querySelector('#dialog-title')!
    const more = document.querySelector('[data-more-comments]')!
    i18n.global.locale.value = 'ja'
    await nextTick()
    expect(document.querySelector('#dialog-title')).toBe(heading)
    expect(heading.textContent).toBe('common.search')
    expect(document.querySelector('.badge')!.textContent).toBe('作者自訂分類')
    expect(document.querySelector('.discussion-closed')!.textContent).toBe(
      i18n.global.t('journal.community.closed')
    )
    expect(more.textContent).toBe(i18n.global.t('comment.loadMoreReplies'))
    expect(document.querySelector('#comment-form')).toBeNull()
    expect(mocks.get).toHaveBeenCalledOnce()
  })
})
