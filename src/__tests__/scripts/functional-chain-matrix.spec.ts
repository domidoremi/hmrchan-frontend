import { describe, expect, it } from 'vitest'

import {
  buildFunctionalChainMarkdownSummary,
  createFunctionalChainSummary,
  getFunctionalChainBatchSpecs,
  resolveFunctionalChainAccounts,
  resolveFunctionalChainBatchPlan,
} from '../../../scripts/lib/functional-chain-matrix.js'

describe('functional chain matrix governance', () => {
  it('splits comments, favorites, notifications, and dual-user flows into low-output batches', () => {
    const batches = getFunctionalChainBatchSpecs()

    expect(batches.map((batch) => batch.area)).toEqual([
      'comments',
      'favorites',
      'notifications',
      'dual-user',
    ])
    expect(batches.map((batch) => batch.id)).toEqual([
      'comments-readiness',
      'favorites-profile-index',
      'notifications-inbox',
      'dual-user-session-isolation',
    ])

    for (const batch of batches) {
      expect(batch.maxChecks).toBeGreaterThan(0)
      expect(batch.maxChecks).toBeLessThanOrEqual(4)
      expect(batch.routeSurfaces.length).toBeGreaterThan(0)
      expect(batch.facadePaths.length).toBeGreaterThan(0)
      expect(batch.evidence.length).toBeGreaterThan(0)
    }
  })

  it('resolves explicit batch selections and records unknown batch ids', () => {
    expect(resolveFunctionalChainBatchPlan().batches).toHaveLength(4)

    const selected = resolveFunctionalChainBatchPlan(
      'comments-readiness,notifications-inbox,missing-batch'
    )

    expect(selected.batches.map((batch) => batch.id)).toEqual([
      'comments-readiness',
      'notifications-inbox',
    ])
    expect(selected.unknownIds).toEqual(['missing-batch'])
  })

  it('renders planned batches without exposing account secrets', () => {
    const accounts = resolveFunctionalChainAccounts({
      PRIMARY_USERNAME: 'primary@example.com',
      PRIMARY_PASSWORD: 'primary-secret',
      PEER_USERNAME: 'peer@example.com',
      PEER_PASSWORD: 'peer-secret',
    })
    const summary = createFunctionalChainSummary({
      artifactDir: 'output/functional-chain/test',
      baseUrl: 'https://next.momichan.xyz',
      accounts,
    })
    const markdown = buildFunctionalChainMarkdownSummary(summary)

    expect(summary.batches).toHaveLength(4)
    expect(markdown).toContain('### Planned Batches')
    expect(markdown).toContain('comments-readiness')
    expect(markdown).toContain('dual-user-session-isolation')
    expect(markdown).not.toContain('primary-secret')
    expect(markdown).not.toContain('peer-secret')
  })
})
