import { describe, expect, it } from 'vitest'

import {
  buildWebSocketUpstreamUrl,
  resolveConfiguredApiBaseUrl,
  resolveRequiredApiBaseUrl,
  resolveUpstreamDomain,
  resolveVpcOrigin,
  resolveVpcOriginForPath,
} from '../upstream'

describe('edge upstream configuration helpers', () => {
  it('normalizes configured public API origins and rejects missing required origins', () => {
    expect(resolveConfiguredApiBaseUrl({ API_BASE_URL: ' https://api.example.test/// ' })).toBe(
      'https://api.example.test'
    )
    expect(resolveConfiguredApiBaseUrl({ API_BASE_URL: '   ' })).toBeNull()
    expect(resolveConfiguredApiBaseUrl()).toBeNull()
    expect(resolveRequiredApiBaseUrl({ API_BASE_URL: 'https://api.example.test/v1/' })).toBe(
      'https://api.example.test/v1'
    )
    expect(() => resolveRequiredApiBaseUrl({})).toThrow('API_BASE_URL is required')
  })

  it('routes identity, community, and content paths to their upstream domains', () => {
    expect(resolveUpstreamDomain('/internal/v1/auth/session')).toBe('identity')
    expect(resolveUpstreamDomain('/api/v1/preferences')).toBe('identity')
    expect(resolveUpstreamDomain('/uploads/avatars/demo.png')).toBe('identity')

    expect(resolveUpstreamDomain('/api/v1/posts/post-id/comments')).toBe('community')
    expect(resolveUpstreamDomain('/api/v1/users/user-id/public-profile')).toBe('community')
    expect(resolveUpstreamDomain('/uploads/comment_images/demo.png')).toBe('community')

    expect(resolveUpstreamDomain('/api/v1/community/highlights')).toBe('content')
    expect(resolveUpstreamDomain('/api/v1/home/story-deck')).toBe('content')
    expect(
      resolveUpstreamDomain('https://backend.test/api/v1/posts/post-id/comments?limit=1')
    ).toBe('community')
  })

  it('selects domain-specific VPC origins with trimmed fallback behavior', () => {
    const env = {
      VPC_API_ORIGIN: ' http://fallback-api:8000/ ',
      VPC_COMMUNITY_API_ORIGIN: 'http://community-api:8000/',
      VPC_CONTENT_API_ORIGIN: 'http://content-api:8000///',
      VPC_IDENTITY_API_ORIGIN: 'http://identity-api:8000/',
    }

    expect(resolveVpcOriginForPath('/api/v1/auth/me', env)).toBe('http://identity-api:8000')
    expect(resolveVpcOriginForPath('/api/v1/comments', env)).toBe('http://community-api:8000')
    expect(resolveVpcOriginForPath('/api/v1/home', env)).toBe('http://content-api:8000')
    expect(
      resolveVpcOriginForPath('/api/v1/auth/me', { VPC_API_ORIGIN: 'http://fallback:8000/' })
    ).toBe('http://fallback:8000')
    expect(resolveVpcOrigin()).toBe('http://localhost:8000')
  })

  it('builds websocket upstream URLs from HTTP API origins', () => {
    expect(buildWebSocketUpstreamUrl('https://api.example.test/base?token=1#hash', 'events')).toBe(
      'wss://api.example.test/base/events'
    )
    expect(buildWebSocketUpstreamUrl('http://api.example.test/', '/ws')).toBe(
      'ws://api.example.test/ws'
    )
  })
})
