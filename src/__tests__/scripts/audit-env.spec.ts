import { describe, expect, it } from 'vitest'

import {
  createLocalAuditEnv,
  LOCAL_AUDIT_CONTRACT_VERSION,
  resolveLocalAuditContractVersion,
} from '../../../scripts/lib/audit-env.js'

describe('local audit environment', () => {
  it('uses the checked-in Wrangler client contract for local validation', () => {
    const contractVersion = resolveLocalAuditContractVersion({ cwd: process.cwd() })
    const env = createLocalAuditEnv(
      {},
      {
        cwd: process.cwd(),
        includeContractFallback: true,
      }
    )

    expect(contractVersion).toBe('2026-04-13.p1')
    expect(env.VITE_CLIENT_CONTRACT_VERSION).toBe(contractVersion)
  })

  it('preserves an explicit client contract version', () => {
    const env = createLocalAuditEnv(
      { VITE_CLIENT_CONTRACT_VERSION: 'explicit-contract' },
      {
        cwd: process.cwd(),
        includeContractFallback: true,
      }
    )

    expect(env.VITE_CLIENT_CONTRACT_VERSION).toBe('explicit-contract')
  })

  it('retains the deterministic fallback when Wrangler config is unavailable', () => {
    expect(
      resolveLocalAuditContractVersion({
        cwd: new URL('missing-audit-root', import.meta.url).pathname,
      })
    ).toBe(LOCAL_AUDIT_CONTRACT_VERSION)
  })
})
