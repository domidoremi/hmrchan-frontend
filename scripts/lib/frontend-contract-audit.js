import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  findPublicSnapshotIdContractIssuesFromText,
  hasNumericPublicDetailRouteInText,
  hasRetiredPublicIdInText,
  summarizePublicSnapshotContractIssues,
} from './public-snapshot-contract.js'

const AUTH_CONTRACT_ENDPOINTS = Object.freeze([
  Object.freeze({
    path: '/api/v1/client/init',
    method: 'POST',
    aliases: Object.freeze(['/client/init']),
    files: Object.freeze(['src/api/clientSecurityService.ts', 'scripts/lib/auth-bootstrap.js']),
    methodFiles: Object.freeze(['src/api/clientSecurityService.ts']),
    requiredTokens: Object.freeze(['client_fingerprint']),
  }),
  Object.freeze({
    path: '/api/v1/auth/session:resolve',
    method: 'POST',
    aliases: Object.freeze(['/auth/session:resolve']),
    files: Object.freeze([
      'src/api/authService.ts',
      'functions/api/[[path]].ts',
      'scripts/lib/auth-bootstrap.js',
    ]),
    methodFiles: Object.freeze(['src/api/authService.ts']),
  }),
  Object.freeze({
    path: '/api/v1/auth/google/start',
    method: 'GET',
    aliases: Object.freeze(['/auth/google/start']),
    files: Object.freeze(['src/services/googleAuthService.ts', 'scripts/lib/auth-bootstrap.js']),
    methodFiles: Object.freeze(['src/services/googleAuthService.ts']),
    requiredTokens: Object.freeze(['intent', 'return_to']),
  }),
  Object.freeze({
    path: '/api/v1/auth/passkeys/login/options',
    method: 'POST',
    aliases: Object.freeze(['/auth/passkeys/login/options']),
    files: Object.freeze(['src/api/authService.ts', 'scripts/lib/auth-bootstrap.js']),
    methodFiles: Object.freeze(['src/api/authService.ts']),
  }),
  Object.freeze({
    path: '/api/v1/auth/passkeys/login/verify',
    method: 'POST',
    aliases: Object.freeze(['/auth/passkeys/login/verify']),
    files: Object.freeze(['src/api/authService.ts']),
    requiredCallTokens: Object.freeze(['ceremony_id', 'credential']),
  }),
  Object.freeze({
    path: '/api/v1/auth/passkeys/recovery/start',
    method: 'POST',
    aliases: Object.freeze(['/auth/passkeys/recovery/start']),
    files: Object.freeze(['src/api/authService.ts']),
    requiredTokens: Object.freeze(['email']),
  }),
  Object.freeze({
    path: '/api/v1/auth/passkeys/recovery/verify',
    method: 'POST',
    aliases: Object.freeze(['/auth/passkeys/recovery/verify']),
    files: Object.freeze(['src/api/authService.ts']),
    requiredTokens: Object.freeze(['verification_code', 'recovery_id']),
  }),
  Object.freeze({
    path: '/api/v1/auth/passkeys/recovery/{id}/status',
    method: 'GET',
    aliases: Object.freeze(['/auth/passkeys/recovery/${id}/status']),
    files: Object.freeze(['src/api/authService.ts']),
  }),
  Object.freeze({
    path: '/api/v1/auth/passkeys/recovery/register/options',
    method: 'POST',
    aliases: Object.freeze(['/auth/passkeys/recovery/register/options']),
    files: Object.freeze(['src/api/authService.ts']),
    requiredTokens: Object.freeze(['recovery_id']),
  }),
  Object.freeze({
    path: '/api/v1/auth/passkeys/recovery/register/verify',
    method: 'POST',
    aliases: Object.freeze(['/auth/passkeys/recovery/register/verify']),
    files: Object.freeze(['src/api/authService.ts']),
    requiredCallTokens: Object.freeze(['recovery_id', 'ceremony_id', 'credential']),
  }),
  Object.freeze({
    path: '/api/v1/2fa/status',
    method: 'GET',
    aliases: Object.freeze(['/2fa/status']),
    files: Object.freeze(['src/api/twoFactorService.ts']),
  }),
  Object.freeze({
    path: '/api/v1/2fa/setup',
    method: 'POST',
    aliases: Object.freeze(['/2fa/setup']),
    files: Object.freeze(['src/api/twoFactorService.ts']),
  }),
  Object.freeze({
    path: '/api/v1/2fa/verify',
    method: 'POST',
    aliases: Object.freeze(['/2fa/verify']),
    files: Object.freeze(['src/api/twoFactorService.ts']),
  }),
  Object.freeze({
    path: '/api/v1/2fa/disable',
    method: 'POST',
    aliases: Object.freeze(['/2fa/disable']),
    files: Object.freeze(['src/api/twoFactorService.ts']),
  }),
  Object.freeze({
    path: '/api/v1/2fa/webauthn/register/options',
    method: 'POST',
    aliases: Object.freeze(['/2fa/webauthn/register/options']),
    files: Object.freeze(['src/api/twoFactorService.ts']),
  }),
  Object.freeze({
    path: '/api/v1/2fa/webauthn/register/verify',
    method: 'POST',
    aliases: Object.freeze(['/2fa/webauthn/register/verify']),
    files: Object.freeze(['src/api/twoFactorService.ts']),
    requiredCallTokens: Object.freeze(['ceremony_id', 'credential']),
  }),
])

