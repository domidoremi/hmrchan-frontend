import { describe, expect, it } from 'vitest'

import {
  assertPublicSnapshotIdContract,
  findPublicSnapshotIdContractIssues,
  findPublicSnapshotIdContractIssuesFromText,
} from '../../../scripts/lib/public-snapshot-contract.js'

describe('public snapshot contract guard', () => {
  it('accepts UUIDv7 public IDs in snapshot data', () => {
    const snapshots = {
      postDetails: {
        '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10': {
          id: '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10',
          author_id: '018f7da0-0c13-7c5f-a3b2-50d09d31a100',
          deep_link: '/post/018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10',
        },
      },
    }

    expect(findPublicSnapshotIdContractIssues(snapshots)).toEqual([])
  })

  it('rejects retired v4 and numeric public IDs in snapshot data', () => {
    const snapshots = {
      postDetails: {
        'dd8173a9-7ecc-4ecb-a362-0286d0eee53c': {
          id: 'dd8173a9-7ecc-4ecb-a362-0286d0eee53c',
          author_id: '123',
          deep_link: '/post/123',
        },
      },
    }

    expect(findPublicSnapshotIdContractIssues(snapshots)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'retired-v4' }),
        expect.objectContaining({ reason: 'numeric' }),
      ])
    )
    expect(() =>
      assertPublicSnapshotIdContract(snapshots, { sourceName: 'test snapshots' })
    ).toThrow(/test snapshots contain non-UUIDv7 public IDs/)
  })

  it('does not treat external platform IDs as public resource IDs', () => {
    const snapshots = {
      postDetails: {
        '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10': {
          id: '018f7d9f-7a22-7c8d-9b11-2d8c0e8c7a10',
          platform_post_id: '2040445439464612067',
          url: 'https://x.com/example/status/2040445439464612067',
        },
      },
    }

    expect(findPublicSnapshotIdContractIssues(snapshots)).toEqual([])
  })

  it('scans generated module text for stale public IDs', () => {
    const source = `
export const STATIC_POST_DETAILS = {
  'dd8173a9-7ecc-4ecb-a362-0286d0eee53c': {
    id: 'dd8173a9-7ecc-4ecb-a362-0286d0eee53c',
    deep_link: '/post/456'
  }
}
`

    expect(findPublicSnapshotIdContractIssuesFromText(source)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'dd8173a9-7ecc-4ecb-a362-0286d0eee53c' }),
        expect.objectContaining({ value: '456', reason: 'numeric' }),
      ])
    )
  })
})
