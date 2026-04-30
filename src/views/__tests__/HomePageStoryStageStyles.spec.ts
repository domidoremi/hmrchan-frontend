import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const homePageSource = readFileSync(resolve(process.cwd(), 'src/views/HomePage.vue'), 'utf8')
const homePageSystemSource = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/home-page-system.css'),
  'utf8'
)

function mobileRuleFor(source: string, selector: string): string {
  const mobileSource = mobileMediaBlock(source)
  const selectorIndex = mobileSource.indexOf(selector)
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

function lastMobileRuleFor(source: string, selector: string): string {
  const mobileSource = mobileMediaBlock(source)
  const selectorIndex = mobileSource.lastIndexOf(selector)
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
  if (!mobileSource.includes(selector)) return null
  return mobileRuleFor(source, selector)
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
    expect(homePageSource).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(homePageSource).toContain('grid-auto-rows: auto')
    expect(homePageSource).toContain('overflow: visible')
    expect(homePageSource).toContain('grid-column: 1 / -1')
    expect(homePageSource).toContain('align-self: start')
    expect(homePageSource).toContain('min-block-size: clamp(6rem, 12dvh, 7rem)')
    expect(homePageSource).toContain('@media (max-width: 560px)')
    expect(homePageSource).toContain('min-block-size: auto')
  })

  it('keeps shared mobile story-stage rules content-first instead of forcing rigid height', () => {
    const storyRule = lastMobileRuleFor(homePageSystemSource, '.home-page .story-stage')
    expect(storyRule).toContain('block-size: auto')
    expect(storyRule).toContain('min-block-size: var(--home-safe-block-size)')
    expect(storyRule).toContain('perspective: 16rem')
    expect(storyRule).toContain('transform-style: preserve-3d')
  })
})
