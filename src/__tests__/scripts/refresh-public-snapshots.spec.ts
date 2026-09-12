import { describe, expect, it } from 'vitest'

import { normalizeSnapshotExternalLinks } from '../../../scripts/refresh-public-snapshots.mjs'

const CURRENT_POST_ID = '01890f47-6a35-7cc4-8a2d-7f5b56c9e001'
const TARGET_POST_ID = '01890f47-6a35-7cc4-8a2d-7f5b56c9e002'

describe('public snapshot external-link mapping', () => {
  it('preserves and normalizes supported detail external links', () => {
    expect(
      normalizeSnapshotExternalLinks(
        [
          {
            platform: 'youtube',
            url: 'https://youtu.be/video',
            platform_post_id: 'video',
            target_post_id: TARGET_POST_ID,
            ignored: true,
          },
          {
            platform: 'tiktok',
            url: 'https://www.tiktok.com/@creator/video/1',
            target_post_id: CURRENT_POST_ID,
          },
          { platform: 'youtube', url: 'https://youtube.com.evil.test/video' },
          {
            platform: 'youtube',
            url: 'https://youtu.be/no-invalid-target',
            target_post_id: 'not-a-public-id',
          },
          { platform: 'other', url: 'https://example.com/video' },
        ],
        CURRENT_POST_ID
      )
    ).toEqual([
      {
        platform: 'youtube',
        url: 'https://youtu.be/video',
        platform_post_id: 'video',
        target_post_id: TARGET_POST_ID,
      },
      {
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@creator/video/1',
      },
      {
        platform: 'youtube',
        url: 'https://youtu.be/no-invalid-target',
      },
    ])
  })

  it('always emits the required detail field', () => {
    expect(normalizeSnapshotExternalLinks(undefined, CURRENT_POST_ID)).toEqual([])
  })
})
