import { readFileSync } from 'node:fs'
import path from 'node:path'

const AUTH_CONTRACT_ENDPOINTS = Object.freeze([
  '/api/v1/client/init',
  '/api/v1/auth/session:resolve',
  '/api/v1/auth/google/start',
  '/api/v1/auth/passkeys/login/options',
  '/api/v1/auth/passkeys/login/verify',
  '/api/v1/auth/passkeys/recovery/start',
  '/api/v1/auth/passkeys/recovery/verify',
  '/api/v1/auth/passkeys/recovery/{id}/status',
  '/api/v1/auth/passkeys/recovery/register/options',
  '/api/v1/auth/passkeys/recovery/register/verify',
  '/api/v1/2fa/status',
  '/api/v1/2fa/setup',
  '/api/v1/2fa/verify',
  '/api/v1/2fa/disable',
  '/api/v1/2fa/webauthn/register/options',
  '/api/v1/2fa/webauthn/register/verify',
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

function readProjectFile(projectRoot, relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

function endpointToken(endpoint) {
  return endpoint.replace('/api/v1', '')
}

function hasEndpointReference(contentsByFile, endpoint) {
  const token = endpointToken(endpoint)
  const [dynamicPrefix, dynamicSuffix] = token.split('{id}')
  return [...contentsByFile.values()].some(
    (contents) =>
      contents.includes(endpoint) ||
      contents.includes(token) ||
      (token.includes('{id}') &&
        Boolean(dynamicPrefix) &&
        Boolean(dynamicSuffix) &&
        contents.includes(dynamicPrefix) &&
        contents.includes(dynamicSuffix))
  )
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
        message: `Frontend auth surface does not reference backend contract endpoint ${endpoint}`,
        file: 'scripts/lib/frontend-contract-audit.js',
      })
    }
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

  return issues
}
