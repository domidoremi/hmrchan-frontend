import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

import { blocksInvalidPublicResourceId, resolveHmrRouteGuard } from '@/router/guards'

const VALID_RESOURCE_ID = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0'

function makeRoute(overrides: Partial<RouteLocationNormalized> = {}): RouteLocationNormalized {
  return {
    fullPath: '/',
    hash: '',
    matched: [],
    meta: {},
    name: 'hmr-home',
    params: {},
    path: '/',
    query: {},
    redirectedFrom: undefined,
    ...overrides,
  }
}

function makeAuth(isAuthenticated = false) {
  return {
    isAuthenticated,
    resolveSession: vi.fn(async () => undefined),
  }
}

describe('blocksInvalidPublicResourceId', () => {
  it('blocks legacy public detail routes with non-contract resource ids', () => {
    expect(blocksInvalidPublicResourceId('author-detail', 'plain-slug')).toBe(true)
    expect(blocksInvalidPublicResourceId('author-detail', VALID_RESOURCE_ID)).toBe(false)
    expect(blocksInvalidPublicResourceId('hmr-author-detail', 'plain-slug')).toBe(true)
    expect(blocksInvalidPublicResourceId('hmr-author-detail', VALID_RESOURCE_ID)).toBe(false)
  })

  it('blocks hmr post detail routes with non-contract resource ids', () => {
    expect(blocksInvalidPublicResourceId('hmr-post-detail', 'featured-post')).toBe(true)
    expect(blocksInvalidPublicResourceId('hmr-post-detail', VALID_RESOURCE_ID)).toBe(false)
  })

  it('blocks hmr discussion detail routes with non-contract resource ids', () => {
    expect(blocksInvalidPublicResourceId('hmr-discussion-detail', 'discussion-slug')).toBe(true)
    expect(blocksInvalidPublicResourceId('hmr-discussion-detail', VALID_RESOURCE_ID)).toBe(false)
  })

  it('blocks hmr schedule detail routes with non-contract resource ids', () => {
    expect(blocksInvalidPublicResourceId('hmr-schedule-detail', 'schedule-preview-live')).toBe(true)
    expect(blocksInvalidPublicResourceId('hmr-schedule-detail', VALID_RESOURCE_ID)).toBe(false)
  })
})

describe('resolveHmrRouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves the session before evaluating route access', async () => {
    const auth = makeAuth()

    await resolveHmrRouteGuard(makeRoute(), auth)

    expect(auth.resolveSession).toHaveBeenCalledOnce()
  })

  it.each([
    ['legacy author detail', 'author-detail', 'bad-id'],
    ['hmr author detail', 'hmr-author-detail', 'bad-id'],
    ['hmr post detail', 'hmr-post-detail', 'featured-post'],
    ['hmr discussion detail', 'hmr-discussion-detail', 'discussion-slug'],
    ['hmr schedule detail', 'hmr-schedule-detail', 'schedule-preview-live'],
  ])('redirects invalid %s public resource ids to not found', async (_label, name, id) => {
    const auth = makeAuth()

    await expect(
      resolveHmrRouteGuard(
        makeRoute({
          name,
          params: { id },
        }),
        auth
      )
    ).resolves.toEqual({
      name: 'hmr-not-found',
    })
  })

  it.each([
    ['hmr-post-detail', `/posts/${VALID_RESOURCE_ID}`],
    ['hmr-discussion-detail', `/community/discussions/${VALID_RESOURCE_ID}`],
    ['hmr-schedule-detail', `/schedule/${VALID_RESOURCE_ID}`],
  ])('allows valid %s public resource ids', async (name, path) => {
    const auth = makeAuth(false)

    await expect(
      resolveHmrRouteGuard(
        makeRoute({
          fullPath: path,
          name,
          params: { id: VALID_RESOURCE_ID },
          path,
        }),
        auth
      )
    ).resolves.toBe(true)
  })

  it('redirects unauthenticated protected routes to login with the original path', async () => {
    const auth = makeAuth(false)

    await expect(
      resolveHmrRouteGuard(
        makeRoute({
          fullPath: '/profile/security?tab=keys',
          meta: { requiresAuth: true },
          name: 'hmr-profile-section',
          path: '/profile/security',
        }),
        auth
      )
    ).resolves.toEqual({
      path: '/login',
      query: { redirect: '/profile/security?tab=keys' },
    })
  })

  it('redirects authenticated login and register routes to a sanitized target', async () => {
    const auth = makeAuth(true)

    await expect(
      resolveHmrRouteGuard(
        makeRoute({
          name: 'hmr-login',
          path: '/login',
          query: { redirect: '//evil.example' },
        }),
        auth
      )
    ).resolves.toBe('/profile')
  })

  it('redirects authenticated auth-entry routes to the nested non-auth target', async () => {
    const auth = makeAuth(true)

    await expect(
      resolveHmrRouteGuard(
        makeRoute({
          name: 'hmr-register',
          path: '/register',
          query: { redirect: '/login?redirect=/profile' },
        }),
        auth
      )
    ).resolves.toBe('/profile')

    await expect(
      resolveHmrRouteGuard(
        makeRoute({
          name: 'hmr-login',
          path: '/login',
          query: { redirect: '/register?redirect=/settings' },
        }),
        auth
      )
    ).resolves.toBe('/settings')
  })

  it('allows ordinary public routes', async () => {
    const auth = makeAuth(false)

    await expect(resolveHmrRouteGuard(makeRoute({ path: '/explore' }), auth)).resolves.toBe(true)
  })
})
