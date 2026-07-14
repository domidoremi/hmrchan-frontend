const DEFAULT_SENSITIVE_QUERY_KEYS = [
  'access_token',
  'code',
  'code_verifier',
  'handoff_code',
  'id_token',
  'refresh_token',
  'state',
  'token',
] as const

export function scrubSensitiveUrlParameters(
  keys: readonly string[] = DEFAULT_SENSITIVE_QUERY_KEYS
): void {
  if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return

  const url = new URL(window.location.href)
  let changed = false

  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }

  const rawFragment = url.hash.slice(1)
  const fragmentPrefix = rawFragment.startsWith('?') ? '?' : ''
  const fragmentBody = fragmentPrefix ? rawFragment.slice(1) : rawFragment
  if (fragmentBody.includes('=') && !fragmentBody.startsWith('/')) {
    const fragmentParams = new URLSearchParams(fragmentBody)
    for (const key of keys) {
      if (fragmentParams.has(key)) {
        fragmentParams.delete(key)
        changed = true
      }
    }

    const nextFragment = fragmentParams.toString()
    url.hash = nextFragment ? `#${fragmentPrefix}${nextFragment}` : ''
  }

  if (!changed) return

  const nextUrl = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', nextUrl)
}
