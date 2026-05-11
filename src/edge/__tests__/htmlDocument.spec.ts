import { describe, expect, it } from 'vitest'

import { renderPrerenderShell, resolveHtmlDocument } from '../htmlDocument'

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

  it('keeps unknown routes as real 404 documents', () => {
    const documentConfig = resolvePath('/__missing-route__')

    expect(documentConfig.status).toBe(404)
    expect(documentConfig.robots).toBe('noindex, nofollow')
    expect(documentConfig.canonicalPath).toBe('/__missing-route__')
  })

  it('renders an inert prerender marker instead of a visible loader shell', () => {
    const shell = renderPrerenderShell(resolvePath('/'))

    expect(shell).toContain('data-prerender-shell="true"')
    expect(shell).toContain('data-prerender-shell-variant="home"')
    expect(shell).toContain('data-prerender-shell-title="MomiChan"')
    expect(shell).not.toContain('/hmrchan/pets/tidyfox/spritesheet.webp')
    expect(shell).not.toContain('<svg')
    expect(shell).not.toContain('<i')
    expect(shell).not.toContain('#171412')
    expect(shell.trim().startsWith('<template')).toBe(true)
  })
})
