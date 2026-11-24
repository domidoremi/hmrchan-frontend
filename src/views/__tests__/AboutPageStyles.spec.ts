import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const aboutPageSource = readFileSync(resolve(process.cwd(), 'src/views/AboutPage.vue'), 'utf8')
const aboutPageStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/about-page-view.css'),
  'utf8'
)
const themeComposition = readFileSync(
  resolve(process.cwd(), 'src/features/journal/styles/theme-composition.css'),
  'utf8'
)

describe('AboutPage styles', () => {
  it('keeps the author directory intrinsic, padded and responsive', () => {
    expect(aboutPageSource).toContain('about-directory-group')
    expect(aboutPageSource).toContain('about-directory-links')
    expect(aboutPageStyles).toContain('align-content: start')
    expect(aboutPageStyles).toContain('min-inline-size: 0')
    expect(aboutPageStyles).toContain('overflow-wrap: anywhere')
    expect(aboutPageStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(aboutPageStyles).toContain('@media (max-width: 700px)')
    expect(aboutPageStyles).toContain('grid-column: 1 / -1')
  })

  it('removes redundant descriptions while keeping official attribution', () => {
    expect(aboutPageSource).not.toContain('about-disclaimer')
    expect(aboutPageSource).not.toContain('about-subtitle')
    expect(aboutPageSource).toContain('about.footer.fanProject')
  })

  it('composes each retained theme into a distinct directory layout', () => {
    for (const preset of [
      'apple-native',
      'fluent-workspace',
      'material-expressive',
      'carbon-index',
    ]) {
      expect(themeComposition).toContain(`data-preset='${preset}'`)
    }
    expect(themeComposition).toContain("about-directory-group[data-directory='personal']")
    expect(themeComposition).toContain("about-directory-group[data-directory='group']")
    expect(themeComposition).toContain('background: var(--theme-companion)')
    expect(themeComposition).toContain('grid-template-columns: minmax(0, 0.32fr) minmax(0, 1fr)')
    expect(themeComposition).toContain('@media (max-width: 760px)')
  })

  it('gives index and directory links a visible keyboard focus state', () => {
    expect(themeComposition).toContain(
      ':is(.about-directory-links a, .about-index a):focus-visible'
    )
    expect(themeComposition).toContain('outline: 2px solid var(--accent)')
  })
})
