interface AccessTokenClaims {
  exp?: number
  permissions?: unknown
  permission_version?: number | string
  is_admin?: boolean
  identity_provider?: string
}

export interface AuthRuntimeSession {
  accessToken: string
  accessTokenExpiresAt: number
  refreshThresholdSeconds: number
  permissionVersion: string
  permissions: string[]
  roles: string[]
  identityProvider?: string
  lastAuthzCheckAt: number
}

interface RuntimeSessionPayload {
  access_token: string
  expires_in?: number
  refresh_threshold?: number
  permission_version?: number | string
}

const DEFAULT_REFRESH_THRESHOLD_SECONDS = 5 * 60

let runtimeSession: AuthRuntimeSession | null = null

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function decodeBase64Url(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return atob(padded)
  } catch {
    return null
  }
}

function decodeAccessTokenClaims(token: string): AccessTokenClaims | null {
  const segments = token.split('.')
  if (segments.length < 2) return null

  const payload = decodeBase64Url(segments[1] ?? '')
  if (!payload) return null

  try {
    const parsed = JSON.parse(payload) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as AccessTokenClaims) : null
  } catch {
    return null
  }
}

function normalizePermissionVersion(value: number | string | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  return '1'
}

function buildRolesFromClaims(claims: AccessTokenClaims | null): string[] {
  return claims?.is_admin ? ['admin'] : []
}

function resolveAccessTokenExpiresAt(claims: AccessTokenClaims | null, expiresIn?: number): number {
  if (typeof claims?.exp === 'number' && Number.isFinite(claims.exp) && claims.exp > 0) {
    return claims.exp * 1000
  }

  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) {
    return Date.now() + expiresIn * 1000
  }

  return Date.now()
}

function buildRuntimeSession(payload: RuntimeSessionPayload): AuthRuntimeSession {
  const claims = decodeAccessTokenClaims(payload.access_token)
  const permissionVersion =
    payload.permission_version !== undefined
      ? normalizePermissionVersion(payload.permission_version)
      : normalizePermissionVersion(claims?.permission_version)

  return {
    accessToken: payload.access_token,
    accessTokenExpiresAt: resolveAccessTokenExpiresAt(claims, payload.expires_in),
    refreshThresholdSeconds:
      typeof payload.refresh_threshold === 'number' && payload.refresh_threshold > 0
        ? payload.refresh_threshold
        : DEFAULT_REFRESH_THRESHOLD_SECONDS,
    permissionVersion,
    permissions: isStringArray(claims?.permissions) ? claims.permissions : [],
    roles: buildRolesFromClaims(claims),
    identityProvider:
      typeof claims?.identity_provider === 'string' ? claims.identity_provider : undefined,
    lastAuthzCheckAt: Date.now(),
  }
}

export function getAuthRuntimeSession(): AuthRuntimeSession | null {
  return runtimeSession
}

export function getRuntimeAccessToken(): string | null {
  return runtimeSession?.accessToken ?? null
}

export function establishAuthRuntimeSession(payload: RuntimeSessionPayload): AuthRuntimeSession {
  runtimeSession = buildRuntimeSession(payload)
  return runtimeSession
}

export function clearAuthRuntimeSession(): void {
  runtimeSession = null
}

export function touchAuthzCheck(at = Date.now()): void {
  if (!runtimeSession) return
  runtimeSession = {
    ...runtimeSession,
    lastAuthzCheckAt: at,
  }
}

export function updateRuntimePermissionVersion(permissionVersion: number | string): void {
  if (!runtimeSession) return

  runtimeSession = {
    ...runtimeSession,
    permissionVersion: normalizePermissionVersion(permissionVersion),
    lastAuthzCheckAt: Date.now(),
  }
}

export function isRuntimeAccessTokenExpired(now = Date.now()): boolean {
  return !runtimeSession || runtimeSession.accessTokenExpiresAt <= now
}

export function isRuntimeAccessTokenNearRefreshThreshold(now = Date.now()): boolean {
  if (!runtimeSession) return true

  return runtimeSession.accessTokenExpiresAt - now <= runtimeSession.refreshThresholdSeconds * 1000
}
