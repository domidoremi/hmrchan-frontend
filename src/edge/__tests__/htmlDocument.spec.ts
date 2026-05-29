import { describe, expect, it } from 'vitest'

import { STATIC_HOME_PRERENDER_IMAGE } from '../../fallbacks/generated/homePrerenderManifest'
import { renderPrerenderShell, resolveHtmlDocument } from '../htmlDocument'
import { createPrerenderedHtml } from '../prerenderHtml'

function resolvePath(path: string) {
  return resolveHtmlDocument(new URL(`https://momichan.xyz${path}`))
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
      '<html><head><title>App</title></head><body><div id="app-root"></div></body></html>',
      '/'
    )

    expect(html).toContain('rel="preload"')
    expect(html).toContain('as="image"')
    expect(html).toContain(`href="${STATIC_HOME_PRERENDER_IMAGE.href}"`)
    expect(html).toContain(`imagesrcset="${STATIC_HOME_PRERENDER_IMAGE.srcset}"`)
    expect(html).toContain(`imagesizes="${STATIC_HOME_PRERENDER_IMAGE.sizes}"`)
    expect(html).toContain('/snapshot-media/home/')
    expect(html).toContain('data-prerender-preload-image="true"')
    expect(html).toContain('fetchpriority' + '="high"')
  })
})
