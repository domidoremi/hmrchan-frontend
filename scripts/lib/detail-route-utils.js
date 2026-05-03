function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const POST_DETAIL_ROUTE_PATTERN = /^\/post\/[^/?#]+$/i
const DISCUSSION_DETAIL_ROUTE_PATTERN = /^\/community\/discussions\/[^/?#]+$/i

function isDetailRoutePath(path) {
  return path.startsWith('/post/') || path.startsWith('/community/discussions/')
}

function getDetailRouteAnchorSelectors(path) {
  if (path.startsWith('/post/')) {
    return ['.post-comments']
  }
  if (path.startsWith('/community/discussions/')) {
    return ['.discussion-comments']
  }
  return []
}

function createSampleDetailSkipReason(label, classification, lastFailure) {
  const suffix =
    classification === 'data-dependent'
      ? `${lastFailure}; sample data is unavailable or no longer maps to a live public UUIDv7 resource`
      : lastFailure
  return `${label} unavailable (${classification}): ${suffix}; last probe: ${lastFailure}`
}

export async function ensureDetailRouteReadiness(page, route, options = {}) {
  const readinessSelectorsAll = route.readinessSelectorsAll ?? []
  const readinessSelectorsAny = route.readinessSelectorsAny ?? []
  const timeout = options.timeout ?? 15_000
  const scrollAttempts = options.scrollAttempts ?? 12

  if (
    isDetailRoutePath(route.path) &&
    (readinessSelectorsAll.length > 0 || readinessSelectorsAny.length > 0)
  ) {
    const anchorSelectors = getDetailRouteAnchorSelectors(route.path)

    for (let attempt = 0; attempt < scrollAttempts; attempt += 1) {
      const ready = await page.evaluate(
        ({ all, any }) => {
          const allMatched = all.every((selector) => Boolean(document.querySelector(selector)))
          const anyMatched =
            any.length === 0 || any.some((selector) => Boolean(document.querySelector(selector)))
          return allMatched && anyMatched
        },
        {
          all: readinessSelectorsAll,
          any: readinessSelectorsAny,
        }
      )

      if (ready) {
        break
      }

      const reachedBottom = await page.evaluate((anchors) => {
        const anchor = anchors
          .map((selector) => document.querySelector(selector))
          .find((node) => Boolean(node))

        if (anchor instanceof Element) {
          anchor.scrollIntoView({ block: 'center' })
        } else {
          const maxY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
          const nextY = Math.min(window.scrollY + Math.max(window.innerHeight * 0.9, 480), maxY)
          window.scrollTo({ top: nextY, behavior: 'auto' })
        }

        return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      }, anchorSelectors)

      await sleep(reachedBottom ? 400 : 250)
    }
  }

  for (const selector of readinessSelectorsAll) {
    await page.waitForSelector(selector, { timeout })
  }

  if (readinessSelectorsAny.length) {
    await page.waitForFunction(
      (selectors) => selectors.some((selector) => Boolean(document.querySelector(selector))),
      { timeout },
      readinessSelectorsAny
    )
  }
}

export function buildSampleRouteCandidates(requestedRoute, fallbackRoute) {
  return [...new Set([requestedRoute, fallbackRoute].filter(Boolean))]
}

function matchesRoutePattern(pathname, kind) {
  if (kind === 'post') return POST_DETAIL_ROUTE_PATTERN.test(pathname)
  if (kind === 'discussion') return DISCUSSION_DETAIL_ROUTE_PATTERN.test(pathname)
  return false
}

function getDiscoveryRouteDataSelectors(kind) {
  if (kind === 'post') {
    return ['[data-post-route]', '[data-post-id]', '.post-card[data-post-id]']
  }
  if (kind === 'discussion') {
    return [
      '[data-discussion-route]',
      '[data-discussion-id]',
      '.discussion-card[data-discussion-route]',
      '.discussion-card[data-discussion-id]',
    ]
  }
  return []
}

async function discoverLiveDetailRoute(page, baseUrl, config) {
  const discoveryPath = config.discoveryPath
  const detailKind = config.detailKind

  if (!discoveryPath || !detailKind) {
    return null
  }

  try {
    await page.goto(new URL(discoveryPath, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout ?? 60_000,
    })
    await page.waitForSelector('body', { timeout: config.timeout ?? 8_000 })
    const discoverySelectors = getDiscoveryRouteDataSelectors(detailKind)

    await page
      .waitForFunction(
        (kind, selectors) => {
          const readRouteFromDocument = () => {
            const anchors = Array.from(document.querySelectorAll('a[href]'))
            for (const anchor of anchors) {
              const href = anchor.getAttribute('href')
              if (typeof href !== 'string' || href.length === 0) continue
              if (kind === 'post' && /^\/post\/[^/?#]+$/i.test(href)) return href
              if (kind === 'discussion' && /^\/community\/discussions\/[^/?#]+$/i.test(href)) {
                return href
              }
            }

            const routeValues = selectors
              .flatMap((selector) =>
                Array.from(document.querySelectorAll(selector)).flatMap((element) => [
                  element.getAttribute('data-post-route'),
                  element.getAttribute('data-discussion-route'),
                  element.getAttribute('data-route'),
                  element.getAttribute('data-href'),
                ])
              )
              .filter((value) => typeof value === 'string' && value.length > 0)

            for (const value of routeValues) {
              if (kind === 'post' && /^\/post\/[^/?#]+$/i.test(value)) return value
              if (kind === 'discussion' && /^\/community\/discussions\/[^/?#]+$/i.test(value)) {
                return value
              }
            }

            const idValues = selectors
              .flatMap((selector) =>
                Array.from(document.querySelectorAll(selector)).flatMap((element) => [
                  element.getAttribute('data-post-id'),
                  element.getAttribute('data-discussion-id'),
                ])
              )
              .filter((value) => typeof value === 'string' && value.length > 0)

            for (const value of idValues) {
              if (kind === 'post') return `/post/${value}`
              if (kind === 'discussion') return `/community/discussions/${value}`
            }

            return null
          }

          return readRouteFromDocument() !== null
        },
        {
          timeout: config.discoveryTimeout ?? 8_000,
        },
        detailKind,
        discoverySelectors
      )
      .catch(() => undefined)

    const discoveredPath = await page.evaluate((kind, selectors) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'))
      for (const anchor of anchors) {
        const href = anchor.getAttribute('href')
        if (typeof href !== 'string' || href.length === 0) continue
        if (kind === 'post' && /^\/post\/[^/?#]+$/i.test(href)) return href
        if (kind === 'discussion' && /^\/community\/discussions\/[^/?#]+$/i.test(href)) return href
      }

      const routeValues = selectors
        .flatMap((selector) =>
          Array.from(document.querySelectorAll(selector)).flatMap((element) => [
            element.getAttribute('data-post-route'),
            element.getAttribute('data-discussion-route'),
            element.getAttribute('data-route'),
            element.getAttribute('data-href'),
          ])
        )
        .filter((value) => typeof value === 'string' && value.length > 0)

      for (const value of routeValues) {
        if (kind === 'post' && /^\/post\/[^/?#]+$/i.test(value)) return value
        if (kind === 'discussion' && /^\/community\/discussions\/[^/?#]+$/i.test(value)) {
          return value
        }
      }

      const idValues = selectors
        .flatMap((selector) =>
          Array.from(document.querySelectorAll(selector)).flatMap((element) => [
            element.getAttribute('data-post-id'),
            element.getAttribute('data-discussion-id'),
          ])
        )
        .filter((value) => typeof value === 'string' && value.length > 0)

      for (const value of idValues) {
        if (kind === 'post') return `/post/${value}`
        if (kind === 'discussion') return `/community/discussions/${value}`
      }

      return null
    }, detailKind, discoverySelectors)

    return typeof discoveredPath === 'string' && discoveredPath.length > 0 ? discoveredPath : null
  } catch {
    return null
  }
}

export async function resolveSampleDetailRoute(page, baseUrl, config) {
  const discoveredRoute = await discoverLiveDetailRoute(page, baseUrl, config)
  const candidates = [
    ...new Set(
      [config.requestedRoute, discoveredRoute, config.fallbackRoute].filter((candidate) =>
        typeof candidate === 'string' ? candidate.length > 0 : Boolean(candidate)
      )
    ),
  ]
  let lastFailure = 'No sample detail route candidates configured'
  let sawDataDependentCandidateFailure = false
  let sawStructuralCandidateFailure = false

  for (const candidate of candidates) {
    const candidateSource =
      candidate === config.requestedRoute
        ? 'requested'
        : candidate === discoveredRoute
          ? 'discovered'
          : 'fallback'

    try {
      await page.goto(new URL(candidate, baseUrl).toString(), {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout ?? 60_000,
      })
      await page.waitForSelector('body', { timeout: config.timeout ?? 8_000 })

      const state = await page.evaluate((shellSelector) => {
        return {
          pathname: window.location.pathname,
          title: document.title,
          hasShell: Boolean(document.querySelector(shellSelector)),
          notFound: Boolean(document.querySelector('.not-found-page')),
        }
      }, config.shellSelector)

      if (state.notFound) {
        lastFailure = `${candidate} resolved to not-found`
        sawDataDependentCandidateFailure = true
        continue
      }

      if (state.pathname !== candidate) {
        lastFailure = `${candidate} redirected to ${state.pathname || 'unknown'}`
        sawStructuralCandidateFailure = true
        continue
      }

      if (!matchesRoutePattern(state.pathname, config.detailKind)) {
        lastFailure = `${candidate} did not resolve to a valid ${config.detailKind ?? 'detail'} route`
        sawStructuralCandidateFailure = true
        continue
      }

      if (!state.hasShell) {
        lastFailure = `${candidate} did not mount ${config.shellSelector}`
        if (
          config.dataDependent !== false &&
          candidateSource !== 'discovered' &&
          discoveredRoute === null &&
          state.pathname === candidate
        ) {
          sawDataDependentCandidateFailure = true
          continue
        }
        sawStructuralCandidateFailure = true
        continue
      }

      if ((config.readinessSelectorsAll?.length ?? 0) > 0 || (config.readinessSelectorsAny?.length ?? 0) > 0) {
        try {
          await ensureDetailRouteReadiness(
            page,
            {
              path: candidate,
              readinessSelectorsAll: config.readinessSelectorsAll,
              readinessSelectorsAny: config.readinessSelectorsAny,
            },
            {
              timeout: config.timeout ?? 8_000,
              scrollAttempts: config.scrollAttempts ?? 8,
            }
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          lastFailure = `${candidate} did not reach detail readiness: ${message}`
          sawStructuralCandidateFailure = true
          continue
        }
      }

      return {
        route: candidate,
        source: candidateSource === 'discovered' ? 'fallback' : candidateSource,
        skipReason: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      lastFailure = `${candidate} probe failed: ${message}`
      sawStructuralCandidateFailure = true
    }
  }

  const classification =
    sawStructuralCandidateFailure || config.dataDependent === false
      ? 'unavailable'
      : 'data-dependent'

  return {
    route: null,
    source: null,
    classification:
      sawDataDependentCandidateFailure && classification === 'data-dependent'
        ? 'data-dependent'
        : classification,
    skipReason: createSampleDetailSkipReason(config.label, classification, lastFailure),
  }
}
