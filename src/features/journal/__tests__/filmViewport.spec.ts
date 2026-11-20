import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFilmViewport } from '../editions/filmViewport'

let shell: HTMLElement
let top: number
let mobileHeight: number
let viewport: ReturnType<typeof createFilmViewport>

beforeEach(() => {
  vi.stubGlobal('innerHeight', 800)
  top = 122
  mobileHeight = 0
  shell = document.createElement('div')
  shell.className = 'journal-shell'
  shell.innerHTML = `<header class="edition-header"></header>
    <nav class="editorial-contents" style="top: 72px"></nav>
    <section class="editorial-film"><h2 class="film-heading"></h2>
      <div class="film-track"></div><div class="film-position"></div></section>
    <nav class="mobile-navigation"></nav>`
  document.body.append(shell)
  const mockRect = (selector: string, rect: () => Partial<DOMRect>) =>
    vi
      .spyOn(shell.querySelector(selector)!, 'getBoundingClientRect')
      .mockImplementation(() => rect() as DOMRect)
  mockRect('.edition-header', () => ({ bottom: 72 }))
  mockRect('.editorial-contents', () => ({ height: 50 }))
  mockRect('.mobile-navigation', () => ({ height: mobileHeight, top: 800 - mobileHeight }))
  mockRect('.editorial-film', () => ({ top, height: 678 }))
  mockRect('.film-heading', () => ({ top: top + 18 }))
  mockRect('.film-position', () => ({ bottom: top + 660 }))
  viewport = createFilmViewport(shell.querySelector<HTMLElement>('.film-track')!)
})
afterEach(() => {
  shell.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('film viewport chrome', () => {
  it('reserves both sticky bars and reacts when mobile navigation becomes visible', () => {
    viewport.refresh()
    const panel = shell.querySelector<HTMLElement>('.editorial-film')!
    expect(panel.style.getPropertyValue('--film-viewport-top')).toBe('122px')
    expect(panel.style.getPropertyValue('--film-viewport-bottom')).toBe('0px')
    expect(viewport.canBrowse(new WheelEvent('wheel', { deltaY: 120 }))).toBe(true)
    mobileHeight = 80
    viewport.refresh()
    expect(panel.style.getPropertyValue('--film-viewport-bottom')).toBe('80px')
    expect(viewport.canBrowse(new WheelEvent('wheel', { deltaY: 120 }))).toBe(false)
  })

  it('leaves the page free while the heading is hidden behind the sticky bars', () => {
    top = 50
    expect(viewport.canBrowse(new WheelEvent('wheel', { deltaY: 120 }))).toBe(false)
    expect(viewport.canBrowse(new WheelEvent('wheel', { deltaY: -120 }))).toBe(true)
  })
})
