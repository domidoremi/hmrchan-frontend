import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LOCAL_AUDIT_CONTRACT_VERSION,
  createLocalAuditEnv,
  parseAuditEnvFile,
} from '../../../scripts/lib/audit-env.js'

describe('audit env helpers', () => {
  it('parses dotenv-style local audit files', () => {
    expect(
      parseAuditEnvFile(`
# comment
PRIMARY_USERNAME=demo@example.com
PRIMARY_PASSWORD="secret value"
export E2E_AUTH_LOGIN=legacy@example.com
      `)
    ).toEqual({
      PRIMARY_USERNAME: 'demo@example.com',
      PRIMARY_PASSWORD: 'secret value',
      E2E_AUTH_LOGIN: 'legacy@example.com',
    })
  })

  it('prefers explicit process env values over local audit env values', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'audit-env-'))
    try {
      writeFileSync(
        path.join(tempDir, '.env.smoke.local'),
        'PRIMARY_USERNAME=file@example.com\nPRIMARY_PASSWORD=file-secret\n',
        'utf8'
      )

      expect(
        createLocalAuditEnv(
          {
            PRIMARY_USERNAME: 'override@example.com',
          },
          {
            cwd: tempDir,
            overrides: {
              PRIMARY_PASSWORD: 'override-secret',
            },
          }
        )
      ).toMatchObject({
        PRIMARY_USERNAME: 'override@example.com',
        PRIMARY_PASSWORD: 'override-secret',
      })
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('injects a local contract fallback only for managed script envs', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'audit-env-empty-'))
    try {
      expect(
        createLocalAuditEnv(
          {},
          {
            cwd: tempDir,
            includeContractFallback: false,
          }
        ).VITE_CLIENT_CONTRACT_VERSION
      ).toBeUndefined()

      expect(
        createLocalAuditEnv(
          {},
          {
            cwd: tempDir,
            includeContractFallback: true,
          }
        ).VITE_CLIENT_CONTRACT_VERSION
      ).toBe(LOCAL_AUDIT_CONTRACT_VERSION)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
