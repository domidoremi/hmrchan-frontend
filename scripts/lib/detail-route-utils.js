function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
      ? 'sample data is unavailable or no longer maps to a live public UUIDv7 resource'
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

export async function resolveSampleDetailRoute(page, baseUrl, config) {
  const candidates = buildSampleRouteCandidates(config.requestedRoute, config.fallbackRoute)
  let lastFailure = 'No sample detail route candidates configured'

  for (const candidate of candidates) {
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
        if (config.dataDependent !== false) {
          return {
            route: null,
            source: null,
            classification: 'data-dependent',
            skipReason: createSampleDetailSkipReason(config.label, 'data-dependent', lastFailure),
          }
        }
        continue
      }

      if (state.pathname !== candidate) {
        lastFailure = `${candidate} redirected to ${state.pathname || 'unknown'}`
        continue
      }

      if (!state.hasShell) {
        lastFailure = `${candidate} did not mount ${config.shellSelector}`
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
          continue
        }
      }

      return {
        route: candidate,
        source: candidate === config.requestedRoute ? 'requested' : 'fallback',
        skipReason: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      lastFailure = `${candidate} probe failed: ${message}`
    }
  }

  return {
    route: null,
    source: null,
    classification: config.dataDependent === false ? 'unavailable' : 'data-dependent',
    skipReason: createSampleDetailSkipReason(
      config.label,
      config.dataDependent === false ? 'unavailable' : 'data-dependent',
      lastFailure
    ),
  }
}
