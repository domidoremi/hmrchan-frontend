import { describe, expect, it } from 'vitest'

import { scrubSensitiveUrlParameters } from '../sensitiveUrl'

describe('scrubSensitiveUrlParameters', () => {
  it('removes one-time credentials while preserving unrelated query state', () => {
    window.history.replaceState(
      { marker: true },
      '',
      '/verify-email?token=secret&email=user%40example.com#result'
    )

    scrubSensitiveUrlParameters(['token'])

    expect(window.location.pathname).toBe('/verify-email')
    expect(window.location.search).toBe('?email=user%40example.com')
    expect(window.location.hash).toBe('#result')
    expect(window.history.state).toEqual({ marker: true })
  })

  it('removes form-encoded fragment credentials without changing ordinary anchors', () => {
    window.history.replaceState(
      null,
      '',
      '/auth/callback#access_token=fragment-secret&scope=profile&state=state-secret'
    )

    scrubSensitiveUrlParameters()

    expect(window.location.hash).toBe('#scope=profile')

    window.history.replaceState(null, '', '/verify-email#result')
    scrubSensitiveUrlParameters()
    expect(window.location.hash).toBe('#result')
  })
})
