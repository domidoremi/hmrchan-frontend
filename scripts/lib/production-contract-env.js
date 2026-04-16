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

export function resolveProductionContractEnv(baseEnv = process.env) {
  const explicitContract = firstTrimmedValue(baseEnv.VITE_CLIENT_CONTRACT_VERSION)
  if (explicitContract) {
    return {
      env: { ...baseEnv, VITE_CLIENT_CONTRACT_VERSION: explicitContract },
      injected: false,
      source: 'explicit',
      value: explicitContract,
    }
  }

  if (!isCloudflarePagesEnv(baseEnv)) {
    return {
      env: { ...baseEnv },
      injected: false,
      source: 'missing',
      value: '',
    }
  }

  const pagesCommitSha = firstTrimmedValue(baseEnv.CF_PAGES_COMMIT_SHA, baseEnv.VITE_GIT_COMMIT)

  if (!pagesCommitSha) {
    return {
      env: { ...baseEnv },
      injected: false,
      source: 'cloudflare-pages-missing-commit',
      value: '',
    }
  }

  return {
    env: {
      ...baseEnv,
      VITE_CLIENT_CONTRACT_VERSION: pagesCommitSha,
    },
    injected: true,
    source: 'cloudflare-pages-commit-sha',
    value: pagesCommitSha,
  }
}
