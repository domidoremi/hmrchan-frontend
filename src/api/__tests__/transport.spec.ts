import { describe, expect, it } from 'vitest'
import { buildRequestUrl } from '../client/transport'

describe('api transport helpers', () => {
  it('preserves explicit http and https endpoints', () => {
    expect(buildRequestUrl('https://api.example.test/v1/posts', '/api/v1')).toBe(
      'https://api.example.test/v1/posts'
    )
    expect(buildRequestUrl('http://localhost:8788/health', '/api/v1')).toBe(
      'http://localhost:8788/health'
    )
  })

  it('treats non-url http-prefixed paths as relative API endpoints', () => {
    expect(buildRequestUrl('httpish/path', '/api/v1')).toBe('/api/v1httpish/path')
  })

  it('normalizes trailing slashes on the configured base URL', () => {
    expect(buildRequestUrl('/posts', '/api/v1///')).toBe('/api/v1/posts')
  })
})
