import { idbGet, idbSet, idbGetAll, idbClear, idbDelete, idbCount, STORES } from './idb'
import { prefetchPostDetail } from '../prefetch'

interface AccessRecord {
  id: string
  type: 'post' | 'author' | 'tag'
  resourceId: string
  accessCount: number
  lastAccess: number
  avgTimeSpent: number
}

const ACCESS_STORE = STORES.ACCESS_HISTORY
const MAX_RECORDS = 500
const PREFETCH_THRESHOLD = 3
const RECENT_DAYS = 7

export async function recordAccess(
  type: AccessRecord['type'],
  resourceId: string,
  timeSpent: number = 0
): Promise<void> {
  const id = `${type}-${resourceId}`

  const existing = await idbGet<AccessRecord>(ACCESS_STORE, id)

  if (existing) {
    existing.accessCount++
    existing.lastAccess = Date.now()
    existing.avgTimeSpent =
      (existing.avgTimeSpent * (existing.accessCount - 1) + timeSpent) / existing.accessCount
    await idbSet(ACCESS_STORE, existing)
  } else {
    const record: AccessRecord = {
      id,
      type,
      resourceId,
      accessCount: 1,
      lastAccess: Date.now(),
      avgTimeSpent: timeSpent,
    }
    await idbSet(ACCESS_STORE, record)
  }

  await cleanupOldRecords()
}

export async function getPopularResources(
  type?: AccessRecord['type'],
  limit: number = 10
): Promise<AccessRecord[]> {
  let records = await idbGetAll<AccessRecord>(ACCESS_STORE)

  if (type) {
    records = records.filter((r) => r.type === type)
  }

  const cutoffTime = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
  records = records.filter((r) => r.lastAccess > cutoffTime)

  records.sort((a, b) => {
    const scoreA = a.accessCount * 0.7 + (a.lastAccess / Date.now()) * 0.3
    const scoreB = b.accessCount * 0.7 + (b.lastAccess / Date.now()) * 0.3
    return scoreB - scoreA
  })

  return records.slice(0, limit)
}

export async function prefetchPopularContent(): Promise<{
  prefetched: number
  skipped: number
}> {
  const popularPosts = await getPopularResources('post', 20)
  let prefetched = 0
  let skipped = 0

  for (const record of popularPosts) {
    if (record.accessCount >= PREFETCH_THRESHOLD) {
      try {
        await prefetchPostDetail(record.resourceId)
        prefetched++

        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch {
        skipped++
      }
    } else {
      skipped++
    }
  }

  return { prefetched, skipped }
}

export async function prefetchRelatedContent(
  currentResourceId: string,
  type: AccessRecord['type'] = 'post'
): Promise<void> {
  const history = await getPopularResources(type, 50)

  const related = history.filter((r) => r.resourceId !== currentResourceId).slice(0, 5)

  for (const record of related) {
    if (record.type === 'post') {
      try {
        await prefetchPostDetail(record.resourceId)
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch {}
    }
  }
}

async function cleanupOldRecords(): Promise<void> {
  const count = await idbCount(ACCESS_STORE)
  if (count <= MAX_RECORDS) {
    return
  }

  const records = await idbGetAll<AccessRecord>(ACCESS_STORE)

  records.sort((a, b) => a.lastAccess - b.lastAccess)
  const toDelete = records.slice(0, count - MAX_RECORDS)

  await Promise.all(toDelete.map((record) => idbDelete(ACCESS_STORE, record.id)))
}

export async function getAccessStats(): Promise<{
  totalRecords: number
  postAccess: number
  authorAccess: number
  avgAccessCount: number
}> {
  const records = await idbGetAll<AccessRecord>(ACCESS_STORE)

  const postRecords = records.filter((r) => r.type === 'post')
  const authorRecords = records.filter((r) => r.type === 'author')
  const totalAccessCount = records.reduce((sum, r) => sum + r.accessCount, 0)

  return {
    totalRecords: records.length,
    postAccess: postRecords.reduce((sum, r) => sum + r.accessCount, 0),
    authorAccess: authorRecords.reduce((sum, r) => sum + r.accessCount, 0),
    avgAccessCount: records.length > 0 ? totalAccessCount / records.length : 0,
  }
}

export async function clearAccessHistory(): Promise<void> {
  await idbClear(ACCESS_STORE)
}
