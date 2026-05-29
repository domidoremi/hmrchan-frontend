import { describe, expect, it } from 'vitest'

import router from '../index'
import {
  CONTRACT_RESOURCE_ROUTE_NAMES,
  ROUTE_ID_PARAM_EXEMPTIONS,
  buildLoginRedirect,
  getContractResourceRouteId,
  isContractResourceRouteName,
  resolveInvalidContractResourceRedirect,
  resolveRouteAuthStoreLoadPolicy,
  resolveRouteSecurityLevel,
  resolveUnauthenticatedRouteRedirect,
  shouldRedirectAuthenticatedGuestRoute,
  shouldRejectInvalidContractResourceRoute,
  toNotFoundParams,
} from '../routeSecurityPolicy'

const VALID_CONTRACT_ID = '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10'

describe('route security policy', () => {
  it('guards all contract resource detail route names', () => {
    expect([...CONTRACT_RESOURCE_ROUTE_NAMES]).toEqual([
      'post-detail',
      'author-detail',
      'discussion-detail',
      'user-public-profile',
      'passkey-recovery-detail',
    ])

    for (const name of CONTRACT_RESOURCE_ROUTE_NAMES) {
      expect(isContractResourceRouteName(name)).toBe(true)
    }
  })

  it('requires named id-param routes to be guarded or explicitly exempt', () => {
    const unresolvedRoutes = router
      .getRoutes()
      .filter((route) => route.name && route.path.includes(':id'))
      .map((route) => String(route.name))
      .filter((name) => !isContractResourceRouteName(name) && !(name in ROUTE_ID_PARAM_EXEMPTIONS))

    expect(unresolvedRoutes).toEqual([])
  })

  it('rejects missing, placeholder, and non-contract ids only on guarded routes', () => {
    for (const badId of [undefined, null, 'undefined', 'null', '42', 'event-1', ['42']]) {
      expect(
        shouldRejectInvalidContractResourceRoute({
          name: 'post-detail',
          params: { id: badId },
        })
      ).toBe(true)
    }

    expect(
      shouldRejectInvalidContractResourceRoute({
        name: 'post-detail',
        params: { id: VALID_CONTRACT_ID },
      })
    ).toBe(false)

    expect(
      shouldRejectInvalidContractResourceRoute({
        name: 'schedule-detail',
        params: { id: 'event-1' },
      })
    ).toBe(false)
  })

  it('uses the first array route parameter value for contract validation', () => {
    expect(getContractResourceRouteId({ params: { id: [VALID_CONTRACT_ID, 'ignored'] } })).toBe(
      VALID_CONTRACT_ID
    )

    expect(
      shouldRejectInvalidContractResourceRoute({
        name: 'author-detail',
        params: { id: [VALID_CONTRACT_ID, 'ignored'] },
      })
    ).toBe(false)
  })

  it('builds not-found redirects for invalid contract resource routes', () => {
    expect(toNotFoundParams('/post/42')).toEqual({ pathMatch: ['post', '42'] })
    expect(toNotFoundParams('/')).toEqual({ pathMatch: [] })

    expect(
      resolveInvalidContractResourceRedirect({
        name: 'post-detail',
        path: '/post/42',
        params: { id: '42' },
        query: { from: 'guard' },
        hash: '#comments',
      })
    ).toEqual({
      name: 'not-found',
      params: { pathMatch: ['post', '42'] },
      query: { from: 'guard' },
      hash: '#comments',
    })

    expect(
      resolveInvalidContractResourceRedirect({
        name: 'post-detail',
        path: `/post/${VALID_CONTRACT_ID}`,
        params: { id: VALID_CONTRACT_ID },
        query: { from: 'guard' },
        hash: '#comments',
      })
    ).toBeNull()
  })

  it('resolves route auth store loading from security metadata', () => {
    expect(resolveRouteSecurityLevel({ meta: {} })).toBe('public')
    expect(resolveRouteSecurityLevel({ meta: { requiresAuth: true } })).toBe('authenticated')
    expect(resolveRouteSecurityLevel({ meta: { securityLevel: 'sensitive' } })).toBe('sensitive')

    expect(resolveRouteAuthStoreLoadPolicy({ meta: {} })).toEqual({
      load: false,
      initialize: false,
    })
    expect(resolveRouteAuthStoreLoadPolicy({ meta: { guestOnly: true } })).toEqual({
      load: true,
      initialize: false,
    })
    expect(resolveRouteAuthStoreLoadPolicy({ meta: { securityLevel: 'authenticated' } })).toEqual({
      load: true,
      initialize: true,
    })
    expect(resolveRouteAuthStoreLoadPolicy({ meta: { securityLevel: 'sensitive' } })).toEqual({
      load: true,
      initialize: true,
    })
  })

  it('resolves login and guest redirects as pure route auth policy', () => {
    expect(buildLoginRedirect('/profile/security?tab=mfa')).toEqual({
      path: '/login',
      query: { redirect: '/profile/security?tab=mfa' },
    })
    expect(
      resolveUnauthenticatedRouteRedirect({
        route: {
          fullPath: '/profile',
          meta: { requiresAuth: true },
        },
        isAuthenticated: false,
      })
    ).toEqual({
      path: '/login',
      query: { redirect: '/profile' },
    })
    expect(
      resolveUnauthenticatedRouteRedirect({
        route: {
          fullPath: '/profile/security',
          meta: { securityLevel: 'sensitive' },
        },
        isAuthenticated: false,
      })
    ).toEqual({
      path: '/login',
      query: { redirect: '/profile/security' },
    })
    expect(
      resolveUnauthenticatedRouteRedirect({
        route: {
          fullPath: '/profile/security',
          meta: { securityLevel: 'sensitive' },
        },
        isAuthenticated: true,
      })
    ).toBeNull()

    expect(
      shouldRedirectAuthenticatedGuestRoute({
        guestOnly: true,
        isAuthenticated: true,
        sensitiveReauthLogin: false,
      })
    ).toBe(true)
    expect(
      shouldRedirectAuthenticatedGuestRoute({
        guestOnly: true,
        isAuthenticated: true,
        sensitiveReauthLogin: true,
      })
    ).toBe(false)
  })

  it('redirects invalid contract resource navigation to not found with query state preserved', async () => {
    await router.push('/post/42?from=guard')

    expect(router.currentRoute.value.name).toBe('not-found')
    expect(router.currentRoute.value.params.pathMatch).toEqual(['post', '42'])
    expect(router.currentRoute.value.query).toEqual({ from: 'guard' })
  })
})
