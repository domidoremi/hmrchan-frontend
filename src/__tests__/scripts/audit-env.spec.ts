import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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

  it('hydrates local audit fallbacks from the sibling backend env when missing', () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'audit-env-backend-'))
    const frontendDir = path.join(tempRoot, 'hmrchan-frontend')
    const backendDir = path.join(tempRoot, 'hmrchan-backend')

    try {
      mkdirSync(frontendDir, { recursive: true })
      mkdirSync(backendDir, { recursive: true })
      writeFileSync(
        path.join(backendDir, '.env'),
        [
          'REHEARSAL_TURNSTILE_BYPASS_TOKEN=test-bypass-token',
          'INTERNAL_API_SHARED_SECRET=test-internal-secret',
          'INTERNAL_IDENTITY_API_BASE_URL=http://127.0.0.1:19081',
          '',
        ].join('\n'),
        'utf8'
      )

      expect(
        createLocalAuditEnv(
          {},
          {
            cwd: frontendDir,
          }
        )
      ).toMatchObject({
        REHEARSAL_TURNSTILE_BYPASS_TOKEN: 'test-bypass-token',
        BACKEND_INTERNAL_AUTH_SHARED_SECRET: 'test-internal-secret',
        API_BASE_URL: 'http://127.0.0.1:19081',
        BACKEND_INTERNAL_ORIGIN: 'http://127.0.0.1:19081',
        VPC_API_ORIGIN: 'http://127.0.0.1:19081',
        VPC_IDENTITY_API_ORIGIN: 'http://127.0.0.1:19081',
      })
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it('prefers explicit audit env values over sibling backend fallbacks', () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'audit-env-explicit-'))
    const frontendDir = path.join(tempRoot, 'hmrchan-frontend')
    const backendDir = path.join(tempRoot, 'hmrchan-backend')

    try {
      mkdirSync(frontendDir, { recursive: true })
      mkdirSync(backendDir, { recursive: true })
      writeFileSync(
        path.join(backendDir, '.env'),
        [
          'REHEARSAL_TURNSTILE_BYPASS_TOKEN=backend-bypass-token',
          'INTERNAL_API_SHARED_SECRET=backend-internal-secret',
          'INTERNAL_IDENTITY_API_BASE_URL=http://127.0.0.1:19081',
          '',
        ].join('\n'),
        'utf8'
      )

      expect(
        createLocalAuditEnv(
          {
            VITE_IDENTITY_API_BASE_URL: 'http://127.0.0.1:29081',
            VITE_COMMUNITY_API_BASE_URL: 'http://127.0.0.1:29082',
            VITE_CONTENT_API_BASE_URL: 'http://127.0.0.1:29083',
          },
          {
            cwd: frontendDir,
            overrides: {
              REHEARSAL_TURNSTILE_BYPASS_TOKEN: 'explicit-bypass-token',
              BACKEND_INTERNAL_AUTH_SHARED_SECRET: 'explicit-internal-secret',
            },
          }
        )
      ).toMatchObject({
        REHEARSAL_TURNSTILE_BYPASS_TOKEN: 'explicit-bypass-token',
        BACKEND_INTERNAL_AUTH_SHARED_SECRET: 'explicit-internal-secret',
        API_BASE_URL: 'http://127.0.0.1:29081',
        BACKEND_INTERNAL_ORIGIN: 'http://127.0.0.1:29081',
        VPC_API_ORIGIN: 'http://127.0.0.1:29081',
        VPC_IDENTITY_API_ORIGIN: 'http://127.0.0.1:29081',
        VPC_COMMUNITY_API_ORIGIN: 'http://127.0.0.1:29082',
        VPC_CONTENT_API_ORIGIN: 'http://127.0.0.1:29083',
      })
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})
