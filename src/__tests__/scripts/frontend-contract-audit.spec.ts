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

describe('frontend contract audit', () => {
  it('flags numeric public IDs in guarded API services', () => {
    const root = path.join(tmpdir(), `hmrchan-contract-${Date.now()}`)
    for (const file of [
      'src/api/authService.ts',
      'src/api/twoFactorService.ts',
      'src/api/clientSecurityService.ts',
      'src/services/googleAuthService.ts',
      'functions/api/[[path]].ts',
      'scripts/lib/auth-bootstrap.js',
    ]) {
      writeFixture(
        root,
        file,
        [
          '/api/v1/client/init',
          '/api/v1/auth/session:resolve',
          '/api/v1/auth/google/start',
          '/api/v1/auth/passkeys/login/options',
          '/api/v1/auth/passkeys/login/verify',
          '/api/v1/auth/passkeys/recovery/start',
          '/api/v1/auth/passkeys/recovery/verify',
          '/api/v1/auth/passkeys/recovery/${id}/status',
          '/api/v1/auth/passkeys/recovery/register/options',
          '/api/v1/auth/passkeys/recovery/register/verify',
          '/api/v1/2fa/status',
          '/api/v1/2fa/setup',
          '/api/v1/2fa/verify',
          '/api/v1/2fa/disable',
          '/api/v1/2fa/webauthn/register/options',
          '/api/v1/2fa/webauthn/register/verify',
        ].join('\n')
      )
    }
    writeFixture(root, 'src/api/favoriteService.ts', 'type Bad = { id: string | number }')
    writeFixture(root, 'src/api/historyService.ts', 'type Good = PublicResourceId')
    writeFixture(root, 'src/api/deviceService.ts', 'assertUuidV7String(deviceId)')

    expect(validateFrontendContractAudit(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'numeric-public-id-contract-drift' }),
      ])
    )
  })
})
