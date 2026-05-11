import { buildCacheNamespace } from '@/utils/cache/config'
import type { HmrCacheTtlPreset, HmrCachedSnapshot } from '@/hmr/types'

export type PublicContentCacheScope =
  | 'home'
  | 'explore'
  | 'post-detail'
  | 'author-detail'
  | 'author-list'
  | 'community'
  | 'schedule'
  | 'media'
  | 'snapshot'

export type PublicContentCacheStrategy = 'network-first' | 'stale-while-revalidate' | 'cache-first'

export interface PublicContentCacheOptions<T> {
  key: string
  loader: () => Promise<T>
  scope?: PublicContentCacheScope
  strategy?: PublicContentCacheStrategy
  ttl?: HmrCacheTtlPreset | number
  staleTtl?: number
}

export type PublicContentCacheLookupOptions<T> = Pick<
  PublicContentCacheOptions<T>,
  'key' | 'scope' | 'ttl' | 'staleTtl'
>

export interface PublicContentCacheStats {
  memoryEntries: number
  hits: number
  misses: number
  networkUpdates: number
  staleFallbacks: number
  expiredEntries: number
  rejectedPrivateRequests: number
  lastSource: 'memory' | 'idb' | 'network' | 'stale' | 'none'
}

interface PublicContentCacheEntry<T> {
  key: string
  value: T
  writtenAt: number
  expiresAt: number
  staleUntil: number
  scope: PublicContentCacheScope
  bytes: number
}

const CACHE_NAMESPACE = buildCacheNamespace('hmr-public-content-v1')
const IDB_NAME = 'hmr-public-content-cache-v1'
const IDB_STORE = 'entries'
const MEMORY_LIMIT = 80
const IDB_ENTRY_LIMIT = 200
const IDB_BYTES_LIMIT = 8 * 1024 * 1024
const ttlPresets: Record<HmrCacheTtlPreset, number> = {
  short: 60_000,
  medium: 180_000,
  long: 600_000,
}
const scopeTtls: Record<
  PublicContentCacheScope,
  { ttl: number; staleTtl: number; strategy: PublicContentCacheStrategy }
> = {
  home: { ttl: 60_000, staleTtl: 24 * 60 * 60_000, strategy: 'network-first' },
  explore: { ttl: 90_000, staleTtl: 6 * 60 * 60_000, strategy: 'network-first' },
  community: { ttl: 90_000, staleTtl: 6 * 60 * 60_000, strategy: 'network-first' },
  schedule: { ttl: 90_000, staleTtl: 6 * 60 * 60_000, strategy: 'network-first' },
  'post-detail': {
    ttl: 5 * 60_000,
    staleTtl: 24 * 60 * 60_000,
    strategy: 'stale-while-revalidate',
  },
  'author-detail': {
    ttl: 5 * 60_000,
    staleTtl: 24 * 60 * 60_000,
    strategy: 'stale-while-revalidate',
  },
  'author-list': {
    ttl: 5 * 60_000,
    staleTtl: 12 * 60 * 60_000,
    strategy: 'stale-while-revalidate',
  },
  media: { ttl: 7 * 24 * 60 * 60_000, staleTtl: 7 * 24 * 60 * 60_000, strategy: 'cache-first' },
  snapshot: { ttl: 180_000, staleTtl: 6 * 60 * 60_000, strategy: 'network-first' },
}
const privateKeyPattern =
  /(?:^|:|\/)(?:account|auth|client|device|devices|email|favorite|favorites|history|inbox|notification|notifications|preference|preferences|private|profile|session|sessions|user|users|2fa)(?:$|:|\/)/i

const memoryCache = new Map<string, PublicContentCacheEntry<unknown>>()
const inFlightCache = new Map<string, Promise<unknown>>()
const stats: PublicContentCacheStats = {
  memoryEntries: 0,
  hits: 0,
  misses: 0,
  networkUpdates: 0,
  staleFallbacks: 0,
  expiredEntries: 0,
  rejectedPrivateRequests: 0,
  lastSource: 'none',
}

let idbPromise: Promise<IDBDatabase | null> | undefined

