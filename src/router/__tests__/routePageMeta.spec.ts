import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { syncRoutePageMeta, watchRoutePageMeta } from '../routePageMeta'

const english = { nav: { about: 'About', contact: 'Contact' } }
const chinese = { nav: { about: '关于', contact: '联系' } }
const japanese = { nav: { about: '概要', contact: '連絡先' } }
const cleanups: Array<() => void> = []

function createFixture() {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    fallbackLocale: 'en',
    messages: { en: english },
    missingWarn: false,
    fallbackWarn: false,
  })
  const history = createMemoryHistory()
  const router = createRouter({
    history,
    routes: [
      {
        path: '/about',
        component: { render: () => null },
        meta: { title: 'nav.about', description: 'About route description' },
      },
      {
        path: '/contact',
        component: { render: () => null },
        meta: {
          title: (route) => (route.query['section'] === 'about' ? 'nav.about' : 'nav.contact'),
          description: 'Contact route description',
        },
      },
    ],
  })
  const removeHook = router.afterEach((route) => syncRoutePageMeta(route, i18n.global))
  const stop = watchRoutePageMeta(router.currentRoute, i18n.global)
  cleanups.push(() => {
    stop()
    removeHook()
    history.destroy()
    i18n.dispose()
  })
  return { router, composer: i18n.global }
}

function observeMutations(target: Node, options: MutationObserverInit) {
  const records: MutationRecord[] = []
  const observer = new MutationObserver((next) => records.push(...next))
  observer.observe(target, options)
  cleanups.push(() => observer.disconnect())
  return () => {
    records.push(...observer.takeRecords())
    return records
  }
}

function expectMetadata(
  title: string,
  path: string,
  description: string,
  locale = 'zh-CN',
  socialLocale = 'zh_CN'
) {
  const documentTitle = `${title} · MomiChan`
  expect(document.title).toBe(documentTitle)
  expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
    documentTitle
  )
  expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(
    documentTitle
  )
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  expect(canonical).not.toBeNull()
  expect(new URL(canonical!.href).pathname).toBe(path)
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
    description
  )
  expect(document.documentElement.lang).toBe(locale)
  expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(
    socialLocale
  )
}

beforeEach(() => {
  document.head.innerHTML = '<title>Prerender title</title>'
  document.documentElement.lang = 'en'
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.head.innerHTML = ''
  document.documentElement.lang = 'en'
})

describe('route metadata locale readiness', () => {
  it('replaces fallback metadata when the default locale dictionary arrives without a locale change', async () => {
    const { router, composer } = createFixture()
    await router.push('/about')
    expectMetadata('About', '/about', 'About route description')
    const mutations = observeMutations(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
      attributeOldValue: true,
    })

    composer.setLocaleMessage('zh-CN', chinese)
    await nextTick()

    expect(composer.locale.value).toBe('zh-CN')
    expectMetadata('关于', '/about', 'About route description')
    expect(mutations()).toHaveLength(0)
  })

  it('refreshes the latest route when navigation finishes before the dictionary arrives', async () => {
    const { router, composer } = createFixture()
    await router.push('/about')
    await router.push('/contact?source=late')
    expectMetadata('Contact', '/contact', 'Contact route description')
    const mutations = observeMutations(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    })

    composer.setLocaleMessage('zh-CN', chinese)
    await nextTick()

    expect(router.currentRoute.value.fullPath).toBe('/contact?source=late')
    expectMetadata('联系', '/contact', 'Contact route description')
    expect(mutations()).toHaveLength(0)
  })

  it('updates document and social metadata when the actual locale changes', async () => {
    const { router, composer } = createFixture()
    composer.setLocaleMessage('zh-CN', chinese)
    composer.setLocaleMessage('ja', japanese)
    await nextTick()
    await router.push('/contact?section=about')
    expectMetadata('关于', '/contact', 'Contact route description')
    const mutations = observeMutations(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
      attributeOldValue: true,
    })

    composer.locale.value = 'ja'
    await nextTick()

    expectMetadata('概要', '/contact', 'Contact route description', 'ja', 'ja_JP')
    expect(mutations()).toHaveLength(1)
    expect(mutations()[0]?.oldValue).toBe('zh-CN')
  })

  it('skips unmatched routes and does not refresh metadata for an inactive dictionary', async () => {
    const { router, composer } = createFixture()
    const startupMutations = observeMutations(document.head, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    })
    expect(document.title).toBe('Prerender title')
    composer.setLocaleMessage('zh-CN', chinese)
    await nextTick()
    expect(router.currentRoute.value.matched).toHaveLength(0)
    expect(document.title).toBe('Prerender title')
    expect(startupMutations()).toHaveLength(0)

    await router.push('/about')
    expectMetadata('关于', '/about', 'About route description')
    const inactiveMutations = observeMutations(document.head, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    })
    composer.setLocaleMessage('ja', japanese)
    await nextTick()

    expectMetadata('关于', '/about', 'About route description')
    expect(inactiveMutations()).toHaveLength(0)
  })

  it('refreshes metadata when an existing active dictionary is replaced', async () => {
    const { router, composer } = createFixture()
    composer.setLocaleMessage('zh-CN', chinese)
    await nextTick()
    await router.push('/about')
    const availableLocales = composer.availableLocales
    const mutations = observeMutations(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    })

    composer.setLocaleMessage('zh-CN', {
      nav: { about: '更新后的关于', contact: '更新后的联系' },
    })
    await nextTick()

    expect(composer.availableLocales).toEqual(availableLocales)
    expectMetadata('更新后的关于', '/about', 'About route description')
    expect(mutations()).toHaveLength(0)
  })
})
