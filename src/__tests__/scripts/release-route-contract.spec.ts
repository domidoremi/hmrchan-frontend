import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SAMPLE_DISCUSSION_ROUTE,
  DEFAULT_SAMPLE_POST_ROUTE,
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

  it('uses the repository default sample detail routes when callers omit overrides', () => {
    const matrix = getSmokeRouteMatrix()

    expect(matrix.guest.some((route) => route.path === DEFAULT_SAMPLE_POST_ROUTE)).toBe(true)
    expect(matrix.auth.some((route) => route.path === DEFAULT_SAMPLE_DISCUSSION_ROUTE)).toBe(true)
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

  it('keeps detail readiness aligned with lazy comments and discussion thread mounting', () => {
    const [postRoute, discussionRoute] = getAuthenticatedRouteDefinitions().filter((route) =>
      ['authenticated sample post', 'authenticated sample discussion'].includes(route.name)
    )

    expect(postRoute?.readinessSelectorsAll).toEqual([
      '.post-comments',
      '[data-testid="comment-thread-header"]',
    ])
    expect(postRoute?.readinessSelectorsAny).toEqual(['[data-testid="comment-composer"]'])
    expect(discussionRoute?.readinessSelectorsAll).toEqual([
      '.discussion-comments',
      '[data-testid="comment-thread-header"]',
    ])
    expect(discussionRoute?.readinessSelectorsAny).toEqual([
      '[data-testid="discussion-comment-composer"]',
    ])
  })

  it('marks step-up profile routes as sensitive for local audit skip logic', () => {
    const sensitiveRoutes = getAuthenticatedRouteDefinitions()
      .filter((route) => route.securityLevel === 'sensitive')
      .map((route) => route.path)

    expect(sensitiveRoutes).toEqual(
      expect.arrayContaining([
        '/profile/security-activity',
        '/profile/settings',
        '/profile/devices',
      ])
    )
  })
})
