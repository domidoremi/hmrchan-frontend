const SAMPLE_POST_ROUTE_TOKEN = '__SAMPLE_POST__'
const SAMPLE_DISCUSSION_ROUTE_TOKEN = '__SAMPLE_DISCUSSION__'
const DEFAULT_SAMPLE_POST_ROUTE = '/posts/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10'
const DEFAULT_SAMPLE_DISCUSSION_ROUTE =
  '/community/discussions/018f7da0-0c13-7c5f-a3b2-50d09d31a100'

const SEO_CRITICAL_PATHS = new Set([
  '/',
  '/explore',
  '/community',
  '/login',
  SAMPLE_POST_ROUTE_TOKEN,
  SAMPLE_DISCUSSION_ROUTE_TOKEN,
  '/this-route-does-not-exist',
])

const EDGE_CRITICAL_PATHS = new Set([
  '/login',
  '/profile',
  '/favorites',
  '/profile/favorites',
  '/profile/history',
  '/profile/security',
  '/profile/preferences',
  '/profile/inbox',
  SAMPLE_POST_ROUTE_TOKEN,
  SAMPLE_DISCUSSION_ROUTE_TOKEN,
])

export {
  DEFAULT_SAMPLE_DISCUSSION_ROUTE,
  DEFAULT_SAMPLE_POST_ROUTE,
  SAMPLE_DISCUSSION_ROUTE_TOKEN,
  SAMPLE_POST_ROUTE_TOKEN,
}

export function buildProfileSectionShellSelector(sectionId) {
  return `[data-testid="profile-section-shell"][data-profile-section="${sectionId}"]`
}

function sortUniqueStrings(values) {
  return [
    ...new Set(values.filter((value) => typeof value === 'string' && value.length > 0)),
  ].sort()
}

function hasEdgeCriticalBehavior(route) {
  return Boolean(route.expectedPath) || EDGE_CRITICAL_PATHS.has(route.path)
}

function attachRouteContractMetadata(route) {
  const modeTag = route.mode === 'auth' ? 'authenticated' : 'public'
  const riskTags = [modeTag, ...(route.riskTags ?? [])]

  if (route.securityLevel === 'sensitive') {
    riskTags.push('sensitive')
  }

  if (SEO_CRITICAL_PATHS.has(route.path)) {
    riskTags.push('seo-critical')
  }

  if (hasEdgeCriticalBehavior(route)) {
    riskTags.push('edge-critical')
  }

  const includeInProductionReport =
    route.includeInProductionReport ??
    (route.mode === 'auth' && route.includeInManualRunner !== false)

  return Object.freeze({
    ...route,
    riskTags: Object.freeze(sortUniqueStrings(riskTags)),
    includeInProductionReport,
  })
}

const GUEST_BROWSER_ROUTE_DEFINITIONS = Object.freeze(
  [
    {
      name: 'home route',
      path: '/',
      mode: 'guest',
      shellSelector: '.hmr-route-page--home',
    },
    {
      name: 'explore route',
      path: '/explore',
      mode: 'guest',
      shellSelector: '.hmr-route-page--explore',
    },
    {
      name: 'community route',
      path: '/community',
      mode: 'guest',
      shellSelector: '.hmr-route-page--community',
    },
    { name: 'login route', path: '/login', mode: 'guest', shellSelector: '.hmr-auth-page' },
    {
      name: 'sample post route',
      path: SAMPLE_POST_ROUTE_TOKEN,
      mode: 'guest',
      shellSelector: '.hmr-detail--reader',
      sampleDataPolicy: 'data-dependent',
    },
    {
      name: 'sample discussion route',
      path: SAMPLE_DISCUSSION_ROUTE_TOKEN,
      mode: 'guest',
      shellSelector: '.discussion-detail-page',
      sampleDataPolicy: 'data-dependent',
    },
    {
      name: 'profile redirect to login',
      path: '/profile',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'favorites redirect to login',
      path: '/favorites',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile favorites redirect to login',
      path: '/profile/favorites',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile comments redirect to login',
      path: '/profile/comments',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile likes redirect to login',
      path: '/profile/likes',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile comment favorites redirect to login',
      path: '/profile/comment-favorites',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile history redirect to login',
      path: '/profile/history',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile reports redirect to login',
      path: '/profile/reports',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile followers redirect to login',
      path: '/profile/followers',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile following redirect to login',
      path: '/profile/following',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile blocked redirect to login',
      path: '/profile/blocked',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile security redirect to login',
      path: '/profile/security',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile security activity redirect to login',
      path: '/profile/security-activity',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile settings redirect to login',
      path: '/profile/settings',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile notifications redirect to login',
      path: '/profile/notifications',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile devices redirect to login',
      path: '/profile/devices',
      mode: 'guest',
      shellSelector: '.hmr-auth-page',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'not found route',
      path: '/this-route-does-not-exist',
      mode: 'guest',
      shellSelector: '.hmr-panel-hero',
    },
  ].map(attachRouteContractMetadata)
)

