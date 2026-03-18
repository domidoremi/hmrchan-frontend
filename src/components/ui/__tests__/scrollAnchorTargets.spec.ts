import { describe, expect, it } from 'vitest'
import {
  collectDocumentScrollTargets,
  computeScrollAnchorTop,
  isNearDocumentBottom,
  resolveNextScrollAnchor,
} from '../scrollAnchorTargets'

describe('scrollAnchorTargets', () => {
  it('resolves the next semantic anchor after the navbar offset', () => {
    const nextAnchor = resolveNextScrollAnchor({
      scrollY: 640,
      navbarOffset: 64,
      targets: [
        { id: 'hero', top: 0 },
        { id: 'featured', top: 720 },
        { id: 'latest', top: 1440 },
        { id: 'story', top: 2160 },
      ],
    })

    expect(nextAnchor?.id).toBe('latest')
  })

  it('computes target scroll positions without overshooting the top edge', () => {
    expect(computeScrollAnchorTop(720, 64)).toBe(656)
    expect(computeScrollAnchorTop(32, 96)).toBe(0)
  })

  it('marks the page as near the bottom only when the remaining distance is small', () => {
    expect(isNearDocumentBottom(1210, 800, 2100)).toBe(true)
    expect(isNearDocumentBottom(800, 800, 2100)).toBe(false)
  })

  it('derives stepped anchor tops from the shared rail root so panel anchors advance in order', () => {
    document.body.innerHTML = `
      <main>
        <section data-scroll-anchor-root="home-featured" data-scroll-anchor-step-count="4">
          <article data-scroll-anchor="home-featured-portal" data-scroll-anchor-step="0"></article>
          <article data-scroll-anchor="home-featured-spotlight" data-scroll-anchor-step="1"></article>
          <article data-scroll-anchor="home-featured-featured" data-scroll-anchor-step="2"></article>
          <article data-scroll-anchor="home-featured-trends" data-scroll-anchor-step="3"></article>
        </section>
      </main>
    `

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    })

    const root = document.querySelector<HTMLElement>('[data-scroll-anchor-root]')!
    const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-anchor]'))

    root.getBoundingClientRect = () =>
      ({
        top: 840,
        left: 0,
        bottom: 4440,
        right: 0,
        width: 100,
        height: 3600,
        x: 0,
        y: 840,
        toJSON: () => ({}),
      }) as DOMRect

    anchors.forEach((anchor) => {
      anchor.getBoundingClientRect = () =>
        ({
          top: 840,
          left: 0,
          bottom: 1740,
          right: 0,
          width: 100,
          height: 100,
          x: 0,
          y: 840,
          toJSON: () => ({}),
        }) as DOMRect
    })

    const targets = collectDocumentScrollTargets(document)

    expect(targets.map((target) => [target.id, target.top])).toEqual([
      ['home-featured-portal', 840],
      ['home-featured-spotlight', 1740],
      ['home-featured-featured', 2640],
      ['home-featured-trends', 3540],
    ])
  })
})
