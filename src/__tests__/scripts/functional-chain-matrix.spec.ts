import { describe, expect, it } from 'vitest'
import {
  appendFunctionalChainCheck,
  createFunctionalChainSummary,
  finalizeFunctionalChainSummary,
  isUuidString,
  resolveFunctionalChainAccounts,
  validateFunctionalChainAccounts,
} from '../../../scripts/lib/functional-chain-matrix.js'

describe('functional chain matrix helpers', () => {
  it('requires only the primary account and keeps optional accounts skippable', () => {
    const accounts = resolveFunctionalChainAccounts({
      PRIMARY_USERNAME: 'fe_primary',
      PRIMARY_PASSWORD: 'secret',
      PEER_USERNAME: 'fe_peer',
    })

    expect(validateFunctionalChainAccounts(accounts)).toBeNull()
    expect(accounts.find((account) => account.role === 'primary')).toMatchObject({
      configured: true,
      username: 'fe_primary',
    })
    expect(accounts.find((account) => account.role === 'peer')).toMatchObject({
      configured: false,
      missing: ['PEER_PASSWORD'],
      skipReason: 'PEER_PASSWORD not set',
    })
  })

  it('returns a primary account error when required credentials are missing', () => {
    const accounts = resolveFunctionalChainAccounts({
      PEER_USERNAME: 'fe_peer',
      PEER_PASSWORD: 'secret',
    })

    expect(validateFunctionalChainAccounts(accounts)).toBe(
      'PRIMARY_USERNAME/PRIMARY_PASSWORD not set'
    )
  })

  it('summarizes failed, skipped, and environment-blocked checks deterministically', () => {
    const summary = createFunctionalChainSummary({
      artifactDir: 'output/functional-chain/test',
      baseUrl: 'http://127.0.0.1:4173',
      accounts: resolveFunctionalChainAccounts({
        PRIMARY_USERNAME: 'fe_primary',
        PRIMARY_PASSWORD: 'secret',
      }),
    })

    appendFunctionalChainCheck(summary, {
      name: 'primary login',
      accountRole: 'primary',
      status: 'passed',
    })
    appendFunctionalChainCheck(summary, {
      name: 'admin account configured',
      accountRole: 'admin',
      status: 'skipped',
      detail: 'ADMIN_USERNAME/ADMIN_PASSWORD not set',
    })
    appendFunctionalChainCheck(summary, {
      name: 'local audit bridge',
      status: 'environment-blocked',
      detail: 'UPSTREAM_TIMEOUT',
    })

    finalizeFunctionalChainSummary(summary)

    expect(summary.status).toBe('environment-blocked')
    expect(summary.lastFailedCheck).toBe('local audit bridge')
  })

  it('accepts UUID strings and rejects numeric IDs', () => {
    expect(isUuidString('0195fe30-6f9d-7f31-9e6f-c9a5c478a001')).toBe(true)
    expect(isUuidString('123')).toBe(false)
  })
})
