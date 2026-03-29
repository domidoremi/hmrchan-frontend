export type AuthSource = string

const AUTH_SOURCE_STORAGE_KEY = 'momi_auth_source'

export function normalizeAuthSource(value: string | null | undefined): AuthSource {
  const normalized = value?.trim().toLowerCase()
  return normalized && normalized.length > 0 ? normalized : 'session'
}

export function getStoredAuthSource(): AuthSource | null {
  try {
    const raw = localStorage.getItem(AUTH_SOURCE_STORAGE_KEY)
    if (!raw) return null
    return normalizeAuthSource(raw)
  } catch {
    return null
  }
}

export function setStoredAuthSource(source: AuthSource): void {
  try {
    localStorage.setItem(AUTH_SOURCE_STORAGE_KEY, normalizeAuthSource(source))
  } catch {
    // ignore storage errors
  }
}

export function clearStoredAuthSource(): void {
  try {
    localStorage.removeItem(AUTH_SOURCE_STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}