const FRONTEND_AUTH_SURFACE_FILES = Object.freeze([
  'src/api/authService.ts',
  'src/api/twoFactorService.ts',
  'src/api/clientSecurityService.ts',
  'src/services/googleAuthService.ts',
  'functions/api/[[path]].ts',
  'scripts/lib/auth-bootstrap.js',
])

const PUBLIC_ID_GUARD_FILES = Object.freeze([
  'src/api/favoriteService.ts',
  'src/api/historyService.ts',
  'src/api/deviceService.ts',
])

const PUBLIC_ID_ENTRYPOINT_FILES = Object.freeze([
  'src/router/index.ts',
  'scripts/lib/release-route-contract.js',
  'scripts/config/lighthouse-prod-urls.json',
  'src/utils/cache/config.ts',
  'src/utils/cache/publicSnapshotCache.ts',
  'src/api/homeService.ts',
  'src/edge/detailDocumentResolver.ts',
])

function readProjectFile(projectRoot, relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

function endpointToken(endpoint) {
  return endpoint.replace('/api/v1', '')
}

function buildEndpointTokens(endpoint) {
  return [endpoint.path, endpointToken(endpoint.path), ...(endpoint.aliases ?? [])]
}

function hasEndpointReference(contentsByFile, endpoint) {
  const tokens = buildEndpointTokens(endpoint)
  return tokens.some((token) => {
    const [dynamicPrefix, dynamicSuffix] = token.split('{id}')
    return [...contentsByFile.values()].some(
      (contents) =>
        contents.includes(token) ||
        (token.includes('{id}') &&
          Boolean(dynamicPrefix) &&
          Boolean(dynamicSuffix) &&
          contents.includes(dynamicPrefix) &&
          contents.includes(dynamicSuffix)) ||
        (token.includes('${id}') && contents.includes(token.replace('${id}', '${recoveryId}'))) ||
        (token.includes('${id}') &&
          contents.includes(token.replace('${id}', '${encodeURIComponent(id)}')))
    )
  })
}

function hasEndpointMethod(contentsByFile, endpoint) {
  const method = endpoint.method.toLowerCase()
  const pathTokens = buildEndpointTokens(endpoint)
  return (endpoint.methodFiles ?? endpoint.files).some((file) => {
    const contents = contentsByFile.get(file)
    if (!contents) return false
    if (method === 'get' && endpoint.path === '/api/v1/auth/google/start') {
      return contents.includes('window.open') || contents.includes('location.href')
    }
    return pathTokens.some((token) => {
      if (
        endpoint.path === '/api/v1/auth/session:resolve' &&
        contents.includes('AUTH_SESSION_RESOLVE_PATH') &&
        contents.includes(`apiClient.${method}`)
      ) {
        return true
      }

      const placeholders = ['{id}', '${id}']
      const placeholder = placeholders.find((candidate) => token.includes(candidate))
      if (placeholder) {
        const [prefix, suffix] = token.split(placeholder)
        let searchFrom = 0
        while (prefix && searchFrom < contents.length) {
          const tokenIndex = contents.indexOf(prefix, searchFrom)
          if (tokenIndex < 0) return false
          const suffixWindow = contents.slice(
            tokenIndex,
            Math.min(contents.length, tokenIndex + 260)
          )
          if (suffixWindow.includes(suffix)) {
            const nearbyPrefix = contents.slice(Math.max(0, tokenIndex - 200), tokenIndex)
            if (getNearestApiClientMethod(nearbyPrefix) === method) {
              return true
            }
          }
          searchFrom = tokenIndex + prefix.length
        }
        return false
      }

      let searchFrom = 0
      while (searchFrom < contents.length) {
        const tokenIndex = contents.indexOf(token, searchFrom)
        if (tokenIndex < 0) return false
        const nearbyPrefix = contents.slice(Math.max(0, tokenIndex - 200), tokenIndex)
        if (getNearestApiClientMethod(nearbyPrefix) === method) {
          return true
        }
        searchFrom = tokenIndex + token.length
      }
      return false
    })
  })
}

function getNearestApiClientMethod(prefix) {
  const matches = [...prefix.matchAll(/apiClient\.(get|post|put|patch|delete)\b/g)]
  return matches.at(-1)?.[1] ?? null
}

function hasTokenNearEndpoint(contents, endpoint, token) {
  return buildEndpointTokens(endpoint).some((endpointTokenValue) => {
    const placeholders = ['{id}', '${id}']
    const placeholder = placeholders.find((candidate) => endpointTokenValue.includes(candidate))
    const searchToken = placeholder ? endpointTokenValue.split(placeholder)[0] : endpointTokenValue
    let searchFrom = 0
    while (searchToken && searchFrom < contents.length) {
      const tokenIndex = contents.indexOf(searchToken, searchFrom)
      if (tokenIndex < 0) return false
      const callWindow = contents.slice(
        Math.max(0, tokenIndex - 120),
        Math.min(contents.length, tokenIndex + 520)
      )
      if (callWindow.includes(token)) {
        return true
      }
      searchFrom = tokenIndex + searchToken.length
    }
    return false
  })
}

function validateRequiredTokens(contentsByFile, endpoint, issues) {
  for (const token of endpoint.requiredTokens ?? []) {
    const hasToken = (endpoint.methodFiles ?? endpoint.files).some((file) =>
      contentsByFile.get(file)?.includes(token)
    )
    if (!hasToken) {
      issues.push({
        code: 'missing-auth-contract-field',
        message: `${endpoint.path} should keep frontend request/response field ${token} aligned with the auth contract`,
        file: endpoint.files[0] ?? 'scripts/lib/frontend-contract-audit.js',
      })
    }
  }

  for (const token of endpoint.requiredCallTokens ?? []) {
    const hasToken = (endpoint.methodFiles ?? endpoint.files).some((file) => {
      const contents = contentsByFile.get(file)
      return contents ? hasTokenNearEndpoint(contents, endpoint, token) : false
    })
    if (!hasToken) {
      issues.push({
        code: 'missing-auth-contract-field',
        message: `${endpoint.path} should keep frontend request/response field ${token} aligned with the auth contract`,
        file: endpoint.files[0] ?? 'scripts/lib/frontend-contract-audit.js',
      })
    }
  }
}

function validatePublicIdEntrypoints(projectRoot, issues) {
  const routerContents = readProjectFile(projectRoot, 'src/router/index.ts')
  const guardedRouteNames = [
    'post-detail',
    'author-detail',
    'discussion-detail',
    'user-public-profile',
    'passkey-recovery-detail',
  ]
  if (
    !routerContents.includes('isContractResourceId') ||
    guardedRouteNames.some((routeName) => !routerContents.includes(`'${routeName}'`))
  ) {
    issues.push({
      code: 'missing-route-public-id-guard',
      message:
        'Detail routes with public ID params must reject non-UUIDv7 values before loading pages or calling APIs',
      file: 'src/router/index.ts',
    })
  }

  const routeContractContents = readProjectFile(
    projectRoot,
    'scripts/lib/release-route-contract.js'
  )
  if (
    hasRetiredPublicIdInText(routeContractContents) ||
    hasNumericPublicDetailRouteInText(routeContractContents)
  ) {
    issues.push({
      code: 'stale-release-route-id-contract',
      message:
        'Release route contract still contains numeric or retired v4 public detail route IDs',
      file: 'scripts/lib/release-route-contract.js',
    })
  }

  const cacheConfigContents = readProjectFile(projectRoot, 'src/utils/cache/config.ts')
  if (!cacheConfigContents.includes('UUIDV7_CUTOVER_EPOCH')) {
    issues.push({
      code: 'missing-cache-uuidv7-cutover-epoch',
      message:
        'Cache versioning must include a UUIDv7 cutover epoch so old v4/numeric entries can be invalidated explicitly',
      file: 'src/utils/cache/config.ts',
    })
  }

  const snapshotCacheContents = readProjectFile(
    projectRoot,
    'src/utils/cache/publicSnapshotCache.ts'
  )
  if (!snapshotCacheContents.includes('UUIDV7_CUTOVER_EPOCH')) {
    issues.push({
      code: 'missing-public-snapshot-cache-cutover-epoch',
      message:
        'Public snapshot cache keys must include the UUIDv7 cutover epoch before snapshot data is refreshed',
      file: 'src/utils/cache/publicSnapshotCache.ts',
    })
  }

  const generatedSnapshots = readProjectFile(
    projectRoot,
    'src/fallbacks/generated/publicSnapshots.ts'
  )
  const snapshotContractIssues = findPublicSnapshotIdContractIssuesFromText(generatedSnapshots)
  if (snapshotContractIssues.length > 0) {
    issues.push({
      code: 'stale-public-snapshot-id-contract',
      message: `Generated public snapshots contain retired public IDs and must be refreshed for UUIDv7 cutover (${summarizePublicSnapshotContractIssues(snapshotContractIssues)})`,
      file: 'src/fallbacks/generated/publicSnapshots.ts',
    })
  }

  const lighthouseFallbackContents = readProjectFile(
    projectRoot,
    'scripts/config/lighthouse-prod-urls.json'
  )
  const lighthouseFallbackIssues = findPublicSnapshotIdContractIssuesFromText(
    lighthouseFallbackContents
  )
  if (lighthouseFallbackIssues.length > 0) {
    issues.push({
      code: 'stale-lighthouse-fallback-public-id-contract',
      message: `Lighthouse production fallback URL manifest still contains retired public IDs (${summarizePublicSnapshotContractIssues(lighthouseFallbackIssues)})`,
      file: 'scripts/config/lighthouse-prod-urls.json',
    })
  }

  const homeServiceContents = readProjectFile(projectRoot, 'src/api/homeService.ts')
  if (
    !homeServiceContents.includes('getContractResourceId') ||
    !homeServiceContents.includes("if (value.startsWith('/post/'))")
  ) {
    issues.push({
      code: 'missing-home-deeplink-uuidv7-normalization',
      message:
        'Home/discovery deep_link normalization must reject retired /post/{uuidv4} targets before RouterLink/router.push consume them',
      file: 'src/api/homeService.ts',
    })
  }

  const edgeContents = readProjectFile(projectRoot, 'src/edge/detailDocumentResolver.ts')
  if (
    !edgeContents.includes('normalizePublicPostIdentifier') ||
    !edgeContents.includes("label: 'Latest related post'") ||
    !edgeContents.includes("label: 'Recent post'")
  ) {
    issues.push({
      code: 'missing-edge-post-link-uuidv7-normalization',
      message:
        'Edge detail document resolver must only emit /post/{uuidv7} shell links for related or recent posts after cutover',
      file: 'src/edge/detailDocumentResolver.ts',
    })
  }
}

export function validateFrontendContractAudit(projectRoot = process.cwd()) {
  const issues = []
  const authContents = new Map(
    FRONTEND_AUTH_SURFACE_FILES.map((file) => [file, readProjectFile(projectRoot, file)])
  )

  for (const endpoint of AUTH_CONTRACT_ENDPOINTS) {
    if (!hasEndpointReference(authContents, endpoint)) {
      issues.push({
        code: 'missing-frontend-auth-surface-reference',
        message: `Frontend auth surface does not reference backend contract endpoint ${endpoint.path}`,
        file: 'scripts/lib/frontend-contract-audit.js',
      })
      continue
    }

    if (!hasEndpointMethod(authContents, endpoint)) {
      issues.push({
        code: 'auth-contract-method-drift',
        message: `${endpoint.path} should be consumed with ${endpoint.method} by the frontend service/proxy surface`,
        file: endpoint.files[0] ?? 'scripts/lib/frontend-contract-audit.js',
      })
    }

    validateRequiredTokens(authContents, endpoint, issues)
  }

  for (const file of PUBLIC_ID_GUARD_FILES) {
    const contents = readProjectFile(projectRoot, file)
    const bannedPatterns = [
      /id\??:\s*string\s*\|\s*number/,
      /comment_id\??:\s*number/,
      /post_id\??:\s*number/,
      /device_id\??:\s*number/,
      /item\.post\?\.id\s*===/,
    ]

    for (const pattern of bannedPatterns) {
      if (pattern.test(contents)) {
        issues.push({
          code: 'numeric-public-id-contract-drift',
          message: `${file} still accepts numeric or fallback public resource IDs; UUIDv7 hard cutover requires UUIDv7 strings only`,
          file,
        })
      }
    }

    if (!contents.includes('PublicResourceId') && !contents.includes('assertUuidV7String')) {
      issues.push({
        code: 'missing-public-id-guard',
        message: `${file} should use the shared UUIDv7 public ID type or runtime guard`,
        file,
      })
    }
  }

  for (const file of PUBLIC_ID_ENTRYPOINT_FILES) {
    readProjectFile(projectRoot, file)
  }
  validatePublicIdEntrypoints(projectRoot, issues)

  return issues
}
