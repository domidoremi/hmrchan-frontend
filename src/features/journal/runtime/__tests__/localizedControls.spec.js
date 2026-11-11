import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { useToastStore } from '@/stores/toast'
import { createJournalFeedbackAdapter } from '../../feedback'
import { createJournalRuntime } from '../index.js'
import en from '@/i18n/locales/en.json'
import ja from '@/i18n/locales/ja.json'
import zhCN from '@/i18n/locales/zh-CN.json'
import zhTW from '@/i18n/locales/zh-TW.json'

vi.mock('@/utils/modernAPIs', () => ({
  createVisibilityObserver: () => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }),
}))
vi.mock('../viewport-motion.js', () => ({
  installViewportMotion: () => ({ refresh: vi.fn(), dispose: vi.fn() }),
}))
vi.mock('../layout-motion.js', () => ({
  createLayoutMotion: () => ({ layout: vi.fn(), cancel: vi.fn() }),
}))
vi.mock('../motion.js', () => ({
  createMotionPreference: ({ changed }) => {
    changed('reduced')
    return { set: vi.fn() }
  },
  motionTiming: {},
}))

let runtime, i18n, dialog, content, pinia, store
beforeEach(() => {
  vi.useFakeTimers()
  pinia = createPinia()
  setActivePinia(pinia)
  store = useToastStore()
  document.body.innerHTML =
    '<button id="outside">Open</button><main id="main-content"></main><dialog id="app-dialog"><div class="dialog-head"><span class="eyebrow">MOMICHAN</span><button data-close>Close</button></div><div id="dialog-content"></div></dialog><div id="toast"></div>'
  dialog = document.querySelector('#app-dialog')
  content = document.querySelector('#dialog-content')
  content.getAnimations = () => []
  dialog.showModal = vi.fn(() => {
    dialog.open = true
  })
  dialog.close = () => {
    dialog.open = false
    dialog.dispatchEvent(new Event('close'))
  }
  i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en, ja, 'zh-CN': zhCN, 'zh-TW': zhTW },
  })
  runtime = createJournalRuntime(vi.fn(), {
    feedback: createJournalFeedbackAdapter(store),
    translate: (key, named) => i18n.global.t(key, named ?? {}),
  })
})
afterEach(() => {
  runtime.dispose()
  disposePinia(pinia)
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('runtime language callbacks', () => {
  it('refreshes a return label without replacing fields, changing focus, or reopening the dialog', () => {
    const search = {
      key: 'search',
      labelKey: 'common.search',
      render: () =>
        runtime.UI.openDialog(
          '<h2 id="dialog-title">Search</h2><input id="query">',
          'search-dialog',
          search
        ),
    }
    search.render()
    document.querySelector('#query').value = '未发送検索'
    runtime.UI.openDialog(
      '<h2 id="dialog-title">作者原題</h2><input id="draft" value="原文draft">',
      'detail-dialog',
      {
        key: 'post:one',
        labelKey: 'nav.postDetail',
        render: vi.fn(),
      }
    )
    const field = document.querySelector('#draft')
    field.focus()
    field.setSelectionRange(1, 4)
    content.scrollTop = 164
    const back = dialog.querySelector('[data-dialog-back]')
    const changes = vi.fn()
    document.addEventListener('dialogwillchange', changes, { once: true })
    i18n.global.locale.value = 'ja'
    runtime.refreshLocalizedControls()
    expect(back.textContent).toBe(
      i18n.global.t('journal.actions.backTo', { label: i18n.global.t('common.search') })
    )
    expect(document.querySelector('#draft')).toBe(field)
    expect(field.value).toBe('原文draft')
    expect([field.selectionStart, field.selectionEnd]).toEqual([1, 4])
    expect(document.activeElement).toBe(field)
    expect(content.scrollTop).toBe(164)
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(changes).not.toHaveBeenCalled()
    document.removeEventListener('dialogwillchange', changes)
    back.click()
    expect(document.querySelector('#query').value).toBe('未发送検索')
  })

  it('keeps an author-supplied return label as text after interpolation', () => {
    const label = '<img id="injected-return" src=x onerror=alert(1)> 作者原名'
    runtime.UI.openDialog('<h2 id="dialog-title">Author</h2>', 'author-dialog', {
      key: 'author:one',
      label,
      render: vi.fn(),
    })
    runtime.UI.openDialog('<h2 id="dialog-title">Post</h2>', 'detail-dialog', { key: 'post:one' })
    const back = dialog.querySelector('[data-dialog-back]')
    expect(back.textContent).toBe(i18n.global.t('journal.actions.backTo', { label }))
    expect(document.querySelector('#injected-return')).toBeNull()
    i18n.global.locale.value = 'ja'
    runtime.refreshLocalizedControls()
    expect(back.textContent).toBe(i18n.global.t('journal.actions.backTo', { label }))
    expect(document.querySelector('#injected-return')).toBeNull()
  })

  it('uses the current locale for new preference failures and leaves already announced toasts alone', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    runtime.UI.save('motion', 'reduced')
    const previous = store.toasts.map(({ id, message }) => ({ id, message }))
    expect(previous).toHaveLength(1)
    i18n.global.locale.value = 'ja'
    runtime.refreshLocalizedControls()
    expect(store.toasts.map(({ id, message }) => ({ id, message }))).toEqual(previous)
    runtime.UI.save('motion', 'reduced')
    expect(store.toasts).toHaveLength(2)
    expect(store.toasts.at(-1).message).toBe(i18n.global.t('journal.toast.storageFailed'))
  })

  it.each(['en', 'ja', 'zh-CN', 'zh-TW'])(
    'keeps zoom state and subsequent ARIA in %s',
    (locale) => {
      i18n.global.locale.value = locale
      runtime.UI.openDialog(
        `<h2 id="dialog-title">作者原圖</h2><button data-gallery-zoom aria-pressed="false" aria-label="${i18n.global.t('common.zoomIn')}">Zoom</button>`,
        'gallery-dialog'
      )
      const button = dialog.querySelector('[data-gallery-zoom]')
      button.click()
      expect(button.getAttribute('aria-pressed')).toBe('true')
      expect(button.getAttribute('aria-label')).toBe(i18n.global.t('common.zoomOut'))
      i18n.global.locale.value = locale === 'ja' ? 'en' : 'ja'
      runtime.refreshLocalizedControls()
      expect(dialog.querySelector('[data-gallery-zoom]')).toBe(button)
      expect(button.getAttribute('aria-pressed')).toBe('true')
      expect(dialog.classList.contains('gallery-zoomed')).toBe(true)
      expect(button.getAttribute('aria-label')).toBe(i18n.global.t('common.zoomOut'))
      button.click()
      expect(button.getAttribute('aria-label')).toBe(i18n.global.t('common.zoomIn'))
    }
  )
})
