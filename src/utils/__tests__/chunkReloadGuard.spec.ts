import { afterEach, describe, expect, it } from 'vitest'
import { createChunkReloadGuard } from '../chunkReloadGuard'

let guard: ReturnType<typeof createChunkReloadGuard> | undefined
const elements: HTMLElement[] = []

afterEach(() => {
  guard?.dispose()
  guard = undefined
  for (const element of elements.splice(0)) element.remove()
})

function clickLink(
  attributes: Record<string, string> = {},
  options: MouseEventInit = {},
  handled = false
) {
  const link = document.createElement('a')
  link.href = '/next-document'
  for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value)
  document.body.append(link)
  elements.push(link)
  if (handled) link.addEventListener('click', (event) => event.preventDefault())
  // Stop JSDOM's unsupported default navigation after the guard observes it.
  window.addEventListener('click', (event) => event.preventDefault(), { once: true })
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...options }))
}

describe('chunk reload navigation guard', () => {
  it('allows recovery while the current document is active', () => {
    guard = createChunkReloadGuard(window)

    window.dispatchEvent(new Event('blur'))
    document.dispatchEvent(new Event('visibilitychange'))

    expect(guard.canReload()).toBe(true)
  })

  it('keeps navigation protected while the initiating key finishes', () => {
    guard = createChunkReloadGuard(window)

    clickLink()
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }))
    window.dispatchEvent(new Event('focus'))

    expect(guard.canReload()).toBe(false)
  })

  it('keeps recovery available for navigation handled by the application', () => {
    guard = createChunkReloadGuard(window)

    clickLink({}, {}, true)

    expect(guard.canReload()).toBe(true)
  })

  it.each([
    [{ target: '_blank' }, {}],
    [{ download: '' }, {}],
    [{ href: '#section' }, {}],
    [{}, { ctrlKey: true }],
    [{}, { button: 1 }],
  ] as const)(
    'keeps recovery available for a click that keeps this document active',
    (attrs, options) => {
      guard = createChunkReloadGuard(window)

      clickLink(attrs, options)

      expect(guard.canReload()).toBe(true)
    }
  )

  it('protects native form navigation but preserves handled submissions', () => {
    guard = createChunkReloadGuard(window)
    const form = document.createElement('form')
    document.body.append(form)
    elements.push(form)
    const handle = (event: Event) => event.preventDefault()
    form.addEventListener('submit', handle)

    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    expect(guard.canReload()).toBe(true)

    form.removeEventListener('submit', handle)
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    expect(guard.canReload()).toBe(false)
  })

  it('restores recovery when a cached document is shown again', () => {
    guard = createChunkReloadGuard(window)

    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    expect(guard.canReload()).toBe(false)

    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    expect(guard.canReload()).toBe(true)
  })

  it.each(['pointerdown', 'keydown'])(
    'restores recovery when %s resumes interaction after a cancelled departure',
    (name) => {
      guard = createChunkReloadGuard(window)

      clickLink()
      window.dispatchEvent(new Event(name))

      expect(guard.canReload()).toBe(true)
    }
  )

  it('removes lifecycle listeners when the entry is disposed', () => {
    guard = createChunkReloadGuard(window)
    guard.dispose()

    clickLink()
    window.dispatchEvent(new Event('pagehide'))

    expect(guard.canReload()).toBe(true)
  })
})