function resolveTtl(ttl: HmrCacheTtlPreset | number | undefined, scope: PublicContentCacheScope) {
  return typeof ttl === 'number' ? ttl : ttl ? ttlPresets[ttl] : scopeTtls[scope].ttl
}

function resolveOptions<T>(options: PublicContentCacheOptions<T>) {
  const scope = options.scope ?? inferScopeFromKey(options.key)
  return {
    scope,
    key: buildPublicSnapshotCacheKey(options.key),
    rawKey: options.key,
    strategy: options.strategy ?? scopeTtls[scope].strategy,
    ttl: resolveTtl(options.ttl, scope),
    staleTtl: options.staleTtl ?? scopeTtls[scope].staleTtl,
  }
}

function inferScopeFromKey(key: string): PublicContentCacheScope {
  if (key.includes('home')) return 'home'
  if (key.includes('explore')) return 'explore'
  if (key.includes('community')) return 'community'
  if (key.includes('schedule')) return 'schedule'
  if (key.includes('post-detail')) return 'post-detail'
  if (key.includes('author-detail')) return 'author-detail'
  if (key.includes('author-list') || key.includes('authors')) return 'author-list'
  if (key.includes('media')) return 'media'
  return 'snapshot'
}

function isPublicContentKeyAllowed(key: string): boolean {
  return !privateKeyPattern.test(key)
}

function estimateBytes(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size
  } catch {
    return 0
  }
}

function updateMemoryStats(): void {
  stats.memoryEntries = memoryCache.size
}

function touchMemory(key: string, entry: PublicContentCacheEntry<unknown>): void {
  memoryCache.delete(key)
  memoryCache.set(key, entry)
  while (memoryCache.size > MEMORY_LIMIT) {
    const oldestKey = memoryCache.keys().next().value as string | undefined
    if (!oldestKey) break
    memoryCache.delete(oldestKey)
  }
  updateMemoryStats()
}

function isFresh(entry: PublicContentCacheEntry<unknown>): boolean {
  return entry.expiresAt > Date.now()
}

function isStaleUsable(entry: PublicContentCacheEntry<unknown>): boolean {
  return entry.staleUntil > Date.now()
}

function makeEntry<T>(
  key: string,
  value: T,
  ttl: number,
  staleTtl: number,
  scope: PublicContentCacheScope
): PublicContentCacheEntry<T> {
  const writtenAt = Date.now()
  return {
    key,
    value,
    writtenAt,
    expiresAt: writtenAt + ttl,
    staleUntil: writtenAt + staleTtl,
    scope,
    bytes: estimateBytes(value),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isUnstableFallbackValue(value: unknown): boolean {
  return isRecord(value) && value.source === 'local' && Boolean(value.error)
}

function openIdb(): Promise<IDBDatabase | null> {
  if (idbPromise) return idbPromise
  if (typeof indexedDB === 'undefined') {
    idbPromise = Promise.resolve(null)
    return idbPromise
  }

  idbPromise = new Promise((resolve) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'key' })
        store.createIndex('writtenAt', 'writtenAt')
      }
    }
    request.onerror = () => resolve(null)
    request.onsuccess = () => resolve(request.result)
  })

  return idbPromise
}

async function idbRead<T>(key: string): Promise<PublicContentCacheEntry<T> | null> {
  const db = await openIdb()
  if (!db) return null

  return new Promise((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readonly')
    const request = transaction.objectStore(IDB_STORE).get(key)
    request.onerror = () => resolve(null)
    request.onsuccess = () => resolve((request.result as PublicContentCacheEntry<T>) ?? null)
  })
}

async function idbWrite(entry: PublicContentCacheEntry<unknown>): Promise<void> {
  const db = await openIdb()
  if (!db) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite')
    transaction.objectStore(IDB_STORE).put(entry)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
  })
  await trimIdb(db)
}

async function idbClear(): Promise<void> {
  const db = await openIdb()
  if (!db) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite')
    transaction.objectStore(IDB_STORE).clear()
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
  })
}

