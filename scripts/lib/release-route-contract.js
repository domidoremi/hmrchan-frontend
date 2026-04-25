const SAMPLE_POST_ROUTE_TOKEN = '__SAMPLE_POST__'
const SAMPLE_DISCUSSION_ROUTE_TOKEN = '__SAMPLE_DISCUSSION__'
const DEFAULT_SAMPLE_POST_ROUTE = '/post/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10'
const DEFAULT_SAMPLE_DISCUSSION_ROUTE =
  '/community/discussions/018f7da0-0c13-7c5f-a3b2-50d09d31a100'

const SEO_CRITICAL_PATHS = new Set([
  '/',
  '/explore',
  '/authors',
  '/community',
  '/search',
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
  '/profile/comments',
  '/profile/likes',
  '/profile/comment-favorites',
  '/profile/history',
  '/profile/reports',
  '/profile/followers',
  '/profile/following',
  '/profile/blocked',
  '/profile/security',
  '/profile/security-activity',
  '/profile/settings',
  '/profile/notifications',
  '/profile/devices',
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
    { name: 'home route', path: '/', mode: 'guest', shellSelector: '.home-page' },
    { name: 'explore route', path: '/explore', mode: 'guest', shellSelector: '.explore-page' },
    { name: 'search route', path: '/search', mode: 'guest', shellSelector: '.search-page' },
    { name: 'authors route', path: '/authors', mode: 'guest', shellSelector: '.authors-page' },
    {
      name: 'community route',
      path: '/community',
      mode: 'guest',
      shellSelector: '.community-page',
    },
    { name: 'login route', path: '/login', mode: 'guest', shellSelector: '.auth-page--login' },
    {
      name: 'sample post route',
      path: SAMPLE_POST_ROUTE_TOKEN,
      mode: 'guest',
      shellSelector: '.post-detail-page',
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
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'favorites redirect to login',
      path: '/favorites',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile favorites redirect to login',
      path: '/profile/favorites',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile comments redirect to login',
      path: '/profile/comments',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile likes redirect to login',
      path: '/profile/likes',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile comment favorites redirect to login',
      path: '/profile/comment-favorites',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile history redirect to login',
      path: '/profile/history',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile reports redirect to login',
      path: '/profile/reports',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile followers redirect to login',
      path: '/profile/followers',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile following redirect to login',
      path: '/profile/following',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile blocked redirect to login',
      path: '/profile/blocked',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile security redirect to login',
      path: '/profile/security',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile security activity redirect to login',
      path: '/profile/security-activity',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile settings redirect to login',
      path: '/profile/settings',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile notifications redirect to login',
      path: '/profile/notifications',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'profile devices redirect to login',
      path: '/profile/devices',
      mode: 'guest',
      shellSelector: '.auth-page--login',
      expectedPath: '/login',
      expectedCanonicalPath: '/login',
    },
    {
      name: 'not found route',
      path: '/this-route-does-not-exist',
      mode: 'guest',
      shellSelector: '.not-found-page',
    },
  ].map(attachRouteContractMetadata)
)

