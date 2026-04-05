/**
 * 公开页面真实快照缓存
 * 优先保存最近一次成功的公开响应，用于异常时回退。
 */

import { idbDelete, idbGet, idbPruneByIndex, idbSet, STORES } from './idb'
import { CACHE_LIMITS, CACHE_TTL, generateCacheKey } from './config'
import { memoryCache } from './memoryCache'
import { deepClone } from '@/utils/modernAPIs'

export interface PublicSnapshotRecord<T> {
  key: string
  scope: string
  params: Record<string, unknown>
  data: T
  cached_at: number
}

let publicSnapshotPruneTimer: ReturnType<typeof setTimeout> | null = null

function schedulePublicSnapshotPrune(): void {
  if (publicSnapshotPruneTimer) return
  publicSnapshotPruneTimer = setTimeout(() => {
    publicSnapshotPruneTimer = null
    void idbPruneByIndex(STORES.META, 'cached_at', CACHE_LIMITS.IDB_META_MAX_SIZE)
  }, 500)
}

function buildSnapshotKey(scope: string, params: Record<string, unknown> = {}): string {
  return generateCacheKey(`public_snapshot:${scope}`, params)
}

function cloneSnapshotData<T>(value: T): T {
  return deepClone(value)
}

export async function getPublicSnapshot<T>(
  scope: string,
  params: Record<string, unknown> = {},
  ttl = CACHE_TTL.PUBLIC_SNAPSHOT
): Promise<T | undefined> {
  const key = buildSnapshotKey(scope, params)
  const memCached = memoryCache.get<PublicSnapshotRecord<T>>(key)
  if (memCached) {
    return cloneSnapshotData(memCached.data)
  }

  const idbCached = await idbGet<PublicSnapshotRecord<T>>(STORES.META, key)
  if (!idbCached) return undefined

  if (Date.now() - idbCached.cached_at >= ttl) {
    await idbDelete(STORES.META, key)
    return undefined
  }

  memoryCache.set(key, idbCached, CACHE_TTL.MEMORY_EXTENDED)
  return cloneSnapshotData(idbCached.data)
}

export async function setPublicSnapshot<T>(
  scope: string,
  params: Record<string, unknown> = {},
  data: T
): Promise<void> {
  const key = buildSnapshotKey(scope, params)
  const record: PublicSnapshotRecord<T> = {
    key,
    scope,
    params: cloneSnapshotData(params),
    data: cloneSnapshotData(data),
    cached_at: Date.now(),
  }

  memoryCache.set(key, record, CACHE_TTL.MEMORY_EXTENDED)
  await idbSet(STORES.META, record)
  schedulePublicSnapshotPrune()
}

export async function deletePublicSnapshot(
  scope: string,
  params: Record<string, unknown> = {}
): Promise<void> {
  const key = buildSnapshotKey(scope, params)
  memoryCache.delete(key)
  await idbDelete(STORES.META, key)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (publicSnapshotPruneTimer) {
      clearTimeout(publicSnapshotPruneTimer)
      publicSnapshotPruneTimer = null
    }
  })
}
