import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = () =>
  '<div id="app-root"><section data-prerender-shell="true"><h1>Original route</h1><a href="/explore">Explore</a></section></div>'
const root = () => document.getElementById('app-root')
const panel = () => document.querySelector('.boot-recovery')
const start = () => import('../recovery.js')
const failedEntry = () => {
  const script = document.createElement('script')
  script.type = 'module'
  script.src = '/assets/js/index-missing.js'
  document.head.append(script)
  script.dispatchEvent(new Event('error'))
  script.remove()
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  localStorage.clear()
  document.body.innerHTML = fixture()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
})
afterEach(async () => {
  root()?.setAttribute('data-v-app', '')
  await Promise.resolve()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('data-bootstrap-pending')
})

describe('independent bootstrap recovery', () => {
  it('stays absent during normal startup and disposes listeners and timer on mount', async () => {
    await start()
    vi.advanceTimersByTime(11999)
    expect(panel()).toBeNull()
    root().setAttribute('data-v-app', '')
    await Promise.resolve()
    expect(vi.getTimerCount()).toBe(0)
    expect(document.documentElement.hasAttribute('data-bootstrap-pending')).toBe(false)
    failedEntry()
    window.dispatchEvent(new Event('offline'))
    vi.advanceTimersByTime(30000)
    expect(panel()).toBeNull()
  })

  it('offers recovery after a slow module even when DOMContentLoaded has not fired', async () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
    await start()
    vi.advanceTimersByTime(12000)
    expect(panel()?.dataset.state).toBe('slow')
    expect(panel().querySelector('button')?.textContent).toBe('Reload page')
    expect(panel().querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite')
  })

  it('remembers entry failure before the body is parsed and shows it when the root arrives', async () => {
    document.body.innerHTML = ''
    await start()
    failedEntry()
    document.body.innerHTML = fixture()
    document.dispatchEvent(new Event('readystatechange'))
    expect(panel()?.dataset.state).toBe('error')
    expect(panel().querySelectorAll('a').length).toBe(5)
    failedEntry()
    expect(document.querySelectorAll('.boot-recovery')).toHaveLength(1)
  })

  it('does not mistake an image or a third-party script error for an entry failure', async () => {
    await start()
    const image = document.createElement('img')
    document.body.append(image)
    image.dispatchEvent(new Event('error'))
    window.dispatchEvent(
      new ErrorEvent('error', { filename: 'https://analytics.example/script.js' })
    )
    expect(panel()).toBeNull()
    failedEntry()
    expect(panel()?.dataset.state).toBe('error')
  })

  it('explains offline startup and returns to the failed state without navigating on reconnect', async () => {
    await start()
    failedEntry()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    expect(panel()?.dataset.state).toBe('offline')
    const before = location.href
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    expect(panel()?.dataset.state).toBe('error')
    expect(location.href).toBe(before)
    expect(panel().querySelector('button')?.disabled).toBe(false)
  })

  it('restores a saved locale, color mode and reduced-motion choice without the app store', async () => {
    localStorage.setItem('locale', 'zh-TW')
    localStorage.setItem('theme', JSON.stringify({ theme: 'dark' }))
    localStorage.setItem('momichan-journal:presentation-motion', JSON.stringify('reduced'))
    await start()
    failedEntry()
    expect(panel()?.lang).toBe('zh-TW')
    expect(panel()?.dataset.color).toBe('dark')
    expect(panel()?.dataset.reduced).toBe('true')
    expect(panel().querySelector('button')?.textContent).toBe('重新載入')
  })

  it('still offers recovery when browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    await start()
    failedEntry()
    expect(panel()?.dataset.state).toBe('error')
    expect(panel().querySelector('button')?.disabled).toBe(false)
  })

  it('hands keyboard focus to content when a delayed app replaces the recovery controls', async () => {
    await start()
    vi.advanceTimersByTime(12000)
    panel().querySelector('button').focus()
    root().innerHTML = '<main><h1>Loaded content</h1></main>'
    root().setAttribute('data-v-app', '')
    await Promise.resolve()
    expect(document.activeElement).toBe(root().querySelector('main'))
    expect(root().hasAttribute('data-bootstrap-recovery')).toBe(false)
    expect(document.documentElement.hasAttribute('data-bootstrap-pending')).toBe(false)
  })

  it('preserves normal focus when the user did not interact with recovery', async () => {
    await start()
    vi.advanceTimersByTime(12000)
    root().innerHTML = '<main><h1>Loaded content</h1></main>'
    root().setAttribute('data-v-app', '')
    await Promise.resolve()
    expect(document.activeElement).toBe(document.body)
  })

  it('waits for an asynchronous shell to supply the main content', async () => {
    await start()
    vi.advanceTimersByTime(12000)
    panel().querySelector('button').focus()
    root().innerHTML = '<div>Opening the shell</div>'
    root().setAttribute('data-v-app', '')
    await Promise.resolve()
    root().innerHTML = '<main><h1>Loaded content</h1></main>'
    await Promise.resolve()
    expect(document.activeElement).toBe(root().querySelector('main'))
  })

  it('cancels delayed focus handoff when the user continues interacting', async () => {
    await start()
    vi.advanceTimersByTime(12000)
    panel().querySelector('button').focus()
    root().innerHTML = '<div>Opening the shell</div>'
    root().setAttribute('data-v-app', '')
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    root().innerHTML = '<main><h1>Loaded content</h1></main>'
    await Promise.resolve()
    expect(document.activeElement).toBe(document.body)
  })
})
