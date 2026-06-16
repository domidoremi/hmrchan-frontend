import { describe, expect, it } from 'vitest'

import {
  ensureLocalAuditSmokeAccount,
  resolveLocalAuditSmokeAccount,
  shouldEnsureLocalAuditSmokeAccount,
} from '../../../scripts/lib/local-audit-smoke-account.js'

describe('local audit smoke account helpers', () => {
  it('derives a deterministic username/email pair from a username login', () => {
    expect(resolveLocalAuditSmokeAccount('local-smoke-main')).toEqual({
      identifier: 'local-smoke-main',
      username: 'local-smoke-main',
      email: 'local-smoke-main@local-smoke.invalid',
    })
  })

  it('preserves email identifiers and derives a stable username fallback', () => {
    expect(resolveLocalAuditSmokeAccount('Smoke.User+qa@example.com')).toEqual({
      identifier: 'Smoke.User+qa@example.com',
      username: 'smoke.user-qa',
      email: 'Smoke.User+qa@example.com',
    })
  })

  it('only enables local smoke auto-seeding for localhost-style audit origins with credentials', () => {
    expect(
      shouldEnsureLocalAuditSmokeAccount('http://localhost:4173', {
        login: 'local-smoke-main',
        password: 'secret',
      })
    ).toBe(true)

    expect(
      shouldEnsureLocalAuditSmokeAccount('https://momichan.com', {
        login: 'local-smoke-main',
        password: 'secret',
      })
    ).toBe(false)

    expect(
      shouldEnsureLocalAuditSmokeAccount('http://127.0.0.1:4173', {
        login: 'local-smoke-main',
        password: '',
      })
    ).toBe(false)
  })

  it('skips instead of hanging when docker exec times out', () => {
    expect(
      ensureLocalAuditSmokeAccount(
        {},
        'http://localhost:4173',
        {
          login: 'local-smoke-main',
          password: 'secret',
        },
        {
          timeoutMs: 1,
          spawn: () =>
            ({
              pid: 1,
              output: [],
              stdout: '',
              stderr: '',
              status: null,
              signal: 'SIGTERM',
              error: Object.assign(new Error('spawnSync docker ETIMEDOUT'), { code: 'ETIMEDOUT' }),
            }) as never,
        }
      )
    ).toMatchObject({
      ensured: false,
      skipped: true,
      reason: 'docker-exec-timeout',
      username: 'local-smoke-main',
      email: 'local-smoke-main@local-smoke.invalid',
    })
  })
})
