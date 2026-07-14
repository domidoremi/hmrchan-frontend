import { beforeEach, describe, expect, it } from 'vitest'

import i18n, { applyLocale } from '@/i18n'

describe('i18n runtime locale', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-locale')
    document.documentElement.lang = ''
    applyLocale('zh-CN')
  })

  it('updates the global composer, document language, and persisted locale', () => {
    const resolvedLocale = applyLocale('en-US')
    const globalLocale = (i18n.global as unknown as { locale: { value: string } }).locale

    expect(resolvedLocale).toBe('en-US')
    expect(globalLocale.value).toBe('en-US')
    expect(document.documentElement.lang).toBe('en-US')
    expect(document.documentElement.dataset['locale']).toBe('en-US')
    expect(window.localStorage.getItem('hmr.locale')).toBe('en-US')
  })
})
