export function matchesExpectedBrowserRoute(actual, expected) {
  const base = 'https://route.invalid'
  const actualUrl = new URL(actual, base)
  const expectedUrl = new URL(expected, base)
  return (
    actualUrl.pathname === expectedUrl.pathname &&
    (!expected.includes('?') || actualUrl.search === expectedUrl.search) &&
    (!expected.includes('#') || actualUrl.hash === expectedUrl.hash)
  )
}

export function resolveCanonicalRouteUrl(path, origin) {
  const url = new URL(path, origin)
  url.search = ''
  url.hash = ''
  return url.toString()
}
