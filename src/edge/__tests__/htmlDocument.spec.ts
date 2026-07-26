import { describe, expect, it } from 'vitest'
import {
  normalizeDocumentPath,
  resolveCanonicalUrl,
  resolveHtmlDocument,
  renderPrerenderShell,
  renderStructuredDataScript,
} from '@/edge/htmlDocument'

describe('resolveHtmlDocument', () => {
  const contractId = '01900000-0000-7000-8000-000000000001'

  it('returns indexable metadata for public discovery pages', () => {
    const homeConfig = resolveHtmlDocument(new URL('https://momichan.com/'))
    const exploreConfig = resolveHtmlDocument(new URL('https://momichan.com/explore'))
    const contactConfig = resolveHtmlDocument(new URL('https://momichan.com/contact'))

    expect(homeConfig.status).toBe(200)
    expect(homeConfig.title).toBe('Home · MomiChan')
    expect(homeConfig.robots).toBe('index, follow')
    expect(resolveCanonicalUrl(homeConfig)).toBe('https://momichan.com/')
    expect(homeConfig.structuredData.length).toBeGreaterThan(0)
    expect(homeConfig.preloadImages).toEqual([
      {
        href: '/snapshot-media/home/hero-spotlight-f2e0f8f6-0434-4e37-874e-bb9b506585bf.webp',
        sizes: '(max-width: 48rem) 68vw, 32vw',
        fetchPriority: 'high',
      },
    ])

    expect(exploreConfig.status).toBe(200)
    expect(exploreConfig.title).toBe('Explore · MomiChan')
    expect(exploreConfig.robots).toBe('index, follow')
    expect(resolveCanonicalUrl(exploreConfig)).toBe('https://momichan.com/explore')

    expect(contactConfig.status).toBe(200)
    expect(contactConfig.title).toBe('Contact · MomiChan')
    expect(contactConfig.robots).toBe('index, follow')
    expect(contactConfig.description).toContain('留言')
    expect(resolveCanonicalUrl(contactConfig)).toBe('https://momichan.com/contact')
  })

  it('marks auth and private routes as noindex', () => {
    const loginConfig = resolveHtmlDocument(new URL('https://momichan.com/login'))
    const authCallbackConfig = resolveHtmlDocument(new URL('https://momichan.com/auth/callback'))
    const passkeyRecoveryConfig = resolveHtmlDocument(
      new URL('https://momichan.com/auth/passkeys/recovery')
    )
    const passkeyRecoveryDetailConfig = resolveHtmlDocument(
      new URL('https://momichan.com/auth/passkeys/recovery/01900000-0000-7000-8000-000000000001')
    )
    const favoritesConfig = resolveHtmlDocument(new URL('https://momichan.com/favorites'))
    const privateProfilePaths = [
      '/profile',
      '/profile/favorites',
      '/profile/comments',
      '/profile/likes',
      '/profile/comment-favorites',
      '/profile/history',
      '/profile/reports',
      '/profile/followers',
      '/profile/following',
      '/profile/blocked',
      '/profile/notifications',
      '/profile/security',
      '/profile/security-activity',
      '/profile/devices',
      '/profile/settings',
    ]

    expect(loginConfig.status).toBe(200)
    expect(loginConfig.robots).toBe('noindex, nofollow')
    expect(loginConfig.title).toBe('Login · MomiChan')

    expect(authCallbackConfig.status).toBe(200)
    expect(authCallbackConfig.robots).toBe('noindex, nofollow')
    expect(authCallbackConfig.title).toBe('Authentication callback · MomiChan')

    expect(passkeyRecoveryConfig.status).toBe(200)
    expect(passkeyRecoveryConfig.robots).toBe('noindex, nofollow')
    expect(passkeyRecoveryConfig.title).toBe('Account security · MomiChan')

    expect(passkeyRecoveryDetailConfig.status).toBe(200)
    expect(passkeyRecoveryDetailConfig.robots).toBe('noindex, nofollow')
    expect(passkeyRecoveryDetailConfig.title).toBe('Account security · MomiChan')

    expect(favoritesConfig.status).toBe(200)
    expect(favoritesConfig.robots).toBe('noindex, nofollow')
    expect(favoritesConfig.title).toBe('Account area · MomiChan')

    for (const privatePath of privateProfilePaths) {
      const config = resolveHtmlDocument(new URL(`https://momichan.com${privatePath}`))

      expect(config.status).toBe(200)
      expect(config.robots).toBe('noindex, nofollow')
      expect(config.title).toBe('Account area · MomiChan')
    }
  })

  it('returns article metadata for valid detail routes', () => {
    const postConfig = resolveHtmlDocument(new URL(`https://momichan.com/post/${contractId}`))
    const authorConfig = resolveHtmlDocument(new URL(`https://momichan.com/author/${contractId}`))
    const discussionConfig = resolveHtmlDocument(
      new URL(`https://momichan.com/discussion/${contractId}`)
    )

    expect(postConfig.status).toBe(200)
    expect(postConfig.ogType).toBe('article')
    expect(postConfig.robots).toBe('index, follow')
    expect(resolveCanonicalUrl(postConfig)).toBe(`https://momichan.com/post/${contractId}`)

    expect(authorConfig.status).toBe(200)
    expect(authorConfig.ogType).toBe('article')
    expect(authorConfig.title).toBe('Author detail · MomiChan')

    expect(discussionConfig.status).toBe(200)
    expect(resolveCanonicalUrl(discussionConfig)).toBe(
      `https://momichan.com/community/discussions/${contractId}`
    )
  })

  it('returns a real 404 contract for invalid and unknown routes', () => {
    const invalidDetailPaths = [
      '/post/00000000-0000-4000-8000-000000000000',
      '/post/01ARZ3NDEKTSV4RRFFQ69G5FAV',
      '/author/momichan',
      '/community/discussions/discussion-1',
      '/users/user-1',
      '/auth/passkeys/recovery/recovery-1',
    ]
    const unknownRouteConfig = resolveHtmlDocument(
      new URL('https://momichan.com/this-route-does-not-exist')
    )

    for (const invalidPath of invalidDetailPaths) {
      const invalidConfig = resolveHtmlDocument(new URL(invalidPath, 'https://momichan.com'))
      expect(invalidConfig.status).toBe(404)
      expect(invalidConfig.robots).toBe('noindex, nofollow')
      expect(invalidConfig.title).toBe('Page not found · MomiChan')
      expect(resolveCanonicalUrl(invalidConfig)).toBe(`https://momichan.com${invalidPath}`)
    }

    expect(unknownRouteConfig.status).toBe(404)
    expect(unknownRouteConfig.robots).toBe('noindex, nofollow')
    expect(resolveCanonicalUrl(unknownRouteConfig)).toBe(
      'https://momichan.com/this-route-does-not-exist'
    )
  })

  it('renders a prerender shell with escaped copy', () => {
    const shell = renderPrerenderShell({
      status: 404,
      title: 'Page not found · MomiChan',
      description: 'missing',
      canonicalPath: '/missing',
      ogType: 'website',
      robots: 'noindex, nofollow',
      shellEyebrow: '404 <missing>',
      shellTitle: 'Page "not found"',
      shellBody: 'Try another route & keep browsing.',
      shellSummary: ['Missing route & keep browsing'],
      shellStats: [{ label: 'Status', value: 'Unavailable' }],
      shellLinks: [{ href: '/explore', label: 'Explore' }],
      structuredData: [],
      shellVariant: 'default',
    })

    expect(shell).toContain('data-prerender-shell="true"')
    expect(shell).toContain('data-prerender-shell-variant="default"')
    expect(shell).toContain('data-prerender-shell-content="true"')
    expect(shell).toContain('404 &lt;missing&gt;')
    expect(shell).toContain('Page &quot;not found&quot;')
    expect(shell).toContain('Try another route &amp; keep browsing.')
    expect(shell).toContain('Missing route &amp; keep browsing')
    expect(shell).toContain('href="/explore"')
  })

  it('renders the homepage shell with the dedicated home variant', () => {
    const homeConfig = resolveHtmlDocument(new URL('https://momichan.com/'))
    const shell = renderPrerenderShell(homeConfig)

    expect(homeConfig.shellVariant).toBe('home')
    expect(shell).toContain('data-prerender-shell-variant="home"')
    expect(shell).toContain('data-prerender-shell-content="true"')
    expect(shell).toContain('Start here')
    expect(shell).toContain('Public posts, creators, and discussions')
    expect(shell).not.toContain('Quick bridge')
    expect(shell).not.toContain('client takeover')
  })

  it('renders JSON-LD payloads for structured public pages', () => {
    const structuredDataScript = renderStructuredDataScript(
      resolveHtmlDocument(new URL('https://momichan.com/'))
    )

    expect(structuredDataScript).toContain('application/ld+json')
    expect(structuredDataScript).toContain('"@type":"WebSite"')
    expect(structuredDataScript).toContain('"SearchAction"')
  })

  it('keeps the contact prerender shell aligned with the real public contact scope', () => {
    const contactConfig = resolveHtmlDocument(new URL('https://momichan.com/contact'))
    const shell = renderPrerenderShell(contactConfig)

    expect(contactConfig.shellEyebrow).toBe('Contact')
    expect(contactConfig.shellTitle).toContain('share feedback')
    expect(shell).toContain('questions, suggestions, corrections')
    expect(shell).toContain('Private reporting')
    expect(shell).not.toContain('partnership requests')
    expect(shell).not.toContain('private security reporting')
    expect(shell).not.toContain('首包')
  })
})

describe('htmlDocument path normalization', () => {
  it('trims trailing slashes for public collection routes', () => {
    expect(normalizeDocumentPath('/explore/')).toBe('/explore')
    expect(normalizeDocumentPath('/authors///')).toBe('/authors')
    expect(normalizeDocumentPath('/')).toBe('/')
  })

  it('resolves prerendered public routes even when Pages appends a trailing slash', () => {
    const explore = resolveHtmlDocument(new URL('https://momichan.com/explore/'))
    const authors = resolveHtmlDocument(new URL('https://momichan.com/authors/'))
    const community = resolveHtmlDocument(new URL('https://momichan.com/community/'))

    expect(explore.status).toBe(200)
    expect(explore.canonicalPath).toBe('/explore')

    expect(authors.status).toBe(200)
    expect(authors.canonicalPath).toBe('/authors')

    expect(community.status).toBe(200)
    expect(community.canonicalPath).toBe('/community')
  })
})
