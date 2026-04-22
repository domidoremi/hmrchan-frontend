import { describe, expect, it } from 'vitest'

import { resolveUpstreamDomain } from '@/edge/upstream'

describe('resolveUpstreamDomain', () => {
  it('routes authenticated relation-domain public profile reads to community', () => {
    expect(
      resolveUpstreamDomain('/api/v1/users/6ea6823c-7a9a-4cfc-ac85-d141adb00610/public-profile')
    ).toBe('community')
  })

  it('does not generalize every users route to community', () => {
    expect(resolveUpstreamDomain('/api/v1/users/me/profile')).toBe('identity')
    expect(resolveUpstreamDomain('/api/v1/users/6ea6823c-7a9a-4cfc-ac85-d141adb00610')).toBe(
      'content'
    )
  })
})
