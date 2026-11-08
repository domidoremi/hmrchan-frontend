import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadTurnstileScript } from '../turnstileScript'

const selector = 'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
describe('Turnstile script recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    delete window.turnstile
  })
  afterEach(() => {
    document.querySelectorAll(selector).forEach((script) => script.remove())
    delete window.turnstile
    vi.useRealTimers()
  })
  it('shares the loader and replaces a failed script on retry', async () => {
    const first = loadTurnstileScript()
    expect(loadTurnstileScript()).toBe(first)
    const failure = first.catch((error: Error) => error)
    document.querySelector(selector)!.dispatchEvent(new Event('error'))
    expect(await failure).toBeInstanceOf(Error)
    expect(document.querySelector(selector)).toBeNull()
    const retry = loadTurnstileScript()
    window.turnstile = {} as NonNullable<Window['turnstile']>
    await vi.advanceTimersByTimeAsync(50)
    await expect(retry).resolves.toBeUndefined()
  })
  it('times out when an existing script never exposes its API', async () => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    document.head.appendChild(script)
    const result = loadTurnstileScript().catch((error: Error) => error)
    await vi.advanceTimersByTimeAsync(20001)
    expect(await result).toBeInstanceOf(Error)
    expect(document.querySelector(selector)).toBeNull()
  })
})
