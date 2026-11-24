import { spawnSync } from 'node:child_process'

const DEFAULT_SMOKE_ACCOUNT_TIMEOUT_MS = 10_000

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isLocalAuditOrigin(baseUrl) {
  try {
    const hostname = new URL(baseUrl).hostname
    return hostname === '127.0.0.1' || hostname === 'localhost'
  } catch {
    return false
  }
}

function isLikelyEmail(value) {
  return typeof value === 'string' && value.includes('@')
}

function sanitizeUsername(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'local-smoke-user'
}

function escapeSqlLiteral(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`
}

export function resolveLocalAuditSmokeAccount(login) {
  const trimmedLogin = String(login ?? '').trim()
  if (!trimmedLogin) {
    return {
      identifier: '',
      username: '',
      email: '',
    }
  }

  if (isLikelyEmail(trimmedLogin)) {
    return {
      identifier: trimmedLogin,
      username: sanitizeUsername(trimmedLogin.split('@')[0] ?? ''),
      email: trimmedLogin,
    }
  }

  return {
    identifier: trimmedLogin,
    username: trimmedLogin,
    email: `${sanitizeUsername(trimmedLogin)}@local-smoke.invalid`,
  }
}

export function shouldEnsureLocalAuditSmokeAccount(baseUrl, credentials) {
  return Boolean(
    isLocalAuditOrigin(baseUrl) &&
    isNonEmptyString(credentials?.login) &&
    isNonEmptyString(credentials?.password)
  )
}

export function ensureLocalAuditSmokeAccount(
  env = process.env,
  baseUrl,
  credentials,
  {
    postgresContainer = env.LOCAL_AUDIT_POSTGRES_CONTAINER || 'hmrchan-postgres',
    postgresUser = env.LOCAL_AUDIT_POSTGRES_USER || 'hmrchan',
    postgresDb = env.LOCAL_AUDIT_POSTGRES_DB || 'hmr_identity',
    timeoutMs = DEFAULT_SMOKE_ACCOUNT_TIMEOUT_MS,
    spawn = spawnSync,
  } = {}
) {
  if (!shouldEnsureLocalAuditSmokeAccount(baseUrl, credentials)) {
    return {
      ensured: false,
      skipped: true,
      reason: 'not-local-audit-or-missing-credentials',
    }
  }

  const account = resolveLocalAuditSmokeAccount(credentials.login)
  if (!account.username || !account.email) {
    return {
      ensured: false,
      skipped: true,
      reason: 'invalid-local-smoke-account',
    }
  }

  const usernameLiteral = escapeSqlLiteral(account.username)
  const emailLiteral = escapeSqlLiteral(account.email)
  const passwordLiteral = escapeSqlLiteral(credentials.password)
  const sql = `
WITH updated_user AS (
  UPDATE users
  SET
    email = ${emailLiteral},
    username = ${usernameLiteral},
    password_hash = crypt(${passwordLiteral}, gen_salt('bf')),
    is_active = TRUE,
    is_admin = FALSE,
    is_verified = TRUE,
    totp_enabled = FALSE,
    failed_login_count = 0,
    locked_until = NULL,
    deleted_at = NULL,
    email_verified_at = COALESCE(email_verified_at, NOW()),
    updated_at = NOW()
  WHERE username = ${usernameLiteral} OR email = ${emailLiteral}
  RETURNING id
),
inserted_user AS (
  INSERT INTO users (
    email,
    username,
    password_hash,
    is_active,
    is_admin,
    is_verified,
    totp_enabled,
    failed_login_count,
    locked_until,
    email_verified_at,
    permission_version,
    webauthn_user_handle
  )
  SELECT
    ${emailLiteral},
    ${usernameLiteral},
    crypt(${passwordLiteral}, gen_salt('bf')),
    TRUE,
    FALSE,
    TRUE,
    FALSE,
    0,
    NULL,
    NOW(),
    1,
    gen_random_bytes(64)
  WHERE NOT EXISTS (SELECT 1 FROM updated_user)
  RETURNING id
),
upserted_user AS (
  SELECT id FROM updated_user
  UNION ALL
  SELECT id FROM inserted_user
)
INSERT INTO user_preferences (user_id)
SELECT id
FROM upserted_user
ON CONFLICT (user_id) DO NOTHING;
`

  const result = spawn(
    'docker',
    ['exec', postgresContainer, 'psql', '-U', postgresUser, '-d', postgresDb, '-c', sql],
    {
      encoding: 'utf8',
      env,
      timeout: timeoutMs,
    }
  )

  if (result.error) {
    return {
      ensured: false,
      skipped: true,
      reason:
        result.error.code === 'ETIMEDOUT'
          ? 'docker-exec-timeout'
          : `docker-exec-error:${result.error.message}`,
      username: account.username,
      email: account.email,
    }
  }

  if (result.status !== 0) {
    return {
      ensured: false,
      skipped: true,
      reason: result.stderr?.trim() || result.stdout?.trim() || 'docker-exec-failed',
      username: account.username,
      email: account.email,
    }
  }

  return {
    ensured: true,
    skipped: false,
    username: account.username,
    email: account.email,
  }
}
