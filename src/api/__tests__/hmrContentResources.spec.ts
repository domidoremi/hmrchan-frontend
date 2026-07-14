import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client'
import {
  combineEndpointResults,
  makeResource,
  toApiErrorState,
  type EndpointResult,
} from '@/api/hmrContentResources'

describe('hmrContentResources error states', () => {
  it('classifies ApiError statuses and codes into HMR error kinds', () => {
    expect(
      toApiErrorState(
        new ApiError('Automated access is not permitted', 403, 'AUTOMATED_ACCESS_NOT_PERMITTED'),
        '/posts'
      )
    ).toMatchObject({
      kind: 'restricted',
      status: 403,
      code: 'AUTOMATED_ACCESS_NOT_PERMITTED',
      path: '/posts',
    })
    expect(toApiErrorState(new ApiError('Login required', 401), '/me').kind).toBe('unauthorized')
    expect(toApiErrorState(new ApiError('Missing', 404), '/posts/missing').kind).toBe('not-found')
    expect(toApiErrorState(new ApiError('Upgrade', 426), '/posts').kind).toBe('refresh-needed')
    expect(toApiErrorState(new ApiError('Slow down', 429), '/posts').kind).toBe('rate-limited')
    expect(toApiErrorState(new ApiError('Server failed', 500), '/posts').kind).toBe('server')
  })

  it('classifies network-like runtime failures and unknown errors', () => {
    expect(toApiErrorState(new TypeError('Failed to fetch'), '/posts')).toMatchObject({
      kind: 'network',
      message: 'Failed to fetch',
      path: '/posts',
    })
    expect(toApiErrorState('bad value', '/posts')).toEqual({
      kind: 'unknown',
      message: '当前内容暂时不可用。',
      path: '/posts',
    })
  })
})

describe('hmrContentResources resource metadata', () => {
  it('creates ready resources with optional retry actions', async () => {
    const retry = async () => undefined
    const resource = makeResource(
      { posts: ['api'] },
      {
        paths: ['/posts'],
        source: 'api',
        retry,
      }
    )

    expect(resource).toMatchObject({
      state: 'ready',
      data: { posts: ['api'] },
      source: 'api',
      error: null,
      paths: ['/posts'],
    })
    expect(resource.updatedAt).toEqual(expect.any(String))
    expect(resource.retry).toEqual({
      label: '重试',
      run: retry,
    })
    await expect(resource.retry?.run()).resolves.toBeUndefined()
  })

  it('combines endpoint results into source, error, and path metadata', () => {
    const networkError = {
      kind: 'network',
      message: 'fetch failed',
      path: '/authors',
    } as const
    const apiResults: EndpointResult<unknown>[] = [
      { data: ['post'], error: null, source: 'api', path: '/posts' },
      { data: ['author'], error: null, source: 'api', path: '/authors' },
    ]
    const firstApiResult = apiResults[0]
    if (!firstApiResult) throw new Error('Expected the post endpoint fixture')
    const mixedResults: EndpointResult<unknown>[] = [
      firstApiResult,
      { data: null, error: networkError, source: 'local', path: '/authors' },
    ]

    expect(combineEndpointResults(apiResults)).toEqual({
      source: 'api',
      error: null,
      paths: ['/posts', '/authors'],
    })
    expect(combineEndpointResults(mixedResults)).toEqual({
      source: 'local',
      error: networkError,
      paths: ['/posts', '/authors'],
    })
  })
})
