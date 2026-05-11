import { describe, expect, it } from 'vitest'

import { insertCriticalCSS, toLayeredCriticalCSS } from '../criticalCss'

describe('insertCriticalCSS', () => {
  it('inserts layered critical CSS after the theme first-paint guard', () => {
    const html =
      '<!doctype html><html><head><meta charset="UTF-8" /><script data-hmr-theme-bootstrap></script><style id="hmr-theme-critical">html{background:#fbf9ef}</style><title>MomiChan</title></head><body><div id="app-root"></div></body></html>'
    const styleBlock = `\n<style id="critical-css">${toLayeredCriticalCSS('body{margin:0}')}</style>`

    const transformed = insertCriticalCSS(html, styleBlock)

    expect(transformed.indexOf('id="hmr-theme-critical"')).toBeLessThan(
      transformed.indexOf('id="critical-css"')
    )
    expect(transformed.indexOf('id="critical-css"')).toBeLessThan(transformed.indexOf('<title>'))
    expect(transformed).toContain('@layer')
  })
})
