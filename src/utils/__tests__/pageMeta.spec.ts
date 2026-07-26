import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { applyPageMeta, buildDocumentTitle, normalizeMetaDescription } from '../pageMeta'

const STRUCTURED_DATA_SELECTOR = 'script[data-prerender-structured-data="true"]'

const BASE_HEAD = `
  <meta name="description" content="Default site description">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://momichan.com/">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://momichan.com/">
  <meta property="og:title" content="MomiChan">
  <meta property="og:description" content="Default site description">
  <meta property="og:image" content="https://momichan.com/icons/sitting-512.webp">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:url" content="https://momichan.com/">
  <meta name="twitter:title" content="MomiChan">
  <meta name="twitter:description" content="Default site description">
  <meta name="twitter:image" content="https://momichan.com/icons/sitting-512.webp">
  <script type="application/ld+json" data-prerender-structured-data="true">{"stale":true}</script>
`

describe('pageMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = BASE_HEAD
    document.documentElement.lang = 'en'
    document.title = 'Original'
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    document.head.innerHTML = ''
    document.documentElement.lang = 'en'
    document.title = ''
    window.history.replaceState({}, '', '/')
  })

  it('builds document titles with the site suffix only when needed', () => {
    expect(buildDocumentTitle('Profile')).toBe('Profile · MomiChan')
    expect(buildDocumentTitle('MomiChan')).toBe('MomiChan')
    expect(buildDocumentTitle('   ')).toBe('MomiChan')
  })

  it('normalizes and truncates meta descriptions', () => {
    const truncated = normalizeMetaDescription('x'.repeat(220))
    expect(normalizeMetaDescription('   alpha   beta   ')).toBe('alpha beta')
    expect(normalizeMetaDescription('   ')).toBeUndefined()
    expect(truncated).toHaveLength(160)
    expect(truncated?.endsWith('…')).toBe(true)
  })

  it('applies canonical, robots, social, locale, and structured data metadata', () => {
    applyPageMeta({
      title: 'Notifications',
      description: ' Fresh   updates  from your account  ',
      canonicalPath: '/profile/notifications?source=test',
      ogType: 'article',
      ogImage: '/icons/sitting-180.webp',
      locale: 'zh-TW',
      structuredData: [{ '@context': 'https://schema.org', '@type': 'ProfilePage' }],
    })

    expect(document.title).toBe('Notifications · MomiChan')
    expect(document.documentElement.lang).toBe('zh-TW')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow'
    )
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://momichan.com/profile/notifications'
    )
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe(
      'article'
    )
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(
      'zh_TW'
    )
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(
      'https://momichan.com/icons/sitting-180.webp'
    )
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Fresh updates from your account'
    )

    const scripts = document.querySelectorAll('script[data-prerender-structured-data="true"]')
    expect(scripts).toHaveLength(1)
    expect(JSON.parse(scripts[0]?.textContent ?? '')).toMatchObject({ '@type': 'ProfilePage' })
  })

  it('restores route defaults and removes stale JSON-LD during SPA navigation', () => {
    applyPageMeta({ canonicalPath: '/' })

    expect(document.title).toBe('Home · MomiChan')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow'
    )
    expect(document.querySelector('script[data-prerender-structured-data="true"]')).not.toBeNull()

    const duplicate = document.createElement('script')
    duplicate.dataset.prerenderStructuredData = 'true'
    document.head.appendChild(duplicate)
    applyPageMeta({ canonicalPath: '/missing-page' })

    expect(document.title).toBe('Page not found · MomiChan')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://momichan.com/missing-page'
    )
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow'
    )
    expect(document.querySelectorAll('script[data-prerender-structured-data="true"]')).toHaveLength(
      0
    )
  })

  it('preserves edge detail JSON-LD only while its canonical still matches', () => {
    const script = document.querySelector<HTMLScriptElement>(
      'script[data-prerender-structured-data="true"]'
    )
    expect(script).not.toBeNull()
    if (!script) return
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      mainEntityOfPage: 'https://momichan.com/post/01900000-0000-7000-8000-000000000001',
    })

    applyPageMeta({ canonicalPath: '/post/01900000-0000-7000-8000-000000000001' })
    expect(document.querySelector(STRUCTURED_DATA_SELECTOR)).toBe(script)

    applyPageMeta({ canonicalPath: '/post/01900000-0000-7000-8000-000000000002' })
    expect(document.querySelector(STRUCTURED_DATA_SELECTOR)).toBeNull()
  })
})
