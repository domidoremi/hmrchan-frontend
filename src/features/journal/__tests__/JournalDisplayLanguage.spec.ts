import { createPinia } from 'pinia'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import JournalDisplaySettings from '../JournalDisplaySettings.vue'
import { createJournalTestI18n, type JournalTestLocale } from './journalTestI18n'

const mocks = vi.hoisted(() => ({ setLocale: vi.fn() }))
vi.mock('@/i18n', () => ({ setLocale: mocks.setLocale }))
vi.mock('@/stores', async () => {
  const { defineStore } = await import('pinia')
  return {
    useThemeStore: defineStore('journal-language-theme', {
      state: () => ({ theme: 'dark' }),
      actions: {
        setTheme(value: string) {
          this.theme = value
        },
      },
    }),
  }
})

let wrapper: VueWrapper | undefined
let i18n: ReturnType<typeof createJournalTestI18n>
function start(locale: JournalTestLocale = 'en') {
  i18n = createJournalTestI18n(locale)
  wrapper = mount(JournalDisplaySettings, {
    attachTo: document.body,
    global: {
      plugins: [createPinia(), i18n],
      stubs: { AppearancePresetPicker: true },
    },
  })
}
function language(code: JournalTestLocale) {
  return wrapper!.get<HTMLButtonElement>(
    `.display-language-options button:has(span[lang="${code}"])`
  )
}
beforeEach(() => {
  mocks.setLocale.mockReset()
  document.body.dataset['motion'] = 'reduced'
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  delete document.body.dataset['motion']
})

describe('public display language', () => {
  it.each(['en', 'ja', 'zh-CN', 'zh-TW'] as const)(
    'uses the actual %s locale and readable autonyms',
    async (locale) => {
      start(locale)
      await nextTick()
      const options = wrapper!.findAll<HTMLButtonElement>('.display-language-options button')
      expect(options.map((node) => node.text())).toEqual([
        'English',
        '日本語',
        '简体中文',
        '繁體中文',
      ])
      expect(options.filter((node) => node.attributes('aria-pressed') === 'true')).toHaveLength(1)
      expect(language(locale).attributes('aria-pressed')).toBe('true')
      expect(language(locale).element.type).toBe('button')
      expect(language(locale).element.disabled).toBe(false)
      const group = wrapper!.get('[role="group"][aria-labelledby]')
      expect(wrapper!.get(`#${group.attributes('aria-labelledby')}`).text()).toBe(
        i18n.global.t('settings.language')
      )
      expect(mocks.setLocale).not.toHaveBeenCalled()
    }
  )

  it('keeps selection and focus during a pending switch and ignores repeat requests', async () => {
    start()
    await nextTick()
    let finish!: () => void
    mocks.setLocale.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const target = language('ja')
    target.element.focus()
    await target.trigger('click')
    await language('zh-TW').trigger('click')
    expect(mocks.setLocale).toHaveBeenCalledExactlyOnceWith('ja')
    expect(language('en').attributes('aria-pressed')).toBe('true')
    expect(target.attributes('aria-disabled')).toBe('true')
    expect(target.element.disabled).toBe(false)
    expect(wrapper!.get('fieldset.display-language-field').attributes('disabled')).toBeUndefined()
    expect(document.activeElement).toBe(target.element)
    expect(wrapper!.get('.display-language-status').text()).toBe(
      i18n.global.t('journal.appearance.languageChanging')
    )
    i18n.global.locale.value = 'ja'
    finish()
    await flushPromises()
    expect(language('ja').attributes('aria-pressed')).toBe('true')
    expect(target.attributes('aria-disabled')).toBe('false')
    expect(document.activeElement).toBe(target.element)
    expect(wrapper!.get<HTMLInputElement>('input[value="dark"]').element.checked).toBe(true)
    expect(wrapper!.get('.display-motion-options button[aria-pressed="true"]').text()).toBe(
      i18n.global.t('settings.animationReduced')
    )
  })

  it('reports the active fallback locale instead of announcing the requested language', async () => {
    start('ja')
    mocks.setLocale.mockImplementation(async () => {
      i18n.global.locale.value = 'en'
    })
    await language('zh-TW').trigger('click')
    await flushPromises()
    expect(language('en').attributes('aria-pressed')).toBe('true')
    expect(language('zh-TW').attributes('aria-pressed')).toBe('false')
    expect(wrapper!.get('.display-language-status').text()).toBe(
      i18n.global.t('journal.appearance.languageUnavailable', { language: 'English' })
    )
  })

  it('recovers from an unexpected setter rejection with the actual selection intact', async () => {
    start('ja')
    mocks.setLocale.mockRejectedValueOnce(new Error('unexpected loader failure'))
    await language('en').trigger('click')
    await flushPromises()
    expect(language('ja').attributes('aria-pressed')).toBe('true')
    expect(language('en').attributes('aria-disabled')).toBe('false')
    expect(wrapper!.get('.display-language-status').text()).toBe(
      i18n.global.t('journal.appearance.languageUnavailable', { language: '日本語' })
    )
  })

  it('does not reload the active language', async () => {
    start('zh-TW')
    await language('zh-TW').trigger('click')
    expect(mocks.setLocale).not.toHaveBeenCalled()
  })
})
