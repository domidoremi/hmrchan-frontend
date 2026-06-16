import { describe, expect, it } from 'vitest'
import {
  getProductionContractEnvPolicy,
  resolveProductionContractEnv,
  validateProductionContractEnvPolicy,
} from '../../../scripts/lib/production-contract-env.js'

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

  it('strips production-incompatible client audit env and forces safe debug flags', () => {
    const result = resolveProductionContractEnv({
      CF_PAGES: '1',
      CF_PAGES_COMMIT_SHA: 'pages-commit-sha',
      VITE_API_BASE_URL: 'https://api.momichan.com',
      VITE_IDENTITY_API_BASE_URL: 'http://127.0.0.1:19081',
      VITE_COMMUNITY_API_BASE_URL: 'http://127.0.0.1:19082',
      VITE_CONTENT_API_BASE_URL: 'http://127.0.0.1:19083',
      VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION: 'true',
      VITE_ENABLE_DEBUG: 'true',
      VITE_ENABLE_DEVTOOLS: 'true',
    })

    expect(result.env.VITE_CLIENT_CONTRACT_VERSION).toBe('pages-commit-sha')
    expect(result.env.VITE_API_BASE_URL).toBeUndefined()
    expect(result.env.VITE_IDENTITY_API_BASE_URL).toBeUndefined()
    expect(result.env.VITE_COMMUNITY_API_BASE_URL).toBeUndefined()
    expect(result.env.VITE_CONTENT_API_BASE_URL).toBeUndefined()
    expect(result.env.VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION).toBeUndefined()
    expect(result.env.VITE_ENABLE_DEBUG).toBe('false')
    expect(result.env.VITE_ENABLE_DEVTOOLS).toBe('false')
    expect(result.sanitized?.strippedKeys).toEqual(
      expect.arrayContaining([
        'VITE_API_BASE_URL',
        'VITE_IDENTITY_API_BASE_URL',
        'VITE_COMMUNITY_API_BASE_URL',
        'VITE_CONTENT_API_BASE_URL',
        'VITE_LOCAL_AUDIT_PERSIST_AUTH_SESSION',
      ])
    )
    expect(result.sanitized?.forcedKeys).toEqual(
      expect.arrayContaining(['VITE_ENABLE_DEBUG', 'VITE_ENABLE_DEVTOOLS'])
    )
  })

  it('preserves the preview proxy bypass for local audit production builds', () => {
    const result = resolveProductionContractEnv({
      VITE_CLIENT_CONTRACT_VERSION: 'local-audit-contract',
      VITE_DISABLE_PREVIEW_PROXY: 'true',
      LOCAL_AUDIT_BUILD: 'true',
      VITE_ENABLE_DEBUG: 'true',
      VITE_ENABLE_DEVTOOLS: 'true',
    })

    expect(result.env.VITE_DISABLE_PREVIEW_PROXY).toBe('true')
    expect(result.env.VITE_ENABLE_DEBUG).toBe('false')
    expect(result.env.VITE_ENABLE_DEVTOOLS).toBe('false')
    expect(result.sanitized?.strippedKeys).not.toContain('VITE_DISABLE_PREVIEW_PROXY')
  })

  it('still strips preview proxy bypass from ordinary Cloudflare production builds', () => {
    const result = resolveProductionContractEnv({
      CF_PAGES: '1',
      CF_PAGES_COMMIT_SHA: 'pages-commit-sha',
      VITE_DISABLE_PREVIEW_PROXY: 'true',
    })

    expect(result.env.VITE_DISABLE_PREVIEW_PROXY).toBeUndefined()
    expect(result.sanitized?.strippedKeys).toContain('VITE_DISABLE_PREVIEW_PROXY')
  })

  it('exposes a stable production env policy contract for release validation', () => {
    const policy = getProductionContractEnvPolicy()

    expect(validateProductionContractEnvPolicy()).toEqual([])
    expect(policy.stripClientEnvKeys).toEqual(
      expect.arrayContaining([
        'VITE_API_BASE_URL',
        'VITE_IDENTITY_API_BASE_URL',
        'VITE_COMMUNITY_API_BASE_URL',
        'VITE_CONTENT_API_BASE_URL',
      ])
    )
    expect(policy.forceClientEnv).toMatchObject({
      VITE_ENABLE_DEBUG: 'false',
      VITE_ENABLE_DEVTOOLS: 'false',
    })
  })
})
