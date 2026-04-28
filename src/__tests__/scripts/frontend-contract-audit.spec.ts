import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { validateFrontendContractAudit } from '../../../scripts/lib/frontend-contract-audit.js'

function writeFixture(root: string, relativePath: string, contents: string): void {
  const filePath = path.join(root, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents, 'utf8')
}

function createRoot(): string {
  return path.join(
    tmpdir(),
    `hmrchan-contract-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
}

function writeAlignedContractFixtures(root: string): void {
  writeFixture(
    root,
    'src/api/authService.ts',
    `
const AUTH_SESSION_RESOLVE_PATH = '/auth/session:resolve'
export interface WebAuthnAuthenticationOptionsResponse { ceremony_id: string; options: Record<string, unknown> }
export interface PasskeyRecoveryStartRequest { email: string }
export interface PasskeyRecoveryVerifyRequest { verification_code: string }
export interface PasskeyRecoveryVerifyResponse { recovery_id: string }
export interface RecoveryPasskeyRegistrationRequest { recovery_id: string }
export const authService = {
  resolveSession: () => apiClient.post(AUTH_SESSION_RESOLVE_PATH, null),
  beginPasswordlessLogin: () => apiClient.post('/auth/passkeys/login/options', {}),
  finishPasswordlessLogin: (ceremonyId, credential) => apiClient.post('/auth/passkeys/login/verify', { ceremony_id: ceremonyId, credential }),
  startPasskeyRecovery: (data) => apiClient.post('/auth/passkeys/recovery/start', data),
  verifyPasskeyRecovery: (data) => apiClient.post('/auth/passkeys/recovery/verify', data),
  getPasskeyRecoveryStatus: (recoveryId) => apiClient.get(\`/auth/passkeys/recovery/\${recoveryId}/status\`),
  beginRecoveryPasskeyRegistration: (data) => apiClient.post('/auth/passkeys/recovery/register/options', data),
  finishRecoveryPasskeyRegistration: (recoveryId, ceremonyId, credential) => apiClient.post('/auth/passkeys/recovery/register/verify', { recovery_id: recoveryId, ceremony_id: ceremonyId, credential }),
}
`
  )
  writeFixture(
    root,
    'src/api/twoFactorService.ts',
    `
export const twoFactorService = {
  getStatus: () => apiClient.get('/2fa/status'),
  setup: () => apiClient.post('/2fa/setup', null),
  verify: (code) => apiClient.post('/2fa/verify', { code }),
  disable: () => apiClient.post('/2fa/disable', null),
  beginWebAuthnRegistration: () => apiClient.post('/2fa/webauthn/register/options', {}),
  finishWebAuthnRegistration: (ceremonyId, credential) => apiClient.post('/2fa/webauthn/register/verify', { ceremony_id: ceremonyId, credential }),
}
`
  )
  writeFixture(
    root,
    'src/api/clientSecurityService.ts',
    `
export interface ClientInitRequest { client_fingerprint: string }
export const clientSecurityService = {
  init: () => apiClient.post('/client/init', { client_fingerprint: 'fixture' }),
}
`
  )
  writeFixture(
    root,
    'src/services/googleAuthService.ts',
    `
const GOOGLE_AUTH_START_PATH = '/api/v1/auth/google/start'
function buildGoogleStartUrl(intent, returnTo) {
  const url = new URL(GOOGLE_AUTH_START_PATH, window.location.origin)
  url.searchParams.set('intent', intent)
  url.searchParams.set('return_to', returnTo)
  return url.toString()
}
export function openGoogleAuthPopup(intent, returnTo) {
  return window.open(buildGoogleStartUrl(intent, returnTo))
}
`
  )
  writeFixture(
    root,
    'functions/api/[[path]].ts',
    `
const AUTH_SESSION_RESOLVE_FACADE_PATH = \`v1/auth/\${'session:resolve'}\`
fetchInternalBff(env, '/internal/v1/auth/bff/session:resolve')
`
  )
  writeFixture(
    root,
    'scripts/lib/auth-bootstrap.js',
    `
const probes = [
  { path: '/api/v1/client/init', method: 'POST', body: { client_fingerprint: 'auth-bootstrap-probe' } },
  { path: '/api/v1/auth/session:resolve', method: 'POST', body: { client_fingerprint: 'auth-bootstrap-probe' } },
  { path: '/api/v1/auth/passkeys/login/options', method: 'POST', body: { client_fingerprint: 'auth-bootstrap-probe' } },
  { path: '/api/v1/auth/google/start?intent=login&return_to=%2F', method: 'GET' },
]
`
  )
  writeFixture(
    root,
    'src/api/favoriteService.ts',
    'type Good = PublicResourceId\nassertUuidV7String(postId)'
  )
  writeFixture(root, 'src/api/historyService.ts', 'type Good = PublicResourceId')
  writeFixture(root, 'src/api/deviceService.ts', 'assertUuidV7String(deviceId)')
  writeFixture(
    root,
    'src/router/index.ts',
    `
const guardedResourceRoutes = new Set(['post-detail', 'author-detail', 'discussion-detail', 'user-public-profile', 'passkey-recovery-detail'])
if (!isContractResourceId(resourceId)) return { name: 'not-found' }
`
  )
  writeFixture(
    root,
    'scripts/lib/release-route-contract.js',
    `
const DEFAULT_SAMPLE_POST_ROUTE = '/post/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10'
const DEFAULT_SAMPLE_DISCUSSION_ROUTE = '/community/discussions/018f7da0-0c13-7c5f-a3b2-50d09d31a100'
`
  )
  writeFixture(
    root,
    'scripts/config/lighthouse-prod-urls.json',
    JSON.stringify(
      {
        entries: ['https://momichan.xyz/', 'https://momichan.xyz/explore'],
      },
      null,
      2
    )
  )
  writeFixture(
    root,
    'src/utils/cache/config.ts',
    "export const UUIDV7_CUTOVER_EPOCH = 'uuidv7-hard-cutover-2026-04-28'"
  )
  writeFixture(
    root,
    'src/utils/cache/publicSnapshotCache.ts',
    "import { UUIDV7_CUTOVER_EPOCH } from './config'\nString(UUIDV7_CUTOVER_EPOCH)"
  )
  writeFixture(
    root,
    'src/fallbacks/generated/publicSnapshots.ts',
    "export const publicSnapshots = [{ id: '018f7da0-0c13-7c5f-a3b2-50d09d31a100', target: '/post/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10' }]"
  )
  writeFixture(
    root,
    'src/api/homeService.ts',
    `
import { getContractResourceId } from '@/utils/contractResourceId'
function normalizeHomeLink(value) {
  if (value.startsWith('/post/')) {
    const parsed = value.match(/^\\/post\\/([^/?#]+)(.*)$/i)
    const publicPostId = getContractResourceId(parsed?.[1])
    return publicPostId ? \`/post/\${publicPostId}\${parsed?.[2] ?? ''}\` : ''
  }
  return value
}
`
  )
  writeFixture(
    root,
    'src/edge/detailDocumentResolver.ts',
    `
import { getContractResourceId } from '@/utils/contractResourceId'
function normalizePublicPostIdentifier(value) {
  return getContractResourceId(String(value ?? '').trim()) ?? ''
}
const links = [
  { label: 'Latest related post', href: '/post/0195fe30-6f9d-7f31-9e6f-c9a5c478a001' },
  { label: 'Recent post', href: '/post/0195fe30-6f9d-7f31-9e6f-c9a5c478a001' },
]
`
  )
}

describe('frontend contract audit', () => {
  it('passes aligned auth methods and UUIDv7 public ID entrypoints', () => {
    const root = createRoot()
    writeAlignedContractFixtures(root)

    expect(validateFrontendContractAudit(root)).toEqual([])
  })

  it('flags numeric public IDs in guarded API services', () => {
    const root = createRoot()
    writeAlignedContractFixtures(root)
    writeFixture(root, 'src/api/favoriteService.ts', 'type Bad = { id: string | number }')

    expect(validateFrontendContractAudit(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'numeric-public-id-contract-drift' }),
      ])
    )
  })

  it('flags auth method drift', () => {
    const root = createRoot()
    writeAlignedContractFixtures(root)
    writeFixture(
      root,
      'src/api/authService.ts',
      `
const AUTH_SESSION_RESOLVE_PATH = '/auth/session:resolve'
export interface PasskeyRecoveryStartRequest { email: string }
export interface PasskeyRecoveryVerifyRequest { verification_code: string }
export interface PasskeyRecoveryVerifyResponse { recovery_id: string }
export interface RecoveryPasskeyRegistrationRequest { recovery_id: string }
export const authService = {
  resolveSession: () => apiClient.post(AUTH_SESSION_RESOLVE_PATH, null),
  beginPasswordlessLogin: () => apiClient.get('/auth/passkeys/login/options'),
  finishPasswordlessLogin: (ceremonyId, credential) => apiClient.post('/auth/passkeys/login/verify', { ceremony_id: ceremonyId, credential }),
  startPasskeyRecovery: (data) => apiClient.post('/auth/passkeys/recovery/start', data),
  verifyPasskeyRecovery: (data) => apiClient.post('/auth/passkeys/recovery/verify', data),
  getPasskeyRecoveryStatus: (recoveryId) => apiClient.get(\`/auth/passkeys/recovery/\${recoveryId}/status\`),
  beginRecoveryPasskeyRegistration: (data) => apiClient.post('/auth/passkeys/recovery/register/options', data),
  finishRecoveryPasskeyRegistration: (recoveryId, ceremonyId, credential) => apiClient.post('/auth/passkeys/recovery/register/verify', { recovery_id: recoveryId, ceremony_id: ceremonyId, credential }),
}
`
    )

    expect(validateFrontendContractAudit(root)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'auth-contract-method-drift' })])
    )
  })

  it('flags critical auth field drift', () => {
    const root = createRoot()
    writeAlignedContractFixtures(root)
    writeFixture(
      root,
      'src/api/authService.ts',
      `
const AUTH_SESSION_RESOLVE_PATH = '/auth/session:resolve'
export interface PasskeyRecoveryStartRequest { email: string }
export interface PasskeyRecoveryVerifyRequest { verification_code: string }
export interface PasskeyRecoveryVerifyResponse { recovery_id: string }
export interface RecoveryPasskeyRegistrationRequest { recovery_id: string }
export const authService = {
  resolveSession: () => apiClient.post(AUTH_SESSION_RESOLVE_PATH, null),
  beginPasswordlessLogin: () => apiClient.post('/auth/passkeys/login/options', {}),
  finishPasswordlessLogin: (ceremonyId) => apiClient.post('/auth/passkeys/login/verify', { ceremony_id: ceremonyId }),
  startPasskeyRecovery: (data) => apiClient.post('/auth/passkeys/recovery/start', data),
  verifyPasskeyRecovery: (data) => apiClient.post('/auth/passkeys/recovery/verify', data),
  getPasskeyRecoveryStatus: (recoveryId) => apiClient.get(\`/auth/passkeys/recovery/\${recoveryId}/status\`),
  beginRecoveryPasskeyRegistration: (data) => apiClient.post('/auth/passkeys/recovery/register/options', data),
  finishRecoveryPasskeyRegistration: (recoveryId, ceremonyId, credential) => apiClient.post('/auth/passkeys/recovery/register/verify', { recovery_id: recoveryId, ceremony_id: ceremonyId, credential }),
}
`
    )

    expect(validateFrontendContractAudit(root)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing-auth-contract-field' })])
    )
  })

  it('flags missing route and cache cutover guards', () => {
    const root = createRoot()
    writeAlignedContractFixtures(root)
    writeFixture(root, 'src/router/index.ts', "path: '/post/:id'")
    writeFixture(root, 'src/utils/cache/config.ts', "export const CACHE_VERSION = 'v3'")

    expect(validateFrontendContractAudit(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing-route-public-id-guard' }),
        expect.objectContaining({ code: 'missing-cache-uuidv7-cutover-epoch' }),
      ])
    )
  })

  it('blocks generated v4 snapshots', () => {
    const root = createRoot()
    writeAlignedContractFixtures(root)
    writeFixture(
      root,
      'src/fallbacks/generated/publicSnapshots.ts',
      "export const publicSnapshots = [{ id: 'dd8173a9-7ecc-4ecb-a362-0286d0eee53c', target: '/post/dd8173a9-7ecc-4ecb-a362-0286d0eee53c' }]"
    )

    expect(validateFrontendContractAudit(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'stale-public-snapshot-id-contract' }),
      ])
    )
  })

  it('flags stale lighthouse fallback URLs and missing runtime post-link normalization', () => {
    const root = createRoot()
    writeAlignedContractFixtures(root)
    writeFixture(
      root,
      'scripts/config/lighthouse-prod-urls.json',
      JSON.stringify(
        {
          entries: ['https://momichan.xyz/post/dd8173a9-7ecc-4ecb-a362-0286d0eee53c'],
        },
        null,
        2
      )
    )
    writeFixture(
      root,
      'src/api/homeService.ts',
      'function normalizeHomeLink(value) { return value }'
    )
    writeFixture(
      root,
      'src/edge/detailDocumentResolver.ts',
      'function normalizeIdentifier(value) { return String(value) }'
    )

    expect(validateFrontendContractAudit(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'stale-lighthouse-fallback-public-id-contract' }),
        expect.objectContaining({ code: 'missing-home-deeplink-uuidv7-normalization' }),
        expect.objectContaining({ code: 'missing-edge-post-link-uuidv7-normalization' }),
      ])
    )
  })
})
