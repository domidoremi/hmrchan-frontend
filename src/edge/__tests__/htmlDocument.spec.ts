import { describe, expect, it } from 'vitest'
import {
  normalizeDocumentPath,
  resolveCanonicalUrl,
  resolveHtmlDocument,
  renderPrerenderShell,
  renderStructuredDataScript,
} from '@/edge/htmlDocument'

describe('resolveHtmlDocument', () => {
  it('returns indexable metadata for public discovery pages', () => {
    const homeConfig = resolveHtmlDocument(new URL('https://momichan.xyz/'))
    const exploreConfig = resolveHtmlDocument(new URL('https://momichan.xyz/explore'))
    const contactConfig = resolveHtmlDocument(new URL('https://momichan.xyz/contact'))

    expect(homeConfig.status).toBe(200)
    expect(homeConfig.title).toBe('Home · MomiChan')
    expect(homeConfig.robots).toBe('index, follow')
    expect(resolveCanonicalUrl(homeConfig)).toBe('https://momichan.xyz/')
    expect(homeConfig.structuredData.length).toBeGreaterThan(0)

    expect(exploreConfig.status).toBe(200)
    expect(exploreConfig.title).toBe('Explore · MomiChan')
    expect(exploreConfig.robots).toBe('index, follow')
    expect(resolveCanonicalUrl(exploreConfig)).toBe('https://momichan.xyz/explore')

    expect(contactConfig.status).toBe(200)
    expect(contactConfig.title).toBe('Contact · MomiChan')
    expect(contactConfig.robots).toBe('index, follow')
    expect(contactConfig.description).toContain('安全问题披露')
    expect(resolveCanonicalUrl(contactConfig)).toBe('https://momichan.xyz/contact')
  })

  it('marks auth and private routes as noindex', () => {
    const loginConfig = resolveHtmlDocument(new URL('https://momichan.xyz/login'))
    const favoritesConfig = resolveHtmlDocument(new URL('https://momichan.xyz/favorites'))

    expect(loginConfig.status).toBe(200)
    expect(loginConfig.robots).toBe('noindex, nofollow')
    expect(loginConfig.title).toBe('Login · MomiChan')

    expect(favoritesConfig.status).toBe(200)
    expect(favoritesConfig.robots).toBe('noindex, nofollow')
    expect(favoritesConfig.title).toBe('Account area · MomiChan')
  })

  it('returns article metadata for valid detail routes', () => {
    const postConfig = resolveHtmlDocument(
      new URL('https://momichan.xyz/post/00000000-0000-4000-8000-000000000000')
    )
    const authorConfig = resolveHtmlDocument(new URL('https://momichan.xyz/author/momichan'))
    const discussionConfig = resolveHtmlDocument(
      new URL('https://momichan.xyz/discussion/discussion-1')
    )

    expect(postConfig.status).toBe(200)
    expect(postConfig.ogType).toBe('article')
    expect(postConfig.robots).toBe('index, follow')
    expect(resolveCanonicalUrl(postConfig)).toBe(
      'https://momichan.xyz/post/00000000-0000-4000-8000-000000000000'
    )

    expect(authorConfig.status).toBe(200)
    expect(authorConfig.ogType).toBe('article')
    expect(authorConfig.title).toBe('Author detail · MomiChan')

    expect(discussionConfig.status).toBe(200)
    expect(resolveCanonicalUrl(discussionConfig)).toBe(
      'https://momichan.xyz/community/discussions/discussion-1'
    )
  })

  it('returns a real 404 contract for invalid and unknown routes', () => {
    const invalidPostConfig = resolveHtmlDocument(
      new URL('https://momichan.xyz/post/not-a-real-id')
    )
    const unknownRouteConfig = resolveHtmlDocument(
      new URL('https://momichan.xyz/this-route-does-not-exist')
    )

    expect(invalidPostConfig.status).toBe(404)
    expect(invalidPostConfig.robots).toBe('noindex, nofollow')
    expect(invalidPostConfig.title).toBe('Page not found · MomiChan')

    expect(unknownRouteConfig.status).toBe(404)
    expect(unknownRouteConfig.robots).toBe('noindex, nofollow')
    expect(resolveCanonicalUrl(unknownRouteConfig)).toBe(
      'https://momichan.xyz/this-route-does-not-exist'
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
      shellSummary: ['Missing route & fallback'],
      shellStats: [{ label: 'Robots', value: 'No index' }],
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
    expect(shell).toContain('Missing route &amp; fallback')
    expect(shell).toContain('href="/explore"')
  })

  it('renders the homepage shell with the dedicated home variant', () => {
    const homeConfig = resolveHtmlDocument(new URL('https://momichan.xyz/'))
    const shell = renderPrerenderShell(homeConfig)

    expect(homeConfig.shellVariant).toBe('home')
    expect(shell).toContain('data-prerender-shell-variant="home"')
    expect(shell).toContain('data-prerender-shell-content="true"')
    expect(shell).toContain('Quick bridge')
  })

  it('renders JSON-LD payloads for structured public pages', () => {
    const structuredDataScript = renderStructuredDataScript(
      resolveHtmlDocument(new URL('https://momichan.xyz/'))
    )

    expect(structuredDataScript).toContain('application/ld+json')
    expect(structuredDataScript).toContain('"@type":"WebSite"')
    expect(structuredDataScript).toContain('"SearchAction"')
  })
})

describe('htmlDocument path normalization', () => {
  it('trims trailing slashes for public collection routes', () => {
    expect(normalizeDocumentPath('/explore/')).toBe('/explore')
    expect(normalizeDocumentPath('/authors///')).toBe('/authors')
    expect(normalizeDocumentPath('/')).toBe('/')
  })

  it('resolves prerendered public routes even when Pages appends a trailing slash', () => {
    const explore = resolveHtmlDocument(new URL('https://momichan.xyz/explore/'))
    const authors = resolveHtmlDocument(new URL('https://momichan.xyz/authors/'))
    const community = resolveHtmlDocument(new URL('https://momichan.xyz/community/'))

    expect(explore.status).toBe(200)
    expect(explore.canonicalPath).toBe('/explore')

    expect(authors.status).toBe(200)
    expect(authors.canonicalPath).toBe('/authors')

    expect(community.status).toBe(200)
    expect(community.canonicalPath).toBe('/community')
  })
})
