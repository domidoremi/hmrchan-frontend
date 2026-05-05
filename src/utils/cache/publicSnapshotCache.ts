import { UUIDV7_CUTOVER_EPOCH } from '@/utils/cache/config'

const memoryCache = new Map<string, unknown>()

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