const AUTHENTICATED_ROUTE_DEFINITIONS = Object.freeze(
  [
    {
      name: 'profile overview',
      path: '/profile',
      mode: 'auth',
      shellSelector: '.hmr-profile-page',
      expectedTitleKey: 'nav.profile',
      runnerReadinessSelectorsAny: ['.hmr-story-stack', '.hmr-list', '.hmr-profile-security'],
    },
    {
      name: 'favorites redirect',
      path: '/favorites',
      mode: 'auth',
      sectionId: 'favorites',
      shellSelector: buildProfileSectionShellSelector('favorites'),
      expectedPath: '/profile/favorites',
      expectedTitleKey: 'nav.profile',
      readinessSelectorsAll: ['[data-testid="profile-favorites-tab"]'],
      runnerReadinessSelectorsAny: ['.hmr-story-stack', '.hmr-list', '.hmr-profile-security'],
    },
    {
      name: 'profile favorites',
      path: '/profile/favorites',
      mode: 'auth',
      sectionId: 'favorites',
      shellSelector: buildProfileSectionShellSelector('favorites'),
      expectedTitleKey: 'nav.profile',
      readinessSelectorsAll: ['[data-testid="profile-favorites-tab"]'],
      runnerReadinessSelectorsAny: ['.hmr-story-stack', '.hmr-list', '.hmr-profile-security'],
    },
    {
      name: 'profile preferences',
      path: '/profile/preferences',
      mode: 'auth',
      sectionId: 'preferences',
      shellSelector: buildProfileSectionShellSelector('preferences'),
      expectedTitleKey: 'nav.profile',
      readinessSelectorsAll: ['[data-testid="profile-preferences-tab"]'],
      runnerReadinessSelectorsAny: ['.hmr-story-stack', '.hmr-list', '.hmr-profile-security'],
    },
    {
      name: 'profile history',
      path: '/profile/history',
      mode: 'auth',
      sectionId: 'history',
      shellSelector: buildProfileSectionShellSelector('history'),
      expectedTitleKey: 'nav.profile',
      readinessSelectorsAll: ['[data-testid="profile-history-tab"]'],
      runnerReadinessSelectorsAny: ['.hmr-story-stack', '.hmr-list', '.hmr-profile-security'],
    },
    {
      name: 'profile inbox',
      path: '/profile/inbox',
      mode: 'auth',
      sectionId: 'inbox',
      shellSelector: buildProfileSectionShellSelector('inbox'),
      expectedTitleKey: 'nav.profile',
      readinessSelectorsAll: ['[data-testid="profile-inbox-tab"]'],
      runnerReadinessSelectorsAny: ['.hmr-story-stack', '.hmr-list', '.hmr-profile-security'],
    },
    {
      name: 'profile security',
      path: '/profile/security',
      mode: 'auth',
      securityLevel: 'sensitive',
      sectionId: 'security',
      shellSelector: buildProfileSectionShellSelector('security'),
      expectedTitleKey: 'nav.profile',
      readinessSelectorsAll: ['[data-testid="profile-security-tab"]'],
      runnerReadinessSelectorsAny: ['.hmr-story-stack', '.hmr-list', '.hmr-profile-security'],
    },
    {
      name: 'authenticated sample post',
      path: SAMPLE_POST_ROUTE_TOKEN,
      mode: 'auth',
      shellSelector: '.hmr-detail--reader',
      readinessSelectorsAll: ['.hmr-detail-reader-hero'],
      readinessSelectorsAny: ['.hmr-detail-comment-list'],
      includeInManualRunner: false,
      sampleDataPolicy: 'data-dependent',
    },
    {
      name: 'authenticated sample discussion',
      path: SAMPLE_DISCUSSION_ROUTE_TOKEN,
      mode: 'auth',
      shellSelector: '.discussion-detail-page',
      readinessSelectorsAll: ['.discussion-comments', '[data-testid="comment-thread-header"]'],
      readinessSelectorsAny: ['[data-testid="discussion-comment-composer"]'],
      includeInManualRunner: false,
      sampleDataPolicy: 'data-dependent',
    },
  ].map(attachRouteContractMetadata)
)

export function getGuestBrowserRouteDefinitions() {
  return GUEST_BROWSER_ROUTE_DEFINITIONS.map((route) => ({
    ...route,
    riskTags: [...route.riskTags],
  }))
}

export function getAuthenticatedRouteDefinitions() {
  return AUTHENTICATED_ROUTE_DEFINITIONS.map((route) => ({
    ...route,
    riskTags: [...route.riskTags],
  }))
}

function resolveRoutePath(route, samplePostRoute, sampleDiscussionRoute) {
  if (route.path === SAMPLE_POST_ROUTE_TOKEN) {
    return samplePostRoute
  }
  if (route.path === SAMPLE_DISCUSSION_ROUTE_TOKEN) {
    return sampleDiscussionRoute
  }
  return route.path
}

