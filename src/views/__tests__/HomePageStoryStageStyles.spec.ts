import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const homePageSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/home-page-view.css'),
  'utf8'
)
const homePageSystemSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/home-page-system.css'),
  'utf8'
)
const stageLetterbookSource = readFileSync(
  resolve(process.cwd(), 'src/styles/stage-letterbook.css'),
  'utf8'
)

function mobileRuleFor(source: string, selector: string): string {
  const mobileSource = mobileMediaBlock(source)
  return ruleFor(mobileSource, selector)
}

function ruleFor(source: string, selector: string): string {
  const selectorIndex = findSelectorIndex(source, selector)
  expect(selectorIndex).toBeGreaterThanOrEqual(0)

  const blockStart = source.indexOf('{', selectorIndex)
  expect(blockStart).toBeGreaterThanOrEqual(0)

  let depth = 0
  for (let index = blockStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(blockStart + 1, index)
      }
    }
  }

  throw new Error(`Rule not closed for selector: ${selector}`)
}

function lastMobileRuleFor(source: string, selector: string): string {
  const mobileSource = mobileMediaBlock(source)
  const selectorIndex = findLastSelectorIndex(mobileSource, selector)
  expect(selectorIndex).toBeGreaterThanOrEqual(0)

  const blockStart = mobileSource.indexOf('{', selectorIndex)
  expect(blockStart).toBeGreaterThanOrEqual(0)

  let depth = 0
  for (let index = blockStart; index < mobileSource.length; index += 1) {
    const char = mobileSource[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return mobileSource.slice(blockStart + 1, index)
      }
    }
  }

  throw new Error(`Rule not closed for selector: ${selector}`)
}

function maybeMobileRuleFor(source: string, selector: string): string | null {
  const mobileSource = mobileMediaBlock(source)
  if (findSelectorIndex(mobileSource, selector) < 0) return null
  return mobileRuleFor(source, selector)
}

function findSelectorIndex(source: string, selector: string): number {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(^|\\n)[^\\n{}]*${escapedSelector}(?![-\\w])[^\\n{}]*\\{`, 'm').exec(
    source
  )
  if (!match || typeof match.index !== 'number') return -1
  return match.index + match[1].length
}

function findLastSelectorIndex(source: string, selector: string): number {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(^|\\n)[^\\n{}]*${escapedSelector}(?![-\\w])[^\\n{}]*\\{`, 'gm')
  let match: RegExpExecArray | null = null
  let lastIndex = -1

  for (match = regex.exec(source); match; match = regex.exec(source)) {
    lastIndex = match.index + match[1].length
  }

  return lastIndex
}

function mobileMediaBlock(source: string): string {
  const mediaIndex = source.indexOf('@media (max-width: 768px)')
  expect(mediaIndex).toBeGreaterThanOrEqual(0)

  const blockStart = source.indexOf('{', mediaIndex)
  expect(blockStart).toBeGreaterThanOrEqual(0)

  let depth = 0
  for (let index = blockStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(blockStart + 1, index)
      }
    }
  }

  throw new Error('Mobile media block is not closed.')
}

