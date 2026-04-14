import { describe, expect, it } from 'vitest'

import {
  buildProfileSectionShellSelector,
  getAuthenticatedRouteDefinitions,
  getManualRunnerProtectedRoutes,
  getReleaseRouteContractOverview,
  getSmokeRouteMatrix,
  validateReleaseRouteContract,
} from '../../../scripts/lib/release-route-contract.js'

describe('release route contract', () => {
  it('validates the shared contract without drift', () => {
    expect(validateReleaseRouteContract()).toEqual([])
  })

  it('resolves sample route placeholders for smoke route matrices', () => {
    const matrix = getSmokeRouteMatrix({
      samplePostRoute: '/post/sample-post',
      sampleDiscussionRoute: '/community/discussions/sample-discussion',
    })

    expect(matrix.guest.some((route) => route.path === '/post/sample-post')).toBe(true)
    expect(
      matrix.auth.some((route) => route.path === '/community/discussions/sample-discussion')
    ).toBe(true)
  })

  it('keeps profile section routes aligned with section shell selectors', () => {
    const standaloneProfilePages = new Set([
      '/profile/settings',
      '/profile/notifications',
      '/profile/devices',
    ])
    const routes = getAuthenticatedRouteDefinitions().filter((route) => route.sectionId)

    for (const route of routes) {
      if (standaloneProfilePages.has(route.path)) continue
      expect(route.shellSelector).toBe(buildProfileSectionShellSelector(route.sectionId!))
    }
  })

  it('keeps a single favorites redirect rule and excludes detail routes from manual runner coverage', () => {
    const authRoutes = getAuthenticatedRouteDefinitions()
    const favoritesRedirects = authRoutes.filter((route) => route.path === '/favorites')
    const manualRunnerRoutes = getManualRunnerProtectedRoutes()

    expect(favoritesRedirects).toHaveLength(1)
    expect(favoritesRedirects[0].expectedPath).toBe('/profile/favorites')
    expect(manualRunnerRoutes.some((route) => route.name === 'authenticated sample post')).toBe(
      false
    )
    expect(
      manualRunnerRoutes.some((route) => route.name === 'authenticated sample discussion')
    ).toBe(false)
  })

  it('tracks route coverage counts for smoke and manual runner consumers', () => {
    const overview = getReleaseRouteContractOverview()

    expect(overview.guestRouteCount).toBeGreaterThan(5)
    expect(overview.authRouteCount).toBeGreaterThan(10)
    expect(overview.manualRunnerRouteCount).toBeGreaterThan(10)
    expect(overview.detailReadinessRouteCount).toBe(2)
  })
})
