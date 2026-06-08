import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UUIDV7_CUTOVER_EPOCH } from '@/utils/cache/config'
import {
  __resetPublicContentCacheForTests,
  buildPublicSnapshotCacheKey as buildCanonicalPublicSnapshotCacheKey,
  readOrCreatePublicSnapshot as readOrCreateCanonicalPublicSnapshot,
  readPublicSnapshot as readCanonicalPublicSnapshot,
  readPublicSnapshotEntry as readCanonicalPublicSnapshotEntry,
  writePublicSnapshot as writeCanonicalPublicSnapshot,
  writePublicSnapshotEntry as writeCanonicalPublicSnapshotEntry,
} from '@/utils/cache/publicContentCache'
import {
  PUBLIC_SNAPSHOT_CACHE_CUTOVER_EPOCH,
  buildPublicSnapshotCacheKey,
  readOrCreatePublicSnapshot,
  readPublicSnapshot,
  readPublicSnapshotEntry,
  writePublicSnapshot,
  writePublicSnapshotEntry,
} from '@/utils/cache/publicSnapshotCache'

describe('public snapshot cache compatibility entry', () => {
  beforeEach(() => {
    vi.useRealTimers()
    __resetPublicContentCacheForTests()
  })

  it('mirrors the canonical public content cache snapshot exports', () => {
    expect(PUBLIC_SNAPSHOT_CACHE_CUTOVER_EPOCH).toBe(UUIDV7_CUTOVER_EPOCH)
    expect(buildPublicSnapshotCacheKey).toBe(buildCanonicalPublicSnapshotCacheKey)
    expect(readPublicSnapshot).toBe(readCanonicalPublicSnapshot)
    expect(writePublicSnapshot).toBe(writeCanonicalPublicSnapshot)
    expect(readPublicSnapshotEntry).toBe(readCanonicalPublicSnapshotEntry)
    expect(writePublicSnapshotEntry).toBe(writeCanonicalPublicSnapshotEntry)
    expect(readOrCreatePublicSnapshot).toBe(readOrCreateCanonicalPublicSnapshot)
  })

  it('reads snapshot values written through the compatibility entry', () => {
    const snapshotValue = { title: 'home fallback' }

    writePublicSnapshot('home', snapshotValue)

    expect(buildPublicSnapshotCacheKey('home')).toBe(buildCanonicalPublicSnapshotCacheKey('home'))
    expect(readPublicSnapshot('home')).toEqual(snapshotValue)
    expect(readCanonicalPublicSnapshot('home')).toEqual(snapshotValue)
    expect(readPublicSnapshot('missing')).toBeNull()
  })

  it('preserves snapshot entry metadata and expiry behavior', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-08T10:00:00.000Z'))

    const entry = writePublicSnapshotEntry('post:demo', { id: 'post:demo' }, 1_000)

    expect(entry).toEqual({
      value: { id: 'post:demo' },
      writtenAt: Date.parse('2026-06-08T10:00:00.000Z'),
      expiresAt: Date.parse('2026-06-08T10:00:01.000Z'),
    })
    expect(readPublicSnapshotEntry('post:demo')).toEqual(entry)
    expect(readCanonicalPublicSnapshotEntry('post:demo')).toEqual(entry)

    vi.advanceTimersByTime(1_001)

    expect(readPublicSnapshotEntry('post:demo')).toBeNull()
  })
})
