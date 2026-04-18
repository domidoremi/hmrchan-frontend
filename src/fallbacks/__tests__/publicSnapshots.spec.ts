import { describe, expect, it } from 'vitest'

import {
  STATIC_AUTHOR_DETAILS,
  STATIC_AUTHOR_POSTS,
  STATIC_AUTHORS,
  STATIC_DISCUSSION_COMMENTS,
  STATIC_DISCUSSIONS,
  STATIC_EXPLORE_POSTS,
  STATIC_HOME_AGGREGATE,
  STATIC_HOME_POSTS,
  STATIC_POST_DETAILS,
  STATIC_SCHEDULE_DETAILS,
  STATIC_SCHEDULE_EVENTS,
} from '../generated/publicSnapshots'

const SNAPSHOT_AVATAR_FIELDS = new Set([
  'avatar_url',
  'author_avatar_url',
  'original_author_avatar_url',
])

function collectAvatarValues(value: unknown, bucket: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectAvatarValues(item, bucket)
    }
    return bucket
  }

  if (!value || typeof value !== 'object') {
    return bucket
  }

  for (const [key, entry] of Object.entries(value)) {
    if (SNAPSHOT_AVATAR_FIELDS.has(key)) {
      if (typeof entry === 'string' && entry.trim()) {
        bucket.push(entry)
      }
      continue
    }
    collectAvatarValues(entry, bucket)
  }

  return bucket
}

describe('publicSnapshots', () => {
  const snapshotPayloads = [
    STATIC_HOME_AGGREGATE,
    STATIC_HOME_POSTS,
    STATIC_EXPLORE_POSTS,
    STATIC_AUTHORS,
    STATIC_AUTHOR_DETAILS,
    STATIC_AUTHOR_POSTS,
    STATIC_POST_DETAILS,
    STATIC_SCHEDULE_EVENTS,
    STATIC_SCHEDULE_DETAILS,
    STATIC_DISCUSSIONS,
    STATIC_DISCUSSION_COMMENTS,
  ]

  it('keeps snapshot avatar fields same-origin or empty', () => {
    const avatarUrls = snapshotPayloads.flatMap((payload) => collectAvatarValues(payload))

    for (const avatarUrl of avatarUrls) {
      expect(avatarUrl.startsWith('/')).toBe(true)
    }
  })

  it('does not retain risky external avatar hosts in generated snapshots', () => {
    const serialized = JSON.stringify(
      snapshotPayloads.flatMap((payload) => collectAvatarValues(payload))
    )

    expect(serialized).not.toContain('tiktokcdn')
    expect(serialized).not.toContain('twimg.com')
    expect(serialized).not.toContain('pbs.twimg.com')
  })
})
