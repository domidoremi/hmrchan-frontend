import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const modalSource = readFileSync(
  resolve(process.cwd(), 'src/components/business/PostPreviewModal.vue'),
  'utf8'
)
const modalStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/components/post-preview-modal.css'),
  'utf8'
)
const stylesIndex = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8')

describe('PostPreviewModal styles', () => {
  it('keeps modal presentation in the layered component stylesheet', () => {
    expect(modalSource).not.toContain('<style')
    expect(stylesIndex).toContain(
      "@import './components/post-preview-modal.css' layer(components);"
    )
    expect(modalStyles).toContain('.post-preview-overlay {')
    expect(modalStyles).toContain('.post-preview-panel {')
  })

  it('uses namespaced selectors after leaving scoped SFC styles', () => {
    expect(modalSource).not.toContain('class="thumb"')
    expect(modalSource).not.toContain('class="meta-pill"')
    expect(modalStyles).not.toContain('.thumb')
    expect(modalStyles).not.toContain('.meta-pill')
    expect(modalStyles).toContain('.post-preview-thumb {')
    expect(modalStyles).toContain('.post-preview-meta-pill {')
  })
})
