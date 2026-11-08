import { describe, expect, it } from 'vitest'

import { resolveUpstreamDomain } from '@/edge/upstream'

describe('resolveUpstreamDomain', () => {
  it('routes post interactions to community while retaining content reads', () => {
    const post = '/api/v1/posts/019ab001-0000-7000-8000-000000000001'
    expect(resolveUpstreamDomain(`${post}/like`)).toBe('community')
    expect(resolveUpstreamDomain(`${post}/like/`)).toBe('community')
    expect(resolveUpstreamDomain(`${post}/comments`)).toBe('community')
    expect(resolveUpstreamDomain(post)).toBe('content')
    expect(resolveUpstreamDomain('/api/v1/posts')).toBe('content')
  })
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