export function getSmokeRouteMatrix({
  samplePostRoute = DEFAULT_SAMPLE_POST_ROUTE,
  sampleDiscussionRoute = DEFAULT_SAMPLE_DISCUSSION_ROUTE,
} = {}) {
  const resolve = (route) => ({
    ...route,
    path: resolveRoutePath(route, samplePostRoute, sampleDiscussionRoute),
  })

  return {
    guest: getGuestBrowserRouteDefinitions().map(resolve),
    auth: getAuthenticatedRouteDefinitions().map(resolve),
  }
}

export function getManualRunnerProtectedRoutes() {
  return getAuthenticatedRouteDefinitions().filter((route) => route.includeInManualRunner !== false)
}

export function getReleaseRouteContractOverview() {
  const guest = getGuestBrowserRouteDefinitions()
  const auth = getAuthenticatedRouteDefinitions()
  const allRoutes = [...guest, ...auth]
  const manualRunner = getManualRunnerProtectedRoutes()
  const profileRoutes = auth.filter(
    (route) => route.path === '/favorites' || route.path.startsWith('/profile')
  )
  const detailReadinessRoutes = auth.filter(
    (route) =>
      route.path === SAMPLE_POST_ROUTE_TOKEN || route.path === SAMPLE_DISCUSSION_ROUTE_TOKEN
  )
  const productionReportRoutes = allRoutes.filter((route) => route.includeInProductionReport)
  const riskTagCounts = Object.fromEntries(
    sortUniqueStrings(allRoutes.flatMap((route) => route.riskTags)).map((tag) => [
      tag,
      allRoutes.filter((route) => route.riskTags.includes(tag)).length,
    ])
  )

  return {
    guestRouteCount: guest.length,
    authRouteCount: auth.length,
    manualRunnerRouteCount: manualRunner.length,
    profileRouteCount: profileRoutes.length,
    detailReadinessRouteCount: detailReadinessRoutes.length,
    productionReportRouteCount: productionReportRoutes.length,
    riskTagCounts,
    manualRunnerRouteNames: manualRunner.map((route) => route.name),
    profileRouteNames: profileRoutes.map((route) => route.name),
    detailReadinessRouteNames: detailReadinessRoutes.map((route) => route.name),
    productionReportRouteNames: productionReportRoutes.map((route) => route.name),
  }
}

export function validateReleaseRouteContract() {
  const issues = []
  const guestRoutes = getGuestBrowserRouteDefinitions()
  const authRoutes = getAuthenticatedRouteDefinitions()
  const allRoutes = [...guestRoutes, ...authRoutes]
  const favoritesRedirects = authRoutes.filter((route) => route.path === '/favorites')
  const profileSectionRoutes = authRoutes.filter((route) => route.sectionId)
  const detailRoutes = authRoutes.filter(
    (route) =>
      route.path === SAMPLE_POST_ROUTE_TOKEN || route.path === SAMPLE_DISCUSSION_ROUTE_TOKEN
  )

  if (favoritesRedirects.length !== 1) {
    issues.push({
      code: 'favorites-redirect-count',
      message: `Expected exactly one /favorites redirect rule, found ${favoritesRedirects.length}`,
    })
  } else if (favoritesRedirects[0].expectedPath !== '/profile/favorites') {
    issues.push({
      code: 'favorites-redirect-target',
      message: `Expected /favorites to redirect to /profile/favorites, got ${favoritesRedirects[0].expectedPath ?? 'missing'}`,
    })
  }

  for (const route of profileSectionRoutes) {
    if (route.path.startsWith('/profile/') || route.path === '/favorites') {
      const expectedShell = buildProfileSectionShellSelector(route.sectionId)
      const usesProfileSectionShell = route.shellSelector === expectedShell
      const isStandaloneProfilePage = [
        '/profile/security',
        '/profile/security-activity',
        '/profile/devices',
        '/profile/settings',
        '/profile/notifications',
      ].includes(route.path)

      if (!usesProfileSectionShell && !isStandaloneProfilePage) {
        issues.push({
          code: 'profile-shell-selector',
          message: `${route.name} should use ${expectedShell}, got ${route.shellSelector}`,
        })
      }
    }
  }

  for (const route of authRoutes.filter(
    (entry) => entry.path.startsWith('/profile/') && entry.path !== '/profile'
  )) {
    if (!route.sectionId) {
      issues.push({
        code: 'missing-profile-section-id',
        message: `${route.name} is missing sectionId`,
      })
    }
  }

  for (const route of detailRoutes) {
    if (
      (route.readinessSelectorsAll?.length ?? 0) + (route.readinessSelectorsAny?.length ?? 0) ===
      0
    ) {
      issues.push({
        code: 'missing-detail-readiness',
        message: `${route.name} must declare at least one readiness selector`,
      })
    }
  }

  for (const route of allRoutes) {
    if (!Array.isArray(route.riskTags) || route.riskTags.length === 0) {
      issues.push({
        code: 'missing-risk-tags',
        message: `${route.name} must declare at least one risk tag`,
      })
    }

    if (typeof route.includeInProductionReport !== 'boolean') {
      issues.push({
        code: 'missing-production-report-flag',
        message: `${route.name} must declare includeInProductionReport as a boolean`,
      })
    }
  }

  return issues
}
