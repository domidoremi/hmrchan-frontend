import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pagePrimitivesSource = readFileSync(
  resolve(process.cwd(), 'src/styles/components/page-primitives.css'),
  'utf8'
)

describe('page primitive mobile tap targets', () => {
  it('keeps compact and icon controls at a mobile-friendly 44px target', () => {
    expect(pagePrimitivesSource).toContain(
      'min-block-size: max(var(--ui-control-height-sm), 2.75rem)'
    )
    expect(pagePrimitivesSource).toContain('min-inline-size: max(var(--ui-action-size), 2.75rem)')
    expect(pagePrimitivesSource).toContain('block-size: max(var(--ui-action-size), 2.75rem)')
  })
})
