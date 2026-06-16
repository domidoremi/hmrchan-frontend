export function stripTrailingSlash(value) {
  return String(value ?? '').replace(/\/$/, '')
}

export function normalizeAbsoluteBaseUrl(rawUrl, fallbackUrl) {
  const url = new URL(rawUrl || fallbackUrl)
  url.hash = ''
  if (url.pathname === '/') {
    url.pathname = ''
  }
  return stripTrailingSlash(url.toString())
}