async function trimIdb(db: IDBDatabase): Promise<void> {
  const entries = await new Promise<PublicContentCacheEntry<unknown>[]>((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readonly')
    const request = transaction.objectStore(IDB_STORE).getAll()
    request.onerror = () => resolve([])
    request.onsuccess = () => resolve((request.result as PublicContentCacheEntry<unknown>[]) ?? [])
  })
  const sorted = entries.toSorted((a, b) => a.writtenAt - b.writtenAt)
  let totalBytes = sorted.reduce((total, entry) => total + (entry.bytes || 0), 0)
  const deleteKeys: string[] = []

  while (sorted.length > IDB_ENTRY_LIMIT) {
    const entry = sorted.shift()
    if (!entry) break
    deleteKeys.push(entry.key)
    totalBytes -= entry.bytes || 0
  }

  while (totalBytes > IDB_BYTES_LIMIT) {
    const entry = sorted.shift()
    if (!entry) break
    deleteKeys.push(entry.key)
    totalBytes -= entry.bytes || 0
  }

  if (!deleteKeys.length) return

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite')
    const store = transaction.objectStore(IDB_STORE)
    deleteKeys.forEach((key) => store.delete(key))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
  })
}

async function readCachedEntry<T>(key: string): Promise<PublicContentCacheEntry<T> | null> {
  const memoryEntry = memoryCache.get(key) as PublicContentCacheEntry<T> | undefined
  if (memoryEntry) {
    touchMemory(key, memoryEntry)
    stats.hits += 1
    stats.lastSource = isFresh(memoryEntry) ? 'memory' : 'stale'
    return memoryEntry
  }

  const idbEntry = await idbRead<T>(key)
  if (idbEntry) {
    touchMemory(key, idbEntry)
    stats.hits += 1
    stats.lastSource = isFresh(idbEntry) ? 'idb' : 'stale'
    return idbEntry
  }

  stats.misses += 1
  stats.lastSource = 'none'
  return null
}

async function writeEntry(entry: PublicContentCacheEntry<unknown>): Promise<void> {
  touchMemory(entry.key, entry)
  await idbWrite(entry)
}

function readInFlight<T>(key: string): Promise<T> | null {
  const request = inFlightCache.get(key)
  return request ? (request as Promise<T>) : null
}

function runNetwork<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: number,
  staleTtl: number,
  scope: PublicContentCacheScope
): Promise<T> {
  const inFlight = readInFlight<T>(key)
  if (inFlight) return inFlight

  const request = loader()
    .then(async (value) => {
      if (isUnstableFallbackValue(value)) {
        return value
      }
      await writeEntry(makeEntry(key, value, ttl, staleTtl, scope))
      stats.networkUpdates += 1
      stats.lastSource = 'network'
      return value
    })
    .finally(() => {
      inFlightCache.delete(key)
    })

  inFlightCache.set(key, request)
  return request
}

async function networkFirst<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: number,
  staleTtl: number,
  scope: PublicContentCacheScope
): Promise<T> {
  const cached = await readCachedEntry<T>(key)
  try {
    const value = await runNetwork(key, loader, ttl, staleTtl, scope)
    if (cached && isStaleUsable(cached) && isUnstableFallbackValue(value)) {
      stats.staleFallbacks += 1
      stats.lastSource = 'stale'
      return cached.value
    }
    return value
  } catch (error) {
    if (cached && isStaleUsable(cached)) {
      stats.staleFallbacks += 1
      stats.lastSource = 'stale'
      return cached.value
    }
    stats.expiredEntries += cached ? 1 : 0
    throw error
  }
}

async function staleWhileRevalidate<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: number,
  staleTtl: number,
  scope: PublicContentCacheScope
): Promise<T> {
  const cached = await readCachedEntry<T>(key)
  if (cached && isFresh(cached)) return cached.value
  if (cached && isStaleUsable(cached)) {
    stats.staleFallbacks += 1
    void runNetwork(key, loader, ttl, staleTtl, scope).catch(() => undefined)
    return cached.value
  }

  stats.expiredEntries += cached ? 1 : 0
  return runNetwork(key, loader, ttl, staleTtl, scope)
}

async function cacheFirst<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: number,
  staleTtl: number,
  scope: PublicContentCacheScope
): Promise<T> {
  const cached = await readCachedEntry<T>(key)
  if (cached && isStaleUsable(cached)) return cached.value
  stats.expiredEntries += cached ? 1 : 0
  return runNetwork(key, loader, ttl, staleTtl, scope)
}

