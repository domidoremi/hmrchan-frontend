import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appFooterSource = readFileSync(
  resolve(process.cwd(), 'src/components/layout/AppFooter.vue'),
  'utf8'
)

describe('AppFooter marquee styles', () => {
  it('keeps the home marquee track scrollable across responsive breakpoints instead of disabling it', () => {
    expect(appFooterSource).toContain('.footer-marquee__track {')
    expect(appFooterSource).toContain('flex-shrink: 0;')
    expect(appFooterSource).not.toContain('.footer-marquee {\n    display: none;')
    expect(appFooterSource).not.toContain(
      '.footer--home .footer-marquee__track {\n    animation: none;'
    )
  })
})
