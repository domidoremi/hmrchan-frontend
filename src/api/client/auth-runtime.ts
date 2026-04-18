export interface AuthRuntimeSession {
  permissionVersion: string
  permissions: string[]
  roles: string[]
  identityProvider?: string
  sessionExpiresAt: string | null
  lastAuthzCheckAt: number
}

interface RuntimeSessionPayload {
  permission_version?: number | string
  permissions?: unknown
  roles?: unknown
  identity_provider?: string
  session_expires_at?: string | null
  user?: {
    is_admin?: boolean
    identity_provider?: string
  } | null
}

let runtimeSession: AuthRuntimeSession | null = null

function normalizePermissionVersion(value: number | string | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  return '1'
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function resolveRoles(payload: RuntimeSessionPayload): string[] {
  const roles = normalizeStringArray(payload.roles)
  if (roles.length > 0) return roles
  return payload.user?.is_admin ? ['admin'] : []
}

function buildRuntimeSession(payload: RuntimeSessionPayload): AuthRuntimeSession {
  return {
    permissionVersion: normalizePermissionVersion(payload.permission_version),
    permissions: normalizeStringArray(payload.permissions),
    roles: resolveRoles(payload),
    identityProvider:
      typeof payload.identity_provider === 'string'
        ? payload.identity_provider
        : payload.user?.identity_provider,
    sessionExpiresAt:
      typeof payload.session_expires_at === 'string' ? payload.session_expires_at : null,
    lastAuthzCheckAt: Date.now(),
  }
}

export function getAuthRuntimeSession(): AuthRuntimeSession | null {
  return runtimeSession
}

export function getRuntimeAccessToken(): string | null {
  return null
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
  if (!runtimeSession) {
    runtimeSession = buildRuntimeSession({
      permission_version: permissionVersion,
      session_expires_at: null,
    })
    return
  }

  runtimeSession = {
    ...runtimeSession,
    permissionVersion: normalizePermissionVersion(permissionVersion),
    lastAuthzCheckAt: Date.now(),
  }
}

export function isRuntimeAccessTokenExpired(): boolean {
  return runtimeSession?.sessionExpiresAt == null
}

export function isRuntimeAccessTokenNearRefreshThreshold(): boolean {
  return false
}
