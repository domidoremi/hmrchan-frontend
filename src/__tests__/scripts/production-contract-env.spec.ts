import { describe, expect, it } from 'vitest'
import { resolveProductionContractEnv } from '../../../scripts/lib/production-contract-env.js'

describe('production contract env resolver', () => {
  it('preserves an explicit production contract version', () => {
    const result = resolveProductionContractEnv({
      VITE_CLIENT_CONTRACT_VERSION: ' release-contract ',
      CF_PAGES_COMMIT_SHA: 'cloudflare-sha',
    })

    expect(result.injected).toBe(false)
    expect(result.source).toBe('explicit')
    expect(result.env.VITE_CLIENT_CONTRACT_VERSION).toBe('release-contract')
  })

  it('does not inject a contract for ordinary local builds', () => {
    const result = resolveProductionContractEnv({
      VITE_GIT_COMMIT: 'local-git-sha',
    })

    expect(result.injected).toBe(false)
    expect(result.source).toBe('missing')
    expect(result.env.VITE_CLIENT_CONTRACT_VERSION).toBeUndefined()
  })

  it('uses the Cloudflare Pages commit SHA for Pages builds without a contract variable', () => {
    const result = resolveProductionContractEnv({
      CF_PAGES: '1',
      CF_PAGES_COMMIT_SHA: 'pages-commit-sha',
      VITE_GIT_COMMIT: 'vite-git-sha',
    })

    expect(result.injected).toBe(true)
    expect(result.source).toBe('cloudflare-pages-commit-sha')
    expect(result.env.VITE_CLIENT_CONTRACT_VERSION).toBe('pages-commit-sha')
  })

  it('falls back to VITE_GIT_COMMIT only inside a Cloudflare Pages context', () => {
    const result = resolveProductionContractEnv({
      CF_PAGES_BRANCH: 'main',
      VITE_GIT_COMMIT: 'vite-git-sha',
    })

    expect(result.injected).toBe(true)
    expect(result.env.VITE_CLIENT_CONTRACT_VERSION).toBe('vite-git-sha')
  })
})
