import { describe, expect, it } from 'vitest'

import { normalizeProxyTarget } from '../proxyTarget'

describe('Vite API proxy target normalization', () => {
  const facade = 'https://momichan.com'

  it.each([undefined, '', '/api', '/api/'])(
    'maps the same-origin %s sentinel to the configured facade',
    (target) => {
      expect(normalizeProxyTarget(target, `${facade}/`)).toBe(facade)
    }
  )

  it('preserves an explicit absolute local backend target', () => {
    expect(normalizeProxyTarget(' http://127.0.0.1:8080/ ', facade)).toBe('http://127.0.0.1:8080')
  })
})
