import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const searchPageSource = readFileSync(resolve(process.cwd(), 'src/views/SearchPage.vue'), 'utf8')
const searchPageStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/search-page-view.css'),
  'utf8'
)
const stylesIndex = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8')

describe('SearchPage styles', () => {
  it('keeps page presentation in the layered page-system stylesheet', () => {
    expect(searchPageSource).not.toContain('<style')
    expect(stylesIndex).toContain(
      "@import './page-systems/search-page-view.css' layer(page-systems);"
    )
    expect(searchPageStyles).toContain('.search-page .search-content {')
    expect(searchPageStyles).toContain('.search-page .search-history-layout {')
  })

  it('keeps migrated selectors scoped under the search page root', () => {
    expect(searchPageStyles).toContain('.search-page .filter-tab {')
    expect(searchPageStyles).toContain('.search-page .login-hint-content {')
    expect(searchPageStyles).toContain('@media (max-width: 768px)')
    expect(searchPageStyles).not.toContain('\n.filter-tab {')
    expect(searchPageStyles).not.toContain('\n.login-hint-content {')
  })
})