const AUTHENTICATED_ROUTE_DEFINITIONS = Object.freeze(
  [
    {
      name: 'profile overview',
      path: '/profile',
      mode: 'auth',
      shellSelector: '.profile-page',
      expectedTitleKey: 'nav.profile',
      runnerReadinessSelectorsAny: ['.profile-overview', '.profile-group__grid', '.summary-card'],
    },
    {
      name: 'favorites redirect',
      path: '/favorites',
      mode: 'auth',
      sectionId: 'favorites',
      shellSelector: buildProfileSectionShellSelector('favorites'),
      expectedPath: '/profile/favorites',
      expectedTitleKey: 'profile.tabs.favorites',
      readinessSelectorsAll: ['[data-testid="profile-favorites-tab"]'],
      runnerReadinessSelectorsAny: [
        '.posts-masonry',
        '.posts-grid',
        '.loading-indicator',
        '.state-indicator',
      ],
    },
    {
      name: 'profile favorites',
      path: '/profile/favorites',
      mode: 'auth',
      sectionId: 'favorites',
      shellSelector: buildProfileSectionShellSelector('favorites'),
      expectedTitleKey: 'profile.tabs.favorites',
      readinessSelectorsAll: ['[data-testid="profile-favorites-tab"]'],
      runnerReadinessSelectorsAny: [
        '.posts-masonry',
        '.posts-grid',
        '.loading-indicator',
        '.state-indicator',
      ],
    },
    {
      name: 'profile comments',
      path: '/profile/comments',
      mode: 'auth',
      sectionId: 'comments',
      shellSelector: buildProfileSectionShellSelector('comments'),
      expectedTitleKey: 'profile.tabs.comments',
      readinessSelectorsAll: ['[data-testid="profile-comments-tab"]'],
      runnerReadinessSelectorsAny: [
        '.timeline',
        '.skeleton-timeline',
        '.state-indicator',
        '.timeline-item',
      ],
    },
    {
      name: 'profile likes',
      path: '/profile/likes',
      mode: 'auth',
      sectionId: 'likes',
      shellSelector: buildProfileSectionShellSelector('likes'),
      expectedTitleKey: 'profile.tabs.likes',
      readinessSelectorsAll: ['[data-testid="profile-likes-tab"]'],
      runnerReadinessSelectorsAny: [
        '.timeline',
        '.loading-skeleton',
        '.state-indicator',
        '.timeline-item',
      ],
    },
    {
      name: 'profile comment favorites',
      path: '/profile/comment-favorites',
      mode: 'auth',
      sectionId: 'comment-favorites',
      shellSelector: buildProfileSectionShellSelector('comment-favorites'),
      expectedTitleKey: 'profile.tabs.commentFavorites',
      readinessSelectorsAll: ['[data-testid="profile-comment-favorites-tab"]'],
      runnerReadinessSelectorsAny: [
        '.timeline',
        '.loading-skeleton',
        '.state-indicator',
        '.timeline-item',
      ],
    },
    {
      name: 'profile history',
      path: '/profile/history',
      mode: 'auth',
      sectionId: 'history',
      shellSelector: buildProfileSectionShellSelector('history'),
      expectedTitleKey: 'profile.tabs.history',
      readinessSelectorsAll: ['[data-testid="profile-history-tab"]'],
      runnerReadinessSelectorsAny: [
        '.history-groups',
        '.history-skeleton',
        '.state-indicator',
        '.group-grid',
      ],
    },
    {
      name: 'profile reports',
      path: '/profile/reports',
      mode: 'auth',
      sectionId: 'reports',
      shellSelector: buildProfileSectionShellSelector('reports'),
      expectedTitleKey: 'profile.tabs.reports',
      readinessSelectorsAll: ['[data-testid="profile-reports-tab"]'],
      runnerReadinessSelectorsAny: [
        '.reports-list',
        '.reports-skeleton',
        '.state-indicator',
        '.report-card',
      ],
    },
    {
      name: 'profile followers',
      path: '/profile/followers',
      mode: 'auth',
      sectionId: 'followers',
      shellSelector: buildProfileSectionShellSelector('followers'),
      expectedTitleKey: 'profile.tabs.followers',
      readinessSelectorsAll: [
        '[data-testid="profile-relations-tab"][data-profile-relations-mode="followers"]',
      ],
      runnerReadinessSelectorsAny: [
        '.relations-list',
        '.relations-skeleton',
        '.state-indicator',
        '.relation-card',
      ],
    },
    {
      name: 'profile following',
      path: '/profile/following',
      mode: 'auth',
      sectionId: 'following',
      shellSelector: buildProfileSectionShellSelector('following'),
      expectedTitleKey: 'profile.tabs.following',
      readinessSelectorsAll: [
        '[data-testid="profile-relations-tab"][data-profile-relations-mode="following"]',
      ],
      runnerReadinessSelectorsAny: [
        '.relations-list',
        '.relations-skeleton',
        '.state-indicator',
        '.relation-card',
      ],
    },
    {
      name: 'profile blocked',
      path: '/profile/blocked',
      mode: 'auth',
      sectionId: 'blocked',
      shellSelector: buildProfileSectionShellSelector('blocked'),
      expectedTitleKey: 'profile.tabs.blocked',
      readinessSelectorsAll: [
        '[data-testid="profile-relations-tab"][data-profile-relations-mode="blocked"]',
      ],
      runnerReadinessSelectorsAny: [
        '.relations-list',
        '.relations-skeleton',
        '.state-indicator',
        '.relation-card',
      ],
    },
    {
      name: 'profile security',
      path: '/profile/security',
      mode: 'auth',
      securityLevel: 'sensitive',
      sectionId: 'security',
      shellSelector: '[data-testid="profile-security-page"]',
      expectedTitleKey: 'profile.securityHubTitle',
      readinessSelectorsAll: ['[data-testid="profile-security-page"]'],
      runnerReadinessSelectorsAny: [
        '[data-testid="profile-security-credentials"]',
        '[data-testid="profile-devices-management"]',
        '[data-testid="profile-security-tab"]',
      ],
    },
    {
      name: 'profile security activity',
      path: '/profile/security-activity',
      mode: 'auth',
      securityLevel: 'sensitive',
      sectionId: 'security',
      shellSelector: '[data-testid="profile-security-page"]',
      expectedPath: '/profile/security#activity',
      expectedTitleKey: 'profile.securityHubTitle',
      readinessSelectorsAll: ['[data-testid="profile-security-tab"]'],
      runnerReadinessSelectorsAny: [
        '[data-testid="profile-security-credentials"]',
        '[data-testid="profile-security-tab"]',
      ],
    },
    {
      name: 'profile settings',
      path: '/profile/settings',
      mode: 'auth',
      securityLevel: 'sensitive',
      sectionId: 'settings',
      shellSelector: '.settings-page',
      expectedTitleKey: 'nav.profileSettings',
      runnerReadinessSelectorsAny: ['.settings-overview', '.settings-section'],
    },
    {
      name: 'profile notifications',
      path: '/profile/notifications',
      mode: 'auth',
      sectionId: 'notifications',
      shellSelector: '[data-testid="profile-notifications-page"]',
      expectedTitleKey: 'profile.tabs.notifications',
      readinessSelectorsAll: ['[data-testid="profile-notifications-tab"]'],
      runnerReadinessSelectorsAny: [
        '.notifications-overview',
        '.notifications-list',
        '.state-indicator',
      ],
    },
    {
      name: 'profile devices',
      path: '/profile/devices',
      mode: 'auth',
      securityLevel: 'sensitive',
      sectionId: 'security',
      shellSelector: '[data-testid="profile-security-page"]',
      expectedPath: '/profile/security#devices',
      expectedTitleKey: 'profile.securityHubTitle',
      readinessSelectorsAll: ['[data-testid="profile-devices-management"]'],
      runnerReadinessSelectorsAny: [
        '[data-testid="profile-devices-management"]',
        '[data-testid="profile-security-credentials"]',
      ],
    },
    {
      name: 'authenticated sample post',
      path: SAMPLE_POST_ROUTE_TOKEN,
      mode: 'auth',
      shellSelector: '.post-detail-page',
      readinessSelectorsAll: ['.post-comments', '[data-testid="comment-thread-header"]'],
      readinessSelectorsAny: ['[data-testid="comment-composer"]'],
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
