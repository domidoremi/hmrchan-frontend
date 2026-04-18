function hasTrimmedValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function firstTrimmedValue(...values) {
  for (const value of values) {
    if (hasTrimmedValue(value)) {
      return value.trim()
    }
  }

  return ''
}

function isCloudflarePagesEnv(env) {
  return (
    env.CF_PAGES === '1' ||
    hasTrimmedValue(env.CF_PAGES_COMMIT_SHA) ||
    hasTrimmedValue(env.CF_PAGES_BRANCH) ||
    hasTrimmedValue(env.CF_PAGES_URL)
  )
}

const STRIP_PRODUCTION_CLIENT_ENV_KEYS = Object.freeze([
  'VITE_API_BASE_URL',
  'VITE_API_ENDPOINT',
  'VITE_API_URL',
  'VITE_IDENTITY_API_BASE_URL',
  'VITE_COMMUNITY_API_BASE_URL',
  'VITE_CONTENT_API_BASE_URL',
  'VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION',
  'VITE_DISABLE_PREVIEW_PROXY',
])

const FORCE_SAFE_PRODUCTION_CLIENT_ENV = Object.freeze({
  VITE_ENABLE_DEBUG: 'false',
  VITE_ENABLE_DEVTOOLS: 'false',
})

function sanitizeProductionClientEnv(baseEnv) {
  const env = { ...baseEnv }
  const strippedKeys = []
  const forcedKeys = []

  for (const key of STRIP_PRODUCTION_CLIENT_ENV_KEYS) {
    if (!(key in env)) continue
    if (!hasTrimmedValue(env[key])) {
      delete env[key]
      continue
    }

    strippedKeys.push(key)
    delete env[key]
  }

  for (const [key, safeValue] of Object.entries(FORCE_SAFE_PRODUCTION_CLIENT_ENV)) {
    const currentValue = env[key]
    if (currentValue === safeValue) continue
    if (hasTrimmedValue(currentValue)) {
      forcedKeys.push(key)
    }
    env[key] = safeValue
  }

  return {
    env,
    strippedKeys,
    forcedKeys,
  }
}

export function resolveProductionContractEnv(baseEnv = process.env) {
  const sanitized = sanitizeProductionClientEnv(baseEnv)
  const sanitizedEnv = sanitized.env
  const explicitContract = firstTrimmedValue(baseEnv.VITE_CLIENT_CONTRACT_VERSION)
  if (explicitContract) {
    return {
      env: { ...sanitizedEnv, VITE_CLIENT_CONTRACT_VERSION: explicitContract },
      injected: false,
      source: 'explicit',
      value: explicitContract,
      sanitized,
    }
  }

  if (!isCloudflarePagesEnv(baseEnv)) {
    return {
      env: { ...sanitizedEnv },
      injected: false,
      source: 'missing',
      value: '',
      sanitized,
    }
  }

  const pagesCommitSha = firstTrimmedValue(baseEnv.CF_PAGES_COMMIT_SHA, baseEnv.VITE_GIT_COMMIT)

  if (!pagesCommitSha) {
    return {
      env: { ...sanitizedEnv },
      injected: false,
      source: 'cloudflare-pages-missing-commit',
      value: '',
      sanitized,
    }
  }

  return {
    env: {
      ...sanitizedEnv,
      VITE_CLIENT_CONTRACT_VERSION: pagesCommitSha,
    },
    injected: true,
    source: 'cloudflare-pages-commit-sha',
    value: pagesCommitSha,
    sanitized,
  }
}
