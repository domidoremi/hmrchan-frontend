import { describe, expect, it } from 'vitest'
import type { RouteRecordNormalized } from 'vue-router'

import router from '../index'

const SECURITY_LEVELS = new Set(['public', 'authenticated', 'sensitive'])
const DATA_SENSITIVITIES = new Set(['none', 'profile', 'security'])
const SAMPLE_ROUTE_PARAMS: Record<string, string | string[]> = {
  id: '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10',
  pathMatch: ['missing'],
}

function buildRouteParams(route: RouteRecordNormalized): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}
  const paramNames = route.path.matchAll(/:([A-Za-z0-9_]+)/g)

  for (const match of paramNames) {
    const name = match[1]
    params[name] = SAMPLE_ROUTE_PARAMS[name] ?? 'test'
  }

  return params
}

function resolveNamedRoutes() {
  return router
    .getRoutes()
    .filter((route) => route.name)
    .map((route) => ({
      route,
      resolved: router.resolve({
        name: route.name,
        params: buildRouteParams(route),
      }),
    }))
}

describe('router meta contract', () => {
  it('provides security and data sensitivity metadata for every named route', () => {
    const missingSecurityMeta: string[] = []
    const missingSensitivityMeta: string[] = []

    for (const { route, resolved } of resolveNamedRoutes()) {
      const routeName = String(route.name)

      if (!SECURITY_LEVELS.has(String(resolved.meta.securityLevel))) {
        missingSecurityMeta.push(routeName)
      }

      if (!DATA_SENSITIVITIES.has(String(resolved.meta.dataSensitivity))) {
        missingSensitivityMeta.push(routeName)
      }
    }

    expect(missingSecurityMeta).toEqual([])
    expect(missingSensitivityMeta).toEqual([])
  })

  it('keeps sensitive account routes classified as security-sensitive', () => {
    const sensitiveRouteNames = [
      'profile-security',
      'profile-devices',
      'profile-settings',
      'profile-security-activity',
    ]

    for (const name of sensitiveRouteNames) {
      const resolved = router.resolve({ name })

      expect(resolved.meta.securityLevel).toBe('sensitive')
      expect(resolved.meta.dataSensitivity).toBe('security')
    }
  })

  it('keeps route auth flags aligned with security metadata', () => {
    const publicAuthenticatedRoutes: string[] = []
    const sensitiveRoutesWithoutAuth: string[] = []
    const guestRoutesWithSensitiveData: string[] = []

    for (const { route, resolved } of resolveNamedRoutes()) {
      const routeName = String(route.name)

      if (resolved.meta.requiresAuth && resolved.meta.securityLevel === 'public') {
        publicAuthenticatedRoutes.push(routeName)
      }

      if (resolved.meta.securityLevel === 'sensitive' && !resolved.meta.requiresAuth) {
        sensitiveRoutesWithoutAuth.push(routeName)
      }

      if (
        resolved.meta.guestOnly &&
        (resolved.meta.securityLevel !== 'public' || resolved.meta.dataSensitivity !== 'none')
      ) {
        guestRoutesWithSensitiveData.push(routeName)
      }
    }

    expect(publicAuthenticatedRoutes).toEqual([])
    expect(sensitiveRoutesWithoutAuth).toEqual([])
    expect(guestRoutesWithSensitiveData).toEqual([])
  })
})
