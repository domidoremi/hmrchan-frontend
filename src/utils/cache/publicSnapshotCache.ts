import { UUIDV7_CUTOVER_EPOCH } from '@/utils/cache/config'
import type { HmrCacheTtlPreset, HmrCachedSnapshot } from '@/hmr/types'

const memoryCache = new Map<string, unknown>()
const inFlightCache = new Map<string, Promise<unknown>>()

const ttlPresets: Record<HmrCacheTtlPreset, number> = {
  short: 60_000,
  medium: 180_000,
  long: 600_000,
}

export function buildPublicSnapshotCacheKey(key: string): string {
  return `${UUIDV7_CUTOVER_EPOCH}:${key}`
}

export function readPublicSnapshot<T>(key: string): T | null {
  const value = memoryCache.get(buildPublicSnapshotCacheKey(key))
  return value === undefined ? null : (value as T)
}

export function writePublicSnapshot<T>(key: string, value: T): void {
  memoryCache.set(buildPublicSnapshotCacheKey(key), value)
}

function resolveTtl(ttl: HmrCacheTtlPreset | number): number {
  return typeof ttl === 'number' ? ttl : ttlPresets[ttl]
}

export function readPublicSnapshotEntry<T>(key: string): HmrCachedSnapshot<T> | null {
  const value = readPublicSnapshot<HmrCachedSnapshot<T>>(key)
  if (!value) return null
  if (value.expiresAt <= Date.now()) return null
  return value
}

export function writePublicSnapshotEntry<T>(
  key: string,
  value: T,
  ttl: HmrCacheTtlPreset | number = 'medium'
): HmrCachedSnapshot<T> {
  const now = Date.now()
  const snapshot: HmrCachedSnapshot<T> = {
    value,
    writtenAt: now,
    expiresAt: now + resolveTtl(ttl),
  }
  writePublicSnapshot(key, snapshot)
  return snapshot
}

export async function readOrCreatePublicSnapshot<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: HmrCacheTtlPreset | number = 'medium'
): Promise<T> {
  const cached = readPublicSnapshotEntry<T>(key)
  if (cached) return cached.value

  const cacheKey = buildPublicSnapshotCacheKey(key)
  const inFlight = inFlightCache.get(cacheKey)
  if (inFlight) return inFlight as Promise<T>

  const request = loader()
    .then((value) => {
      writePublicSnapshotEntry(key, value, ttl)
      return value
    })
    .finally(() => {
      inFlightCache.delete(cacheKey)
    })

  inFlightCache.set(cacheKey, request)
  return request
}
