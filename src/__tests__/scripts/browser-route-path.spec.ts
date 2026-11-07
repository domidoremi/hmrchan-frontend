import { describe, expect, it } from 'vitest'
import { matchesExpectedBrowserRoute } from '../../../scripts/lib/browser-route-path.js'

describe('browser route expectations', () => {
  it('checks required fragments while allowing ordinary route query state', () => {
    expect(
      matchesExpectedBrowserRoute(
        'https://example.com/profile/security#activity',
        '/profile/security#activity'
      )
    ).toBe(true)
    expect(matchesExpectedBrowserRoute('/profile/security', '/profile/security#activity')).toBe(
      false
    )
    expect(
      matchesExpectedBrowserRoute('/profile/security#devices', '/profile/security#activity')
    ).toBe(false)
    expect(
      matchesExpectedBrowserRoute('/login?return_to=%2Fprofile', '/profile/security#activity')
    ).toBe(false)
    expect(matchesExpectedBrowserRoute('/explore?layout=list', '/explore')).toBe(true)
    expect(matchesExpectedBrowserRoute('/explore?layout=list', '/explore?layout=grid')).toBe(false)
  })
})
