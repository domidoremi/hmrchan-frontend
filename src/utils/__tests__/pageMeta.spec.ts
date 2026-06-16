import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { applyPageMeta, buildDocumentTitle, normalizeMetaDescription } from '../pageMeta'

const BASE_HEAD = `
  <meta name="description" content="Default site description">
`

describe('pageMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = BASE_HEAD
    document.title = 'Original'
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    document.head.innerHTML = ''
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

  it('applies canonical, og, twitter, and description metadata', () => {
    applyPageMeta({
      title: 'Notifications',
      description: ' Fresh   updates  from your account  ',
      canonicalPath: '/profile/notifications',
    })

    expect(document.title).toBe('Notifications · MomiChan')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://momichan.com/profile/notifications'
    )
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://momichan.com/profile/notifications'
    )
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(
      'Notifications · MomiChan'
    )
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Fresh updates from your account'
    )
  })

  it('falls back to window pathname and default description when explicit values are absent', () => {
    window.history.replaceState({}, '', '/community?tab=recent#live')

    applyPageMeta({ title: null, description: null })

    expect(document.title).toBe('MomiChan')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://momichan.com/community'
    )
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Default site description'
    )
  })
})
