import { describe, expect, it } from 'vitest'

import { STATIC_HOME_PRERENDER_IMAGE } from '../../fallbacks/generated/homePrerenderManifest'
import { supportedLocales } from '../../i18n/locales'
import { appRoutes } from '../../router/routes'
import { renderPrerenderShell, resolveHtmlDocument } from '../htmlDocument'
import { STATIC_PRERENDER_ROUTES, createPrerenderedHtml } from '../prerenderHtml'

function resolvePath(path: string) {
  return resolveHtmlDocument(new URL(`https://momichan.com${path}`))
}

function resolveRepresentativeRoutePath(path: string): string {
  if (!path) return '/'
  return `/${path}`
    .replace('/profile/:section', '/profile/security')
    .replace('/posts/:id', '/posts/123')
    .replace('/:pathMatch(.*)*', '/__missing-route__')
}

function collectNamedShellRoutes() {
  return appRoutes.flatMap((route) =>
    (route.children ?? [])
      .filter((child) => typeof child.name === 'string')
      .map((child) => ({
        isNoindexShell:
          child.meta?.isPanel === true ||
          child.meta?.requiresAuth === true ||
          child.name === 'hmr-not-found',
        name: String(child.name),
        path: resolveRepresentativeRoutePath(child.path),
      }))
  )
}

describe('edge HTML document routing', () => {
  it.each(['/auth/passkey-recovery', '/auth/callback'])(
    'serves %s as a noindex SPA document',
    (path) => {
      const documentConfig = resolvePath(path)

      expect(documentConfig.status).toBe(200)
      expect(documentConfig.robots).toBe('noindex, nofollow')
      expect(documentConfig.canonicalPath).toBe(path)
    }
  )

  it.each([
    ['/favorites', '/profile/favorites'],
    ['/profile/favorites', '/profile/favorites'],
    ['/profile/security', '/profile/security'],
  ])('serves protected SPA route %s as a noindex document', (path, canonicalPath) => {
    const documentConfig = resolvePath(path)

    expect(documentConfig.status).toBe(200)
    expect(documentConfig.robots).toBe('noindex, nofollow')
    expect(documentConfig.canonicalPath).toBe(canonicalPath)
  })

  it('keeps unknown routes as real 404 documents', () => {
    const documentConfig = resolvePath('/__missing-route__')

    expect(documentConfig.status).toBe(404)
    expect(documentConfig.robots).toBe('noindex, nofollow')
    expect(documentConfig.canonicalPath).toBe('/__missing-route__')
  })

  it('defines edge document status and robots policy for every named shell route', () => {
    const namedRoutes = collectNamedShellRoutes()

    expect(namedRoutes.map((route) => route.name)).toEqual([
      'hmr-home',
      'hmr-explore',
      'hmr-community',
      'hmr-discussion-detail',
      'hmr-schedule',
      'hmr-settings',
      'hmr-login',
      'hmr-register',
      'hmr-auth-callback',
      'hmr-passkey-recovery',
      'hmr-profile',
      'hmr-profile-section',
      'hmr-about',
      'hmr-contact',
      'hmr-join-us',
      'hmr-thank-you',
      'hmr-post-detail',
      'hmr-not-found',
    ])

    for (const route of namedRoutes) {
      const documentConfig = resolvePath(route.path)

      expect({ routeName: route.name, status: documentConfig.status }).toMatchObject({
        status: route.name === 'hmr-not-found' ? 404 : 200,
      })
      expect({ routeName: route.name, robots: documentConfig.robots }).toMatchObject({
        robots: route.isNoindexShell ? 'noindex, nofollow' : 'index, follow',
      })
      expect({ canonicalPath: documentConfig.canonicalPath, routeName: route.name }).toMatchObject({
        canonicalPath: route.path,
      })
    }
  })

  it('renders a visible lightweight prerender shell for Lighthouse LCP', () => {
    const documentConfig = resolvePath('/')
    const shell = renderPrerenderShell(documentConfig)

    expect(documentConfig.preloadImages).toEqual([
      {
        href: STATIC_HOME_PRERENDER_IMAGE.href,
        srcset: STATIC_HOME_PRERENDER_IMAGE.srcset,
        sizes: STATIC_HOME_PRERENDER_IMAGE.sizes,
        fetchPriority: 'high',
      },
    ])
    expect(shell).toContain('data-prerender-shell="true"')
    expect(shell).toContain('data-prerender-shell-variant="home"')
    expect(shell).toContain('data-prerender-shell-title="MomiChan"')
    expect(shell).toContain('hmr-prerender-shell__title')
    expect(shell).toContain('hmr-prerender-shell__media')
    expect(shell).toContain(`src="${STATIC_HOME_PRERENDER_IMAGE.href}"`)
    expect(shell).toContain(`width="${STATIC_HOME_PRERENDER_IMAGE.width}"`)
    expect(shell).toContain(`height="${STATIC_HOME_PRERENDER_IMAGE.height}"`)
    expect(shell).toContain('loading="eager"')
    expect(shell).toContain('fetchpriority' + '="high"')
    expect(shell).toContain('<h1')
    expect(shell).not.toContain('/hmrchan/pets/tidyfox/spritesheet.webp')
    expect(shell).not.toContain('<svg')
    expect(shell).not.toContain('<i class=')
    expect(shell).not.toContain('#171412')
    expect(shell.trim().startsWith('<section')).toBe(true)
  })

  it('emits a discoverable image preload for the home prerender document', () => {
    const html = createPrerenderedHtml(
      '<html><head><title>App</title><script type="module" src="/assets/app.js"></script></head><body><div id="app-root"></div></body></html>',
      '/'
    )

    const preloadIndex = html.indexOf('data-prerender-preload-image="true"')
    const moduleScriptIndex = html.indexOf('<script type="module"')

    expect(html).toContain('rel="preload"')
    expect(html).toContain('as="image"')
    expect(html).toContain(`href="${STATIC_HOME_PRERENDER_IMAGE.href}"`)
    expect(html).toContain(`imagesrcset="${STATIC_HOME_PRERENDER_IMAGE.srcset}"`)
    expect(html).toContain(`imagesizes="${STATIC_HOME_PRERENDER_IMAGE.sizes}"`)
    expect(html).toContain('/snapshot-media/home/')
    expect(html).toContain('data-prerender-preload-image="true"')
    expect(html).toContain('fetchpriority' + '="high"')
    expect(preloadIndex).toBeGreaterThanOrEqual(0)
    expect(preloadIndex).toBeLessThan(moduleScriptIndex)
  })

  it('generates a canonical prerender document for the legacy passkey recovery redirect', () => {
    const html = createPrerenderedHtml(
      '<html><head><title>App</title><link rel="canonical" href="https://momichan.com/" /></head><body><div id="app-root"></div></body></html>',
      '/passkey-recovery'
    )

    expect(STATIC_PRERENDER_ROUTES).toContain('/passkey-recovery')
    expect(html).toContain('<title>Passkey recovery · MomiChan</title>')
    expect(html).toContain('href="https://momichan.com/auth/passkey-recovery"')
    expect(html).toContain('data-prerender-shell-title="Recover Passkey access"')
    expect(html).not.toContain('data-prerender-shell-title="Page not found"')
  })

  it('binds WebSite structured data languages to the supported locale contract', () => {
    const documentConfig = resolvePath('/')
    const websiteStructuredData = documentConfig.structuredData.find(
      (item) => item['@type'] === 'WebSite'
    )

    expect(websiteStructuredData).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      inLanguage: supportedLocales,
    })
  })
})
