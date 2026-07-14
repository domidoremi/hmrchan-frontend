import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const analogSystemSource = readFileSync(
  resolve(process.cwd(), 'src/styles/analog-system.css'),
  'utf8'
)

function extractRule(selector: string): string {
  const start = analogSystemSource.indexOf(`${selector} {`)
  if (start < 0) return ''

  const end = analogSystemSource.indexOf('\n}', start)
  return end < 0 ? analogSystemSource.slice(start) : analogSystemSource.slice(start, end + 2)
}

describe('analog surface dark mode styles', () => {
  it('uses subdued highlight tokens and stronger secondary text in dark mode', () => {
    const darkModeTokens = extractRule("[data-color-mode='dark']")

    expect(darkModeTokens).toContain('--surface-paper-highlight: rgba(255, 255, 255, 0.035);')
    expect(darkModeTokens).toContain('--surface-paper-highlight-spot: rgba(255, 255, 255, 0.055);')
    expect(darkModeTokens).toContain('--surface-paper-ink-soft: rgba(237, 242, 246, 0.82);')
    expect(darkModeTokens).toContain('--surface-nature-ink-soft: rgba(237, 245, 239, 0.82);')
  })

  it('routes shared surface highlights through theme-aware tokens', () => {
    expect(analogSystemSource).toContain(
      'linear-gradient(180deg, var(--surface-paper-highlight), transparent 32%)'
    )
    expect(analogSystemSource).toContain(
      'radial-gradient(circle at 86% 14%, var(--surface-paper-highlight-spot), transparent 24%)'
    )
    expect(analogSystemSource).toContain(
      'radial-gradient(circle at 12% 14%, var(--surface-nature-highlight), transparent 32%)'
    )
    expect(analogSystemSource).toContain('var(--surface-paper-chip-highlight)')
  })
})
