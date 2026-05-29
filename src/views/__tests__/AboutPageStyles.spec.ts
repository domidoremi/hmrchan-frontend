import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const aboutPageSource = readFileSync(resolve(process.cwd(), 'src/views/AboutPage.vue'), 'utf8')
const aboutPageStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/about-page-view.css'),
  'utf8'
)
const stylesIndex = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8')

describe('AboutPage styles', () => {
  it('keeps page presentation in the layered page-system stylesheet', () => {
    expect(aboutPageSource).not.toContain('<style')
    expect(stylesIndex).toContain(
      "@import './page-systems/about-page-view.css' layer(page-systems);"
    )
    expect(aboutPageStyles).toContain('.about-page .origin-content {')
    expect(aboutPageStyles).toContain('.about-page .tech-grid {')
  })

  it('keeps migrated selectors scoped under the about page root', () => {
    expect(aboutPageStyles).toContain('.about-page .link-desc {')
    expect(aboutPageStyles).toContain('.about-page .tech-header {')
    expect(aboutPageStyles).toContain('@media (max-width: 768px)')
    expect(aboutPageStyles).not.toContain('\n.link-desc {')
    expect(aboutPageStyles).not.toContain('\n.tech-header {')
  })
})