describe('HomePage story-stage styles', () => {
  it('keeps the compact rail in document flow through tablet widths', () => {
    expect(stageLetterbookSource).toMatch(
      /@media \(min-width: 769px\) and \(max-width: 1024px\)\s*\{[\s\S]*?#app \.home-page :where\(\.rail-sticky, \.rail-stage\)\s*\{[^}]*position:\s*relative;[^}]*block-size:\s*auto;[^}]*overflow:\s*visible;[\s\S]*?#app \.home-page \.rail-track\s*\{[^}]*display:\s*grid;[^}]*inline-size:\s*100%;[^}]*block-size:\s*auto;[^}]*transform:\s*none;[\s\S]*?#app \.home-page \.rail-panel\s*\{[^}]*block-size:\s*auto;[^}]*min-inline-size:\s*0;/
    )
  })

  it('keeps the wide featured rail viewport-sized without letterbook padding travel', () => {
    expect(stageLetterbookSource).toMatch(
      /@media \(min-width: 1025px\)\s*\{\s*#app \.home-page \.rail\s*\{[^}]*--home-safe-block-size:\s*calc\(100dvh - var\(--home-navbar-stable-height\)\);[^}]*padding-block:\s*0;/
    )
  })

  it('keeps visual theme tokens in the layered page system so dark mode can override them', () => {
    const visualTokens = [
      '--home-blush-rgb',
      '--home-mist-rgb',
      '--home-lilac-rgb',
      '--home-ink',
      '--home-shell-radius',
      '--home-card-radius',
      '--home-chip-radius',
      '--home-section-bg',
      '--home-card-shadow',
      '--home-soft-border',
      '--home-pill-bg',
      '--home-pill-border',
      '--home-tag-hover',
      '--home-accent',
      '--home-accent-soft',
      '--home-panel-bg',
      '--home-panel-bg-soft',
      '--home-panel-bg-strong',
      '--home-panel-muted',
      '--home-panel-muted-strong',
      '--home-panel-border',
      '--home-panel-border-strong',
      '--home-panel-highlight',
      '--home-panel-shadow',
      '--home-panel-shadow-strong',
      '--home-preview-bg',
      '--home-preview-empty-bg',
      '--home-preview-border',
      '--home-preview-overlay',
      '--home-preview-overlay-ink',
      '--home-preview-shadow',
      '--home-community-rgb',
      '--home-stage-chip-bg',
      '--home-stage-chip-border',
      '--home-stage-backdrop',
      '--home-story-card-bg',
      '--home-story-card-border',
      '--home-story-card-shadow',
      '--home-story-visual-bg',
      '--home-story-stage-bg',
      '--home-story-stage-end-surface',
      '--home-media-slices-bg',
    ]

    const scopedHomeRule = ruleFor(homePageSource, '.home-page')
    const defaultThemeRule = ruleFor(homePageSystemSource, '.home-page')
    const darkThemeRule = ruleFor(homePageSystemSource, "[data-color-mode='dark'] .home-page")

    for (const token of visualTokens) {
      expect(scopedHomeRule).not.toContain(`${token}:`)
      expect(defaultThemeRule).toContain(`${token}:`)
    }

    expect(darkThemeRule).toContain('--home-ink: #f8fafc')
    expect(darkThemeRule).toContain('--home-pill-bg: rgba(15, 20, 31, 0.76)')
    expect(darkThemeRule).toContain('rgba(12, 16, 23, 0.88)')
    expect(darkThemeRule).toContain('rgba(18, 24, 36, 0.78)')
    expect(darkThemeRule).toContain('rgba(8, 12, 18, 0.78)')
    expect(darkThemeRule).not.toContain('--home-pill-bg: rgba(255, 255, 255')

    expect(homePageSource).toContain('background: var(--home-media-slices-bg)')
    expect(homePageSource).toContain('background: var(--home-panel-bg), var(--home-pill-bg)')
    expect(homePageSource).not.toContain(
      'linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.74))'
    )
    expect(homePageSource).not.toContain('rgba(248, 247, 244, 0.78)')
  })

  it('keeps mobile story-stage on a 3D transform layer instead of resetting motion', () => {
    for (const source of [homePageSource, homePageSystemSource]) {
      const mobileSource = mobileMediaBlock(source)
      const resetGroup = mobileSource.match(
        /\.rail-stage,\s*[\s\S]*?\.posts--bubble > \.container\s*\{[\s\S]*?transform:\s*none;[\s\S]*?will-change:\s*auto;[\s\S]*?\}/
      )?.[0]

      expect(resetGroup).toBeTruthy()
      expect(resetGroup).not.toContain('.story-stage')

      const storyRule = mobileRuleFor(source, '.story-stage')
      expect(storyRule).toContain('translate3d')
      expect(storyRule).toContain('transform-style: preserve-3d')
      expect(storyRule).toContain('will-change: transform, opacity')

      const mediaRule = maybeMobileRuleFor(source, '.media-slice-list') ?? ''
      const hasMediaRule = mediaRule.length > 0
      expect(hasMediaRule ? mediaRule.includes('perspective:') : true).toBe(true)
      expect(hasMediaRule ? mediaRule.includes('transform-style: preserve-3d') : true).toBe(true)
    }
  })

  it('lets the smallest bubble stage collapse into a flowing single-column stack', () => {
    expect(homePageSource).toContain('@media (max-width: 768px)')
    expect(homePageSource).toContain('display: flex')
    expect(homePageSource).toContain('flex-direction: column')
    expect(homePageSource).toContain('align-items: stretch')
    expect(homePageSource).toContain('overflow: visible')
    expect(homePageSource).toContain('flex: 0 0 auto')
    expect(homePageSource).toContain('align-self: start')
    expect(homePageSource).toContain('gap: 0.875rem')
    expect(homePageSource).toContain('min-block-size: clamp(6.5rem, 14dvh, 7.75rem)')
    expect(homePageSource).toContain('@media (max-width: 560px)')
    expect(homePageSource).toContain('min-block-size: auto')

    const floatRule = mobileRuleFor(homePageSource, '.bubble-stage--mobile .latest-bubble__float')
    expect(floatRule).toContain('var(--bubble-live-x, 0rem) * 0.5')
    expect(floatRule).toContain('var(--bubble-live-y, 0rem) * 0.18')
    expect(floatRule).not.toContain('--bubble-nudge-y')
  })

  it('stacks mobile featured rail cards on content-sized rows so media and copy do not overlap', () => {
    const mobileSource = mobileMediaBlock(homePageSource)

    expect(mobileSource).toContain('.featured-rail-card--lead,')
    expect(mobileSource).toContain('grid-template-rows: auto auto')
    expect(mobileSource).toContain('align-content: start')

    const bodyRule = mobileRuleFor(homePageSource, '.featured-rail-card__body')
    expect(bodyRule).toContain('block-size: auto')
    expect(bodyRule).toContain('align-self: start')
    expect(bodyRule).toContain('overflow: visible')
  })

  it('keeps the mobile story deck on a perceptible 3D transform scale instead of flattening it', () => {
    const componentSliceRule = mobileRuleFor(homePageSource, '.media-slice')
    const sharedSliceRule = mobileRuleFor(homePageSystemSource, '.home-page .media-slice')

    for (const rule of [componentSliceRule, sharedSliceRule]) {
      expect(rule).toContain('* 0.78')
      expect(rule).toContain('* 0.82')
      expect(rule).toContain('* 0.58')
    }
  })

  it('keeps shared mobile story-stage rules content-first instead of forcing rigid height', () => {
    const storyRule = lastMobileRuleFor(homePageSystemSource, '.home-page .story-stage')
    expect(storyRule).toContain('block-size: auto')
    expect(storyRule).toContain('min-block-size: var(--home-safe-block-size)')
    expect(storyRule).toContain('perspective: 16rem')
    expect(storyRule).toContain('transform-style: preserve-3d')
  })

  it('keeps the desktop story deck on a stronger stacked perspective instead of a nearly flat slice list', () => {
    expect(homePageSource).toContain('.media-slice-list {')
    expect(homePageSource).toContain('perspective: clamp(24rem, 40vw, 42rem);')
    expect(homePageSource).toContain('perspective-origin: 50% 24%;')
    expect(homePageSource).toContain('rotateY(calc(var(--story-rotate-y, 0deg) * -0.18))')
  })
})