export function buildPublicSnapshotCacheKey(key: string): string {
  return `${CACHE_NAMESPACE}:${key}`
}

export function readPublicSnapshot<T>(key: string): T | null {
  const entry = memoryCache.get(buildPublicSnapshotCacheKey(key))
  return entry === undefined ? null : (entry.value as T)
}

export function writePublicSnapshot<T>(key: string, value: T): void {
  const resolved = resolveOptions({ key, loader: async () => value })
  touchMemory(
    resolved.key,
    makeEntry(resolved.key, value, resolved.ttl, resolved.staleTtl, resolved.scope)
  )
}

export function readPublicSnapshotEntry<T>(key: string): HmrCachedSnapshot<T> | null {
  const entry = memoryCache.get(buildPublicSnapshotCacheKey(key)) as
    | PublicContentCacheEntry<HmrCachedSnapshot<T>>
    | undefined
  if (!entry || !isFresh(entry)) return null
  return entry.value
}

export function writePublicSnapshotEntry<T>(
  key: string,
  value: T,
  ttl: HmrCacheTtlPreset | number = 'medium'
): HmrCachedSnapshot<T> {
  const resolved = resolveOptions({ key, loader: async () => value, ttl })
  const now = Date.now()
  const snapshot: HmrCachedSnapshot<T> = {
    value,
    writtenAt: now,
    expiresAt: now + resolved.ttl,
  }
  touchMemory(
    resolved.key,
    makeEntry(resolved.key, snapshot, resolved.ttl, resolved.staleTtl, resolved.scope)
  )
  return snapshot
}

export async function readOrCreatePublicSnapshot<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: HmrCacheTtlPreset | number = 'medium'
): Promise<T> {
  return readPublicContent({
    key,
    loader,
    ttl,
    scope: inferScopeFromKey(key),
    strategy: inferScopeFromKey(key) === 'post-detail' ? 'stale-while-revalidate' : 'network-first',
  })
}

export async function readPublicContent<T>(options: PublicContentCacheOptions<T>): Promise<T> {
  if (!isPublicContentKeyAllowed(options.key)) {
    stats.rejectedPrivateRequests += 1
    return options.loader()
  }

  const resolved = resolveOptions(options)
  if (resolved.strategy === 'cache-first') {
    return cacheFirst(resolved.key, options.loader, resolved.ttl, resolved.staleTtl, resolved.scope)
  }
  if (resolved.strategy === 'stale-while-revalidate') {
    return staleWhileRevalidate(
      resolved.key,
      options.loader,
      resolved.ttl,
      resolved.staleTtl,
      resolved.scope
    )
  }
  return networkFirst(resolved.key, options.loader, resolved.ttl, resolved.staleTtl, resolved.scope)
}

export async function readAvailablePublicContent<T>(
  options: PublicContentCacheLookupOptions<T>
): Promise<T | null> {
  if (!isPublicContentKeyAllowed(options.key)) {
    stats.rejectedPrivateRequests += 1
    return null
  }

  const resolved = resolveOptions({ ...options, loader: async () => undefined as T })
  const cached = await readCachedEntry<T>(resolved.key)
  if (cached && isStaleUsable(cached)) return cached.value

  stats.expiredEntries += cached ? 1 : 0
  return null
}

export async function clearPublicContentCache(): Promise<void> {
  memoryCache.clear()
  inFlightCache.clear()
  updateMemoryStats()
  await idbClear()

  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_PUBLIC_CACHE' })
  }
}

export function getPublicCacheStats(): PublicContentCacheStats {
  return {
    ...stats,
    memoryEntries: memoryCache.size,
  }
}

export function __resetPublicContentCacheForTests(): void {
  memoryCache.clear()
  inFlightCache.clear()
  stats.memoryEntries = 0
  stats.hits = 0
  stats.misses = 0
  stats.networkUpdates = 0
  stats.staleFallbacks = 0
  stats.expiredEntries = 0
  stats.rejectedPrivateRequests = 0
  stats.lastSource = 'none'
  idbPromise = undefined
}
