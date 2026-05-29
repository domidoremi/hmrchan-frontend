import { describe, expect, it } from 'vitest'
import { buildCacheKey, buildRequestUrl, parseSuccessfulResponse } from '../client/transport'

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

  it('builds stable method and url cache keys', () => {
    expect(buildCacheKey('GET', '/api/v1/posts')).toBe('api:GET:/api/v1/posts')
    expect(buildCacheKey('post', 'https://api.example.test/v1/posts')).toBe(
      'api:post:https://api.example.test/v1/posts'
    )
  })

  it('returns undefined for successful no-content and not-modified responses', async () => {
    await expect(parseSuccessfulResponse(new Response(null, { status: 204 }))).resolves.toBe(
      undefined
    )
    await expect(parseSuccessfulResponse(new Response(null, { status: 304 }))).resolves.toBe(
      undefined
    )
  })

  it('parses successful text, json, blob, and raw response bodies', async () => {
    await expect(
      parseSuccessfulResponse(new Response('hello', { status: 200 }), 'text')
    ).resolves.toBe('hello')

    await expect(
      parseSuccessfulResponse<{ ok: boolean }>(
        Response.json({ success: true, data: { ok: true } }),
        'json'
      )
    ).resolves.toEqual({ ok: true })

    const blob = await parseSuccessfulResponse<Blob>(new Response('blob-data'), 'blob')
    expect(await blob.text()).toBe('blob-data')

    const response = new Response('raw', { status: 200 })
    await expect(parseSuccessfulResponse<Response>(response, 'response')).resolves.toBe(response)
  })
})
